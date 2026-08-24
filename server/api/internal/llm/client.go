package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/checkgrammar/check-grammar/server/api/internal/config"
)

type Client struct {
	cfg        config.Config
	httpClient *http.Client
}

func New(cfg config.Config) *Client {
	return &Client{cfg: cfg, httpClient: &http.Client{Timeout: 60 * time.Second}}
}

type Result struct {
	Text     string
	Provider string
	Model    string
}

func (c *Client) Rewrite(ctx context.Context, text, instruction, dialect string, cloud bool) (Result, error) {
	base, key, model, provider := c.cfg.LLMBaseURL, c.cfg.LLMAPIKey, c.cfg.LLMModel, "local"
	if cloud {
		if c.cfg.CloudLLMBaseURL == "" || c.cfg.CloudLLMAPIKey == "" {
			return Result{}, fmt.Errorf("cloud LLM is not configured (opt-in only)")
		}
		base, key, model, provider = c.cfg.CloudLLMBaseURL, c.cfg.CloudLLMAPIKey, c.cfg.CloudLLMModel, "byok"
	}
	if strings.TrimSpace(instruction) == "" {
		instruction = "Fix grammar, spelling, and clarity. Preserve meaning. Dialect: " + dialect
	}
	body := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": "You are Check Grammar's local writing model. Return only the corrected text."},
			{"role": "user", "content": instruction + "\n\n---\n" + text},
		},
		"temperature": 0.2,
	}
	raw, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(base, "/")+"/chat/completions", bytes.NewReader(raw))
	if err != nil {
		return Result{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	if key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return Result{}, fmt.Errorf("local LLM at %s: %w (start ml/serve or llama.cpp on the host — not Docker)", base, err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return Result{}, fmt.Errorf("llm http %d: %s", resp.StatusCode, string(b))
	}
	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(b, &parsed); err != nil {
		return Result{}, err
	}
	out := ""
	if len(parsed.Choices) > 0 {
		out = parsed.Choices[0].Message.Content
	}
	return Result{Text: strings.TrimSpace(out), Provider: provider, Model: model}, nil
}
