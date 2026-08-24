package check

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

func llmBaseURL() string {
	if u := getenv("LLM_URL", ""); u != "" {
		return strings.TrimRight(u, "/")
	}
	return strings.TrimRight(getenv("LLM_BASE_URL", ""), "/")
}

func llmModel() string {
	return getenv("LLM_MODEL", "check-gec-v0")
}

func llmAPIKey() string {
	return getenv("LLM_API_KEY", "")
}

func augmentWithLLM(ctx context.Context, text string, dialect Dialect, matches []Match) ([]Match, LLMMeta, error) {
	base := llmBaseURL()
	if base == "" {
		return matches, LLMMeta{Used: false, Provider: "none", SkippedReason: "LLM_BASE_URL not set"}, nil
	}
	instruction := "Fix grammar, spelling, and clarity. Preserve meaning. Dialect: " + string(dialect)
	corrected, model, err := callLLM(ctx, base, instruction, text)
	if err != nil {
		return matches, LLMMeta{Used: false, Provider: "local", SkippedReason: err.Error()}, err
	}
	if corrected == "" || corrected == text {
		return matches, LLMMeta{Used: true, Provider: "local", Model: model}, nil
	}
	extra := diffToMatches(text, corrected, dialect)
	extra = filterNonOverlapping(matches, extra)
	meta := LLMMeta{Used: true, Provider: "local", Model: model}
	return mergeMatches(matches, extra), meta, nil
}

func filterNonOverlapping(base, extra []Match) []Match {
	if len(extra) == 0 {
		return extra
	}
	out := make([]Match, 0, len(extra))
	for _, m := range extra {
		if overlapsAny(m, base) {
			continue
		}
		out = append(out, m)
	}
	return out
}

func overlapsAny(m Match, others []Match) bool {
	end := m.Offset + m.Length
	for _, o := range others {
		oEnd := o.Offset + o.Length
		if m.Offset < oEnd && end > o.Offset {
			return true
		}
	}
	return false
}

func callLLM(ctx context.Context, base, instruction, text string) (string, string, error) {
	model := llmModel()
	body := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": "You are Check Grammar's local writing model. Return only the corrected text."},
			{"role": "user", "content": instruction + "\n\n---\n" + text},
		},
		"temperature": 0.2,
	}
	raw, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/chat/completions", bytes.NewReader(raw))
	if err != nil {
		return "", model, err
	}
	req.Header.Set("Content-Type", "application/json")
	if key := llmAPIKey(); key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", model, fmt.Errorf("llm: %w", err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", model, fmt.Errorf("llm http %d: %s", resp.StatusCode, string(b))
	}
	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Model string `json:"model"`
	}
	if err := json.Unmarshal(b, &parsed); err != nil {
		return "", model, err
	}
	out := ""
	if len(parsed.Choices) > 0 {
		out = strings.TrimSpace(parsed.Choices[0].Message.Content)
	}
	if parsed.Model != "" {
		model = parsed.Model
	}
	return out, model, nil
}

// diffToMatches compares word tokens and emits a match per differing word.
func diffToMatches(original, corrected string, dialect Dialect) []Match {
	if original == corrected {
		return nil
	}
	orig := wordSpans(original)
	corr := wordSpans(corrected)
	var out []Match
	i, j := 0, 0
	for i < len(orig) && j < len(corr) {
		if strings.EqualFold(orig[i].text, corr[j].text) {
			i++
			j++
			continue
		}
		out = append(out, Match{
			Offset: orig[i].start, Length: orig[i].end - orig[i].start,
			RuleID: "LLM_SUGGEST", Category: "grammar",
			Message:      "LLM suggests a correction.",
			Explanation:  "From local GEC model.",
			Replacements: []string{corr[j].text},
			Dialect:      dialect,
		})
		i++
		j++
	}
	return out
}

type wordSpan struct {
	text  string
	start int
	end   int
}

func wordSpans(s string) []wordSpan {
	var out []wordSpan
	i := 0
	for i < len(s) {
		if !isWordStart(s[i]) {
			i++
			continue
		}
		start := i
		for i < len(s) && isWordChar(s[i]) {
			i++
		}
		out = append(out, wordSpan{text: s[start:i], start: start, end: i})
	}
	return out
}

func isWordStart(b byte) bool {
	return (b >= 'A' && b <= 'Z') || (b >= 'a' && b <= 'z')
}

func isWordChar(b byte) bool {
	return isWordStart(b) || b == '\'' || b == '-'
}
