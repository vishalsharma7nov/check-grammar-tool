package check

type Dialect string

const (
	EnUS Dialect = "en-US"
	EnGB Dialect = "en-GB"
	EnCA Dialect = "en-CA"
	EnAU Dialect = "en-AU"
	EnIN Dialect = "en-IN"
)

type Request struct {
	Text               string   `json:"text"`
	Dialect            Dialect  `json:"dialect"`
	StyleGuide         string   `json:"styleGuide"`
	PersonalDictionary []string `json:"personalDictionary"`
	IncludeLLM         bool     `json:"includeLLM"`
	Caret              int      `json:"caret"`
}

type Match struct {
	Offset       int      `json:"offset"`
	Length       int      `json:"length"`
	RuleID       string   `json:"ruleId"`
	Category     string   `json:"category"`
	Message      string   `json:"message"`
	Explanation  string   `json:"explanation"`
	Replacements []string `json:"replacements"`
	Dialect      Dialect  `json:"dialect,omitempty"`
}

type Stats struct {
	WordCount           int     `json:"wordCount"`
	SentenceCount       int     `json:"sentenceCount"`
	AvgSentenceLength   float64 `json:"avgSentenceLength"`
	Readability         float64 `json:"readability"`
	PassiveVoiceCount   int     `json:"passiveVoiceCount"`
	Dialect             Dialect `json:"dialect"`
}

type LLMMeta struct {
	Used          bool   `json:"used"`
	Provider      string `json:"provider"`
	Model         string `json:"model,omitempty"`
	SkippedReason string `json:"skippedReason,omitempty"`
}

type Response struct {
	Matches []Match `json:"matches"`
	Stats   Stats   `json:"stats"`
	LLM     LLMMeta `json:"llm"`
}
