import type { NextWordSuggestion, WordInsight, WritingHelp, WritingTip } from "../../protocol/src/index";

/** Common next words after a 1- or 2-word cue. Local, no network. */
const AFTER_ONE: Record<string, string[]> = {
  i: ["am", "will", "would", "have", "can", "need", "want", "think", "hope", "look"],
  we: ["are", "will", "have", "can", "need", "would"],
  they: ["are", "will", "have", "were"],
  he: ["is", "was", "has", "will"],
  she: ["is", "was", "has", "will"],
  it: ["is", "was", "has", "will"],
  please: ["find", "let", "review", "confirm", "share", "note", "see"],
  thank: ["you"],
  thanks: ["for", "again"],
  looking: ["forward", "at", "for"],
  would: ["like", "be", "appreciate"],
  could: ["you", "be", "we"],
  can: ["you", "we", "be"],
  let: ["me", "us", "you"],
  as: ["soon", "well", "per", "discussed"],
  in: ["the", "order", "addition", "case", "spite"],
  at: ["the", "your", "least"],
  for: ["the", "your", "this", "me"],
  to: ["the", "be", "discuss", "confirm", "send", "meet", "review"],
  of: ["the", "this", "our"],
  on: ["the", "this", "Monday"],
  with: ["the", "you", "regard"],
  the: ["meeting", "report", "letter", "team", "project", "following"],
  a: ["meeting", "look", "moment", "copy", "quick"],
  an: ["email", "update", "attachment"],
  this: ["is", "email", "report", "week"],
  that: ["the", "is", "we"],
  and: ["the", "I", "we"],
  or: ["the", "we"],
  if: ["you", "we", "possible"],
  when: ["you", "the", "we"],
  because: ["the", "I", "we"],
  so: ["that", "I", "we"],
  but: ["the", "I", "we"],
  make: ["sure", "sense", "a", "progress"],
  take: ["a", "care", "place", "part"],
  give: ["me", "you", "a"],
  have: ["a", "the", "been"],
  do: ["not", "you", "the"],
  feel: ["free"],
  find: ["attached", "the", "a"],
  attached: ["the", "is"],
  writing: ["to", "this"],
  kind: ["regards"],
  best: ["regards", "wishes"],
  regards: [],
};

const AFTER_TWO: Record<string, string[]> = {
  "looking forward": ["to"],
  "in order": ["to"],
  "as soon": ["as"],
  "as well": ["as"],
  "would like": ["to"],
  "i am": ["writing", "working", "happy", "sorry", "attaching"],
  "i will": ["be", "send", "share", "call"],
  "i have": ["attached", "reviewed", "a"],
  "thank you": ["for", "so"],
  "thanks for": ["the", "your"],
  "let me": ["know"],
  "please find": ["the", "attached"],
  "please let": ["me", "us"],
  "forward to": ["hearing", "your", "seeing"],
  "writing to": ["inform", "request", "confirm", "follow"],
  "in spite": ["of"],
  "due to": ["the"],
  "instead of": ["the"],
  "out of": ["office", "the"],
  "make sure": ["that", "you"],
  "feel free": ["to"],
  "at your": ["earliest", "convenience"],
  "a look": ["at"],
  "give me": ["a"],
  "me know": ["if"],
  "kind regards": [],
  "best regards": [],
};

const SENTENCE_START = ["I", "The", "This", "Please", "We", "Thank", "In", "As", "After", "Could"];

const COMPLETE: string[] = [
  "about",
  "after",
  "again",
  "also",
  "and",
  "attached",
  "because",
  "before",
  "between",
  "could",
  "confirm",
  "discuss",
  "email",
  "following",
  "forward",
  "from",
  "have",
  "however",
  "inform",
  "letter",
  "looking",
  "meeting",
  "please",
  "project",
  "receive",
  "received",
  "regards",
  "report",
  "request",
  "review",
  "should",
  "sorry",
  "thank",
  "thanks",
  "their",
  "there",
  "therefore",
  "this",
  "through",
  "today",
  "together",
  "tomorrow",
  "update",
  "would",
  "writing",
  "yesterday",
];

