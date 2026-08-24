package check

import "testing"

func TestMergeMatchesDedupesByOffset(t *testing.T) {
	base := []Match{{Offset: 0, Length: 3, RuleID: "SPELL_TEH", Category: "spelling", Message: "typo"}}
	extra := []Match{
		{Offset: 0, Length: 3, RuleID: "LT_TYPO", Category: "spelling", Message: "LT"},
		{Offset: 10, Length: 5, RuleID: "LT_OTHER", Category: "grammar", Message: "other"},
	}
	merged := mergeMatches(base, extra)
	if len(merged) != 2 {
		t.Fatalf("expected 2 matches, got %d: %+v", len(merged), merged)
	}
	if merged[1].Offset != 10 {
		t.Fatalf("expected LT match at offset 10, got %+v", merged[1])
	}
}

func TestDiffToMatches(t *testing.T) {
	m := diffToMatches("I recieve teh letter.", "I receive the letter.", EnUS)
	if len(m) == 0 {
		t.Fatal("expected diff matches")
	}
	for _, match := range m {
		if len(match.Replacements) == 0 {
			t.Fatalf("expected replacement, got %+v", match)
		}
	}
}
