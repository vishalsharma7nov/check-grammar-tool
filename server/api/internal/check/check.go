package check

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

type Dialect string

const (
	EnUS Dialect = "en-US"
	EnGB Dialect = "en-GB"
	EnCA Dialect = "en-CA"
	EnAU Dialect = "en-AU"
	EnIN Dialect = "en-IN"
)

type Goals struct {
	Audience  string `json:"audience,omitempty"`
	Formality string `json:"formality,omitempty"`
	Intent    string `json:"intent,omitempty"`
}

type Request struct {
	Text               string   `json:"text"`
	Dialect            Dialect  `json:"dialect,omitempty"`
	Mode               string   `json:"mode,omitempty"`
	PersonalDictionary []string `json:"personalDictionary,omitempty"`
	StyleGuide         string   `json:"styleGuide,omitempty"`
	IncludeLLM         bool     `json:"includeLLM,omitempty"`
	Goals              *Goals   `json:"goals,omitempty"`
}

type Match struct {
	Offset       int      `json:"offset"`
	Length       int      `json:"length"`
	RuleID       string   `json:"ruleId"`
	Category     string   `json:"category"`
	Message      string   `json:"message"`
	Explanation  string   `json:"explanation"`
	Replacements []string `json:"replacements"`
	Dialect      Dialect  `json:"dialect,omitempty"`
}

type Stats struct {
	WordCount         int     `json:"wordCount"`
	SentenceCount     int     `json:"sentenceCount"`
	AvgSentenceLength float64 `json:"avgSentenceLength"`
	Readability       int     `json:"readability"`
	PassiveVoiceCount int     `json:"passiveVoiceCount"`
	Dialect           Dialect `json:"dialect"`
}

type LLMMeta struct {
	Used          bool   `json:"used"`
	Provider      string `json:"provider"`
	Model         string `json:"model,omitempty"`
	SkippedReason string `json:"skippedReason,omitempty"`
}

type Response struct {
	Matches []Match `json:"matches"`
	Stats   Stats   `json:"stats"`
	LLM     LLMMeta `json:"llm"`
}

var typos = map[string]string{
	"teh": "the", "adn": "and", "recieve": "receive", "recieved": "received",
	"seperate": "separate", "seperated": "separated", "definately": "definitely",
	"occassion": "occasion", "occured": "occurred", "occurence": "occurrence",
	"accomodate": "accommodate", "neccessary": "necessary", "untill": "until",
	"wierd": "weird", "truely": "truly", "adress": "address", "begining": "beginning",
	"enviroment": "environment", "goverment": "government", "independant": "independent",
	"succesful": "successful", "sucessful": "successful", "tommorow": "tomorrow",
	"tommorrow": "tomorrow", "langauge": "language", "grammer": "grammar",
	"writting": "writing", "reccomend": "recommend", "reccommend": "recommend",
	"publically": "publicly", "prefered": "preferred", "refered": "referred",
	"transfered": "transferred",
}

var gbToUS = map[string]string{
	"colour": "color", "colours": "colors", "favourite": "favorite", "favourites": "favorites",
	"organise": "organize", "organised": "organized", "organisation": "organization",
	"centre": "center", "centres": "centers", "defence": "defense", "programme": "program",
	"travelling": "traveling", "labelled": "labeled",
}

func invert(m map[string]string) map[string]string {
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[v] = k
	}
	return out
}

var usToGB = invert(gbToUS)

var (
	wordRe            = regexp.MustCompile(`[A-Za-z][A-Za-z'-]*`)
	fenceRe           = regexp.MustCompile("(?s)```.*?```")
	tickRe            = regexp.MustCompile("`[^`]*`")
	spaceBeforePeriod = regexp.MustCompile(`[ \t]+\.`)
	commaNoSpace      = regexp.MustCompile(`,\S`)
	doubleSpace       = regexp.MustCompile(` {2,}`)
	capitalI          = regexp.MustCompile(`\bi\b`)
	passiveRe         = regexp.MustCompile(`(?i)\b(was|were|been|being|is|are|be)\s+\w+ed\b`)
	sentenceRe        = regexp.MustCompile(`[.!?]+`)
	inOrderTo         = regexp.MustCompile(`(?i)\bin order to\b`)
	dueToFact         = regexp.MustCompile(`(?i)\bdue to the fact that\b`)
	pointInTime       = regexp.MustCompile(`(?i)\bat this point in time\b`)
	inTheEvent        = regexp.MustCompile(`(?i)\bin the event that\b`)
	largeNumber       = regexp.MustCompile(`(?i)\ba large number of\b`)
	doNeedful         = regexp.MustCompile(`(?i)\bdo the needful\b`)
	kindlyRevert      = regexp.MustCompile(`(?i)\bkindly revert( back)?\b`)
	preponeRe         = regexp.MustCompile(`(?i)\bprepone\b`)
)

