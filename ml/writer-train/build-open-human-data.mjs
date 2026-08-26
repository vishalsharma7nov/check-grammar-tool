#!/usr/bin/env node
/**
 * Build open-licensed human English JSONL for local writer training.
 *
 * Sources (human-authored only):
 *   - Project Gutenberg plain-text classics (public domain, US)
 *   - packages/corpus seed excerpts (PD + CC-BY / CC-BY-SA / CC0 with attribution)
 *   - existing natural_writing.jsonl (hand-written style scaffolds)
 *
 * Ethics: no copyrighted scrapes, no AI-generated "human" labels, no detector-evasion goals.
 *
 * Usage:
 *   node ml/writer-train/build-open-human-data.mjs
 *   node ml/writer-train/build-open-human-data.mjs --max 1200 --skip-download  # use cache only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const DATA_DIR = path.join(__dirname, "data");
const CACHE_DIR = path.join(DATA_DIR, "gutenberg-cache");
const OUT_OPEN = path.join(DATA_DIR, "open_human_english.jsonl");
const OUT_MERGED = path.join(DATA_DIR, "natural_writing_merged.jsonl");
const NATURAL = path.join(DATA_DIR, "natural_writing.jsonl");
const SEED = path.join(ROOT, "packages/corpus/data/seed.json");

const args = process.argv.slice(2);
const SKIP_DOWNLOAD = args.includes("--skip-download");
const maxIdx = args.indexOf("--max");
const MAX_EXAMPLES = maxIdx >= 0 ? Number(args[maxIdx + 1]) || 1500 : 1500;

/** Curated PD classics — small set, truncated per book. */
const GUTENBERG_BOOKS = [
  { id: 1342, title: "Pride and Prejudice", author: "Jane Austen", themes: ["society", "family", "character", "manners"] },
  { id: 1661, title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", themes: ["observation", "mystery", "London", "reasoning"] },
  { id: 205, title: "Walden", author: "Henry David Thoreau", themes: ["nature", "simplicity", "solitude", "living deliberately"] },
  { id: 98, title: "A Tale of Two Cities", author: "Charles Dickens", themes: ["revolution", "cities", "sacrifice", "history"] },
  { id: 84, title: "Frankenstein", author: "Mary Shelley", themes: ["ambition", "creation", "responsibility", "isolation"] },
  { id: 2701, title: "Moby Dick", author: "Herman Melville", themes: ["sea", "obsession", "work", "nature"] },
  { id: 76, title: "Adventures of Huckleberry Finn", author: "Mark Twain", themes: ["river", "freedom", "friendship", "travel"] },
  { id: 11, title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", themes: ["curiosity", "nonsense", "childhood", "logic"] },
  { id: 345, title: "Dracula", author: "Bram Stoker", themes: ["letters", "fear", "travel", "night"] },
  { id: 174, title: "The Picture of Dorian Gray", author: "Oscar Wilde", themes: ["beauty", "art", "influence", "society"] },
  { id: 1400, title: "Great Expectations", author: "Charles Dickens", themes: ["ambition", "class", "memory", "growing up"] },
  { id: 2591, title: "Grimms' Fairy Tales", author: "Jacob and Wilhelm Grimm", themes: ["folklore", "lessons", "family", "courage"] },
  { id: 1232, title: "The Prince", author: "Niccolò Machiavelli", themes: ["power", "leadership", "states", "prudence"] },
  { id: 1080, title: "A Modest Proposal", author: "Jonathan Swift", themes: ["satire", "poverty", "rhetoric", "society"] },
  { id: 25305, title: "The Interesting Narrative of the Life of Olaudah Equiano", author: "Olaudah Equiano", themes: ["freedom", "travel", "testimony", "justice"] },
  { id: 55, title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", themes: ["journey", "home", "courage", "friendship"] },
  { id: 43, title: "The Strange Case of Dr. Jekyll and Mr. Hyde", author: "Robert Louis Stevenson", themes: ["duality", "science", "London", "conscience"] },
  { id: 16, title: "Peter Pan", author: "J. M. Barrie", themes: ["childhood", "adventure", "home", "imagination"] },
  { id: 1260, title: "Jane Eyre", author: "Charlotte Brontë", themes: ["independence", "work", "feeling", "integrity"] },
  { id: 1184, title: "The Count of Monte Cristo", author: "Alexandre Dumas", themes: ["justice", "patience", "fortune", "revenge"] },
  { id: 215, title: "The Call of the Wild", author: "Jack London", themes: ["wilderness", "instinct", "hardship", "dogs"] },
  { id: 158, title: "Emma", author: "Jane Austen", themes: ["matchmaking", "village life", "mistakes", "growth"] },
  { id: 36, title: "The War of the Worlds", author: "H. G. Wells", themes: ["invasion", "science", "panic", "survival"] },
  { id: 244, title: "A Study in Scarlet", author: "Arthur Conan Doyle", themes: ["detection", "clues", "partnership", "crime"] },
  { id: 46, title: "A Christmas Carol", author: "Charles Dickens", themes: ["generosity", "memory", "reform", "winter"] },
];

const MAX_BYTES_PER_BOOK = 180_000; // truncate large downloads
const MIN_PARA_CHARS = 280;
const MAX_PARA_CHARS = 900;
const TARGET_GUTENBERG = 1100;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripGutenbergBoilerplate(text) {
  let t = text.replace(/\r\n/g, "\n");
  const startMarkers = [
    "*** START OF THE PROJECT GUTENBERG EBOOK",
    "*** START OF THIS PROJECT GUTENBERG EBOOK",
    "***START OF THE PROJECT GUTENBERG EBOOK",
  ];
  const endMarkers = [
    "*** END OF THE PROJECT GUTENBERG EBOOK",
    "*** END OF THIS PROJECT GUTENBERG EBOOK",
    "***END OF THE PROJECT GUTENBERG EBOOK",
  ];
  for (const m of startMarkers) {
    const i = t.indexOf(m);
    if (i >= 0) {
      const nl = t.indexOf("\n", i);
      t = t.slice(nl >= 0 ? nl + 1 : i);
      break;
    }
  }
  for (const m of endMarkers) {
    const i = t.indexOf(m);
    if (i >= 0) t = t.slice(0, i);
  }
  return t;
}

function cleanParagraph(p) {
  return p
    .replace(/_+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\[[0-9]+\]/g, "")
    .trim();
}

function splitParagraphs(text) {
  const raw = text.split(/\n\s*\n+/);
  const out = [];
  for (const block of raw) {
    const p = cleanParagraph(block.replace(/\n/g, " "));
    if (p.length < MIN_PARA_CHARS || p.length > MAX_PARA_CHARS) continue;
    // Skip chapter headings / all-caps short lines / Gutenberg noise
    if (/^(CHAPTER|CONTENTS|ILLUSTRATION|PROJECT GUTENBERG)/i.test(p)) continue;
    if (/^[A-Z0-9 .,'-]{10,80}$/.test(p) && p.length < 100) continue;
    // Prefer prose with sentence punctuation
    if ((p.match(/[.!?]/g) || []).length < 2) continue;
    out.push(p);
  }
  return out;
}

function topicFromParagraph(p, themes) {
  const words = p
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const stop = new Set([
    "which", "their", "there", "would", "could", "should", "about", "these", "those",
    "being", "after", "before", "where", "while", "though", "through", "every", "other",
    "himself", "herself", "themselves", "something", "nothing", "without", "within",
  ]);
  const freq = new Map();
  for (const w of words) {
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w);
  const theme = themes[Math.floor(Math.abs(hash(p)) % themes.length)];
  if (top.length >= 2) return `${theme}: ${top.slice(0, 3).join(", ")}`;
  return theme;
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

async function fetchBook(book) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${book.id}.txt`);
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 1000) {
    return fs.readFileSync(cachePath, "utf8");
  }
  if (SKIP_DOWNLOAD) {
    console.warn(`  skip (no cache): ${book.id} ${book.title}`);
    return null;
  }

  const urls = [
    `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`,
    `https://gutenberg.pglaf.org/cache/epub/${book.id}/pg${book.id}.txt`,
    `https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`,
    `https://www.gutenberg.org/files/${book.id}/${book.id}.txt`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "check-grammar-tool-writer-train/1.0 (educational; PD corpus)" },
        redirect: "follow",
      });
      if (!res.ok) continue;
      let text = await res.text();
      if (text.length < 2000) continue;
      if (text.length > MAX_BYTES_PER_BOOK) text = text.slice(0, MAX_BYTES_PER_BOOK);
      fs.writeFileSync(cachePath, text, "utf8");
      console.log(`  cached ${book.id} (${(text.length / 1024).toFixed(0)} KB) ← ${url}`);
      return text;
    } catch (err) {
      console.warn(`  fail ${url}: ${err.message}`);
    }
  }
  console.warn(`  FAILED all URLs for ${book.id} ${book.title}`);
  return null;
}

