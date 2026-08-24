import { EN_WORD_BLOB, FREQ_BLOB } from "./wordlist.generated.ts";
import type { Dialect } from "../../protocol/src/index";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

let WORDS: Set<string> | null = null;
let RANK: Map<string, number> | null = null;

export function wordSet(): Set<string> {
  if (!WORDS) WORDS = new Set(EN_WORD_BLOB.split("\n"));
  return WORDS;
}

function rankOf(w: string): number {
  if (!RANK) {
    RANK = new Map();
    FREQ_BLOB.split("\n").forEach((word, i) => RANK!.set(word, i));
  }
  return RANK.get(w) ?? 50_000;
}

function stemPossessive(w: string): string {
  if (w.endsWith("'s") && w.length > 3) return w.slice(0, -2);
  if (w.endsWith("'") && w.length > 2) return w.slice(0, -1);
  return w;
}

export function knownWord(
  raw: string,
  _dialect: Dialect,
  personal: Set<string>,
  regional: Set<string>,
): boolean {
  const lower = stemPossessive(raw.toLowerCase());
  if (lower.length === 0) return true;
  if (personal.has(lower) || regional.has(lower)) return true;
  const set = wordSet();
  if (set.has(lower)) return true;
  const compact = lower.replace(/'/g, "");
  if (compact !== lower && set.has(compact)) return true;
  if (lower.includes("-")) return lower.split("-").every((p) => !p || set.has(p) || personal.has(p));
  return false;
}

function edits1(word: string): string[] {
  const out: string[] = [];
  const splits: [string, string][] = [];
  for (let i = 0; i <= word.length; i++) splits.push([word.slice(0, i), word.slice(i)]);
  for (const [a, b] of splits) {
    if (b) out.push(a + b.slice(1));
    if (b.length > 1) out.push(a + b[1] + b[0] + b.slice(2));
    if (b) {
      for (const c of LETTERS) out.push(a + c + b.slice(1));
    }
    for (const c of LETTERS) out.push(a + c + b);
  }
  return out;
}

/** Collapse runs of 3+ identical letters to length 1 or 2 (e.g. heeeelooo → helo/heloo/…). */
function elongationVariants(word: string): string[] {
  const runs: { ch: string; n: number }[] = [];
  for (let i = 0; i < word.length; ) {
    let j = i + 1;
    while (j < word.length && word[j] === word[i]) j++;
    runs.push({ ch: word[i]!, n: j - i });
    i = j;
  }
  if (!runs.some((r) => r.n >= 3)) return [];

  const out: string[] = [];
  const walk = (idx: number, acc: string) => {
    if (idx === runs.length) {
      if (acc !== word) out.push(acc);
      return;
    }
    const { ch, n } = runs[idx]!;
    const maxKeep = n >= 3 ? 2 : n;
    const minKeep = n >= 3 ? 1 : n;
    for (let k = minKeep; k <= maxKeep; k++) walk(idx + 1, acc + ch.repeat(k));
  };
  walk(0, "");
  return out;
}

export function spellSuggestions(word: string, extra: string[] = []): string[] {
  const lower = word.toLowerCase();
  const set = wordSet();
  const found = new Set<string>();
  for (const e of extra) {
    if (e && e !== lower) found.add(e);
  }
  for (const e of edits1(lower)) {
    if (set.has(e) && e !== lower) found.add(e);
  }
  // Stretched greetings etc. exceed max edit distance; try collapsed forms (+1 edit).
  for (const v of elongationVariants(lower)) {
    if (set.has(v) && v !== lower) found.add(v);
    for (const e of edits1(v)) {
      if (set.has(e) && e !== lower) found.add(e);
    }
  }
  if (found.size === 0 && lower.length <= 14) {
    for (const e1 of edits1(lower)) {
      for (const e2 of edits1(e1)) {
        if (set.has(e2) && e2 !== lower) found.add(e2);
      }
    }
  }
  const ranked = [...found].sort(
    (a, b) => rankOf(a) - rankOf(b) || a.length - b.length || a.localeCompare(b),
  );
  const frequent = ranked.filter((w) => rankOf(w) < 50_000);
  return (frequent.length ? frequent : ranked).slice(0, 5);
}

export function skipSpellToken(text: string, index: number, word: string, caret?: number): boolean {
  if (word.length <= 1) return true;
  if (/^[A-Z]{2,6}$/.test(word)) return true;
  if (/^[A-Z][a-z]+[A-Z]/.test(word)) return true;
  const before = text.slice(Math.max(0, index - 8), index);
  if (/https?:\/\/$/i.test(before) || /@$/.test(before)) return true;
  if (caret == null) return false;
  const end = index + word.length;
  return caret > index && caret < end;
}
