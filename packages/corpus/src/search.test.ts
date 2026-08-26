import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SEED_CORPUS,
  isAllowedLicense,
  researchResponse,
  searchCorpus,
} from "./index.ts";

test("seed corpus has enough license-safe chunks", () => {
  assert.ok(SEED_CORPUS.length >= 30, `expected >=30 chunks, got ${SEED_CORPUS.length}`);
  assert.ok(SEED_CORPUS.length <= 80, `expected <=80 chunks, got ${SEED_CORPUS.length}`);
  for (const chunk of SEED_CORPUS) {
    assert.ok(isAllowedLicense(chunk.license), chunk.id);
    assert.ok(chunk.text.trim().length > 40, chunk.id);
    assert.ok(chunk.sourceUrl.startsWith("http"), chunk.id);
    assert.ok(Array.isArray(chunk.topics) && chunk.topics.length > 0, chunk.id);
  }
});

test("searchCorpus returns democracy-related hits for topic democracy", () => {
  const hits = searchCorpus("democracy", { limit: 5 });
  assert.ok(hits.length >= 1, "expected at least one hit");
  assert.ok(hits.length <= 5);
  const blob = hits.map((h) => `${h.title} ${h.text}`.toLowerCase()).join(" ");
  assert.match(blob, /democra|govern|people|elect|liberty|suffrage|republic/);
  for (const h of hits) {
    assert.ok(typeof h.score === "number" && h.score > 0);
    assert.ok(isAllowedLicense(h.license));
    assert.ok(h.sourceUrl.length > 0);
  }
  // Scores should be non-increasing
  for (let i = 1; i < hits.length; i++) {
    assert.ok(hits[i - 1].score >= hits[i].score);
  }
});

test("searchCorpus empty query returns no passages", () => {
  assert.deepEqual(searchCorpus("   "), []);
  assert.deepEqual(searchCorpus(""), []);
});

test("researchResponse provider is open-corpus", () => {
  const res = researchResponse("climate change", { limit: 3 });
  assert.equal(res.provider, "open-corpus");
  assert.ok(res.passages.length >= 1);
  assert.ok(res.passages.length <= 3);
  const blob = res.passages.map((p) => p.text.toLowerCase()).join(" ");
  assert.match(blob, /climate|emission|energy|warming|carbon/);
});
