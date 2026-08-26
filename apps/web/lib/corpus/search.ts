import { isAllowedLicense, searchCorpus } from "@check-grammar/corpus";
import { MINI_SEED } from "./seed";
import type { CorpusChunk, CorpusLicense, CorpusPassage } from "./types";

function asPassage(
  title: string,
  sourceUrl: string,
  license: string,
  text: string,
  score: number,
): CorpusPassage | null {
  if (!isAllowedLicense(license)) return null;
  return {
    title,
    sourceUrl,
    license: license as CorpusLicense,
    text,
    score,
  };
}

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
  /** Optional override corpus; when set, uses local lexical scoring over these chunks. */
  corpus?: CorpusChunk[];
};

/**
 * Search open-license passages for grounded drafting.
 * Prefers the fuller `@check-grammar/corpus` seed; falls back to mini-seed if needed.
 */
export function searchOpenCorpus(
  query: string,
  opts: SearchOpenCorpusOptions = {},
): CorpusPassage[] {
  const limit = Math.min(20, Math.max(1, opts.limit ?? 5));

  if (opts.corpus?.length) {
    const tokens = tokenize(query);
    if (!tokens.length) return [];
    return opts.corpus
      .map((chunk) => ({ chunk, score: scoreChunk(tokens, chunk) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ chunk, score }) =>
        asPassage(chunk.title, chunk.sourceUrl, chunk.license, chunk.text, score),
      )
      .filter((p): p is CorpusPassage => p != null);
  }

  try {
    const hits = searchCorpus(query, { limit });
    if (hits.length) {
      return hits
        .map((p) => asPassage(p.title, p.sourceUrl, p.license, p.text, p.score))
        .filter((p): p is CorpusPassage => p != null);
    }
  } catch {
    /* fuller package unavailable — mini seed below */
  }

  const tokens = tokenize(query);
  if (!tokens.length) return [];
  return MINI_SEED.map((chunk) => ({ chunk, score: scoreChunk(tokens, chunk) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chunk, score }) =>
      asPassage(chunk.title, chunk.sourceUrl, chunk.license, chunk.text, score),
    )
    .filter((p): p is CorpusPassage => p != null);
}