function examplesFromBook(book, text) {
  const body = stripGutenbergBoilerplate(text);
  const paras = splitParagraphs(body);
  // Spread samples across the book
  const step = Math.max(1, Math.floor(paras.length / 55));
  const picked = [];
  for (let i = 0; i < paras.length && picked.length < 50; i += step) {
    picked.push(paras[i]);
  }

  const examples = [];
  for (const para of picked) {
    const topic = topicFromParagraph(para, book.themes);
    const wc = wordCount(para);
    const wordsHint = wc < 80 ? "~80" : wc < 140 ? "~120" : "~160";
    examples.push({
      instruction:
        "Write a short essay paragraph on the topic in clear natural prose. Return only the paragraph.",
      input: `Topic: ${topic}\nAudience: general readers\nTone: natural classic clarity\nWords: ${wordsHint}\nSource style: public-domain human prose (${book.author})`,
      output: para,
      meta: {
        license: "public-domain",
        source: `Project Gutenberg #${book.id}`,
        title: book.title,
        author: book.author,
        sourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
      },
    });
  }
  return examples;
}

function examplesFromSeed() {
  if (!fs.existsSync(SEED)) return [];
  const chunks = JSON.parse(fs.readFileSync(SEED, "utf8"));
  const allowed = new Set(["public-domain", "CC0", "CC-BY", "CC-BY-SA"]);
  const out = [];
  for (const c of chunks) {
    if (!allowed.has(c.license)) continue;
    const text = cleanParagraph(c.text || "");
    if (text.length < 120) continue;
    const topics = Array.isArray(c.topics) ? c.topics.slice(0, 3).join(", ") : "general";
    const attr =
      c.license === "public-domain" || c.license === "CC0"
        ? `${c.license}; ${c.title}`
        : `${c.license} — attribute: ${c.sourceUrl || c.title}`;
    out.push({
      instruction:
        "Write a short informative paragraph on the topic in clear natural prose. Return only the paragraph.",
      input: `Topic: ${topics}\nAudience: curious readers\nTone: clear explanatory\nWords: ~${Math.min(160, Math.max(60, wordCount(text)))}\nAttribution note: ${attr}`,
      output: text,
      meta: {
        license: c.license,
        source: c.title,
        sourceUrl: c.sourceUrl || "",
        licenseNote: c.licenseNote || "",
      },
    });
  }
  return out;
}

