package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/checkgrammar/check-grammar/server/api/internal/config"
)

type Client struct {
	cfg        config.Config
	httpClient *http.Client
}

func New(cfg config.Config) *Client {
	return &Client{cfg: cfg, httpClient: &http.Client{Timeout: 90 * time.Second}}
}

type Result struct {
	Text     string
	Provider string
	Model    string
	Variants []Variant
}

func (c *Client) status(ctx context.Context) Status {
	return Detect(ctx, c.cfg.LLMBaseURL)
}

func (c *Client) effectiveBase(ctx context.Context) string {
	return ResolveBaseURL(ctx, c.cfg.LLMBaseURL)
}

func (c *Client) effectiveModel(status Status) string {
	return EffectiveModel(c.cfg.LLMModel, status)
}

func (c *Client) providerLabel(status Status) string {
	if status.Backend == "ollama" {
		return "ollama"
	}
	return "local"
}

func (c *Client) Rewrite(ctx context.Context, text, instruction, dialect string, cloud bool) (Result, error) {
	variants, err := c.RewriteVariants(ctx, text, instruction, dialect, cloud)
	if err != nil {
		return Result{}, err
	}
	if len(variants) == 0 {
		return Result{}, fmt.Errorf("no rewrite variants")
	}
	status := c.status(ctx)
	return Result{
		Text:     variants[0].Text,
		Provider: c.providerLabel(status),
		Model:    c.effectiveModel(status),
		Variants: variants,
	}, nil
}

func (c *Client) RewriteVariants(ctx context.Context, text, instruction, dialect string, cloud bool) ([]Variant, error) {
	base, key, model, provider := c.cfg.LLMBaseURL, c.cfg.LLMAPIKey, c.cfg.LLMModel, "local"
	if cloud {
		if c.cfg.CloudLLMBaseURL == "" || c.cfg.CloudLLMAPIKey == "" {
			return nil, fmt.Errorf("cloud LLM is not configured (opt-in only)")
		}
		base, key, model, provider = c.cfg.CloudLLMBaseURL, c.cfg.CloudLLMAPIKey, c.cfg.CloudLLMModel, "byok"
	} else {
		status := c.status(ctx)
		base = c.effectiveBase(ctx)
		model = c.effectiveModel(status)
		provider = c.providerLabel(status)
		_ = provider
	}

	goals := rewriteGoalsFromInstruction(instruction)
	llmUp := ProbeBridge(ctx, base) || DetectOllama(ctx).Available
	if llmUp {
		goals = []string{"clarity", "brevity", "formality"}
	} else if len(goals) == 0 {
		goals = []string{"clarity"}
	}

	if !llmUp {
		return ruleVariants(text, goals), nil
	}

	var out []Variant
	for _, goal := range goals {
		prompt := RewriteGoalPrompt(goal)
		if len(goals) == 1 && strings.TrimSpace(instruction) != "" {
			prompt = instruction
		}
		rewritten, usedModel, err := c.chat(ctx, base, key, model, prompt, text, dialect)
		if err != nil {
			continue
		}
		model = usedModel
		if err := ValidateVariant(text, rewritten); err != nil {
			if fallback := ruleRewrite(text, goal); fallback != text {
				out = append(out, Variant{Goal: goal, Text: fallback})
			}
			continue
		}
		out = append(out, Variant{Goal: goal, Text: rewritten})
	}
	if len(out) == 0 {
		return ruleVariants(text, goals), nil
	}
	return out, nil
}

func (c *Client) chat(ctx context.Context, base, key, model, instruction, text, dialect string) (string, string, error) {
	if strings.TrimSpace(instruction) == "" {
		instruction = "Fix grammar, spelling, and clarity. Preserve meaning. Dialect: " + dialect
	}
	body := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": RewriteSystemPrompt()},
			{"role": "user", "content": instruction + "\n\n---\n" + text},
		},
		"temperature": 0.35,
	}
	raw, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(base, "/")+"/chat/completions", bytes.NewReader(raw))
	if err != nil {
		return "", model, err
	}
	req.Header.Set("Content-Type", "application/json")
	if key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", model, fmt.Errorf("local LLM at %s: %w (start ml/serve or Ollama on the host — not Docker)", base, err)
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
		out = parsed.Choices[0].Message.Content
	}
	if parsed.Model != "" {
		model = parsed.Model
	}
	return strings.TrimSpace(out), model, nil
}

var goalPattern = regexp.MustCompile(`(?i)\b(clarity|brevity|formal(?:ity| tone)?)\b`)

func rewriteGoalsFromInstruction(instruction string) []string {
	if instruction == "" {
		return nil
	}
	seen := map[string]bool{}
	var goals []string
	for _, m := range goalPattern.FindAllStringSubmatch(instruction, -1) {
		g := strings.ToLower(m[1])
		if strings.HasPrefix(g, "formal") {
			g = "formality"
		}
		if seen[g] {
			continue
		}
		seen[g] = true
		goals = append(goals, g)
	}
	return goals
}

func ruleVariants(text string, goals []string) []Variant {
	var out []Variant
	for _, g := range goals {
		if t := ruleRewrite(text, g); t != "" {
			out = append(out, Variant{Goal: g, Text: t})
		}
	}
	return out
}

func ruleRewrite(text, goal string) string {
	out := text
	switch goal {
	case "clarity":
		out = applyRules(out, wordyRules)
	case "brevity":
		out = applyRules(out, append(wordyRules, briefRules...))
	case "formality":
		out = applyRules(out, append(contractionRules, wordyRules...))
		out = regexp.MustCompile(`(?i)\b(hey|yeah|gonna|wanna|kinda)\b`).ReplaceAllString(out, "")
	}
	out = strings.TrimSpace(regexp.MustCompile(`  +`).ReplaceAllString(out, " "))
	if out == "" {
		return text
	}
	return out
}

type rulePair struct {
	re   *regexp.Regexp
	repl string
}

var (
	wordyRules = []rulePair{
		{regexp.MustCompile(`(?i)\bin order to\b`), "to"},
		{regexp.MustCompile(`(?i)\bdue to the fact that\b`), "because"},
		{regexp.MustCompile(`(?i)\bat this point in time\b`), "now"},
	}
	briefRules = []rulePair{
		{regexp.MustCompile(`(?i)\bvery\s+(\w+)\b`), "$1"},
		{regexp.MustCompile(`(?i)\breally\s+(\w+)\b`), "$1"},
		{regexp.MustCompile(`(?i)\bactually\b`), ""},
	}
	contractionRules = []rulePair{
		{regexp.MustCompile(`(?i)\bdon't\b`), "do not"},
		{regexp.MustCompile(`(?i)\bcan't\b`), "cannot"},
		{regexp.MustCompile(`(?i)\bwon't\b`), "will not"},
		{regexp.MustCompile(`(?i)\bit's\b`), "it is"},
		{regexp.MustCompile(`(?i)\bI'm\b`), "I am"},
	}
)

func applyRules(text string, rules []rulePair) string {
	out := text
	for _, r := range rules {
		out = r.re.ReplaceAllString(out, r.repl)
	}
	return out
}
