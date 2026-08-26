/** Allowed open licenses for seed corpus chunks (citation-required research). */
export type CorpusLicense =
  | "public-domain"
  | "CC0"
  | "CC-BY"
  | "CC-BY-SA";

/** One passage in the offline open-license seed corpus. */
export interface CorpusChunk {
  id: string;
  title: string;
  sourceUrl: string;
  license: CorpusLicense;
  licenseNote: string;
  text: string;
  topics: string[];
}

/** Ranked hit returned by searchCorpus / POST /api/research. */
export interface ResearchPassage {
  title: string;
  sourceUrl: string;
  license: CorpusLicense;
  text: string;
  score: number;
}

/** Response contract for POST /api/research (and searchCorpus consumers). */
export interface ResearchResponse {
  passages: ResearchPassage[];
  provider: "open-corpus";
}

export interface SearchCorpusOptions {
  /** Max passages to return (default 5, clamped 1–20). */
  limit?: number;
}