type Lex = { synonyms: string[]; example: string; note: string };

const LEXICON: Record<string, Lex> = {
  get: {
    synonyms: ["receive", "obtain", "collect"],
    example: "I received the files yesterday.",
    note: "In formal writing, receive or obtain often reads more clearly than get.",
  },
  got: {
    synonyms: ["received", "obtained"],
    example: "We received your message this morning.",
    note: "Prefer received in email and reports.",
  },
  go: {
    synonyms: ["attend", "leave", "proceed"],
    example: "I will attend the meeting at 3 pm.",
    note: "Pick a verb that names the action: attend, travel, continue.",
  },
  make: {
    synonyms: ["create", "prepare", "decide"],
    example: "Please make sure the figures are correct.",
    note: "Common pairs: make a decision, make progress, make sure.",
  },
  do: {
    synonyms: ["complete", "perform", "handle"],
    example: "I will complete the report by Friday.",
    note: "Do the work is fine in speech; complete/handle is clearer on paper.",
  },
  very: {
    synonyms: ["highly", "clearly", "strongly"],
    example: "The deadline is tight.",
    note: "A precise adjective often beats very + weak adjective.",
  },
  nice: {
    synonyms: ["helpful", "clear", "kind"],
    example: "Thank you — that summary was helpful.",
    note: "Nice is vague. Name what was good.",
  },
  good: {
    synonyms: ["clear", "useful", "sound"],
    example: "That is a sound plan for this week.",
    note: "Say what kind of good: clear, useful, accurate.",
  },
  bad: {
    synonyms: ["poor", "harmful", "unhelpful"],
    example: "The delay is unhelpful for the launch.",
    note: "A specific word tells the reader why it is a problem.",
  },
  thing: {
    synonyms: ["point", "item", "issue"],
    example: "The main point is the new date.",
    note: "Thing hides meaning. Name the object.",
  },
  stuff: {
    synonyms: ["material", "details", "files"],
    example: "I will send the files after lunch.",
    note: "Stuff is casual. Use files, notes, or equipment.",
  },
  important: {
    synonyms: ["urgent", "central", "key"],
    example: "The key change is the new deadline.",
    note: "Urgent vs central vs key are not the same.",
  },
  help: {
    synonyms: ["assist", "support", "guide"],
    example: "Could you help me review this draft?",
    note: "Help is fine. Assist is a touch more formal.",
  },
  tell: {
    synonyms: ["inform", "explain", "let know"],
    example: "Please let me know if the time works.",
    note: "Tell someone something; inform is more formal.",
  },
  ask: {
    synonyms: ["request", "enquire", "check"],
    example: "I wanted to ask whether Friday still works.",
    note: "Request is stronger and more formal than ask.",
  },
  want: {
    synonyms: ["would like", "need", "hope"],
    example: "I would like to confirm the slot.",
    note: "Would like is the usual polite form in email.",
  },
  need: {
    synonyms: ["require", "must have"],
    example: "We need the signed copy today.",
    note: "Need is clear. Require is more formal.",
  },
  think: {
    synonyms: ["believe", "suggest", "feel"],
    example: "I think we should move the call.",
    note: "I suggest is firmer than I think.",
  },
  send: {
    synonyms: ["share", "forward", "email"],
    example: "I will send the agenda this evening.",
    note: "Share is common for links and docs.",
  },
  revert: {
    synonyms: ["reply", "get back"],
    example: "Please reply by tomorrow.",
    note: "In Indian English revert often means reply. Reply is clear worldwide.",
  },
  prepone: {
    synonyms: ["bring forward", "move earlier"],
    example: "Can we move the meeting earlier?",
    note: "Prepone is standard in Indian English; other regions say move earlier.",
  },
  receive: {
    synonyms: ["get", "collect", "obtain"],
    example: "I received your letter this morning.",
    note: "Receive is the usual verb for mail and files.",
  },
  discuss: {
    synonyms: ["talk about", "go over", "review"],
    example: "Shall we discuss the timeline tomorrow?",
    note: "Discuss takes a direct object: discuss the plan, not discuss about.",
  },
  confirm: {
    synonyms: ["verify", "agree", "check"],
    example: "Please confirm the time by 5 pm.",
    note: "Confirm means say that something is definite.",
  },
  meeting: {
    synonyms: ["call", "discussion", "session"],
    example: "The meeting is at 11 am.",
    note: "Use on for days (on Monday) and at for clock times.",
  },
  please: {
    synonyms: ["kindly", "could you"],
    example: "Please send the file today.",
    note: "One please is polite. Kindly please together is heavy.",
  },
  because: {
    synonyms: ["since", "as"],
    example: "We moved the date because the room is booked.",
    note: "Because starts a reason. Pair it with a main clause, not a fragment.",
  },
};

