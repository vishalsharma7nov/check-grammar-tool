#!/usr/bin/env node
/**
 * Expand the offline seed corpus later from Project Gutenberg (public domain).
 *
 * This script does NOT download GB dumps at runtime for Vercel. It documents a
 * safe offline workflow: fetch a few known public-domain ebooks locally, cut
 * short excerpts, and merge them into data/seed.json with license metadata.
 *
 * Usage (from packages/corpus):
 *   npm run build-seed
 *   node scripts/build-seed.mjs --dry-run
 *
 * Manual expansion checklist:
 * 1. Prefer https://www.gutenberg.org/ebooks/ titles clearly labeled public domain.
 * 2. Download plain-text (.txt) locally — do not commit multi-MB full books.
 * 3. Extract 1–3 short passages (roughly 400–1200 characters) per work.
 * 4. Add a chunk shaped like:
 *    {
 *      "id": "pd-my-work-1",
 *      "title": "Work Title — excerpt label",
 *      "sourceUrl": "https://www.gutenberg.org/ebooks/NNNN",
 *      "license": "public-domain",
 *      "licenseNote": "Public domain (US). Project Gutenberg.",
 *      "text": "...excerpt...",
 *      "topics": ["topic-a", "topic-b"]
 *    }
 * 5. Only allow licenses: public-domain | CC0 | CC-BY | CC-BY-SA.
 * 6. Keep the bundled seed between ~30 and ~80 chunks so Next/Vercel stays lean.
 * 7. Re-run: npm test -w @check-grammar/corpus
 *
 * Wikipedia / CC BY-SA educational snippets must keep attribution + share-alike
 * notes and a stable sourceUrl for citations.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const seedPath = path.join(root, "data", "seed.json");

const ALLOWED = new Set(["public-domain", "CC0", "CC-BY", "CC-BY-SA"]);

function validate(chunks) {
  if (!Array.isArray(chunks)) throw new Error("seed must be a JSON array");
  if (chunks.length < 30) {
    console.warn(`warning: only ${chunks.length} chunks (recommend >= 30)`);
  }
  if (chunks.length > 80) {
    console.warn(`warning: ${chunks.length} chunks (recommend <= 80 for Vercel)`);
  }
  const ids = new Set();
  for (const c of chunks) {
    for (const key of ["id", "title", "sourceUrl", "license", "licenseNote", "text", "topics"]) {
      if (c[key] == null || c[key] === "") throw new Error(`missing ${key} on ${c.id ?? "?"}`);
    }
    if (!ALLOWED.has(c.license)) throw new Error(`disallowed license ${c.license} on ${c.id}`);
    if (!Array.isArray(c.topics) || c.topics.length === 0) {
      throw new Error(`topics required on ${c.id}`);
    }
    if (ids.has(c.id)) throw new Error(`duplicate id ${c.id}`);
    ids.add(c.id);
  }
}

const dryRun = process.argv.includes("--dry-run");
const raw = fs.readFileSync(seedPath, "utf8");
const chunks = JSON.parse(raw);
validate(chunks);

console.log(`Seed OK: ${chunks.length} chunks at ${path.relative(process.cwd(), seedPath)}`);
console.log(
  "Licenses:",
  [...chunks.reduce((m, c) => m.set(c.license, (m.get(c.license) ?? 0) + 1), new Map())]
    .map(([k, v]) => `${k}=${v}`)
    .join(", "),
);

if (dryRun) {
  console.log("Dry run only — no files written. See script header to expand from Gutenberg.");
  process.exit(0);
}

// Rewrite pretty-printed seed so future merges stay consistent, and sync seed-data.ts.
fs.writeFileSync(seedPath, JSON.stringify(chunks, null, 2) + "\n");

const seedDataPath = path.join(root, "src", "seed-data.ts");
const seedData = `/** Auto-synced from data/seed.json — run scripts/build-seed.mjs after edits. */
import type { CorpusChunk } from "./types.ts";

const seed: CorpusChunk[] = ${JSON.stringify(chunks, null, 2)};

export default seed;
`;
fs.writeFileSync(seedDataPath, seedData);
console.log("Normalized seed.json and synced src/seed-data.ts.");
console.log("Add Gutenberg excerpts to data/seed.json, then re-run this script.");
