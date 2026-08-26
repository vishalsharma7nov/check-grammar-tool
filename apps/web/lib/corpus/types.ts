/** Open-license corpus chunk used for research-grounded drafting. */

export type CorpusLicense = "public-domain" | "CC0" | "CC-BY" | "CC-BY-SA";

export type CorpusChunk = {
  id: string;
  title: string;
  sourceUrl: string;
  license: CorpusLicense;
  licenseNote?: string;
  text: string;
  topics: string[];
};

export type CorpusPassage = {
  title: string;
  sourceUrl: string;
  license: CorpusLicense;
  text: string;
  score: number;
};

export type Citation = {
  title: string;
  sourceUrl: string;
  license: CorpusLicense | string;
};
