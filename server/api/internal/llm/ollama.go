package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

const defaultOllamaBase = "http://127.0.0.1:11434"

var preferredModels = []string{
	"llama3.2", "llama3.2:latest",
	"mistral", "mistral:latest",
	"llama3", "llama3:latest",
	"gemma2", "gemma2:latest",
}

// Status describes whether a local LLM backend is reachable.
type Status struct {
	Available bool     `json:"llmAvailable"`
	Backend   string   `json:"llmBackend"` // ollama | bridge | none
	BaseURL   string   `json:"llmBaseUrl"`
	Model     string   `json:"llmModel,omitempty"`
	Models    []string `json:"llmModels,omitempty"`
}

type tagsResponse struct {
	Models []struct {
		Name string `json:"name"`
	} `json:"models"`
}

// OllamaBaseURL returns OLLAMA_BASE_URL or the default local address.
func OllamaBaseURL() string {
	if u := strings.TrimSpace(os.Getenv("OLLAMA_BASE_URL")); u != "" {
		return strings.TrimRight(u, "/")
	}
	return defaultOllamaBase
}

// DetectOllama probes /api/tags and picks a model.
func DetectOllama(ctx context.Context) Status {
	base := OllamaBaseURL()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/api/tags", nil)
	if err != nil {
		return Status{Available: false, Backend: "none", BaseURL: base}
	}
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return Status{Available: false, Backend: "none", BaseURL: base}
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return Status{Available: false, Backend: "none", BaseURL: base}
	}
	var parsed tagsResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return Status{Available: false, Backend: "none", BaseURL: base}
	}
	names := make([]string, 0, len(parsed.Models))
	for _, m := range parsed.Models {
		if m.Name != "" {
			names = append(names, m.Name)
		}
	}
	if len(names) == 0 {
		return Status{Available: false, Backend: "none", BaseURL: base}
	}
	return Status{
		Available: true,
		Backend:   "ollama",
		BaseURL:   base,
		Model:     pickModel(names),
		Models:    names,
	}
}

func pickModel(models []string) string {
	env := strings.TrimSpace(os.Getenv("OLLAMA_MODEL"))
	if env == "" {
		env = strings.TrimSpace(os.Getenv("LLM_MODEL"))
	}
	if env != "" {
		for _, name := range models {
			if name == env || strings.HasPrefix(name, env+":") {
				return name
			}
		}
		stem := strings.Split(env, ":")[0]
		for _, name := range models {
			if name == stem || strings.HasPrefix(name, stem+":") {
				return name
			}
		}
	}
	for _, pref := range preferredModels {
		stem := strings.Split(pref, ":")[0]
		for _, name := range models {
			if name == pref || strings.HasPrefix(name, stem+":") {
				return name
			}
		}
	}
	return models[0]
}

// ProbeBridge checks whether LLM_BASE_URL responds like an OpenAI-compatible server.
func ProbeBridge(ctx context.Context, baseURL string) bool {
	base := strings.TrimRight(baseURL, "/")
	for _, path := range []string{"/models", "/healthz"} {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+path, nil)
		if err != nil {
			continue
		}
		client := &http.Client{Timeout: 2 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()
		if resp.StatusCode < 300 {
			return true
		}
	}
	return false
}

// Detect picks the best available local LLM backend.
func Detect(ctx context.Context, bridgeURL string) Status {
	if ollama := DetectOllama(ctx); ollama.Available {
		return ollama
	}
	base := strings.TrimRight(bridgeURL, "/")
	if ProbeBridge(ctx, base) {
		model := strings.TrimSpace(os.Getenv("LLM_MODEL"))
		if model == "" {
			model = "check-gec-v0"
		}
		return Status{
			Available: true,
			Backend:   "bridge",
			BaseURL:   base,
			Model:     model,
		}
	}
	return Status{Available: false, Backend: "none", BaseURL: base}
}

// EffectiveBaseURL returns LLM_BASE_URL when set, otherwise Ollama's OpenAI endpoint.
func EffectiveBaseURL(cfgBase string) string {
	if u := strings.TrimRight(strings.TrimSpace(cfgBase), "/"); u != "" {
		return u
	}
	return OllamaBaseURL() + "/v1"
}