func Analyze(req Request) Response {
	text := req.Text
	d := req.Dialect
	if d == "" {
		d = EnIN
	}
	dict := map[string]bool{}
	for _, w := range req.PersonalDictionary {
		dict[strings.ToLower(w)] = true
	}
	masked := maskCode(text)
	var matches []Match

	locs := wordRe.FindAllStringIndex(masked, -1)
	for i, loc := range locs {
		w := text[loc[0]:loc[1]]
		lower := strings.ToLower(w)
		if dict[lower] {
			continue
		}
		if repl, ok := typos[lower]; ok {
			cased := repl
			r, _ := utf8.DecodeRuneInString(w)
			if unicode.IsUpper(r) {
				cased = strings.ToUpper(repl[:1]) + repl[1:]
			}
			matches = append(matches, Match{
				Offset: loc[0], Length: loc[1] - loc[0], RuleID: "SPELL_" + strings.ToUpper(lower),
				Category: "spelling", Message: "Possible misspelling: “" + w + "”.",
				Explanation: "Common typo list. Add the word to your personal dictionary if it is intentional.",
				Replacements: []string{cased},
			})
		}
		if i+1 < len(locs) {
			next := text[locs[i+1][0]:locs[i+1][1]]
			if strings.EqualFold(w, next) {
				gap := text[loc[1]:locs[i+1][0]]
				if gap != "" && strings.TrimSpace(gap) == "" {
					matches = append(matches, Match{
						Offset: loc[0], Length: locs[i+1][1] - loc[0], RuleID: "GRAMMAR_DOUBLE_WORD",
						Category: "grammar", Message: "Repeated word: “" + w + " " + next + "”.",
						Explanation: "Accidental doubling is a common typing slip.",
						Replacements: []string{w},
					})
				}
			}
		}
		if lower == "a" || lower == "an" {
			if i+1 < len(locs) {
				next := text[locs[i+1][0]:locs[i+1][1]]
				needAn := vowelsAn(next)
				if lower == "a" && needAn {
					matches = append(matches, Match{Offset: loc[0], Length: loc[1] - loc[0], RuleID: "GRAMMAR_A_AN", Category: "grammar",
						Message: "Use “an” before a vowel sound.", Explanation: "The article depends on sound, not spelling (an hour, a university).", Replacements: []string{"an"}})
				}
				if lower == "an" && !needAn {
					matches = append(matches, Match{Offset: loc[0], Length: loc[1] - loc[0], RuleID: "GRAMMAR_A_AN", Category: "grammar",
						Message: "Use “a” before a consonant sound.", Explanation: "The article depends on sound, not spelling.", Replacements: []string{"a"}})
				}
			}
		}
		if d == EnUS {
			if repl, ok := gbToUS[lower]; ok {
				matches = append(matches, Match{Offset: loc[0], Length: loc[1] - loc[0], RuleID: "DIALECT_GB_SPELLING", Category: "dialect",
					Message: "US English prefers “" + repl + "”.", Explanation: "Dialect lock: American English.", Replacements: []string{repl}, Dialect: d})
			}
		}
		if d == EnGB || d == EnIN || d == EnAU {
			if repl, ok := usToGB[lower]; ok {
				matches = append(matches, Match{Offset: loc[0], Length: loc[1] - loc[0], RuleID: "DIALECT_US_SPELLING", Category: "dialect",
					Message: string(d) + " often prefers “" + repl + "”.", Explanation: "Dialect lock: British/Indian/Australian spelling.", Replacements: []string{repl}, Dialect: d})
			}
		}
	}

	addAll(&matches, masked, capitalI, "GRAMMAR_CAPITAL_I", "grammar", "Capitalize the pronoun “I”.", "English capitalizes the first-person singular pronoun.", []string{"I"}, "")
	addAll(&matches, masked, spaceBeforePeriod, "PUNCT_SPACE_BEFORE_PERIOD", "punctuation", "Remove the space before the period.", "English does not put a space before a full stop.", []string{"."}, "")
	for _, loc := range commaNoSpace.FindAllStringIndex(masked, -1) {
		if loc[0]+1 < len(text) {
			r := rune(text[loc[0]+1])
			if unicode.IsDigit(r) || r == ')' {
				continue
			}
		}
		matches = append(matches, Match{Offset: loc[0], Length: 1, RuleID: "PUNCT_COMMA_SPACE", Category: "punctuation",
			Message: "Add a space after the comma.", Explanation: "Standard English spacing after commas.", Replacements: []string{", "}})
	}
	for _, loc := range doubleSpace.FindAllStringIndex(masked, -1) {
		if loc[0] > 0 && text[loc[0]-1] == '\n' {
			continue
		}
		matches = append(matches, Match{Offset: loc[0], Length: loc[1] - loc[0], RuleID: "PUNCT_DOUBLE_SPACE", Category: "punctuation",
			Message: "Multiple spaces.", Explanation: "Collapse to a single space unless aligning text.", Replacements: []string{" "}})
	}
	addAll(&matches, masked, inOrderTo, "CLARITY_IN_ORDER_TO", "clarity", "Wordy: “in order to” → “to”.", "The extra words do not add meaning.", []string{"to"}, "")
	addAll(&matches, masked, dueToFact, "CLARITY_DUE_TO_FACT", "clarity", "Wordy: “due to the fact that” → “because”.", "A four-word phrase doing the job of one.", []string{"because"}, "")
	addAll(&matches, masked, pointInTime, "CLARITY_POINT_IN_TIME", "clarity", "Wordy: “at this point in time” → “now”.", "Cut filler temporal phrases.", []string{"now"}, "")
	addAll(&matches, masked, inTheEvent, "CLARITY_IN_THE_EVENT", "clarity", "Wordy: “in the event that” → “if”.", "Prefer a plain conditional.", []string{"if"}, "")
	addAll(&matches, masked, largeNumber, "CLARITY_LARGE_NUMBER", "clarity", "Wordy: “a large number of” → “many”.", "Shorter quantifiers are easier to read.", []string{"many"}, "")

	if d == EnIN {
		addAll(&matches, masked, doNeedful, "DIALECT_DO_THE_NEEDFUL", "dialect", "Indian English idiom. Fine for local readers; may confuse US/UK readers.", "Common in Indian professional email.", []string{"please take care of this"}, d)
		addAll(&matches, masked, kindlyRevert, "DIALECT_KINDLY_REVERT", "dialect", "In Indian English “revert” often means “reply”.", "If you mean a reply, “please reply” is unambiguous everywhere.", []string{"please reply"}, d)
		addAll(&matches, masked, preponeRe, "DIALECT_PREPONE", "dialect", "“Prepone” is standard Indian English (antonym of postpone).", "Keep for Indian readers; US/UK dictionaries still mark it as regional.", []string{"move earlier"}, d)
	} else {
		addAll(&matches, masked, doNeedful, "DIALECT_DO_THE_NEEDFUL", "dialect", "“Do the needful” is Indian English and can sound unclear internationally.", "Prefer a specific verb: approve, send, schedule, review.", []string{"please take care of this"}, d)
		addAll(&matches, masked, kindlyRevert, "DIALECT_KINDLY_REVERT", "dialect", "“Revert” here likely means “reply” (Indian English).", "Use “reply” for global audiences.", []string{"please reply"}, d)
		addAll(&matches, masked, preponeRe, "DIALECT_PREPONE", "dialect", "“Prepone” is Indian English. International equivalent: “move earlier”.", "The coinage is logical but not universal yet.", []string{"move earlier"}, d)
	}

	passiveN := 0
	for _, loc := range passiveRe.FindAllStringIndex(masked, -1) {
		passiveN++
		if passiveN <= 8 {
			matches = append(matches, Match{Offset: loc[0], Length: loc[1] - loc[0], RuleID: "STYLE_PASSIVE", Category: "tone",
				Message: "Possible passive voice.", Explanation: "Passive is fine for lab reports; active is usually clearer."})
		}
	}
	applyStyleGuide(masked, req.StyleGuide, &matches)

	wordCount := len(locs)
	sent := len(sentenceRe.FindAllStringIndex(text, -1))
	if wordCount > 0 && sent == 0 {
		sent = 1
	}
	avg := 0.0
	if sent > 0 {
		avg = float64(int(float64(wordCount)/float64(sent)*10+0.5)) / 10
	}
	syll := 0
	for _, loc := range locs {
		syll += countSyllables(text[loc[0]:loc[1]])
	}
	return Response{
		Matches: matches,
		Stats: Stats{
			WordCount: wordCount, SentenceCount: sent, AvgSentenceLength: avg,
			Readability: flesch(wordCount, max(1, sent), syll), PassiveVoiceCount: passiveN, Dialect: d,
		},
		LLM: LLMMeta{Used: false, Provider: "none", SkippedReason: "rules-only"},
	}
}

