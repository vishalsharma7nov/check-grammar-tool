package llm

import (
	"context"
	"testing"
)

func TestPickModelPrefersLlama(t *testing.T) {
	models := []string{"tiny:latest", "llama3.2:latest", "mistral:latest"}
	got := pickModel(models)
	if got != "llama3.2:latest" {
		t.Fatalf("expected llama3.2:latest, got %q", got)
	}
}

func TestParseGrammarResponseJSON(t *testing.T) {
	raw := `{"corrected":"Hello.","changes":[{"from":"Helo","to":"Hello","category":"spelling","message":"typo"}]}`
	corrected, changes, ok := ParseGrammarResponse(raw)
	if !ok || corrected != "Hello." || len(changes) != 1 {
		t.Fatalf("unexpected parse: %q %+v %v", corrected, changes, ok)
	}
}

func TestParseGrammarResponseFence(t *testing.T) {
	raw := "```json\n{\"corrected\":\"Hi.\",\"changes\":[]}\n```"
	_, _, ok := ParseGrammarResponse(raw)
	if !ok {
		t.Fatal("expected fenced JSON to parse")
	}
}

func TestResolveBaseURLPrefersConfiguredWhenUnreachable(t *testing.T) {
	ctx := context.Background()
	got := ResolveBaseURL(ctx, "http://127.0.0.1:59999/v1")
	if got != "http://127.0.0.1:59999/v1" {
		t.Fatalf("expected configured base when nothing reachable, got %q", got)
	}
}
