// Package plagiarism runs originality/similarity checks against external
// providers so writers can find and cite sources for overlapping passages.
// It is a detection aid only — nothing here rewrites or obfuscates text.
package plagiarism

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Config is read from PLAGIARISM_PROVIDER / PLAGIARISM_API_KEY / PLAGIARISM_API_URL.
type Config struct {
	Provider string // winston | prepostseo | generic | none | "" (auto)
	APIKey   string
	APIURL   string // optional override; required for the generic provider
}

type Match struct {
	Text       string  `json:"text"`
	URL        string  `json:"url"`
	Title      string  `json:"title,omitempty"`
	Similarity float64 `json:"similarity"`
}

type Result struct {
	Score         float64 `json:"score"`
	Matches       []Match `json:"matches"`
	Provider      string  `json:"provider"`
	SkippedReason string  `json:"skippedReason,omitempty"`
}

const (
	defaultWinstonURL    = "https://api.gowinston.ai/v2/plagiarism"
	defaultPrepostseoURL = "https://www.prepostseo.com/apis/checkPlag"
	// Winston requires >=100 characters; other providers have similar floors.
	minTextLen     = 100
	requestTimeout = 90 * time.Second
)

// Configured reports whether a provider would actually run for this config.
func Configured(cfg Config) bool {
	p := resolveProvider(cfg)
	return p != "none" && cfg.APIKey != "" && (p != "generic" || cfg.APIURL != "")
}

// ResolvedProvider returns the provider name the config resolves to.
func ResolvedProvider(cfg Config) string { return resolveProvider(cfg) }

func resolveProvider(cfg Config) string {
	p := strings.ToLower(strings.TrimSpace(cfg.Provider))
	switch p {
	case "winston", "prepostseo", "generic", "none":
		return p
	case "":
		// A key with no explicit provider defaults to Winston AI (free tier).
		if cfg.APIKey != "" {
			if cfg.APIURL != "" {
				return "generic"
			}
			return "winston"
		}
		return "none"
	default:
		return "generic"
	}
}

// Check runs the configured provider. Missing configuration or too-short text
// yields a skipped Result (nil error) so callers can respond 200 gracefully;
// a non-nil error means the provider itself failed.
func Check(ctx context.Context, cfg Config, text string) (*Result, error) {
	provider := resolveProvider(cfg)
	if provider == "none" || cfg.APIKey == "" {
		return &Result{Provider: "none", Matches: []Match{}, SkippedReason: "no provider configured"}, nil
	}
	if provider == "generic" && cfg.APIURL == "" {
		return &Result{Provider: "generic", Matches: []Match{}, SkippedReason: "generic provider needs PLAGIARISM_API_URL"}, nil
	}
	if len(strings.TrimSpace(text)) < minTextLen {
		return &Result{Provider: provider, Matches: []Match{},
			SkippedReason: fmt.Sprintf("text too short — providers need at least %d characters", minTextLen)}, nil
	}
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	switch provider {
	case "winston":
		return checkWinston(ctx, cfg, text)
	case "prepostseo":
		return checkPrepostseo(ctx, cfg, text)
	default:
		return checkGeneric(ctx, cfg, text)
	}
}

// --- Winston AI (https://gowinston.ai — free credits at signup, no card) ---

func checkWinston(ctx context.Context, cfg Config, text string) (*Result, error) {
	endpoint := cfg.APIURL
	if endpoint == "" {
		endpoint = defaultWinstonURL
	}
	payload, _ := json.Marshal(map[string]string{"text": text, "language": "auto"})
	body, err := postJSON(ctx, endpoint, "Bearer "+cfg.APIKey, payload)
	if err != nil {
		return nil, fmt.Errorf("winston: %w", err)
	}
	var out struct {
		Result struct {
			Score float64 `json:"score"`
		} `json:"result"`
		Sources []struct {
			Score           float64 `json:"score"`
			URL             string  `json:"url"`
			Title           string  `json:"title"`
			PlagiarismFound []struct {
				Sequence string `json:"sequence"`
			} `json:"plagiarismFound"`
		} `json:"sources"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("winston: bad response: %w", err)
	}
	res := &Result{Score: out.Result.Score, Provider: "winston", Matches: []Match{}}
	for _, src := range out.Sources {
		if src.URL == "" {
			continue
		}
		excerpt := ""
		if len(src.PlagiarismFound) > 0 && src.PlagiarismFound[0].Sequence != "" {
			excerpt = src.PlagiarismFound[0].Sequence
		}
		res.Matches = append(res.Matches, Match{Text: excerpt, URL: src.URL, Title: src.Title, Similarity: src.Score})
	}
	return res, nil
}

// --- Prepostseo (https://www.prepostseo.com/apis — free tier) ---

func checkPrepostseo(ctx context.Context, cfg Config, text string) (*Result, error) {
	endpoint := cfg.APIURL
	if endpoint == "" {
		endpoint = defaultPrepostseoURL
	}
	form := url.Values{"key": {cfg.APIKey}, "data": {text}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("prepostseo: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	body, err := doRead(req)
	if err != nil {
		return nil, fmt.Errorf("prepostseo: %w", err)
	}
	var out struct {
		PlagPercent float64 `json:"plagPercent"`
		Details     []struct {
			Query  string `json:"query"`
			Unique string `json:"unique"`
			Webs   []struct {
				Title string `json:"title"`
				URL   string `json:"url"`
			} `json:"webs"`
		} `json:"details"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("prepostseo: bad response: %w", err)
	}
	res := &Result{Score: out.PlagPercent, Provider: "prepostseo", Matches: []Match{}}
	for _, d := range out.Details {
		if !strings.EqualFold(d.Unique, "false") || len(d.Webs) == 0 {
			continue
		}
		res.Matches = append(res.Matches, Match{Text: d.Query, URL: d.Webs[0].URL, Title: d.Webs[0].Title, Similarity: 100})
	}
	return res, nil
}

// --- Generic: POST {"text": ...} to PLAGIARISM_API_URL, expect our Result shape ---

func checkGeneric(ctx context.Context, cfg Config, text string) (*Result, error) {
	payload, _ := json.Marshal(map[string]string{"text": text})
	auth := ""
	if cfg.APIKey != "" {
		auth = "Bearer " + cfg.APIKey
	}
	body, err := postJSON(ctx, cfg.APIURL, auth, payload)
	if err != nil {
		return nil, fmt.Errorf("generic: %w", err)
	}
	var res Result
	if err := json.Unmarshal(body, &res); err != nil {
		return nil, fmt.Errorf("generic: bad response: %w", err)
	}
	res.Provider = "generic"
	if res.Matches == nil {
		res.Matches = []Match{}
	}
	return &res, nil
}

func postJSON(ctx context.Context, endpoint, auth string, payload []byte) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	return doRead(req)
}

func doRead(req *http.Request) ([]byte, error) {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		msg := strings.TrimSpace(string(body))
		if len(msg) > 300 {
			msg = msg[:300]
		}
		return nil, fmt.Errorf("provider returned %d: %s", resp.StatusCode, msg)
	}
	return body, nil
}
