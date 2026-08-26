import { MINI_SEED } from "./seed";
import type { CorpusChunk, CorpusPassage } from "./types";

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "as",
  "by",
  "at",
  "from",
  "that",
  "this",
  "it",
  "its",
  "into",
  "about",
  "over",
  "under",
]);

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function scoreChunk(tokens: string[], chunk: CorpusChunk): number {
  if (!tokens.length) return 0;
  const hay = `${chunk.title} ${chunk.topics.join(" ")} ${chunk.text}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (chunk.topics.some((topic) => topic.toLowerCase().includes(t) || t.includes(topic.toLowerCase()))) {
      score += 3;
    }
    if (chunk.title.toLowerCase().includes(t)) score += 2;
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const hits = hay.match(re);
    if (hits) score += hits.length;
  }
  return score;
}

export type SearchOpenCorpusOptions = {
  limit?: number;
  /** Optional fuller corpus; defaults to mini seed. */
  corpus?: CorpusChunk[];
};

/**
 * Lexical search over the open-license seed corpus (Vercel-friendly, no vector DB).
 * Other agents may replace the seed with a larger curated set under the same path.
 */
export function searchOpenCorpus(
  query: string,
  opts: SearchOpenCorpusOptions = {},
): CorpusPassage[] {
  const limit = Math.min(20, Math.max(1, opts.limit ?? 5));
  const corpus = opts.corpus?.length ? opts.corpus : MINI_SEED;
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const ranked = corpus
    .map((chunk) => ({ chunk, score: scoreChunk(tokens, chunk) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ chunk, score }) => ({
    title: chunk.title,
    sourceUrl: chunk.sourceUrl,
    license: chunk.license,
    text: chunk.text,
    score,
  }));
}
