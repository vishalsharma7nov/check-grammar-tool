#!/usr/bin/env node
/**
 * Rebuild packages/engine/src/wordlist.generated.ts from public word lists.
 *
 * Sources (free licenses):
 * - dwyl/english-words words_alpha.txt — Unlicense
 *   https://github.com/dwyl/english-words
 * - first20hours/google-10000-english 20k.txt — MIT
 *   https://github.com/first20hours/google-10000-english
 *
 * Usage: node packages/engine/scripts/fetch-wordlist.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "../data");
const outTs = join(here, "../src/wordlist.generated.ts");

const WORDS_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt";
const FREQ_URL = "https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt";

const EXTRAS = [
  "a",
  "i",
  "prepone",
  "preponed",
  "preponing",
  "needful",
  "lakh",
  "lakhs",
  "crore",
  "crores",
  "outstation",
  "colour",
  "favourite",
  "organise",
  "centre",
  "defence",
  "programme",
  "travelling",
  "labelled",
];

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

function normalize(list, extras = []) {
  const keep = new Set(extras);
  for (const raw of list) {
    const w = raw.trim().toLowerCase();
    if (!/^[a-z]+$/.test(w)) continue;
    if (w.length === 1 && w !== "a" && w !== "i") continue;
    if (w.length > 22) continue;
    if (w.length >= 3 && /^([a-z])\1+$/.test(w)) continue;
    keep.add(w);
  }
  return [...keep].sort();
}

const words = normalize((await fetchText(WORDS_URL)).split(/\r?\n/), EXTRAS);
const freq = normalize((await fetchText(FREQ_URL)).split(/\r?\n/));
mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, "en.txt"), words.join("\n") + "\n");
writeFileSync(join(dataDir, "freq.txt"), freq.join("\n") + "\n");
writeFileSync(
  outTs,
  `/** Generated from dwyl/english-words (Unlicense) and google-10000-english 20k (MIT). Do not edit. */\n` +
    `export const EN_WORD_BLOB = ${JSON.stringify(words.join("\n"))};\n` +
    `export const FREQ_BLOB = ${JSON.stringify(freq.join("\n"))};\n`,
);
console.log("words", words.length, "freq", freq.length, "->", outTs);
