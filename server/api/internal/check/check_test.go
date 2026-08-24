package check

import "testing"

func TestTyposAndArticle(t *testing.T) {
	res := Analyze(Request{Text: "I recieve teh letter and a apple."})
	foundThe, foundRecv, foundAn := false, false, false
	for _, m := range res.Matches {
		for _, r := range m.Replacements {
			if r == "the" {
				foundThe = true
			}
			if r == "receive" {
				foundRecv = true
			}
			if r == "an" {
				foundAn = true
			}
		}
	}
	if !foundThe || !foundRecv || !foundAn {
		t.Fatalf("missing expected replacements: %+v", res.Matches)
	}
}

func TestSkipsFencedCode(t *testing.T) {
	res := Analyze(Request{Text: "ok\n```\nteh teh\n```\n"})
	for _, m := range res.Matches {
		if len(m.RuleID) >= 5 && m.RuleID[:5] == "SPELL" {
			t.Fatalf("should not spellcheck inside fences: %+v", m)
		}
	}
}

func TestPrepone(t *testing.T) {
	in := Analyze(Request{Text: "Please prepone the meeting.", Dialect: EnIN})
	us := Analyze(Request{Text: "Please prepone the meeting.", Dialect: EnUS})
	if len(in.Matches) == 0 || len(us.Matches) == 0 {
		t.Fatal("expected dialect matches")
	}
}