function lastWords(left: string): { complete: string[]; partial: string | null } {
  const m = left.match(/([A-Za-z']+(?:\s+[A-Za-z']+)*)?([A-Za-z']+)?$/);
  if (/\s$/.test(left) || /[.!?,;:]$/.test(left.trimEnd())) {
    const words = (left.trim().match(/[A-Za-z']+/g) || []).map((w) => w.toLowerCase());
    return { complete: words.slice(-3), partial: null };
  }
  const parts = left.match(/[A-Za-z']+/g) || [];
  const partial = parts[parts.length - 1] ?? "";
  return { complete: parts.slice(0, -1).map((w) => w.toLowerCase()), partial };
}

function atSentenceStart(left: string): boolean {
  const t = left.trimEnd();
  return t.length === 0 || /[.!?]\s*$/.test(t);
}

function pushUnique(out: NextWordSuggestion[], token: string, kind: NextWordSuggestion["kind"], hint: string) {
  if (!token) return;
  if (out.some((x) => x.token.toLowerCase() === token.toLowerCase())) return;
  out.push({ token, kind, hint });
}

export function suggestNext(text: string, cursor: number): NextWordSuggestion[] {
  const left = text.slice(0, Math.max(0, Math.min(cursor, text.length)));
  const { complete, partial } = lastWords(left);
  const out: NextWordSuggestion[] = [];

  if (partial) {
    const p = partial.toLowerCase();
    const prev = complete[complete.length - 1];
    const prev2 = complete.slice(-2).join(" ");
    const pool = [
      ...(prev2 ? AFTER_TWO[prev2] ?? [] : []),
      ...(prev ? AFTER_ONE[prev] ?? [] : []),
      ...COMPLETE,
    ];
    for (const w of pool) {
      if (w.toLowerCase().startsWith(p) && w.toLowerCase() !== p) {
        pushUnique(out, w, "complete", "Finishes the word you started.");
      }
      if (out.length >= 5) break;
    }
    return out;
  }

  if (atSentenceStart(left)) {
    for (const w of SENTENCE_START) pushUnique(out, w, "next", "A natural way to begin a sentence.");
    return out.slice(0, 5);
  }

  const two = complete.slice(-2).join(" ");
  const one = complete[complete.length - 1];
  for (const w of AFTER_TWO[two] ?? []) {
    pushUnique(out, w, "next", `Often follows “${two}”.`);
  }
  for (const w of AFTER_ONE[one] ?? []) {
    pushUnique(out, w, "next", `A common next word after “${one}”.`);
  }
  return out.slice(0, 5);
}

export function wordInsight(text: string, cursor: number): WordInsight | undefined {
  const i = Math.max(0, Math.min(cursor, text.length));
  const before = text.slice(0, i);
  const after = text.slice(i);
  const a = (before.match(/[A-Za-z']+$/) || [""])[0];
  const b = (after.match(/^[A-Za-z']+/) || [""])[0];
  const word = (a + b).toLowerCase();
  if (word.length < 2) return undefined;
  const lex = LEXICON[word];
  if (!lex) {
    if (word.endsWith("ing") && LEXICON[word.slice(0, -3)]) {
      const base = LEXICON[word.slice(0, -3)];
      return { word, synonyms: base.synonyms, example: base.example, note: base.note };
    }
    return undefined;
  }
  return { word, synonyms: lex.synonyms, example: lex.example, note: lex.note };
}

export function writingTips(text: string): WritingTip[] {
  const tips: WritingTip[] = [];
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const words = text.match(/[A-Za-z']+/g) || [];
  const lower = words.map((w) => w.toLowerCase());

  const iStarts = sentences.filter((s) => /^i\b/i.test(s)).length;
  if (iStarts >= 3 && sentences.length >= 4) {
    tips.push({
      id: "starts-with-i",
      title: "Too many sentences start with “I”",
      detail: `${iStarts} of ${sentences.length} sentences begin with I. Mix in The, This, We, or After…`,
    });
  }

  const very = lower.filter((w) => w === "very" || w === "really" || w === "just").length;
  if (very >= 2) {
    tips.push({
      id: "softeners",
      title: "Cut filler words",
      detail: "very / really / just showed up more than once. A precise word is usually stronger.",
    });
  }

  const avg = sentences.length ? words.length / sentences.length : 0;
  if (avg > 28) {
    tips.push({
      id: "long-sentences",
      title: "Sentences are running long",
      detail: `About ${Math.round(avg)} words per sentence. Split a long one at and, but, or so.`,
    });
  } else if (sentences.length >= 5 && avg > 0 && avg < 8) {
    tips.push({
      id: "choppy",
      title: "Sentences are very short",
      detail: "Join two related ideas with and, so, or because so the paragraph flows.",
    });
  }

  const counts: Record<string, number> = {};
  for (const w of lower) {
    if (w.length < 5) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  const repeated = Object.entries(counts)
    .filter(([, n]) => n >= 4)
    .sort((a, b) => b[1] - a[1])[0];
  if (repeated) {
    tips.push({
      id: "repeat-word",
      title: `“${repeated[0]}” appears ${repeated[1]} times`,
      detail: "A synonym or a pronoun (it, they, this) will sound less repetitive.",
    });
  }

  if (/\b(gonna|wanna|gotta|yeah)\b/i.test(text)) {
    tips.push({
      id: "informal",
      title: "Casual wording",
      detail: "gonna / wanna read as speech. In email, use going to / want to.",
    });
  }

  const last = sentences[sentences.length - 1];
  if (last && last.length > 40 && !/[.!?]$/.test(last) && words.length >= 8) {
    tips.push({
      id: "open-sentence",
      title: "The last sentence is still open",
      detail: "Add a period when the thought is finished, or keep typing.",
    });
  }

  if (!tips.length && words.length >= 6) {
    tips.push({
      id: "next-word",
      title: "Use the chips under the editor",
      detail: "They guess the next English word from the last few you typed. Tab inserts the first chip.",
    });
  }

  return tips.slice(0, 3);
}

export function writingHelp(text: string, cursor: number): WritingHelp {
  return {
    next: suggestNext(text, cursor),
    insight: wordInsight(text, cursor),
    tips: writingTips(text),
  };
}

export function insertSuggestion(
  text: string,
  cursor: number,
  suggestion: NextWordSuggestion,
): { text: string; cursor: number } {
  if (suggestion.kind === "complete") {
    const left = text.slice(0, cursor);
    const start = cursor - ((left.match(/[A-Za-z']+$/) || [""])[0].length);
    const next = text.slice(0, start) + suggestion.token + text.slice(cursor);
    const pos = start + suggestion.token.length;
    return { text: next, cursor: pos };
  }
  const needsSpace = cursor > 0 && !/\s$/.test(text.slice(0, cursor));
  const chunk = (needsSpace ? " " : "") + suggestion.token + " ";
  const next = text.slice(0, cursor) + chunk + text.slice(cursor);
  return { text: next, cursor: cursor + chunk.length };
}
