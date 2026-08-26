/**
 * Shared corpus path for web routes and grounded generate.
 * Prefer searchOpenCorpus (wraps fuller @check-grammar/corpus seed + mini-seed fallback).
 */
export type { Citation, CorpusChunk, CorpusLicense, CorpusPassage } from "./types";
export { MINI_SEED } from "./seed";
export { searchOpenCorpus } from "./search";
export type { SearchOpenCorpusOptions } from "./search";

export {
  SEED_CORPUS,
  searchCorpus,
  researchResponse,
  filterAllowedChunks,
  isAllowedLicense,
  tokenize,
  type ResearchPassage,
  type ResearchResponse,
  type SearchCorpusOptions,
} from "@check-grammar/corpus";