func addAll(dst *[]Match, masked string, re *regexp.Regexp, id, cat, msg, exp string, repl []string, d Dialect) {
	for _, loc := range re.FindAllStringIndex(masked, -1) {
		*dst = append(*dst, Match{Offset: loc[0], Length: loc[1] - loc[0], RuleID: id, Category: cat, Message: msg, Explanation: exp, Replacements: repl, Dialect: d})
	}
}

func maskCode(text string) string {
	b := []byte(text)
	cover := func(re *regexp.Regexp) {
		for _, loc := range re.FindAllStringIndex(text, -1) {
			for i := loc[0]; i < loc[1] && i < len(b); i++ {
				if b[i] != '\n' {
					b[i] = ' '
				}
			}
		}
	}
	cover(fenceRe)
	cover(tickRe)
	return string(b)
}

func vowelsAn(word string) bool {
	w := strings.ToLower(word)
	if strings.HasPrefix(w, "uni") || strings.HasPrefix(w, "euro") || strings.HasPrefix(w, "u.s") {
		return false
	}
	if strings.HasPrefix(w, "hour") || strings.HasPrefix(w, "honest") || strings.HasPrefix(w, "heir") {
		return true
	}
	if w == "" {
		return false
	}
	switch w[0] {
	case 'a', 'e', 'i', 'o', 'u':
		return true
	}
	return false
}

