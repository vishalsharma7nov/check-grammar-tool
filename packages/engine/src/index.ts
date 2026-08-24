import type {
  Category,
  CheckRequest,
  CheckResponse,
  Dialect,
  DocumentStats,
  Match,
} from "../../protocol/src/index";
import { checkContextSpelling } from "./contextSpell.ts";
import { checkSentenceMaking, isLegitPassive } from "./sentenceMaking.ts";
import { analyzeTone } from "./tone.ts";
import { knownWord, skipSpellToken, spellSuggestions } from "./spell.ts";

export type { CheckRequest, CheckResponse, Match, Dialect };

const DEFAULT_DIALECT: Dialect = "en-IN";

const COMMON_TYPOS: Record<string, string> = {
  teh: "the",
  adn: "and",
  recieve: "receive",
  recieved: "received",
  seperate: "separate",
  seperated: "separated",
  definately: "definitely",
  occassion: "occasion",
  occured: "occurred",
  occurence: "occurrence",
  accomodate: "accommodate",
  neccessary: "necessary",
  untill: "until",
  wierd: "weird",
  truely: "truly",
  adress: "address",
  begining: "beginning",
  enviroment: "environment",
  goverment: "government",
  independant: "independent",
  succesful: "successful",
  sucessful: "successful",
  tommorow: "tomorrow",
  tommorrow: "tomorrow",
  langauge: "language",
  grammer: "grammar",
  writting: "writing",
  reccomend: "recommend",
  reccommend: "recommend",
  publically: "publicly",
  prefered: "preferred",
  refered: "referred",
  transfered: "transferred",
  alot: "a lot",
  expresso: "espresso",
};

const GB_TO_US: Record<string, string> = {
  colour: "color",
  colours: "colors",
  favourite: "favorite",
  favourites: "favorites",
  organise: "organize",
  organised: "organized",
  organisation: "organization",
  centre: "center",
  centres: "centers",
  defence: "defense",
  programme: "program",
  travelling: "traveling",
  labelled: "labeled",
};

const US_TO_GB: Record<string, string> = Object.fromEntries(
  Object.entries(GB_TO_US).map(([gb, us]) => [us, gb]),
);

export const INDIAN_ENGLISH_OK = new Set([
  "prepone",
  "preponed",
  "preponing",
  "needful",
  "lakh",
  "lakhs",
  "crore",
  "crores",
  "outstation",
]);

type Wordy = {
  re: RegExp;
  replacement: string;
  id: string;
  message: string;
  explanation: string;
};

const WORDY: Wordy[] = [
  {
    re: /\bin order to\b/gi,
    replacement: "to",
    id: "CLARITY_IN_ORDER_TO",
    message: "Wordy: “in order to” → “to”.",
    explanation: "The extra words do not add meaning.",
  },
  {
    re: /\bdue to the fact that\b/gi,
    replacement: "because",
    id: "CLARITY_DUE_TO_FACT",
    message: "Wordy: “due to the fact that” → “because”.",
    explanation: "A four-word phrase doing the job of one.",
  },
  {
    re: /\bat this point in time\b/gi,
    replacement: "now",
    id: "CLARITY_POINT_IN_TIME",
    message: "Wordy: “at this point in time” → “now”.",
    explanation: "Cut filler temporal phrases.",
  },
  {
    re: /\bin the event that\b/gi,
    replacement: "if",
    id: "CLARITY_IN_THE_EVENT",
    message: "Wordy: “in the event that” → “if”.",
    explanation: "Prefer a plain conditional.",
  },
  {
    re: /\ba large number of\b/gi,
    replacement: "many",
    id: "CLARITY_LARGE_NUMBER",
    message: "Wordy: “a large number of” → “many”.",
    explanation: "Shorter quantifiers are easier to read.",
  },
];

type Idiom = {
  re: RegExp;
  id: string;
  enIN: { message: string; explanation: string; replacements: string[] };
  other: { message: string; explanation: string; replacements: string[] };
};

