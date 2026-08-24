package check

import "context"

// Analyze runs the TS privacy engine, optionally merges LanguageTool matches,
// and optionally augments with a local LLM when includeLLM is set.
func Analyze(req Request) Response {
	res, err := analyzeViaTS(req)
	if err != nil {
		d := req.Dialect
		if d == "" {
			d = EnIN
		}
		return Response{
			Matches: nil,
			Stats:   Stats{Dialect: d},
			LLM:     LLMMeta{Used: false, Provider: "none", SkippedReason: err.Error()},
		}
	}

	if lt, err := fetchLanguageTool(req.Text, req.Dialect); err == nil && len(lt) > 0 {
		res.Matches = mergeMatches(res.Matches, lt)
	} else if err != nil && languageToolURL() != "" {
		// LT configured but unreachable — keep TS results, note in LLM meta if unused.
		if !req.IncludeLLM {
			res.LLM = LLMMeta{Used: false, Provider: "none", SkippedReason: "languagetool: " + err.Error()}
		}
	}

	if req.IncludeLLM {
		augmented, meta, llmErr := augmentWithLLM(context.Background(), req.Text, req.Dialect, res.Matches)
		res.Matches = augmented
		res.LLM = meta
		if llmErr != nil && meta.SkippedReason == "" {
			res.LLM = LLMMeta{Used: false, Provider: "local", SkippedReason: llmErr.Error()}
		}
	}

	return res
}
