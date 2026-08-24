package check

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type ltResponse struct {
	Matches []ltMatch `json:"matches"`
}

type ltMatch struct {
	Message      string        `json:"message"`
	ShortMessage string        `json:"shortMessage"`
	Offset       int           `json:"offset"`
	Length       int           `json:"length"`
	Replacements []ltReplace   `json:"replacements"`
	Rule         ltRule        `json:"rule"`
}

type ltReplace struct {
	Value string `json:"value"`
}

type ltRule struct {
	ID          string    `json:"id"`
	Description string    `json:"description"`
	Category    ltCategory `json:"category"`
}

type ltCategory struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func languageToolURL() string {
	return strings.TrimRight(strings.TrimSpace(getenv("LANGUAGETOOL_URL", "")), "/")
}

func dialectToLT(d Dialect) string {
	if d == "" {
		return "en-US"
	}
	return string(d)
}

func ltCategoryName(c ltCategory) string {
	if c.Name != "" {
		return c.Name
	}
	return c.ID
}

func mapLTCategory(name string) string {
	n := strings.ToLower(name)
	switch {
	case strings.Contains(n, "spell"), strings.Contains(n, "typo"):
		return "spelling"
	case strings.Contains(n, "punct"):
		return "punctuation"
	case strings.Contains(n, "style"), strings.Contains(n, "redund"):
		return "clarity"
	case strings.Contains(n, "tone"):
		return "tone"
	default:
		return "grammar"
	}
}

// MergeStrategy controls how TS and LanguageTool matches at the same offset are combined.
type MergeStrategy string

const (
	MergeSkipDupes       MergeStrategy = "skip_dupes"
	MergePreferLTGrammar MergeStrategy = "prefer_lt_grammar"
)

func mergeStrategy() MergeStrategy {
	switch strings.ToLower(strings.TrimSpace(getenv("LT_MERGE_STRATEGY", "prefer_lt_grammar"))) {
	case "skip_dupes", "dedupe":
		return MergeSkipDupes
	default:
		return MergePreferLTGrammar
	}
}

// ProbeLanguageTool checks whether the configured LanguageTool endpoint responds.
func ProbeLanguageTool() (bool, error) {
	base := languageToolURL()
	if base == "" {
		return false, nil
	}
	req, err := http.NewRequest(http.MethodGet, base+"/v2/languages", nil)
	if err != nil {
		return false, err
	}
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("languagetool: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return false, fmt.Errorf("languagetool http %d: %s", resp.StatusCode, string(body))
	}
	return true, nil
}

func fetchLanguageTool(text string, dialect Dialect) ([]Match, error) {
	base := languageToolURL()
	if base == "" {
		return nil, nil
	}
	form := url.Values{}
	form.Set("text", text)
	form.Set("language", dialectToLT(dialect))
	req, err := http.NewRequest(http.MethodPost, base+"/v2/check", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("languagetool: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("languagetool http %d: %s", resp.StatusCode, string(body))
	}
	var parsed ltResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	out := make([]Match, 0, len(parsed.Matches))
	for _, m := range parsed.Matches {
		reps := make([]string, 0, len(m.Replacements))
		for _, r := range m.Replacements {
			if r.Value != "" {
				reps = append(reps, r.Value)
			}
		}
		msg := m.Message
		if msg == "" {
			msg = m.ShortMessage
		}
		catName := ltCategoryName(m.Rule.Category)
		out = append(out, Match{
			Offset:       m.Offset,
			Length:       m.Length,
			RuleID:       "LT_" + m.Rule.ID,
			Category:     mapLTCategory(catName),
			Message:      msg,
			Explanation:  m.Rule.Description,
			Replacements: reps,
			Dialect:      dialect,
		})
	}
	return out, nil
}

func mergeMatches(base, extra []Match) []Match {
	return mergeMatchesWithStrategy(base, extra, mergeStrategy())
}

func mergeMatchesWithStrategy(base, extra []Match, strategy MergeStrategy) []Match {
	if len(extra) == 0 {
		return base
	}
	if strategy == MergeSkipDupes {
		return mergeSkipDupes(base, extra)
	}
	return mergePreferLTGrammar(base, extra)
}

func mergeSkipDupes(base, extra []Match) []Match {
	offsets := make(map[int]struct{}, len(base))
	for _, m := range base {
		offsets[m.Offset] = struct{}{}
	}
	out := make([]Match, len(base), len(base)+len(extra))
	copy(out, base)
	for _, m := range extra {
		if _, dup := offsets[m.Offset]; dup {
			continue
		}
		out = append(out, m)
		offsets[m.Offset] = struct{}{}
	}
	return out
}

func mergePreferLTGrammar(base, extra []Match) []Match {
	out := make([]Match, len(base))
	copy(out, base)
	offsetIndex := make(map[int]int, len(base))
	for i, m := range out {
		offsetIndex[m.Offset] = i
	}
	for _, m := range extra {
		if idx, dup := offsetIndex[m.Offset]; dup {
			if m.Category == "grammar" && strings.HasPrefix(m.RuleID, "LT_") {
				out[idx] = m
			}
			continue
		}
		out = append(out, m)
		offsetIndex[m.Offset] = len(out) - 1
	}
	return out
}
