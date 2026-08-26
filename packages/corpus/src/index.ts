import seedJson from "../data/seed.json";
import { searchCorpus as searchCorpusOver, resetCorpusIndexCache } from "./search.ts";
import type {
  CorpusChunk,
  CorpusLicense,
  ResearchPassage,
  ResearchResponse,
  SearchCorpusOptions,
} from "./types.ts";
import { filterAllowedChunks, isAllowedLicense, tokenize } from "./search.ts";

export type {
  CorpusChunk,
  CorpusLicense,
  ResearchPassage,
  ResearchResponse,
  SearchCorpusOptions,
};

export {
  filterAllowedChunks,
  isAllowedLicense,
  tokenize,
  resetCorpusIndexCache,
};

/** Bundled offline seed (public-domain + CC open licenses only). */
export const SEED_CORPUS: CorpusChunk[] = filterAllowedChunks(
  seedJson as CorpusChunk[],
);

/**
 * Search the bundled open-license seed corpus.
 * Contract shared with POST /api/research.
 */
export function searchCorpus(
  query: string,
  options: SearchCorpusOptions = {},
): ResearchPassage[] {
  return searchCorpusOver(query, SEED_CORPUS, options);
}

/** Build the /api/research response body. */
export function researchResponse(
  query: string,
  options: SearchCorpusOptions = {},
): ResearchResponse {
  return {
    passages: searchCorpus(query, options),
    provider: "open-corpus",
  };
}
