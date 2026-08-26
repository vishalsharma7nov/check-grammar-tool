import type {
  CorpusChunk,
  CorpusLicense,
  ResearchPassage,
  SearchCorpusOptions,
} from "./types.ts";

const ALLOWED_LICENSES: ReadonlySet<CorpusLicense> = new Set([
  "public-domain",
  "CC0",
  "CC-BY",
  "CC-BY-SA",
]);

const BM25_K1 = 1.2;
const BM25_B = 0.75;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/[\s'-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function isAllowedLicense(license: string): license is CorpusLicense {
  return ALLOWED_LICENSES.has(license as CorpusLicense);
}

export function filterAllowedChunks(chunks: CorpusChunk[]): CorpusChunk[] {
  return chunks.filter(
    (c) =>
      isAllowedLicense(c.license) &&
      typeof c.text === "string" &&
      c.text.trim().length > 0 &&
      typeof c.id === "string" &&
      c.id.length > 0,
  );
}

interface IndexedDoc {
  chunk: CorpusChunk;
  tf: Map<string, number>;
  length: number;
}

interface CorpusIndex {
  docs: IndexedDoc[];
  df: Map<string, number>;
  avgdl: number;
  n: number;
}

function buildIndex(chunks: CorpusChunk[]): CorpusIndex {
  const docs: IndexedDoc[] = [];
  const df = new Map<string, number>();
  let totalLen = 0;

  for (const chunk of chunks) {
    const bag = [
      ...tokenize(chunk.text),
      ...tokenize(chunk.title),
      ...chunk.topics.flatMap((t) => tokenize(t)),
    ];
    const tf = new Map<string, number>();
    for (const term of bag) {
      tf.set(term, (tf.get(term) ?? 0) + 1);
    }
    for (const term of tf.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
    const length = bag.length || 1;
    totalLen += length;
    docs.push({ chunk, tf, length });
  }

  const n = docs.length || 1;
  return { docs, df, avgdl: totalLen / n, n };
}

function idf(term: string, index: CorpusIndex): number {
  const df = index.df.get(term) ?? 0;
  // BM25+ style smooth IDF; avoids negative scores for very common terms
  return Math.log(1 + (index.n - df + 0.5) / (df + 0.5));
}

function bm25Score(queryTerms: string[], doc: IndexedDoc, index: CorpusIndex): number {
  if (queryTerms.length === 0) return 0;
  let score = 0;
  const unique = new Set(queryTerms);
  for (const term of unique) {
    const f = doc.tf.get(term) ?? 0;
    if (f === 0) continue;
    const termIdf = idf(term, index);
    const denom =
      f + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / index.avgdl));
    score += termIdf * ((f * (BM25_K1 + 1)) / denom);
  }
  // Light topic/title boost when exact topic token matches
  for (const topic of doc.chunk.topics) {
    const topicTokens = tokenize(topic);
    if (topicTokens.some((t) => unique.has(t))) {
      score += 0.35;
    }
  }
  return score;
}

let cachedIndex: CorpusIndex | null = null;
let cachedSource: CorpusChunk[] | null = null;

function getIndex(chunks: CorpusChunk[]): CorpusIndex {
  if (cachedIndex && cachedSource === chunks) return cachedIndex;
  const allowed = filterAllowedChunks(chunks);
  cachedIndex = buildIndex(allowed);
  cachedSource = chunks;
  return cachedIndex;
}

/** Reset memoized index (for tests). */
export function resetCorpusIndexCache(): void {
  cachedIndex = null;
  cachedSource = null;
}

/**
 * Rank license-safe corpus passages for a query using BM25-style lexical scoring.
 * Embedding-free and Vercel-friendly (no vector DB).
 */
export function searchCorpus(
  query: string,
  chunks: CorpusChunk[],
  options: SearchCorpusOptions = {},
): ResearchPassage[] {
  const limitRaw = options.limit ?? 5;
  const limit = Math.min(20, Math.max(1, Math.floor(Number(limitRaw) || 5)));
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) return [];

  const queryTerms = tokenize(q);
  if (queryTerms.length === 0) return [];

  const index = getIndex(chunks);
  const scored: ResearchPassage[] = [];

  for (const doc of index.docs) {
    const score = bm25Score(queryTerms, doc, index);
    if (score <= 0) continue;
    scored.push({
      title: doc.chunk.title,
      sourceUrl: doc.chunk.sourceUrl,
      license: doc.chunk.license,
      text: doc.chunk.text,
      score: Math.round(score * 1000) / 1000,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return scored.slice(0, limit);
}