func countSyllables(word string) int {
	w := strings.ToLower(word)
	n := 0
	prevV := false
	for _, r := range w {
		v := strings.ContainsRune("aeiouy", r)
		if v && !prevV {
			n++
		}
		prevV = v
	}
	if strings.HasSuffix(w, "e") && n > 1 {
		n--
	}
	if n < 1 && utf8.RuneCountInString(w) > 0 {
		n = 1
	}
	return n
}

func flesch(words, sentences, syll int) int {
	if words == 0 || sentences == 0 {
		return 100
	}
	score := 206.835 - 1.015*(float64(words)/float64(sentences)) - 84.6*(float64(syll)/float64(words))
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return int(score + 0.5)
}

func applyStyleGuide(masked, yaml string, matches *[]Match) {
	if strings.TrimSpace(yaml) == "" {
		return
	}
	id, msg, pat := "STYLE_CUSTOM", "Style guide flag", ""
	flush := func() {
		if pat == "" {
			return
		}
		re, err := regexp.Compile("(?i)" + pat)
		if err != nil {
			return
		}
		addAll(matches, masked, re, id, "style", msg, "From your style-as-code YAML.", nil, "")
	}
	for _, raw := range strings.Split(yaml, "\n") {
		line := strings.TrimSpace(raw)
		switch {
		case strings.HasPrefix(line, "- id:"):
			flush()
			id = strings.TrimSpace(strings.TrimPrefix(line, "- id:"))
			pat = ""
		case strings.HasPrefix(line, "pattern:"):
			pat = strings.Trim(strings.TrimSpace(strings.TrimPrefix(line, "pattern:")), `"'`)
		case strings.HasPrefix(line, "message:"):
			msg = strings.Trim(strings.TrimSpace(strings.TrimPrefix(line, "message:")), `"'`)
		}
	}
	flush()
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