const INDIAN_IDIOMS: Idiom[] = [
  {
    re: /\bdo the needful\b/gi,
    id: "DIALECT_DO_THE_NEEDFUL",
    enIN: {
      message: "Indian English idiom. Fine for local readers; may confuse US/UK readers.",
      explanation: "Common in Indian professional email.",
      replacements: ["please take care of this", "please do what is needed"],
    },
    other: {
      message: "“Do the needful” is Indian English and can sound unclear internationally.",
      explanation: "Prefer a specific verb: approve, send, schedule, review.",
      replacements: ["please take care of this", "please do what is needed"],
    },
  },
  {
    re: /\bkindly revert( back)?\b/gi,
    id: "DIALECT_KINDLY_REVERT",
    enIN: {
      message: "In Indian English “revert” often means “reply”.",
      explanation: "If you mean a reply, “please reply” is unambiguous everywhere.",
      replacements: ["please reply", "please get back to me"],
    },
    other: {
      message: "“Revert” here likely means “reply” (Indian English).",
      explanation: "Use “reply” for global audiences.",
      replacements: ["please reply", "please get back to me"],
    },
  },
  {
    re: /\bprepone\b/gi,
    id: "DIALECT_PREPONE",
    enIN: {
      message: "“Prepone” is standard Indian English (antonym of postpone).",
      explanation: "Keep for Indian readers; US/UK dictionaries still mark it as regional.",
      replacements: ["move earlier", "reschedule to an earlier time"],
    },
    other: {
      message: "“Prepone” is Indian English. International equivalent: “move earlier”.",
      explanation: "The coinage is logical but not universal yet.",
      replacements: ["move earlier", "bring forward"],
    },
  },
];

function isCodeRegion(text: string, index: number): boolean {
  const before = text.slice(0, index);
  const ticks = (before.match(/```/g) || []).length;
  if (ticks % 2 === 1) return true;
  const inline = (before.match(/`/g) || []).length - ticks * 3;
  return inline % 2 === 1;
}

function vowelsAn(word: string): boolean {
  const w = word.toLowerCase();
  if (/^uni[onv]/.test(w) || w.startsWith("euro") || w.startsWith("u.s")) return false;
  if (/^hour/.test(w) || /^honest/.test(w) || /^heir/.test(w)) return true;
  return /^[aeiou]/.test(w);
}

function flesch(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 100;
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (w.endsWith("e") && n > 1) n -= 1;
  return Math.max(1, n);
}

function spanKey(m: Match): string {
  return `${m.offset}:${m.length}`;
}

/** Prefer phrase hints, then grammar homophones, over generic context-spell rules at the same span. */
function spanPriority(ruleId: string): number {
  if (ruleId.startsWith("SPELL_CONTEXT_PHRASE_")) return 3;
  if (ruleId.startsWith("GRAMMAR_HOMOPHONE_")) return 2;
  if (ruleId.startsWith("SPELL_CONTEXT_")) return 1;
  return 0;
}

function collapseSpanDuplicates(matches: Match[]): Match[] {
  const best = new Map<string, Match>();
  for (const m of matches) {
    const key = spanKey(m);
    const prev = best.get(key);
    if (!prev || spanPriority(m.ruleId) > spanPriority(prev.ruleId)) best.set(key, m);
  }
  return [...best.values()];
}

function push(
  matches: Match[],
  offset: number,
  length: number,
  ruleId: string,
  category: Category,
  message: string,
  explanation: string,
  replacements: string[],
  dialect?: Dialect,
) {
  matches.push({ offset, length, ruleId, category, message, explanation, replacements, dialect });
}

