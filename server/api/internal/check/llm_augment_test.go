package check

import (
	"encoding/json"
	"testing"

	"github.com/checkgrammar/check-grammar/server/api/internal/llm"
)

func TestParseGrammarJSONToMatches(t *testing.T) {
	raw := `{"corrected":"I receive the letter.","changes":[{"from":"recieve","to":"receive","category":"spelling","message":"Misspelling"},{"from":"teh","to":"the","category":"spelling","message":"Common typo"}]}`
	corrected, changes, ok := llm.ParseGrammarResponse(raw)
	if !ok || corrected == "" {
		t.Fatal("expected parsed JSON")
	}
	m := changesToMatches("I recieve teh letter.", changes, EnUS)
	if len(m) < 2 {
		t.Fatalf("expected at least 2 matches, got %d: %+v", len(m), m)
	}
}

func TestChangesToMatchesFindsOffsets(t *testing.T) {
	changes := []llm.Correction{
		{From: "teh", To: "the", Category: "spelling", Message: "typo"},
	}
	m := changesToMatches("Fix teh bug.", changes, EnUS)
	if len(m) != 1 || m[0].Offset != 4 {
		t.Fatalf("unexpected match: %+v", m)
	}
}

func TestParseGrammarResponsePlainText(t *testing.T) {
	corrected, changes, ok := llm.ParseGrammarResponse("I receive the letter.")
	if ok || len(changes) != 0 {
		t.Fatalf("expected plain text fallback, got ok=%v changes=%+v", ok, changes)
	}
	if corrected != "I receive the letter." {
		t.Fatalf("unexpected corrected: %q", corrected)
	}
}

func TestParseGrammarResponseStripsFence(t *testing.T) {
	raw := "```json\n" + `{"corrected":"Hello world.","changes":[]}` + "\n```"
	_, _, ok := llm.ParseGrammarResponse(raw)
	if !ok {
		t.Fatal("expected fenced JSON to parse")
	}
}

func TestAugmentJSONRoundTrip(t *testing.T) {
	var payload grammarFixture
	_ = json.Unmarshal([]byte(`{"corrected":"She ate an apple.","changes":[{"from":"a apple","to":"an apple","category":"grammar","message":"Article"}]}`), &payload)
	m := changesToMatches("She ate a apple.", payload.Changes, EnIN)
	if len(m) != 1 {
		t.Fatalf("expected 1 match, got %+v", m)
	}
}

type grammarFixture struct {
	Corrected string            `json:"corrected"`
	Changes   []llm.Correction  `json:"changes"`
}
