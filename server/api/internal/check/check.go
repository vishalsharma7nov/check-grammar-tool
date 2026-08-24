package check

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
	Caret              *int     `json:"caret,omitempty"`
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

// Analyze delegates to the TypeScript privacy engine (server/shim/check-cli.mjs).
func Analyze(req Request) Response {
	res, err := analyzeViaTS(req)
	if err != nil {
		d := req.Dialect
		if d == "" {
			d = EnIN
		}
		return Response{
			Matches: nil,
			Stats:   Stats{Dialect: d},
			LLM:     LLMMeta{Used: false, Provider: "none", SkippedReason: err.Error()},
		}
	}
	return res
}
