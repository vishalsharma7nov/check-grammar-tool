package llm

import "testing"

func TestRuleVariantsReturnsGoals(t *testing.T) {
	text := "I can't do this in order to finish at this point in time."
	goals := []string{"clarity", "brevity", "formality"}
	variants := ruleVariants(text, goals)
	if len(variants) != 3 {
		t.Fatalf("expected 3 variants, got %d: %+v", len(variants), variants)
	}
	seen := map[string]bool{}
	for _, v := range variants {
		seen[v.Goal] = true
		if v.Text == "" || v.Text == text {
			t.Fatalf("expected rewritten text for %q, got %q", v.Goal, v.Text)
		}
	}
	for _, g := range goals {
		if !seen[g] {
			t.Fatalf("missing goal %q in %+v", g, variants)
		}
	}
}

func TestRewriteGoalsFromInstruction(t *testing.T) {
	goals := rewriteGoalsFromInstruction("Rewrite for clarity and brevity with formal tone")
	if len(goals) != 3 {
		t.Fatalf("expected 3 goals, got %v", goals)
	}
}