// ResolveBaseURL picks a reachable OpenAI-compatible endpoint: configured bridge if up,
// else Ollama when available, else the configured URL anyway.
func ResolveBaseURL(ctx context.Context, configuredBase string) string {
	cfg := strings.TrimRight(strings.TrimSpace(configuredBase), "/")
	if cfg != "" && ProbeBridge(ctx, cfg) {
		return cfg
	}
	if ollama := DetectOllama(ctx); ollama.Available {
		return ollama.BaseURL + "/v1"
	}
	if cfg != "" {
		return cfg
	}
	return EffectiveBaseURL("")
}

// EffectiveModel returns the configured model or the auto-detected Ollama model.
func EffectiveModel(cfgModel string, status Status) string {
	if m := strings.TrimSpace(cfgModel); m != "" && m != "check-gec-v0" {
		return m
	}
	if status.Model != "" {
		return status.Model
	}
	return "llama3.2"
}

// GrammarSystemPrompt is used for GEC / check augmentation.
func GrammarSystemPrompt() string {
	return `You are an expert English grammar, spelling, and clarity checker.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{"corrected":"<full corrected text>","changes":[{"from":"<exact substring in original>","to":"<replacement>","category":"spelling|grammar|clarity|punctuation","message":"<brief reason>"}]}

Rules:
- Preserve meaning and voice unless fixing errors.
- "from" must match the original text exactly (case-sensitive).
- If no changes are needed, return {"corrected":"<original>","changes":[]}.
- Follow the requested dialect (en-US, en-GB, en-IN, etc.).`
}

// RewriteSystemPrompt is used for rewrite requests.
func RewriteSystemPrompt() string {
	return `You are Check Grammar's local writing assistant.

Return ONLY the rewritten text — no quotes, labels, markdown, or explanation.
Preserve factual meaning. Apply the user's rewrite goal precisely.`
}

// RewriteGoalPrompt returns a goal-specific user instruction.
func RewriteGoalPrompt(goal string) string {
	switch strings.ToLower(strings.TrimSpace(goal)) {
	case "clarity":
		return "Rewrite for clarity. Use plain, direct language. Preserve meaning."
	case "brevity":
		return "Rewrite to be more concise. Remove filler words. Preserve meaning."
	case "formality":
		return "Rewrite in a formal, professional tone. Preserve meaning."
	default:
		return goal
	}
}

// ParseGrammarResponse extracts corrected text and structured changes from LLM output.
func ParseGrammarResponse(raw string) (corrected string, changes []Correction, usedJSON bool) {
	raw = stripMarkdownFence(strings.TrimSpace(raw))
	var parsed grammarJSON
	if err := json.Unmarshal([]byte(raw), &parsed); err == nil && parsed.Corrected != "" {
		return parsed.Corrected, parsed.Changes, true
	}
	return raw, nil, false
}

type Correction struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Category string `json:"category"`
	Message  string `json:"message"`
}

type grammarJSON struct {
	Corrected string       `json:"corrected"`
	Changes   []Correction `json:"changes"`
}

func stripMarkdownFence(s string) string {
	if !strings.HasPrefix(s, "```") {
		return s
	}
	lines := strings.Split(s, "\n")
	if len(lines) < 2 {
		return s
	}
	end := len(lines) - 1
	if strings.HasPrefix(lines[end], "```") {
		return strings.TrimSpace(strings.Join(lines[1:end], "\n"))
	}
	return s
}

// Variant is one rewrite style (clarity, brevity, formality).
type Variant struct {
	Goal string `json:"goal"`
	Text string `json:"text"`
}

// ValidateVariant ensures rewrite output is non-empty and not a copy of input.
func ValidateVariant(input, output string) error {
	out := strings.TrimSpace(output)
	if out == "" {
		return fmt.Errorf("empty rewrite")
	}
	if out == strings.TrimSpace(input) {
		return fmt.Errorf("unchanged rewrite")
	}
	return nil
}
