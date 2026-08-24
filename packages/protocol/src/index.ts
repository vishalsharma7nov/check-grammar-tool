/** Shared /v1/check contract. Keep in sync with server/api/api/openapi.yaml */

export type Dialect = "en-US" | "en-GB" | "en-CA" | "en-AU" | "en-IN";

export type Category =
  | "spelling"
  | "grammar"
  | "punctuation"
  | "clarity"
  | "style"
  | "dialect"
  | "tone";

export type CheckMode = "privacy" | "local" | "hosted";

export interface CheckGoals {
  audience?: string;
  formality?: "casual" | "neutral" | "formal";
  intent?: "email" | "essay" | "chat" | "pr" | "commit" | "other";
}

export interface CheckRequest {
  text: string;
  dialect?: Dialect;
  mode?: CheckMode;
  goals?: CheckGoals;
  personalDictionary?: string[];
  styleGuide?: string;
  includeLLM?: boolean;
  /** If set, skip the word the user is still typing (caret strictly inside it). */
  caret?: number;
}

export interface Match {
  offset: number;
  length: number;
  ruleId: string;
  category: Category;
  message: string;
  explanation: string;
  replacements: string[];
  dialect?: Dialect;
}

export interface DocumentStats {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  readability: number;
  passiveVoiceCount: number;
  dialect: Dialect;
}

export interface LLMMeta {
  used: boolean;
  provider: "none" | "local" | "hosted" | "byok" | "ollama";
  model?: string;
  skippedReason?: string;
}

export interface CheckResponse {
  matches: Match[];
  stats: DocumentStats;
  llm: LLMMeta;
}

export interface RewriteRequest {
  text: string;
  instruction?: string;
  dialect?: Dialect;
}

export type RewriteGoal = "clarity" | "brevity" | "formality";

export interface RewriteVariant {
  goal: RewriteGoal;
  text: string;
}

export interface RewriteResponse {
  text: string;
  provider: LLMMeta["provider"] | "ollama" | "rules";
  model?: string;
  variants?: RewriteVariant[];
}

export interface PlagiarismRequest {
  text: string;
}

/** A passage that overlaps with a published source. */
export interface PlagiarismMatch {
  /** The overlapping passage from the checked text (may be empty if the provider only reports the source). */
  text: string;
  /** URL of the matching source, so the writer can review and cite it. */
  url: string;
  /** Title of the matching source page/document. */
  title?: string;
  /** 0–100: how much of the text overlaps with this source. */
  similarity: number;
}

/**
 * Result of an originality/similarity check. Intended to help writers find
 * and cite sources for overlapping passages — not to evade detection.
 */
export interface PlagiarismResult {
  /** 0–100: percentage of the text that matches published sources. */
  score: number;
  matches: PlagiarismMatch[];
  /** Which provider produced the result: "winston" | "prepostseo" | "generic" | "none". */
  provider: string;
  /** Set (with an empty result) when the check was skipped, e.g. "no provider configured". */
  skippedReason?: string;
}

export interface NextWordSuggestion {
  token: string;
  kind: "next" | "complete";
  hint: string;
}

export interface WordInsight {
  word: string;
  synonyms: string[];
  example?: string;
  note?: string;
}

export interface WritingTip {
  id: string;
  title: string;
  detail: string;
}

export interface WritingHelp {
  next: NextWordSuggestion[];
  insight?: WordInsight;
  tips: WritingTip[];
}