function loadNatural() {
  if (!fs.existsSync(NATURAL)) return [];
  return fs
    .readFileSync(NATURAL, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lines = rows.map((r) => {
    const { meta, ...rest } = r;
    // Keep training fields only in JSONL; meta goes to sidecar summary
    return JSON.stringify(rest);
  });
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
}

async function main() {
  console.log("Building open human English dataset…");
  console.log(`Target max examples: ${MAX_EXAMPLES}`);

  const gutenbergExamples = [];
  for (const book of GUTENBERG_BOOKS) {
    if (gutenbergExamples.length >= TARGET_GUTENBERG) break;
    console.log(`Book: ${book.title} (#${book.id})`);
    const text = await fetchBook(book);
    if (!text) continue;
    const ex = examplesFromBook(book, text);
    gutenbergExamples.push(...ex);
    console.log(`  +${ex.length} paragraphs (total Gutenberg ${gutenbergExamples.length})`);
    if (!SKIP_DOWNLOAD) await sleep(400); // be polite to Gutenberg
  }

  const seedExamples = examplesFromSeed();
  console.log(`Seed corpus examples: ${seedExamples.length}`);

  // Prefer diverse Gutenberg + seed; cap
  let open = [...gutenbergExamples, ...seedExamples];
  // Dedup by output prefix
  const seen = new Set();
  open = open.filter((e) => {
    const key = e.output.slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (open.length > MAX_EXAMPLES) open = open.slice(0, MAX_EXAMPLES);

  writeJsonl(OUT_OPEN, open);

  const natural = loadNatural();
  const merged = [...natural, ...open];
  // Dedup merged on output
  const seen2 = new Set();
  const mergedUnique = merged.filter((e) => {
    const key = (e.output || "").slice(0, 120);
    if (seen2.has(key)) return false;
    seen2.add(key);
    return true;
  });
  writeJsonl(OUT_MERGED, mergedUnique);

  const sources = {
    gutenberg_books: GUTENBERG_BOOKS.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      url: `https://www.gutenberg.org/ebooks/${b.id}`,
      license: "public-domain",
    })),
    corpus_seed: SEED,
    natural_scaffold: NATURAL,
    counts: {
      open_human_english: open.length,
      natural_writing: natural.length,
      merged: mergedUnique.length,
      from_gutenberg: Math.min(gutenbergExamples.length, open.length),
      from_seed: seedExamples.length,
    },
    ethics:
      "Human-authored PD / CC text only. No commercial scrapes. Not for AI-detector evasion.",
  };
  fs.writeFileSync(
    path.join(DATA_DIR, "open_human_sources.json"),
    JSON.stringify(sources, null, 2) + "\n",
    "utf8",
  );

  console.log("\nDone.");
  console.log(`  ${OUT_OPEN}  (${open.length} examples)`);
  console.log(`  ${OUT_MERGED}  (${mergedUnique.length} examples)`);
  console.log(`  sources → data/open_human_sources.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