function applyStyleGuide(text: string, yaml: string | undefined, matches: Match[]) {
  if (!yaml?.trim()) return;
  const lines = yaml.split("\n");
  let currentId = "STYLE_CUSTOM";
  let currentMsg = "Style guide flag";
  let currentRe: RegExp | null = null;
  const flush = () => {
    if (!currentRe) return;
    currentRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = currentRe.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      push(matches, m.index, m[0].length, currentId, "style", currentMsg, "From your style-as-code YAML.", []);
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("- id:")) {
      flush();
      currentId = line.slice(5).trim() || "STYLE_CUSTOM";
      currentRe = null;
    } else if (line.startsWith("pattern:")) {
      const body = line.slice(8).trim().replace(/^["']|["']$/g, "");
      try {
        currentRe = new RegExp(body, "gi");
      } catch {
        currentRe = null;
      }
    } else if (line.startsWith("message:")) {
      currentMsg = line.slice(8).trim().replace(/^["']|["']$/g, "");
    }
  }
  flush();
}

export function analyze(req: CheckRequest): CheckResponse {
  const text = req.text ?? "";
  const dialect: Dialect = req.dialect ?? DEFAULT_DIALECT;
  const dict = new Set((req.personalDictionary ?? []).map((w) => w.toLowerCase()));
  const regional = new Set(INDIAN_ENGLISH_OK);
  for (const [gb, us] of Object.entries(GB_TO_US)) {
    regional.add(gb);
    regional.add(us);
  }
  const matches: Match[] = [];

  const wordRe = /[A-Za-z][A-Za-z'-]*/g;
  let wm: RegExpExecArray | null;
  const words: { w: string; index: number }[] = [];
  while ((wm = wordRe.exec(text))) {
    words.push({ w: wm[0], index: wm.index });
  }

  for (let i = 0; i < words.length; i++) {
    const { w, index } = words[i];
    if (isCodeRegion(text, index)) continue;
    const lower = w.toLowerCase();
    if (dict.has(lower)) continue;

    if (!skipSpellToken(text, index, w, req.caret)) {
      if (COMMON_TYPOS[lower]) {
        const repl = COMMON_TYPOS[lower];
        const cased = w[0] === w[0].toUpperCase() ? repl[0].toUpperCase() + repl.slice(1) : repl;
        push(
          matches,
          index,
          w.length,
          `SPELL_${lower.toUpperCase()}`,
          "spelling",
          `Possible misspelling: “${w}”.`,
          "Not in the free English word list. Add the word to your personal dictionary if it is intentional.",
          [cased],
        );
      } else if (!knownWord(w, dialect, dict, regional)) {
        const sugg = spellSuggestions(lower).map((repl) =>
          w[0] === w[0].toUpperCase() ? repl[0].toUpperCase() + repl.slice(1) : repl,
        );
        push(
          matches,
          index,
          w.length,
          "SPELL_DICT",
          "spelling",
          `Possible misspelling: “${w}”.`,
          "Checked against a free on-device English word list (dwyl/english-words, Unlicense). Add names and jargon to your personal dictionary.",
          sugg,
        );
      }
    }

    if (i + 1 < words.length && lower === words[i + 1].w.toLowerCase() && !isCodeRegion(text, words[i + 1].index)) {
      const gap = text.slice(index + w.length, words[i + 1].index);
      if (/^\s+$/.test(gap)) {
        push(
          matches,
          index,
          words[i + 1].index + words[i + 1].w.length - index,
          "GRAMMAR_DOUBLE_WORD",
          "grammar",
          `Repeated word: “${w} ${words[i + 1].w}”.`,
          "Accidental doubling is a common typing slip.",
          [w],
        );
      }
    }

    if (lower === "a" || lower === "an") {
      const next = words[i + 1];
      if (next && !isCodeRegion(text, next.index)) {
        const needAn = vowelsAn(next.w);
        if (lower === "a" && needAn) {
          push(matches, index, w.length, "GRAMMAR_A_AN", "grammar", "Use “an” before a vowel sound.", "The article depends on sound, not spelling alone (an hour, a university).", ["an"]);
        }
        if (lower === "an" && !needAn) {
          push(matches, index, w.length, "GRAMMAR_A_AN", "grammar", "Use “a” before a consonant sound.", "The article depends on sound, not spelling alone.", ["a"]);
        }
      }
    }

    if (dialect === "en-US" && GB_TO_US[lower]) {
      push(matches, index, w.length, "DIALECT_GB_SPELLING", "dialect", `US English prefers “${GB_TO_US[lower]}”.`, "Dialect lock: this document is set to American English.", [GB_TO_US[lower]], dialect);
    }
    if ((dialect === "en-GB" || dialect === "en-IN" || dialect === "en-AU") && US_TO_GB[lower]) {
      push(matches, index, w.length, "DIALECT_US_SPELLING", "dialect", `${dialect} often prefers “${US_TO_GB[lower]}”.`, "Dialect lock: British/Indian/Australian spelling.", [US_TO_GB[lower]], dialect);
    }
  }

  {
    const re = /\bi\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      push(matches, m.index, 1, "GRAMMAR_CAPITAL_I", "grammar", "Capitalize the pronoun “I”.", "English capitalizes the first-person singular pronoun.", ["I"]);
    }
  }

  {
    const re = /[ \t]+\./g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      push(matches, m.index, m[0].length, "PUNCT_SPACE_BEFORE_PERIOD", "punctuation", "Remove the space before the period.", "English does not put a space before a full stop.", ["."]);
    }
  }

  {
    const re = /,(?=\S)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      const next = text[m.index + 1];
      if (next && /[0-9)]/.test(next)) continue;
      push(matches, m.index, 1, "PUNCT_COMMA_SPACE", "punctuation", "Add a space after the comma.", "Standard English spacing after commas.", [", "]);
    }
  }

  {
    const re = / {2,}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      if (text[m.index - 1] === "\n") continue;
      push(matches, m.index, m[0].length, "PUNCT_DOUBLE_SPACE", "punctuation", "Multiple spaces.", "Collapse to a single space unless you are aligning text on purpose.", [" "]);
    }
  }

  for (const rule of WORDY) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      push(matches, m.index, m[0].length, rule.id, "clarity", rule.message, rule.explanation, [rule.replacement]);
    }
  }

  for (const idiom of INDIAN_IDIOMS) {
    idiom.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = idiom.re.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      const pack = dialect === "en-IN" ? idiom.enIN : idiom.other;
      push(matches, m.index, m[0].length, idiom.id, "dialect", pack.message, pack.explanation, pack.replacements, dialect);
    }
  }

  {
    const re = /\b(was|were|been|being|is|are|be)\s+\w+ed\b/gi;
    let m: RegExpExecArray | null;
    let passive = 0;
    while ((m = re.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      if (isLegitPassive(m[0])) continue;
      passive += 1;
      if (passive <= 8) {
        push(
          matches,
          m.index,
          m[0].length,
          "STYLE_PASSIVE",
          "tone",
          "Possible passive voice.",
          "Passive is fine for lab reports; active is usually clearer.",
          [],
        );
      }
    }
  }

  applyStyleGuide(text, req.styleGuide, matches);

  {
    const re = /\b\w+,\s+\w+\s+and\s+\w+\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      const andIdx = m[0].lastIndexOf(" and ");
      if (andIdx < 0) continue;
      push(
        matches,
        m.index + andIdx,
        4,
        "PUNCT_OXFORD_COMMA",
        "punctuation",
        "Consider an Oxford comma before “and” in a list of three or more.",
        "A comma before the final “and” can reduce ambiguity: a, b, and c.",
        [", and"],
      );
    }
  }

  {
    const hasStraight = /"/.test(text);
    const hasCurly = /[\u201c\u201d]/.test(text);
    if (hasStraight && hasCurly) {
      const re = /"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        if (isCodeRegion(text, m.index)) continue;
        push(matches, m.index, 1, "PUNCT_QUOTE_MIXED", "punctuation", "Mixed quote styles — pick straight or curly quotes consistently.", "Stick to one quote style throughout.", ['"']);
      }
    }
  }

  {
    const re = /;\s+[a-z]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (isCodeRegion(text, m.index)) continue;
      const after = text.slice(m.index + 2, m.index + 20);
      if (/^(?:e\.g\.|i\.e\.|etc\.|vs\.|cf\.)/.test(after)) continue;
      push(
        matches,
        m.index,
        1,
        "PUNCT_SEMICOLON_LOWERCASE",
        "punctuation",
        "Semicolon before a lowercase clause — check this is intentional.",
        "Semicolons join related independent clauses. A comma may work if the second part is not a full clause.",
        [","],
      );
    }
  }

  const skip = (i: number) => isCodeRegion(text, i);
  matches.push(...checkContextSpelling(text, skip));
  matches.push(...checkSentenceMaking(text, skip));
  matches.push(...analyzeTone(text, req.goals, skip).matches);

  const collapsed = collapseSpanDuplicates(matches);
  collapsed.sort((a, b) => a.offset - b.offset || b.length - a.length);
  const dedup: Match[] = [];
  for (const m of collapsed) {
    const last = dedup[dedup.length - 1];
    if (last && m.offset < last.offset + last.length && m.ruleId === last.ruleId) continue;
    dedup.push(m);
  }

  const wordCount = words.length;
  const sentenceCount = Math.max(wordCount ? 1 : 0, (text.match(/[.!?]+/g) || []).length);
  const syllables = words.reduce((n, x) => n + countSyllables(x.w), 0);
  const stats: DocumentStats = {
    wordCount,
    sentenceCount,
    avgSentenceLength: wordCount === 0 || sentenceCount === 0 ? 0 : Math.round((wordCount / sentenceCount) * 10) / 10,
    readability: flesch(wordCount, Math.max(1, sentenceCount), syllables),
    passiveVoiceCount: dedup.filter((m) => m.ruleId === "STYLE_PASSIVE").length,
    dialect,
  };

  return {
    matches: dedup,
    stats,
    llm: { used: false, provider: "none", skippedReason: "privacy-engine" },
  };
}

export function applyReplacement(text: string, offset: number, length: number, replacement: string): string {
  return text.slice(0, offset) + replacement + text.slice(offset + length);
}

export { insertSuggestion, writingHelp } from "./writingHelp.ts";
export { matchNearCaret } from "./caret.ts";
export { analyzeTone } from "./tone.ts";
export type { ToneAnalysis, ToneSignal } from "./tone.ts";
