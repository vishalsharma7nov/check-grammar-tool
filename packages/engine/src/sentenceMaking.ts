import type { Category, Match } from "../../protocol/src/index";
import { checkExtraRules } from "./extraRules.ts";

/** Finite-looking verbs used to tell a real sentence from a fragment. */
const FINITE_HINT =
  /\b(am|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must|need|needs|seem|seems|go|goes|went|come|comes|came|make|makes|made|take|takes|took|get|gets|got|see|sees|saw|know|knows|think|thinks|say|says|give|gives|use|uses|want|wants|work|works|try|tries|call|calls|ask|asks|feel|feels|leave|left|keep|keeps|let|help|helps|talk|talks|turn|turns|start|starts|show|shows|hear|hears|play|plays|run|runs|move|moves|live|lives|believe|bring|happen|write|wrote|sit|stand|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|send|build|stay|fall|cut|reach|raise|pass|sell|decide|return|look|find|tell|become|mean|suggest|require|allow|add|expect|report|agree|accept|explain|remain|apply|choose|enjoy|prefer|fail|arrive|like|likes|liked)\b/i;

const BASE_VERBS = [
  "go",
  "do",
  "have",
  "want",
  "need",
  "work",
  "come",
  "make",
  "take",
  "get",
  "see",
  "know",
  "think",
  "say",
  "give",
  "use",
  "try",
  "call",
  "ask",
  "feel",
  "leave",
  "keep",
  "help",
  "talk",
  "turn",
  "start",
  "show",
  "hear",
  "play",
  "run",
  "move",
  "live",
  "believe",
  "bring",
  "happen",
  "write",
  "sit",
  "stand",
  "lose",
  "pay",
  "meet",
  "include",
  "continue",
  "learn",
  "change",
  "lead",
  "understand",
  "watch",
  "follow",
  "stop",
  "create",
  "speak",
  "read",
  "spend",
  "grow",
  "open",
  "walk",
  "win",
  "offer",
  "remember",
  "love",
  "consider",
  "appear",
  "buy",
  "wait",
  "serve",
  "send",
  "build",
  "stay",
  "fall",
  "reach",
  "raise",
  "pass",
  "sell",
  "decide",
  "return",
  "look",
  "find",
  "tell",
  "become",
  "mean",
  "suggest",
  "require",
  "allow",
  "add",
  "expect",
  "report",
  "agree",
  "accept",
  "explain",
  "remain",
  "apply",
  "choose",
  "enjoy",
  "prefer",
  "fail",
  "arrive",
  "like",
];

const S_FORMS: Record<string, string> = Object.fromEntries(
  BASE_VERBS.map((b) => [thirdPerson(b), b]),
);

const PAST_TO_BASE: Record<string, string> = {
  went: "go",
  came: "come",
  saw: "see",
  got: "get",
  made: "make",
  took: "take",
  had: "have",
  said: "say",
  told: "tell",
  did: "do",
  knew: "know",
  thought: "think",
  bought: "buy",
  brought: "bring",
  caught: "catch",
  taught: "teach",
  felt: "feel",
  left: "leave",
  kept: "keep",
  slept: "sleep",
  wrote: "write",
  spoke: "speak",
  ran: "run",
  ate: "eat",
  drank: "drink",
  gave: "give",
  began: "begin",
  became: "become",
  found: "find",
  heard: "hear",
  held: "hold",
  lost: "lose",
  met: "meet",
  paid: "pay",
  sent: "send",
  sat: "sit",
  stood: "stand",
  understood: "understand",
  won: "win",
  built: "build",
  chose: "choose",
  drove: "drive",
  flew: "fly",
  grew: "grow",
  hid: "hide",
  spent: "spend",
  cut: "cut",
  put: "put",
  set: "set",
  hit: "hit",
  hurt: "hurt",
  let: "let",
  read: "read",
  worked: "work",
  wanted: "want",
  needed: "need",
  started: "start",
  tried: "try",
  asked: "ask",
  called: "call",
  looked: "look",
  used: "use",
  lived: "live",
  played: "play",
  walked: "walk",
  talked: "talk",
  decided: "decide",
  returned: "return",
};

const PAST_TO_PARTICIPLE: Record<string, string> = {
  went: "gone",
  came: "come",
  saw: "seen",
  got: "gotten",
  made: "made",
  took: "taken",
  ate: "eaten",
  wrote: "written",
  gave: "given",
  did: "done",
  ran: "run",
  spoke: "spoken",
  drove: "driven",
  flew: "flown",
  grew: "grown",
  knew: "known",
  showed: "shown",
};

const ING_PROGRESSIVE = [
  "going",
  "coming",
  "doing",
  "making",
  "trying",
  "working",
  "looking",
  "waiting",
  "getting",
  "taking",
  "running",
  "talking",
  "thinking",
  "feeling",
  "living",
  "starting",
  "leaving",
  "writing",
  "reading",
  "playing",
  "watching",
  "sitting",
  "standing",
  "walking",
  "moving",
  "planning",
  "using",
  "asking",
  "calling",
  "helping",
];

const SINGULAR_AFTER_ONE_OF = [
  "student",
  "employee",
  "friend",
  "thing",
  "person",
  "issue",
  "problem",
  "reason",
  "member",
  "user",
  "file",
  "item",
  "country",
  "company",
  "client",
  "customer",
  "child",
  "man",
  "woman",
  "day",
  "way",
  "case",
  "point",
  "question",
  "example",
  "team",
  "player",
  "book",
  "report",
];

const BE: Record<string, string> = {
  i: "am",
  he: "is",
  she: "is",
  it: "is",
  you: "are",
  we: "are",
  they: "are",
};

const MODAL_BEFORE =
  /(?:\b(?:will|would|could|can|shall|should|may|might|must|do|does|did|don't|doesn't|didn't|to|not|please)\s+)$/i;

const LEGIT_PASSIVE_PARTICIPLES = new Set([
  "submitted", "born", "founded", "established", "created", "built", "made", "written",
  "published", "released", "announced", "completed", "approved", "rejected", "sent",
  "received", "given", "taken", "held", "elected", "appointed", "named", "designed",
  "developed", "discovered", "invented", "formed", "acquired", "sold", "paid", "charged",
  "deployed", "installed", "implemented", "executed", "performed", "conducted", "awarded",
  "granted", "issued", "filed", "recorded", "registered", "accepted", "denied", "cancelled",
  "canceled", "postponed", "delayed", "extended", "expired", "terminated", "closed",
  "opened", "launched", "introduced", "presented", "shown", "hosted", "organized",
  "organised", "planned", "scheduled", "prepared", "processed", "handled", "managed",
  "maintained", "repaired", "restored", "destroyed", "damaged", "injured", "killed",
  "arrested", "convicted", "acquitted", "released", "saved", "protected", "secured",
  "verified", "validated", "confirmed", "certified", "licensed", "licenced", "authorized",
  "authorised", "endorsed", "recommended", "proposed", "offered", "requested", "ordered",
  "required", "mandated", "enforced", "applied", "allocated", "assigned", "delivered",
  "shipped", "transported", "moved", "relocated", "transferred", "converted", "changed",
  "modified", "updated", "revised", "edited", "corrected", "fixed", "resolved", "addressed",
  "treated", "recovered", "improved", "enhanced", "upgraded", "expanded", "reduced",
  "increased", "decreased", "raised", "lowered", "stopped", "started", "begun", "initiated",
  "triggered", "caused", "prevented", "avoided", "eliminated", "removed", "deleted",
  "cleared", "cleaned", "used", "worn", "broken", "lost", "found", "hidden", "revealed",
  "exposed", "uncovered", "detected", "identified", "recognized", "recognised", "classified",
  "reviewed", "evaluated", "assessed", "measured", "counted", "calculated", "estimated",
  "predicted", "expected", "anticipated", "intended", "aimed", "targeted", "focused",
  "focussed", "centered", "centred", "based", "grounded", "rooted", "fixed", "placed",
  "located", "situated", "headquartered", "incorporated", "listed", "quoted", "traded",
  "valued", "priced", "billed", "invoiced", "refunded", "compensated", "rewarded",
  "punished", "fined", "taxed", "funded", "financed", "invested", "donated", "contributed",
  "supported", "backed", "sponsored", "advertised", "promoted", "marketed", "pitched",
]);

export function isLegitPassive(match: string): boolean {
  const parts = match.toLowerCase().split(/\s+/);
  const participle = parts[parts.length - 1]?.replace(/[^a-z]/g, "") ?? "";
  return LEGIT_PASSIVE_PARTICIPLES.has(participle);
}

/** Missing-apostrophe contractions often typed in chat/email. */
const MISSING_APOSTROPHE: Record<string, string> = {
  dont: "don't",
  doesnt: "doesn't",
  didnt: "didn't",
  cant: "can't",
  wont: "won't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  werent: "weren't",
  havent: "haven't",
  hasnt: "hasn't",
  hadnt: "hadn't",
  wouldnt: "wouldn't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  mustnt: "mustn't",
  thats: "that's",
  whats: "what's",
  whos: "who's",
  theres: "there's",
  heres: "here's",
  lets: "let's",
  im: "I'm",
  youre: "you're",
  theyre: "they're",
  weve: "we've",
  theyve: "they've",
  youve: "you've",
  ive: "I've",
  hes: "he's",
  shes: "she's",
};

type Skip = (index: number) => boolean;

function thirdPerson(base: string): string {
  if (base === "have") return "has";
  if (base === "do") return "does";
  if (base === "go") return "goes";
  if (/[sxz]$/.test(base) || /[cs]h$/.test(base)) return base + "es";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ies";
  return base + "s";
}

function keepCase(src: string, next: string): string {
  if (src[0] === src[0].toUpperCase() && /[A-Za-z]/.test(src[0])) {
    return next[0].toUpperCase() + next.slice(1);
  }
  return next;
}

function add(
  matches: Match[],
  offset: number,
  length: number,
  ruleId: string,
  message: string,
  explanation: string,
  replacements: string[],
  category: Category = "grammar",
) {
  matches.push({
    offset,
    length,
    ruleId,
    category,
    message,
    explanation,
    replacements,
  });
}

function each(
  text: string,
  re: RegExp,
  skip: Skip,
  fn: (m: RegExpExecArray) => void,
) {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (skip(m.index)) continue;
    fn(m);
    if (!re.global) break;
  }
}

function blockedByModal(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 24), index);
  return MODAL_BEFORE.test(before);
}

type Span = { start: number; end: number; raw: string };

function splitSentences(text: string): Span[] {
  const out: Span[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    if (ch === "." && i > 0 && i + 1 < text.length && /\d/.test(text[i - 1]) && /\d/.test(text[i + 1])) {
      continue;
    }
    const chunk = text.slice(start, i + 1);
    if (ch === "." && /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|Inc|Ltd)\.)\s*$/i.test(chunk)) continue;
    out.push({ start, end: i + 1, raw: chunk });
    start = i + 1;
  }
  if (start < text.length) out.push({ start, end: text.length, raw: text.slice(start) });
  return out;
}

function leadingSpace(raw: string): number {
  const m = raw.match(/^\s*/);
  return m ? m[0].length : 0;
}

export function checkSentenceMaking(text: string, skip: Skip): Match[] {
  const matches: Match[] = [];

  each(text, /\b(he|she|it)\s+are\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_SV_ARE",
      `Subject-verb: “${m[1]}” takes “is”, not “are”.`,
      "Singular third-person subjects agree with is/was/has.",
      [`${keepCase(m[1], m[1].toLowerCase())} is`],
    );
  });

  each(text, /\b(they|we|you)\s+is\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_SV_IS",
      `Subject-verb: “${m[1]}” takes “are”, not “is”.`,
      "Plural (and you) agree with are/were/have.",
      [`${keepCase(m[1], m[1].toLowerCase())} are`],
    );
  });

  each(text, /\bi\s+is\b/gi, skip, (m) => {
    add(matches, m.index, m[0].length, "GRAMMAR_SV_I_IS", "Subject-verb: “I” takes “am”, not “is”.", "First person singular uses am.", ["I am"]);
  });

  each(text, /\bi\s+are\b/gi, skip, (m) => {
    add(matches, m.index, m[0].length, "GRAMMAR_SV_I_ARE", "Subject-verb: “I” takes “am”, not “are”.", "First person singular uses am.", ["I am"]);
  });

  each(text, /\b(you|we|they)\s+was\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_SV_WAS",
      `Subject-verb: “${m[1]}” takes “were”, not “was”.`,
      "Was is singular; were is plural (and used with you).",
      [`${keepCase(m[1], m[1].toLowerCase())} were`],
    );
  });

  each(text, /\b(he|she|it)\s+have\b/gi, skip, (m) => {
    if (blockedByModal(text, m.index)) return;
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_SV_HAVE",
      `Subject-verb: “${m[1]}” takes “has”, not “have”.`,
      "Third-person singular uses has in the present.",
      [`${keepCase(m[1], m[1].toLowerCase())} has`],
    );
  });

  each(text, /\b(i|you|we|they)\s+has\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_SV_HAS",
      `Subject-verb: “${m[1]}” takes “have”, not “has”.`,
      "I/you/we/they take have.",
      [`${keepCase(m[1], m[1] === "i" ? "I" : m[1].toLowerCase())} have`],
    );
  });

  each(text, /\b(he|she|it)\s+don't\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_SV_DONT",
      `Subject-verb: “${m[1]} don't” should be “doesn't”.`,
      "Doesn't is the third-person singular negative.",
      [`${keepCase(m[1], m[1].toLowerCase())} doesn't`],
    );
  });

  each(text, /\b(i|you|we|they)\s+doesn't\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_SV_DOESNT",
      `Subject-verb: “${m[1]} doesn't” should be “don't”.`,
      "Don't is used with I/you/we/they.",
      [`${keepCase(m[1], m[1] === "i" ? "I" : m[1].toLowerCase())} don't`],
    );
  });

  const heSheItBase = new RegExp(`\\b(he|she|it)\\s+(${BASE_VERBS.join("|")})\\b`, "gi");
  each(text, heSheItBase, skip, (m) => {
    if (blockedByModal(text, m.index)) return;
    const pron = m[1];
    const verb = m[2].toLowerCase();
    if (verb === "have") return;
    const next = thirdPerson(verb);
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_SV_3SG",
      `Subject-verb: “${pron} ${m[2]}” should be “${pron} ${next}”.`,
      "A he/she/it subject needs the -s form in the present simple.",
      [`${keepCase(pron, pron.toLowerCase())} ${next}`],
    );
  });

  const theyS = new RegExp(`\\b(i|you|we|they)\\s+(${Object.keys(S_FORMS).join("|")})\\b`, "gi");
  each(text, theyS, skip, (m) => {
    const pron = m[1];
    const verb = m[2].toLowerCase();
    const base = S_FORMS[verb];
    if (!base || verb === "has") return;
    const shown = pron.toLowerCase() === "i" ? "I" : pron.toLowerCase();
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_SV_PLURAL_S",
      `Subject-verb: “${pron} ${m[2]}” should be “${shown} ${base}”.`,
      "I/you/we/they take the base form in the present simple, not -s.",
      [`${keepCase(pron, shown)} ${base}`],
    );
  });

  const didPast = new RegExp(
    `\\b(did not|didn't|did)\\s+(${Object.keys(PAST_TO_BASE).join("|")}|\\w+ed)\\b`,
    "gi",
  );
  each(text, didPast, skip, (m) => {
    const aux = m[1];
    const past = m[2].toLowerCase();
    const base = PAST_TO_BASE[past] || (past.endsWith("ied") ? past.slice(0, -3) + "y" : past.replace(/ed$/, ""));
    if (!base || base === past) return;
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_DID_PAST",
      `After “${aux}”, use the base verb (“${base}”), not the past tense.`,
      "Did already marks past tense, so the main verb stays in the infinitive: did go, not did went.",
      [`${aux} ${base}`],
    );
  });

  const havePast = new RegExp(`\\b(has|have|had)\\s+(${Object.keys(PAST_TO_PARTICIPLE).join("|")})\\b`, "gi");
  each(text, havePast, skip, (m) => {
    const part = PAST_TO_PARTICIPLE[m[2].toLowerCase()];
    if (!part) return;
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_PERFECT_FORM",
      `After “${m[1]}”, use the past participle “${part}”.`,
      "Perfect tenses are have/has/had + past participle (has gone, not has went).",
      [`${m[1]} ${part}`],
    );
  });

  const going = new RegExp(
    `\\b(i|he|she|it|you|we|they)\\s+(${ING_PROGRESSIVE.join("|")})\\b`,
    "gi",
  );
  each(text, going, skip, (m) => {
    const before = text.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
    if (/(?:\b(?:am|is|are|was|were|be|been|'m|'s|'re)\s+)$/.test(before)) return;
    const pron = m[1].toLowerCase();
    const be = BE[pron] || "is";
    const shown = pron === "i" ? "I" : pron;
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_MISSING_BE",
      `Missing helping verb: “${shown} ${m[2]}” should be “${shown} ${be} ${m[2]}”.`,
      "English progressive needs a form of be: I am going, she is working.",
      [`${keepCase(m[1], shown)} ${be} ${m[2].toLowerCase()}`],
    );
  });

  each(text, /\b(can|could|will|would|should)\s+able\s+to\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_CAN_ABLE",
      `“${m[1]} able to” doubles the meaning. Use “${m[1]}” or “able to”, not both.`,
      "Can/could already means able to.",
      [m[1].toLowerCase(), `is able to`],
    );
  });

  each(text, /\b(am|is|are|was|were)\s+agree\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_AM_AGREE",
      "Use “agree”, not “am/is/are agree”.",
      "Agree is a verb by itself: I agree, she agrees.",
      ["agree"],
    );
  });

  each(text, /\bdiscuss(?:es|ed|ing)?\s+about\b/gi, skip, (m) => {
    const stem = m[0].replace(/\s+about$/i, "");
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_DISCUSS_ABOUT",
      "Use “discuss” without “about”.",
      "Discuss already takes a direct object: discuss the plan.",
      [stem],
    );
  });

  each(text, /\bdespite\s+of\b/gi, skip, (m) => {
    add(matches, m.index, m[0].length, "GRAMMAR_DESPITE_OF", "Use “despite” or “in spite of”, not “despite of”.", "Despite does not take of.", ["despite", "in spite of"]);
  });

  each(text, /\bcompris(?:e|es|ed|ing)\s+of\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_COMPRISE_OF",
      "Use “comprise” without “of”, or switch to “consist of”.",
      "The whole comprises the parts; it consists of the parts.",
      [m[0].replace(/\s+of$/i, ""), "consist of"],
    );
  });

  each(text, /\b(return|revert|enter|exit|approach)\s+back\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_RETURN_BACK",
      `“${m[1]} back” repeats the idea. “${m[1]}” is enough.`,
      "The verb already includes the direction.",
      [m[1].toLowerCase()],
    );
  });

  each(text, /\baccording to me\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_ACCORDING_TO_ME",
      "Prefer “in my opinion” or “I think” over “according to me”.",
      "According to usually introduces another source, not yourself.",
      ["in my opinion", "I think"],
    );
  });

  each(text, /\bmore\s+(better|best|worse|worst|easier|harder|faster|slower|bigger|smaller|stronger)\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_DOUBLE_COMPARATIVE",
      `Drop “more” — “${m[1]}” is already comparative.`,
      "Do not stack more with -er forms.",
      [m[1].toLowerCase()],
    );
  });

  each(text, /\bthere\s+is\s+(many|several|few|two|three|four|five|six|seven|eight|nine|ten|[2-9]\d*)\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_THERE_IS_PLURAL",
      "Use “there are” before a plural quantity.",
      "There is + singular; there are + plural.",
      [`there are ${m[1]}`],
    );
  });

  each(text, /\bthere\s+are\s+(a|an|one)\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_THERE_ARE_SINGULAR",
      "Use “there is” before a singular noun.",
      "There is + singular; there are + plural.",
      [`there is ${m[1]}`],
    );
  });

  each(text, /\bthis\s+(are|were)\b/gi, skip, (m) => {
    add(matches, m.index, m[0].length, "GRAMMAR_THIS_ARE", "“This” is singular: use “this is / this was” or “these are”.", "This/that take is; these/those take are.", ["this is", "these are"]);
  });

  each(text, /\bthese\s+(is|was)\b/gi, skip, (m) => {
    add(matches, m.index, m[0].length, "GRAMMAR_THESE_IS", "“These” is plural: use “these are / these were” or “this is”.", "This/that take is; these/those take are.", ["these are", "this is"]);
  });

  each(text, /\bthis\s+(sentences|things|items|people|issues|problems|ideas|files|reports|students|employees)\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_THIS_PLURAL_NOUN",
      `Number: “this ${m[1]}” should be “these ${m[1]}” or a singular noun.`,
      "This goes with a singular noun; these goes with a plural.",
      [`these ${m[1]}`, `this ${m[1].replace(/s$/, "")}`],
    );
  });

  const oneOf = new RegExp(`\\bone of (?:the|my|our|his|her|their) (${SINGULAR_AFTER_ONE_OF.join("|")})\\b`, "gi");
  each(text, oneOf, skip, (m) => {
    const plural = m[1] === "person" ? "people" : m[1] === "child" ? "children" : m[1] === "man" ? "men" : m[1] === "woman" ? "women" : m[1] + "s";
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_ONE_OF_PLURAL",
      `After “one of”, the noun is plural: “one of the ${plural}”.`,
      "You pick one from a group, so the group noun is plural.",
      [m[0].replace(new RegExp(m[1] + "$", "i"), plural)],
    );
  });

  each(text, /\bbetween you and I\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_BETWEEN_YOU_AND_I",
      "Object pronoun: “between you and me”.",
      "Between is a preposition, so it takes me, not I.",
      ["between you and me"],
    );
  });

  each(text, /(^|[.!?]\s+)(me and )([A-Za-z][a-z]*)/gi, skip, (m) => {
    const name = m[3];
    add(
      matches,
      m.index + m[1].length,
      m[2].length + name.length,
      "GRAMMAR_ME_AND_SUBJECT",
      `Subject position: “${keepCase(name, name[0].toUpperCase() + name.slice(1).toLowerCase())} and I”, not “Me and ${name}”.`,
      "Use I for the subject of a clause; me for the object.",
      [`${keepCase(name, name[0].toUpperCase() + name.slice(1).toLowerCase())} and I`],
    );
  });

  each(
    text,
    /(^|[.!?]\s+)((?:Why|How|Where|When|What))\s+(you|I|we|they|he|she|it)\s+(is|are|was|were|do|does|did|can|will|would|should)\b/g,
    skip,
    (m) => {
      const rest = text.slice(m.index, m.index + 120);
      if (!rest.includes("?")) return;
      const wh = m[2];
      const pron = m[3];
      const aux = m[4];
      add(
        matches,
        m.index + m[1].length,
        m[0].length - m[1].length,
        "GRAMMAR_QUESTION_ORDER",
        `Question word order: “${wh} ${aux} ${pron}…”, not “${wh} ${pron} ${aux}”.`,
        "In questions, the auxiliary comes before the subject: Why are you…?",
        [`${wh} ${aux} ${pron}`],
      );
    },
  );

  each(text, /\b(?:although|though|even though)\b[^.]{0,80}\bbut\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_ALTHOUGH_BUT",
      "Use although or but, not both in the same clause pair.",
      "Although already makes the contrast, so but is extra.",
      [],
    );
  });

  each(
    text,
    /\bits\s+(?:not|ok(?:ay)?|fine|good|bad|great|better|worse|true|false|possible|likely|clear|important|necessary|required|available|working|broken|fixed|open|closed|here|there|now|then|always|never|still|already|just|also|only|even|really|very|so|too|quite|pretty|fairly|rather|probably|possibly|maybe|perhaps|certainly|definitely|surely|clearly|obviously|going|raining|snowing|time|late|early|hard|easy|difficult|simple|weird|strange|normal|happy|sad|tired|done|finished|ready|complete|incomplete|safe|unsafe|legal|illegal|fair|unfair|fun|boring|interesting|sad|dead|alive|born|mine|yours|his|hers|theirs|ours|been|being|had|having|got|getting|becoming|seeming|appearing|sounding|feeling|looking|seem|appears|sounds|feels|looks)\b/gi,
    skip,
    (m) => {
      add(
        matches,
        m.index,
        3,
        "GRAMMAR_ITS_IT_IS",
        "This “its” is probably the contraction “it's” (it is).",
        "Its is possessive (its color). It's means it is / it has.",
        ["it's"],
      );
    },
  );

  each(
    text,
    /\bits\s+(?:a|an)\s+(?:good|bad|great|big|small|long|short|new|old|hot|cold|fast|slow|high|low|right|wrong|true|false|real|valid|safe|common|rare|free|busy|empty|full|hard|easy|difficult|simple|complex|weird|strange|normal|happy|sad|tired|ready|done|finished|complete|possible|impossible|likely|unlikely|clear|important|necessary|required|optional|available|working|broken|fixed|open|closed|locked|unlocked|great|nice|fine|ok(?:ay)?|problem|issue|mistake|error|bug|feature|shame|pity|surprise|relief|pleasure|honor|honour|blessing|curse|disaster|catastrophe|miracle|wonder|shame)\b/gi,
    skip,
    (m) => {
      add(
        matches,
        m.index,
        3,
        "GRAMMAR_ITS_IT_IS",
        "This “its” is probably the contraction “it's” (it is).",
        "Its is possessive (its color). It's means it is / it has.",
        ["it's"],
      );
    },
  );

  each(text, /\bbecause\b[^.]{0,80}\bso\b/gi, skip, (m) => {
    add(
      matches,
      m.index,
      m[0].length,
      "GRAMMAR_BECAUSE_SO",
      "Use because or so, not both for the same reason.",
      "Because already marks cause; so marks result. Pick one.",
      [],
    );
  });

  for (const [raw, fixed] of Object.entries(MISSING_APOSTROPHE)) {
    const re = new RegExp(`\\b${raw}\\b`, "gi");
    each(text, re, skip, (m) => {
      add(
        matches,
        m.index,
        m[0].length,
        "GRAMMAR_MISSING_APOSTROPHE",
        `Missing apostrophe: “${m[0]}” → “${fixed}”.`,
        "Contractions need an apostrophe in standard English.",
        [keepCase(m[0], fixed)],
      );
    });
  }

  each(text, /\btheir\s+(?:is|are|was|were|will|would|should|could|might|may|can|has|have|had|been|being|going|not|here)\b/gi, skip, (m) => {
    add(matches, m.index, 5, "GRAMMAR_HOMOPHONE_THEIR", "“Their” is possessive; you probably mean “there” or “they're”.", "Their = belonging to them. There = place. They're = they are.", ["there", "they're"]);
  });

  each(text, /\bthere\s+(?:own|first|last|name|job|team|work|home|car|phone|email|idea|plan|goal|role|task|issue|problem|solution|answer|question|reason|way|path|choice|option|decision|view|perspective|approach|method|style|design|color|colour|size|shape|type|kind|sort|form|part|piece|bit|side|end|edge|corner|center|centre|top|bottom|left|right|front|back|history|story|culture|language|voice|tone|style|brand|product|service|company|business|office|department|manager|leader|staff|member|user|customer|client|partner|friend|family|parent|child|brother|sister|husband|wife|son|daughter|boss|colleague|neighbor|neighbour)\b/gi, skip, (m) => {
    add(matches, m.index, 5, "GRAMMAR_HOMOPHONE_THERE", "“There” is a place; you probably mean “their” (possessive).", "Their = belonging to them. There = in that place.", ["their"]);
  });

  each(text, /\byour\s+(?:going|not|here|there|done|finished|ready|welcome|right|wrong|welcome|invited|welcome|welcome)\b/gi, skip, (m) => {
    add(matches, m.index, 4, "GRAMMAR_HOMOPHONE_YOUR", "“Your” is possessive; you probably mean “you're” (you are).", "Your = belonging to you. You're = you are.", ["you're"]);
  });

  each(text, /\byou're\s+(?:name|job|team|work|home|car|phone|email|idea|plan|goal|role|task|issue|problem|way|choice|decision|view|approach|method|style|company|office|boss|friend|family|parent|child|boss|colleague)\b/gi, skip, (m) => {
    add(matches, m.index, 5, "GRAMMAR_HOMOPHONE_YOURE", "“You're” means you are; you probably mean “your” (possessive).", "Your = belonging to you. You're = you are.", ["your"]);
  });

  each(text, /\b(?:want|need|try|plan|go|come|talk|work|buy|pay|move|change|improve|fix|apply|register|download|upload|install|update|delete|remove|add|create|build|develop|design|test|deploy|launch|release|publish|share|post|reply|respond)\s+to\s+(?:much|many|late|early|soon|often|hard|easy|fast|slow|good|bad|great|nice|fine|ok|okay|well|better|worse|best|worst|more|less|enough|so|very|really|quite|pretty|fairly|rather)\b/gi, skip, (m) => {
    const tooStart = m.index + m[0].lastIndexOf(" to ");
    add(matches, tooStart + 1, 2, "GRAMMAR_HOMOPHONE_TO_TOO", "“Too” (also/excessively) fits here, not “to”.", "To = direction/infinitive. Too = also or excessively. Two = the number.", ["too"]);
  });

  each(text, /\btoo\s+(?:go|do|have|want|need|try|plan|hope|decide|choose|learn|come|talk|speak|write|read|send|give|take|make|see|know|think|believe|feel|look|listen|watch|wait|start|stop|begin|finish|continue|help|ask|tell|show|explain|work|play|study|buy|sell|pay|move|change|improve|fix|solve|handle|manage|join|leave|stay|return|visit|travel|create|build|develop|design|test|deploy|launch|release|publish|share|post|reply|respond|apply|register|sign|download|upload|install|update|delete|remove|add)\b/gi, skip, (m) => {
    add(matches, m.index, 3, "GRAMMAR_HOMOPHONE_TOO_TO", "“To” (infinitive) fits here, not “too”.", "To = direction/infinitive. Too = also or excessively.", ["to"]);
  });

  each(text, /\btwo\s+(?:much|many|late|early|soon|often|rarely|hard|easy|fast|slow|good|bad|great|nice|fine|ok|okay|well|better|worse|best|worst|more|less|enough|so|very|really|quite|pretty|fairly|rather|somewhat|extremely|absolutely|completely|totally|entirely|partly|mostly|mainly|largely|slightly|barely|hardly|nearly|almost|about|around|approximately|roughly|exactly|precisely|literally|figuratively|probably|possibly|maybe|perhaps|likely|unlikely|certainly|definitely|surely|clearly|obviously)\b/gi, skip, (m) => {
    add(matches, m.index, 3, "GRAMMAR_HOMOPHONE_TWO_TOO", "“Too” (also/excessively) fits here, not “two”.", "Two = the number. Too = also or excessively.", ["too"]);
  });

  each(text, /\b(?:bigger|smaller|larger|better|worse|best|worst|more|less|faster|slower|higher|lower|longer|shorter|stronger|weaker|harder|easier|earlier|later|sooner|closer|farther|further|heavier|lighter|younger|older|newer|nicer|finer|richer|poorer|happier|sadder|angrier|calmer|busier|quieter|louder|brighter|darker|warmer|cooler|hotter|colder|cheaper|tougher|softer|thicker|thinner|wider|narrower|deeper|shallower|taller|shorter)\s+then\b/gi, skip, (m) => {
    const thenStart = m.index + m[0].lastIndexOf(" then");
    add(matches, thenStart + 1, 4, "GRAMMAR_HOMOPHONE_THEN_THAN", "Comparisons use “than”, not “then”.", "Then = time/sequence. Than = comparison.", ["than"]);
  });

  each(text, /\bthan\s+(?:I|we|you|they|he|she|it|the|a|an|this|that|these|those|my|your|our|their|his|her|its|some|any|every|each|all|both|either|neither|what|which|who|whom|where|when|why|how)\s+(?:will|would|should|could|can|may|might|must|shall|do|does|did|have|has|had|am|is|are|was|were|be|been|being|go|goes|went|come|comes|came|make|makes|made|take|takes|took|get|gets|got|see|sees|saw|know|knows|think|thinks|say|says|give|gives|use|uses|want|wants|work|works|try|tries|call|calls|ask|asks|feel|feels|leave|left|keep|keeps|help|helps|talk|talks|turn|turns|start|starts|show|shows|hear|hears|play|plays|run|runs|move|moves|live|lives|believe|bring|happen|write|wrote|sit|stand|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|send|build|stay|fall|cut|reach|raise|pass|sell|decide|return|look|find|tell|become|mean|suggest|require|allow|add|expect|report|agree|accept|explain|remain|apply|choose|enjoy|prefer|fail|arrive|like|likes|liked)\b/gi, skip, (m) => {
    add(matches, m.index, 4, "GRAMMAR_HOMOPHONE_THAN_THEN", "Sequence/time uses “then”, not “than”.", "Then = time/sequence. Than = comparison.", ["then"]);
  });

  each(text, /\b(?:the|a|an|this|that|these|those|my|your|our|their|his|her|its|some|any|every|each|all|both|either|neither|what|which|no|another|other|same|similar|different|opposite|main|primary|secondary|key|core|major|minor|side|direct|indirect|overall|net|gross|positive|negative|long|short|term|immediate|delayed|instant|lasting|permanent|temporary|possible|likely|potential|actual|real|virtual|side|adverse|beneficial|harmful|helpful|useful|useless|significant|insignificant|substantial|minimal|maximum|minimum|optimal|suboptimal|desired|undesired|intended|unintended|expected|unexpected|predicted|unpredicted|observed|unobserved|measured|unmeasured|reported|unreported|documented|undocumented|known|unknown|visible|invisible|noticeable|unnoticeable|dramatic|subtle|big|small|large|tiny|huge|massive|minor|major)\s+effect\b/gi, skip, (m) => {
    const eff = m[0].match(/\beffect\b/i);
    if (!eff || eff.index === undefined) return;
    add(matches, m.index + eff.index, 6, "GRAMMAR_HOMOPHONE_AFFECT_EFFECT", "As a verb meaning influence, use “affect”.", "Affect (verb) = influence. Effect (noun) = result.", ["affect"]);
  });

  each(text, /\b(?:will|would|should|could|can|may|might|must|shall|to|try|trying|tries|tried|begin|began|start|started|continue|continued|help|helped|helps|need|needed|needs|want|wanted|wants|like|liked|likes|love|loved|loves|hope|hoped|hopes|expect|expected|expects|intend|intended|intends|plan|planned|plans|aim|aimed|aims|seek|sought|seeks|fail|failed|fails|manage|managed|manages|attempt|attempted|attempts|strive|strove|strives|struggle|struggled|struggles|work|worked|works|keep|kept|keeps|stop|stopped|stops|avoid|avoided|avoids|prevent|prevented|prevents|reduce|reduced|reduces|increase|increased|increases|improve|improved|improves|worsen|worsened|worsens|change|changed|changes|alter|altered|alters|modify|modified|modifies|impact|impacted|impacts|influence|influenced|influences|shape|shaped|shapes|determine|determined|determines|decide|decided|decides|control|controlled|controls|limit|limited|limits|restrict|restricted|restricts|enhance|enhanced|enhances|boost|boosted|boosts|hurt|hurts|harm|harmed|harms|damage|damaged|damages|weaken|weakened|weakens|strengthen|strengthened|strengthens|undermine|undermined|undermines|support|supported|supports|undercut|undercut|undercuts|undermine|undermined|undermines)\s+the\s+effect\b/gi, skip, (m) => {
    const eff = m[0].match(/\beffect\b/i);
    if (!eff || eff.index === undefined) return;
    add(matches, m.index + eff.index, 6, "GRAMMAR_HOMOPHONE_AFFECT_EFFECT", "As a verb meaning influence, use “affect”.", "Affect (verb) = influence. Effect (noun) = result.", ["affect"]);
  });

  each(text, /\bless\s+(?:people|items|things|errors|mistakes|bugs|issues|problems|questions|options|choices|cases|examples|students|employees|members|users|customers|clients|partners|friends|visitors|guests|teams|groups|companies|products|features|parts|pages|files|reports|documents|years|months|weeks|days|hours|minutes|seconds|times|attempts|tries|steps|tasks|jobs|roles|names|words|lines|rows|columns|units|points|places|rooms|seats|tickets|orders|requests|calls|emails|messages|comments|posts|votes|reviews|ratings|scores|grades|marks|labels|tags|links|nodes|edges|keys|tokens|ids|codes|numbers|accounts|profiles|records|entries|events|sessions|visits|clicks|views|downloads|uploads|installs|updates|upgrades|patches|fixes|releases|versions|builds|deploys|tests|checks|runs|loops|iterations|cycles|rounds|turns|games|matches|wins|losses|draws|goals|points|shots|hits|misses|errors|warnings|alerts|notifications|reminders|notes|ideas|plans|goals|targets|milestones|deadlines|delays|extensions|retries|failures|successes|passes|fails|skips|drops|adds|removes|changes|edits|saves|loads|imports|exports|copies|moves|renames|deletes|creates|updates|merges|splits|joins|groups|sorts|filters|searches|results|matches|hits|misses)\b/gi, skip, (m) => {
    add(matches, m.index, 4, "GRAMMAR_LESS_FEWER", "Use “fewer” with countable nouns.", "Fewer = countable. Less = uncountable or abstract amount.", ["fewer"]);
  });

  each(text, /\b(?:to|for|with|from|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|during|before|after|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\s+who\b/gi, skip, (m) => {
    add(matches, m.index + m[0].length - 3, 3, "GRAMMAR_WHO_WHOM", "After a preposition, use “whom”.", "Who = subject. Whom = object (especially after prepositions).", ["whom"]);
  });

  each(text, /\bwho\s+did\s+you\s+(?:give|send|tell|ask|show|offer|lend|pay|bring|take|hand|pass|email|call|text|message|notify|inform|remind|warn|assure|convince|persuade|introduce|recommend|refer|assign|delegate|report|describe|explain|mention|quote|cite|credit|blame|accuse|charge|fine|reward|punish|thank|congratulate|compliment|praise|critique|criticize|criticise|scold|rebuke|admonish|counsel|advise|coach|mentor|train|teach|tutor|guide|lead|direct|instruct|order|command|request|beg|plead|implore|beseech|entreat|appeal|petition|pray|wish|hope|expect|want|need|require|demand|expect|anticipate|await|look|wait|watch|observe|monitor|track|follow|supervise|oversee|manage|handle|deal|address|serve|help|assist|support|aid|back|fund|finance|sponsor|subsidize|subsidise|subsidize|subsidise|subsidize|subsidise)\b/gi, skip, (m) => {
    add(matches, m.index, 3, "GRAMMAR_WHO_WHOM2", "Object of the verb: use “whom”, not “who”.", "Who = subject. Whom = object.", ["whom"]);
  });

  each(text, /\balot\b/gi, skip, (m) => {
    add(matches, m.index, m[0].length, "GRAMMAR_A_LOT", "“A lot” is two words.", "Alot is not standard English.", ["a lot"]);
  });

  each(text, /\birregardless\b/gi, skip, (m) => {
    add(matches, m.index, m[0].length, "GRAMMAR_IRREGARDLESS", "Use “regardless”, not “irregardless”.", "Irregardless is nonstandard.", ["regardless"]);
  });

  each(text, /\bexpresso\b/gi, skip, (m) => {
    add(matches, m.index, m[0].length, "SPELL_EXPRESSO", "“Espresso”, not “expresso”.", "Common misspelling of espresso.", ["espresso"]);
  });

  each(text, /\b(accept|except)\s+(?:for|from|to|that|this|it|the|a|an|my|your|our|his|her|their|its|some|any|no|each|every|all|both|either|neither|what|which|who|whom|where|when|why|how)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "accept") return;
    add(matches, m.index, m[1].length, "GRAMMAR_ACCEPT_EXCEPT", "“Except” (excluding) fits here, not “accept”.", "Accept = receive/agree. Except = excluding.", ["except"]);
  });

  each(text, /\b(?:everyday|every day)\b/gi, skip, (m) => {
    const w = m[0].toLowerCase();
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 20);
    if (w === "everyday" && /^\s+(?:I|we|you|they|he|she|it|people|users|customers|clients|teams|employees|students|members|visitors|guests|patients|drivers|workers|staff|folks|everyone|someone|anyone|nobody|everybody|somebody|anybody)\b/i.test(after)) {
      add(matches, m.index, m[0].length, "GRAMMAR_EVERYDAY", "“Every day” (each day) is two words here.", "Everyday = adjective (everyday tasks). Every day = each day.", ["every day"]);
    }
    if (w === "every day" && /^\s+(?:task|tasks|life|lives|use|uses|usage|wear|clothes|clothing|shoes|shoe|work|job|jobs|routine|routines|activity|activities|practice|practices|habit|habits|chore|chores|item|items|product|products|service|services|tool|tools|feature|features|function|functions|option|options|setting|settings|mode|modes|view|views|case|cases|example|examples|instance|instances|occasion|occasions|situation|situations|scenario|scenarios|context|contexts|environment|environments|setting|settings|scene|scenes|moment|moments|experience|experiences|encounter|encounters|interaction|interactions|conversation|conversations|discussion|discussions|meeting|meetings|call|calls|session|sessions|event|events|activity|activities|action|actions|request|requests|order|orders|ticket|tickets|case|cases|incident|incidents|alert|alerts|notification|notifications|reminder|reminders|note|notes|idea|ideas|plan|plans|goal|goals|target|targets|objective|objectives|milestone|milestones|deadline|deadlines|delay|delays|extension|extensions|retry|retries|failure|failures|success|successes|pass|passes|fail|fails|skip|skips|drop|drops|add|adds|remove|removes|change|changes|edit|edits|save|saves|load|loads|import|imports|export|exports|copy|copies|move|moves|rename|renames|delete|deletes|create|creates|update|updates|merge|merges|split|splits|join|joins|group|groups|sort|sorts|filter|filters|search|searches|result|results|match|matches|hit|hits|miss|misses)\b/i.test(after)) {
      add(matches, m.index, m[0].length, "GRAMMAR_EVERYDAY_ADJ", "“Everyday” (ordinary) is one word here.", "Everyday = adjective. Every day = each day.", ["everyday"]);
    }
  });

  each(text, /\b(advice|advise)\s+(?:me|us|him|her|them|you|the|a|an|this|that|these|those|my|your|our|their|his|her|its|some|any|no|each|every|all|both|either|neither|what|which|who|whom|where|when|why|how)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "advise") return;
    add(matches, m.index, m[1].length, "GRAMMAR_ADVICE_ADVISE", "Use the verb “advise”, not the noun “advice”.", "Advice = noun. Advise = verb.", ["advise"]);
  });

  each(text, /\b(breath|breathe)\s+(?:deeply|slowly|quickly|fast|hard|softly|quietly|loudly|heavily|lightly|easily|normally|regularly|irregularly|periodically|sporadically|intermittently|consistently|inconsistently|reliably|unreliably|predictably|unpredictably|expectedly|unexpectedly|surprisingly|unsurprisingly|obviously|clearly|apparently|seemingly|presumably|supposedly|allegedly|reportedly|purportedly|ostensibly|nominally|technically|practically|theoretically|hypothetically|realistically|optimistically|pessimistically|honestly|frankly|seriously|literally|figuratively|metaphorically|symbolically|ironically|coincidentally|accidentally|intentionally|deliberately|purposely|inadvertently|mistakenly|wrongly|rightly|correctly|incorrectly|properly|improperly|appropriately|inappropriately|suitably|unsuitably|adequately|inadequately|sufficiently|insufficiently|completely|incompletely|partially|fully|entirely|wholly|totally|absolutely|definitely|certainly|surely|probably|possibly|maybe|perhaps|likely|unlikely|doubtfully|questionably|arguably|debatably|undeniably|unquestionably|undoubtedly|indisputably|incontestably|irrefutably|unmistakably|unambiguously|explicitly|implicitly|directly|indirectly|openly|secretly|publicly|privately|formally|informally|officially|unofficially|legally|illegally|ethically|unethically|morally|immorally|socially|politically|economically|financially|commercially|personally|professionally|academically|scientifically|technically|medically|legally|historically|geographically|environmentally|ecologically|biologically|culturally|religiously|spiritually|emotionally|psychologically|physically|mentally|intellectually|creatively|artistically|musically|literarily|poetically|dramatically|comically|humorously|seriously|casually|formally|informally|politely|rudely|kindly|unkindly|gently|roughly|softly|loudly|quietly|silently|noisily|calmly|anxiously|nervously|confidently|uncertainly|happily|sadly|angrily|peacefully|violently|aggressively|passively|actively|proactively|reactively|strategically|tactically|operationally|functionally|practically|theoretically|conceptually|abstractly|concretely|specifically|generally|broadly|narrowly|widely|locally|globally|internationally|nationally|regionally|domestically|externally|internally)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "breathe") return;
    add(matches, m.index, m[1].length, "GRAMMAR_BREATH_BREATHE", "Use the verb “breathe”, not the noun “breath”.", "Breath = noun. Breathe = verb.", ["breathe"]);
  });

  each(text, /\b(desert|dessert)\s+(?:after|before|during|for|with|without|from|to|in|on|at|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "dessert") return;
    add(matches, m.index, m[1].length, "GRAMMAR_DESERT_DESSERT", "“Dessert” (sweet course) fits here, not “desert”.", "Desert = arid land/abandon. Dessert = sweet course.", ["dessert"]);
  });

  each(text, /\b(ensure|insure)\s+(?:that|the|a|an|this|that|these|those|my|your|our|their|his|her|its|some|any|no|each|every|all|both|either|neither|what|which|who|whom|where|when|why|how|quality|accuracy|precision|correctness|validity|reliability|durability|scalability|performance|latency|throughput|bandwidth|capacity|load|traffic|demand|supply|usage|consumption|cost|expense|budget|revenue|profit|loss|margin|growth|decline|trend|pattern|signal|metric|kpi|indicator|benchmark|baseline|target|goal|objective|milestone|deadline|timeline|schedule|plan|roadmap|backlog|sprint|iteration|cycle|phase|stage|step|gate|checkpoint|review|approval|signoff|decision|vote|consensus|agreement|contract|deal|offer|proposal|bid|quote|estimate|forecast|projection|prediction|assumption|hypothesis|theory|model|framework|methodology|approach|technique|practice|principle|rule|law|regulation|policy|standard|guideline|requirement|constraint|limit|boundary|scope|range|threshold|tolerance|margin|buffer|reserve|backup|fallback|default|baseline|reference|source|origin|root|cause|reason|factor|driver|trigger|event|incident|issue|problem|bug|defect|error|fault|failure|outage|downtime|delay|blocker|bottleneck|risk|threat|vulnerability|exposure|impact|consequence|effect|benefit|advantage|disadvantage|tradeoff|cost|price|value|return|roi|payoff|upside|downside|compliance|conformance|conformity|consistency|integrity|availability|reliability|durability|scalability|performance|latency|throughput|bandwidth|capacity|load|traffic|demand|supply|usage|consumption|cost|expense|budget|revenue|profit|loss|margin|growth|decline|trend|pattern|signal|metric|kpi|indicator|benchmark|baseline|target|goal|objective|milestone|deadline|timeline|schedule|plan|roadmap|backlog|sprint|iteration|cycle|phase|stage|step|gate|checkpoint|review|approval|signoff|decision|vote|consensus|agreement|contract|deal|offer|proposal|bid|quote|estimate|forecast|projection|prediction|assumption|hypothesis|theory|model|framework|methodology|approach|technique|practice|principle|rule|law|regulation|policy|standard|guideline|requirement|constraint|limit|boundary|scope|range|threshold|tolerance|margin|buffer|reserve|backup|fallback|default|baseline|reference|source|origin|root|cause|reason|factor|driver|trigger|event|incident|issue|problem|bug|defect|error|fault|failure|outage|downtime|delay|blocker|bottleneck|risk|threat|vulnerability|exposure|impact|consequence|effect|benefit|advantage|disadvantage|tradeoff|cost|price|value|return|roi|payoff|upside|downside)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "ensure") return;
    add(matches, m.index, m[1].length, "GRAMMAR_ENSURE_INSURE", "“Ensure” (make certain) fits here, not “insure”.", "Ensure = make certain. Insure = provide insurance.", ["ensure"]);
  });

  each(text, /\b(passed|past)\s+(?:the|a|an|this|that|these|those|my|your|our|their|his|her|its|some|any|no|each|every|all|both|either|neither|what|which|who|whom|where|when|why|how|time|times|deadline|deadlines|due|date|dates|hour|hours|minute|minutes|second|seconds|day|days|week|weeks|month|months|year|years|decade|decades|century|centuries|millennium|millennia|era|eras|epoch|epochs|period|periods|phase|phases|stage|stages|step|steps|gate|gates|checkpoint|checkpoints|review|reviews|approval|approvals|signoff|signoffs|decision|decisions|vote|votes|consensus|consensuses|agreement|agreements|contract|contracts|deal|deals|offer|offers|proposal|proposals|bid|bids|quote|quotes|estimate|estimates|forecast|forecasts|projection|projections|prediction|predictions|assumption|assumptions|hypothesis|hypotheses|theory|theories|model|models|framework|frameworks|methodology|methodologies|approach|approaches|technique|techniques|practice|practices|principle|principles|rule|rules|law|laws|regulation|regulations|policy|policies|standard|standards|guideline|guidelines|requirement|requirements|constraint|constraints|limit|limits|boundary|boundaries|scope|scopes|range|ranges|threshold|thresholds|tolerance|tolerances|margin|margins|buffer|buffers|reserve|reserves|backup|backups|fallback|fallbacks|default|defaults|baseline|baselines|reference|references|source|sources|origin|origins|root|roots|cause|causes|reason|reasons|factor|factors|driver|drivers|trigger|triggers|event|events|incident|incidents|issue|issues|problem|problems|bug|bugs|defect|defects|error|errors|fault|faults|failure|failures|outage|outages|downtime|downtimes|delay|delays|blocker|blockers|bottleneck|bottlenecks|risk|risks|threat|threats|vulnerability|vulnerabilities|exposure|exposures|impact|impacts|consequence|consequences|effect|effects|benefit|benefits|advantage|advantages|disadvantage|disadvantages|tradeoff|tradeoffs|cost|costs|price|prices|value|values|return|returns|roi|rois|payoff|payoffs|upside|upsides|downside|downsides)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "past") return;
    add(matches, m.index, m[1].length, "GRAMMAR_PASSED_PAST", "“Past” (previous time) fits here, not “passed”.", "Passed = verb (past tense of pass). Past = previous time.", ["past"]);
  });

  each(text, /\b(peace|piece)\s+(?:of|from|to|in|on|at|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "piece") return;
    add(matches, m.index, m[1].length, "GRAMMAR_PEACE_PIECE", "“Piece” (part) fits here, not “peace”.", "Peace = calm/absence of war. Piece = part/segment.", ["piece"]);
  });

  each(text, /\b(quiet|quite)\s+(?:a|an|the|this|that|these|those|my|your|our|their|his|her|its|some|any|no|each|every|all|both|either|neither|what|which|who|whom|where|when|why|how|good|bad|great|nice|fine|ok|okay|well|better|worse|best|worst|more|less|enough|so|very|really|quite|pretty|fairly|rather|somewhat|extremely|absolutely|completely|totally|entirely|partly|mostly|mainly|largely|slightly|barely|hardly|nearly|almost|about|around|approximately|roughly|exactly|precisely|literally|figuratively|probably|possibly|maybe|perhaps|likely|unlikely|certainly|definitely|surely|clearly|obviously)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "quite") return;
    add(matches, m.index, m[1].length, "GRAMMAR_QUIET_QUITE", "“Quite” (rather/very) fits here, not “quiet”.", "Quiet = silent. Quite = rather/very.", ["quite"]);
  });

  each(text, /\b(weather|whether)\s+(?:the|a|an|this|that|these|those|my|your|our|their|his|her|its|some|any|no|each|every|all|both|either|neither|what|which|who|whom|where|when|why|how|it|he|she|they|we|you|I|is|are|was|were|will|would|should|could|might|may|can|has|have|had|been|being|going|not|here|there|now|then|always|never|sometimes|often|rarely|usually|generally|typically|normally|commonly|frequently|occasionally|constantly|continuously|regularly|irregularly|periodically|sporadically|intermittently|consistently|inconsistently|reliably|unreliably|predictably|unpredictably|expectedly|unexpectedly|surprisingly|unsurprisingly|obviously|clearly|apparently|seemingly|presumably|supposedly|allegedly|reportedly|purportedly|ostensibly|nominally|technically|practically|theoretically|hypothetically|realistically|optimistically|pessimistically|honestly|frankly|seriously|literally|figuratively|metaphorically|symbolically|ironically|coincidentally|accidentally|intentionally|deliberately|purposely|inadvertently|mistakenly|wrongly|rightly|correctly|incorrectly|properly|improperly|appropriately|inappropriately|suitably|unsuitably|adequately|inadequately|sufficiently|insufficiently|completely|incompletely|partially|fully|entirely|wholly|totally|absolutely|definitely|certainly|surely|probably|possibly|maybe|perhaps|likely|unlikely|doubtfully|questionably|arguably|debatably|undeniably|unquestionably|undoubtedly|indisputably|incontestably|irrefutably|unmistakably|unambiguously|explicitly|implicitly|directly|indirectly|openly|secretly|publicly|privately|formally|informally|officially|unofficially|legally|illegally|ethically|unethically|morally|immorally|socially|politically|economically|financially|commercially|personally|professionally|academically|scientifically|technically|medically|legally|historically|geographically|environmentally|ecologically|biologically|culturally|religiously|spiritually|emotionally|psychologically|physically|mentally|intellectually|creatively|artistically|musically|literarily|poetically|dramatically|comically|humorously|seriously|casually|formally|informally|politely|rudely|kindly|unkindly|gently|roughly|softly|loudly|quietly|silently|noisily|calmly|anxiously|nervously|confidently|uncertainly|happily|sadly|angrily|peacefully|violently|aggressively|passively|actively|proactively|reactively|strategically|tactically|operationally|functionally|practically|theoretically|conceptually|abstractly|concretely|specifically|generally|broadly|narrowly|widely|locally|globally|internationally|nationally|regionally|domestically|externally|internally)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "whether") return;
    add(matches, m.index, m[1].length, "GRAMMAR_WEATHER_WHETHER", "“Whether” (if) fits here, not “weather”.", "Weather = climate conditions. Whether = if.", ["whether"]);
  });

  each(text, /\b(who's|whose)\s+(?:going|not|here|there|done|finished|ready|welcome|right|wrong|invited|also|still|already|just|about|probably|definitely|late|early|busy|free|sure|certain|happy|tired|sick|well|ok|okay|fine|good|bad|interested|aware|prepared|qualified|responsible|available|present|absent|correct|wrong|mistaken|confused|lost|stuck|blocked|set|able|willing|eager|excited|nervous|anxious|worried|confident|uncertain|unsure|name|job|team|work|home|car|phone|email|idea|plan|goal|role|task|issue|problem|way|choice|decision|view|approach|method|style|company|office|boss|friend|family|parent|child|colleague|manager|staff|member|product|service|project|report|file|document|account|password|address|number|turn|duty|responsibility|budget|cost|price|fee|salary|schedule|deadline|target|objective|priority|requirement|spec|standard|guideline|procedure|process|workflow|pipeline|framework|architecture|stack|tool|platform|system|module|component|feature|function|option|setting|configuration|parameter|variable|argument|input|output|result|outcome|impact|effect|benefit|risk|bug|fix|patch|update|upgrade|release|version|build|deploy|test|case|suite|scenario|step|action|task|item|list|queue|batch|group|cluster|node|link|connection|route|path|channel|thread|message|conversation|discussion|meeting|call|session|event|request|order|ticket|incident|alert|notification|reminder|email|letter|memo|summary|overview|brief|proposal|plan|roadmap|strategy|vision|mission|values|culture|department|division|unit|branch|location|site|region|market|segment|audience|customer|client|partner|vendor|supplier|stakeholder|investor|shareholder|board|committee|network|industry|sector|field|domain|area|topic|subject|theme|category|tag|label|keyword|term|phrase|word|sentence|paragraph|section|chapter|page|slide|deck|presentation|document|folder|directory|drive|server|host|instance|container|service|api|endpoint|url|domain|hostname|port|protocol|format|schema|model|dataset|table|column|row|field|record|entry|index|key|value|pair|map|set|list|array|object|class|interface|type|enum|module|package|library|dependency|plugin|extension|app|application|program|script|code|snippet|sample|example|demo|tutorial|guide|manual|handbook|reference|documentation|wiki|faq|help|support|guidance|advice|tip|trick|workaround|solution|answer)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "whose") return;
    add(matches, m.index, m[1].length, "GRAMMAR_WHOS_WHOSE", "“Whose” (possessive) fits here, not “who's”.", "Who's = who is. Whose = possessive.", ["whose"]);
  });

  each(text, /\b(sight|site|cite)\s+(?:of|from|to|in|on|at|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "site") return;
    add(matches, m.index, m[1].length, "GRAMMAR_SIGHT_SITE", "“Site” (location) fits here, not “sight”.", "Sight = vision/view. Site = location. Cite = reference.", ["site"]);
  });

  each(text, /\b(role|roll)\s+(?:of|from|to|in|on|at|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "role") return;
    add(matches, m.index, m[1].length, "GRAMMAR_ROLE_ROLL", "“Role” (function) fits here, not “roll”.", "Role = function/part. Roll = rotate/list.", ["role"]);
  });

  each(text, /\b(hole|whole)\s+(?:of|from|to|in|on|at|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "whole") return;
    add(matches, m.index, m[1].length, "GRAMMAR_HOLE_WHOLE", "“Whole” (entire) fits here, not “hole”.", "Hole = opening. Whole = entire/complete.", ["whole"]);
  });

  each(text, /\b(moral|morale)\s+(?:of|from|to|in|on|at|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "morale") return;
    add(matches, m.index, m[1].length, "GRAMMAR_MORAL_MORALE", "“Morale” (spirit/confidence) fits here, not “moral”.", "Moral = ethical lesson. Morale = team spirit.", ["morale"]);
  });

  each(text, /\b(capital|capitol)\s+(?:of|from|to|in|on|at|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "capital") return;
    add(matches, m.index, m[1].length, "GRAMMAR_CAPITAL_CAPITOL", "“Capital” (city/money) fits here, not “capitol”.", "Capital = city/money. Capitol = government building.", ["capital"]);
  });

  each(text, /\b(elicit|illicit)\s+(?:a|an|the|this|that|these|those|my|your|our|their|his|her|its|some|any|no|each|every|all|both|either|neither|what|which|who|whom|where|when|why|how|response|responses|reaction|reactions|feedback|feedbacks|comment|comments|reply|replies|answer|answers|question|questions|query|queries|request|requests|demand|demands|requirement|requirements|need|needs|want|wants|desire|desires|wish|wishes|hope|hopes|expect|expects|expectation|expectations|intention|intentions|intent|intents|plan|plans|goal|goals|target|targets|objective|objectives|milestone|milestones|deadline|deadlines|delay|delays|extension|extensions|retry|retries|failure|failures|success|successes|pass|passes|fail|fails|skip|skips|drop|drops|add|adds|remove|removes|change|changes|edit|edits|save|saves|load|loads|import|imports|export|exports|copy|copies|move|moves|rename|renames|delete|deletes|create|creates|update|updates|merge|merges|split|splits|join|joins|group|groups|sort|sorts|filter|filters|search|searches|result|results|match|matches|hit|hits|miss|misses)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "elicit") return;
    add(matches, m.index, m[1].length, "GRAMMAR_ELICIT_ILLICIT", "“Elicit” (draw out) fits here, not “illicit”.", "Elicit = draw out. Illicit = illegal.", ["elicit"]);
  });

  each(text, /\b(eminent|imminent)\s+(?:threat|threats|danger|dangers|risk|risks|hazard|hazards|peril|perils|menace|menaces|crisis|crises|disaster|disasters|catastrophe|catastrophes|emergency|emergencies|problem|problems|issue|issues|bug|bugs|defect|defects|error|errors|fault|faults|failure|failures|outage|outages|downtime|downtimes|delay|delays|blocker|blockers|bottleneck|bottlenecks|deadline|deadlines|due|date|dates|hour|hours|minute|minutes|second|seconds|day|days|week|weeks|month|months|year|years|decade|decades|century|centuries|millennium|millennia|era|eras|epoch|epochs|period|periods|phase|phases|stage|stages|step|steps|gate|gates|checkpoint|checkpoints|review|reviews|approval|approvals|signoff|signoffs|decision|decisions|vote|votes|consensus|consensuses|agreement|agreements|contract|contracts|deal|deals|offer|offers|proposal|proposals|bid|bids|quote|quotes|estimate|estimates|forecast|forecasts|projection|projections|prediction|predictions|assumption|assumptions|hypothesis|hypotheses|theory|theories|model|models|framework|frameworks|methodology|methodologies|approach|approaches|technique|techniques|practice|practices|principle|principles|rule|rules|law|laws|regulation|regulations|policy|policies|standard|standards|guideline|guidelines|requirement|requirements|constraint|constraints|limit|limits|boundary|boundaries|scope|scopes|range|ranges|threshold|thresholds|tolerance|tolerances|margin|margins|buffer|buffers|reserve|reserves|backup|backups|fallback|fallbacks|default|defaults|baseline|baselines|reference|references|source|sources|origin|origins|root|roots|cause|causes|reason|reasons|factor|factors|driver|drivers|trigger|triggers|event|events|incident|incidents|issue|issues|problem|problems|bug|bugs|defect|defects|error|errors|fault|faults|failure|failures|outage|outages|downtime|downtimes|delay|delays|blocker|blockers|bottleneck|bottlenecks|risk|risks|threat|threats|vulnerability|vulnerabilities|exposure|exposures|impact|impacts|consequence|consequences|effect|effects|benefit|benefits|advantage|advantages|disadvantage|disadvantages|tradeoff|tradeoffs|cost|costs|price|prices|value|values|return|returns|roi|rois|payoff|payoffs|upside|upsides|downside|downsides)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "imminent") return;
    add(matches, m.index, m[1].length, "GRAMMAR_EMINENT_IMMINENT", "“Imminent” (about to happen) fits here, not “eminent”.", "Eminent = famous/distinguished. Imminent = about to happen.", ["imminent"]);
  });

  each(text, /\b(allusion|illusion)\s+(?:to|of|from|in|on|at|by|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "allusion") return;
    add(matches, m.index, m[1].length, "GRAMMAR_ALLUSION_ILLUSION", "“Allusion” (indirect reference) fits here, not “illusion”.", "Allusion = indirect reference. Illusion = false appearance.", ["allusion"]);
  });

  each(text, /\b(aloud|allowed)\s+(?:to|for|with|from|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "allowed") return;
    add(matches, m.index, m[1].length, "GRAMMAR_ALOUD_ALLOWED", "“Allowed” (permitted) fits here, not “aloud”.", "Aloud = out loud. Allowed = permitted.", ["allowed"]);
  });

  each(text, /\b(personal|personnel)\s+(?:file|files|record|records|data|information|info|details|detail|account|accounts|profile|profiles|settings|setting|preferences|preference|options|option|choices|choice|decisions|decision|actions|action|tasks|task|items|item|lists|list|queues|queue|batches|batch|groups|group|clusters|cluster|nodes|node|links|link|connections|connection|routes|route|paths|path|channels|channel|threads|thread|messages|message|conversations|conversation|discussions|discussion|meetings|meeting|calls|call|sessions|session|events|event|activities|activity|requests|request|orders|order|tickets|ticket|cases|case|incidents|incident|alerts|alert|notifications|notification|reminders|reminder|emails|email|letters|letter|memos|memo|reports|report|summaries|summary|overviews|overview|briefs|brief|proposals|proposal|plans|plan|roadmaps|roadmap|strategies|strategy|visions|vision|missions|mission|values|value|cultures|culture|teams|team|departments|department|divisions|division|units|unit|branches|branch|locations|location|sites|site|regions|region|markets|market|segments|segment|audiences|audience|customers|customer|clients|client|partners|partner|vendors|vendor|suppliers|supplier|stakeholders|stakeholder|investors|investor|shareholders|shareholder|boards|board|committees|committee|networks|network|ecosystems|ecosystem|industries|industry|sectors|sector|fields|field|domains|domain|areas|area|topics|topic|subjects|subject|themes|theme|categories|category|tags|tag|labels|label|keywords|keyword|terms|term|phrases|phrase|words|word|sentences|sentence|paragraphs|paragraph|sections|section|chapters|chapter|pages|page|slides|slide|decks|deck|presentations|presentation|documents|document|folders|folder|directories|directory|drives|drive|disks|disk|volumes|volume|partitions|partition|servers|server|hosts|host|instances|instance|containers|container|pods|pod|services|service|apis|api|endpoints|endpoint|urls|url|uris|uri|links|link|domains|domain|hostnames|hostname|ips|ip|ports|port|protocols|protocol|formats|format|schemas|schema|models|model|datasets|dataset|tables|table|columns|column|rows|row|fields|field|records|record|entries|entry|indexes|index|indices|index|keys|key|values|value|pairs|pair|maps|map|sets|set|lists|list|arrays|array|objects|object|classes|class|interfaces|interface|types|type|enums|enum|structs|struct|unions|union|traits|trait|impls|impl|modules|module|packages|package|libraries|library|dependencies|dependency|plugins|plugin|extensions|extension|addons|addon|widgets|widget|apps|app|applications|application|programs|program|scripts|script|codes|code|snippets|snippet|samples|sample|examples|example|demos|demo|tutorials|tutorial|guides|guide|manuals|manual|handbooks|handbook|references|reference|documentations|documentation|wikis|wiki|faqs|faq|helps|help|supports|support|assistances|assistance|guidances|guidance|advices|advice|tips|tip|tricks|trick|hacks|hack|workarounds|workaround|solutions|solution|answers|answer|fixes|fix|patches|patch|updates|update|upgrades|upgrade|releases|release|versions|version|builds|build|deploys|deploy|deployments|deployment|implementations|implementation|integrations|integration|connections|connection|setups|setup|configurations|configuration|installations|installation|upgrades|upgrade|migrations|migration|transitions|transition|rollouts|rollout|launches|launch|releases|release|deployments|deployment|implementations|implementation|integrations|integration|connections|connection|setups|setup|configurations|configuration|installations|installation|upgrades|upgrade|backups|backup|restores|restore|recoveries|recovery|failovers|failover|redundancies|redundancy|replications|replication|syncs|sync|synchronizations|synchronization|consistencies|consistency|integrities|integrity|availabilities|availability|reliabilities|reliability|durabilities|durability|scalabilities|scalability|performances|performance|latencies|latency|throughputs|throughput|bandwidths|bandwidth|capacities|capacity|loads|load|traffics|traffic|demands|demand|supplies|supply|usages|usage|consumptions|consumption|costs|cost|expenses|expense|budgets|budget|revenues|revenue|profits|profit|losses|loss|margins|margin|growths|growth|declines|decline|trends|trend|patterns|pattern|signals|signal|metrics|metric|kpis|kpi|indicators|indicator|benchmarks|benchmark|baselines|baseline|targets|target|goals|goal|objectives|objective|milestones|milestone|deadlines|deadline|timelines|timeline|schedules|schedule|plans|plan|roadmaps|roadmap|backlogs|backlog|sprints|sprint|iterations|iteration|cycles|cycle|phases|phase|stages|stage|steps|step|gates|gate|checkpoints|checkpoint|reviews|review|approvals|approval|signoffs|signoff|decisions|decision|votes|vote|consensuses|consensus|agreements|agreement|contracts|contract|deals|deal|offers|offer|proposals|proposal|bids|bid|quotes|quote|estimates|estimate|forecasts|forecast|projections|projection|predictions|prediction|assumptions|assumption|hypotheses|hypothesis|theories|theory|models|model|frameworks|framework|methodologies|methodology|approaches|approach|techniques|technique|practices|practice|principles|principle|rules|rule|laws|law|regulations|regulation|policies|policy|standards|standard|guidelines|guideline|requirements|requirement|constraints|constraint|limits|limit|boundaries|boundary|scopes|scope|ranges|range|thresholds|threshold|tolerances|tolerance|margins|margin|buffers|buffer|reserves|reserve|backups|backup|fallbacks|fallback|defaults|default|baselines|baseline|references|reference|sources|source|origins|origin|roots|root|causes|cause|reasons|reason|factors|factor|drivers|driver|triggers|trigger|events|event|incidents|incident|issues|issue|problems|problem|bugs|bug|defects|defect|errors|error|faults|fault|failures|failure|outages|outage|downtimes|downtime|delays|delay|blockers|blocker|bottlenecks|bottleneck|risks|risk|threats|threat|vulnerabilities|vulnerability|exposures|exposure|impacts|impact|consequences|consequence|effects|effect|benefits|benefit|advantages|advantage|disadvantages|disadvantage|tradeoffs|tradeoff|costs|cost|prices|price|values|value|returns|return|rois|roi|payoffs|payoff|upsides|upside|downsides|downside)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "personal") return;
    add(matches, m.index, m[1].length, "GRAMMAR_PERSONAL_PERSONNEL", "“Personnel” (staff) fits here, not “personal”.", "Personal = private/individual. Personnel = staff.", ["personnel"]);
  });

  each(text, /\b(precede|proceed)\s+(?:to|with|from|in|on|at|by|of|about|between|among|through|over|under|into|onto|upon|toward|towards|until|since|near|past|except|like|unlike|versus|vs|via|per|against|despite|concerning|regarding|including|excluding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "proceed") return;
    add(matches, m.index, m[1].length, "GRAMMAR_PRECEDE_PROCEED", "“Proceed” (continue) fits here, not “precede”.", "Precede = come before. Proceed = continue.", ["proceed"]);
  });

  each(text, /\b(lightning|lightening)\s+(?:strike|strikes|struck|striking|bolt|bolts|flash|flashes|flashed|flashing|storm|storms|stormed|storming|thunder|thunders|thundered|thundering|rain|rains|rained|raining|snow|snows|snowed|snowing|hail|hails|hailed|hailing|wind|winds|winded|winding|gust|gusts|gusted|gusting|breeze|breezes|breezed|breezing|squall|squalls|squalled|squalling|tempest|tempests|tempested|tempesting|hurricane|hurricanes|hurricaned|hurricaning|tornado|tornados|tornadoes|tornadoed|tornadoing|cyclone|cyclones|cycloned|cycloning|typhoon|typhoons|typhooned|typhooning|monsoon|monsoons|monsooned|monsooning|drought|droughts|droughted|droughting|flood|floods|flooded|flooding|fire|fires|fired|firing|earthquake|earthquakes|earthquaked|earthquaking|volcano|volcanos|volcanoes|volcanoed|volcanoing|tsunami|tsunamis|tsunamied|tsunamying|avalanche|avalanches|avalanched|avalanching|landslide|landslides|landslided|landsliding|mudslide|mudslides|mudslided|mudsliding|rockslide|rockslides|rockslided|rocksliding|sinkhole|sinkholes|sinkholed|sinkholing|crater|craters|cratered|cratering|fissure|fissures|fissured|fissuring|fault|faults|faulted|faulting|fracture|fractures|fractured|fracturing|crack|cracks|cracked|cracking|break|breaks|broke|broken|breaking|split|splits|split|splitting|tear|tears|tore|torn|tearing|rip|rips|ripped|ripping|shred|shreds|shredded|shredding|cut|cuts|cut|cutting|slice|slices|sliced|slicing|dice|dices|diced|dicing|chop|chops|chopped|chopping|mince|minces|minced|mincing|grind|grinds|ground|grinding|crush|crushes|crushed|crushing|pound|pounds|pounded|pounding|hammer|hammers|hammered|hammering|smash|smashes|smashed|smashing|shatter|shatters|shattered|shattering|splinter|splinters|splintered|splintering|fragment|fragments|fragmented|fragmenting|shard|shards|sharded|sharding|chip|chips|chipped|chipping|nick|nicks|nicked|nicking|notch|notches|notched|notching|dent|dents|dented|denting|ding|dings|dinged|dinging|scratch|scratches|scratched|scratching|scuff|scuffs|scuffed|scuffing|scrape|scrapes|scraped|scraping|abrasion|abrasions|abraded|abrading|wear|wears|wore|worn|wearing|erosion|erosions|eroded|eroding|corrosion|corrosions|corroded|corroding|rust|rusts|rusted|rusting|oxidation|oxidations|oxidized|oxidizing|tarnish|tarnishes|tarnished|tarnishing|patina|patinas|patinaed|patinaing|stain|stains|stained|staining|spot|spots|spotted|spotting|mark|marks|marked|marking|blemish|blemishes|blemished|blemishing|flaw|flaws|flawed|flawing|defect|defects|defected|defecting|imperfection|imperfections|imperfected|imperfecting|irregularity|irregularities|irregulared|irregularing|anomaly|anomalies|anomalied|anomalying|aberration|aberrations|aberrated|aberrating|deviation|deviations|deviated|deviating|variance|variances|varied|varying|variation|variations|varied|varying|difference|differences|differed|differing|discrepancy|discrepancies|discrepancied|discrepancying|inconsistency|inconsistencies|inconsistencied|inconsistencying|contradiction|contradictions|contradicted|contradicting|conflict|conflicts|conflicted|conflicting|clash|clashes|clashed|clashing|collision|collisions|collided|colliding|impact|impacts|impacted|impacting|crash|crashes|crashed|crashing|accident|accidents|accidented|accidenting|incident|incidents|incidented|incidenting|event|events|evented|eventing|occurrence|occurrences|occurred|occurring|happening|happenings|happened|happening|situation|situations|situated|situating|circumstance|circumstances|circumstanced|circumstancing|condition|conditions|conditioned|conditioning|state|states|stated|stating|status|statuses|statused|statusing|phase|phases|phased|phasing|stage|stages|staged|staging|step|steps|stepped|stepping|gate|gates|gated|gating|checkpoint|checkpoints|checkpointed|checkpointing|review|reviews|reviewed|reviewing|approval|approvals|approved|approving|signoff|signoffs|signed|signing|decision|decisions|decided|deciding|vote|votes|voted|voting|consensus|consensuses|consensused|consensusing|agreement|agreements|agreed|agreeing|contract|contracts|contracted|contracting|deal|deals|dealed|dealing|offer|offers|offered|offering|proposal|proposals|proposed|proposing|bid|bids|bid|bidding|quote|quotes|quoted|quoting|estimate|estimates|estimated|estimating|forecast|forecasts|forecasted|forecasting|projection|projections|projected|projecting|prediction|predictions|predicted|predicting|assumption|assumptions|assumed|assuming|hypothesis|hypotheses|hypothesized|hypothesizing|theory|theories|theorized|theorizing|model|models|modeled|modeling|framework|frameworks|frameworked|frameworking|methodology|methodologies|methodologized|methodologizing|approach|approaches|approached|approaching|technique|techniques|techniqued|techniquing|practice|practices|practiced|practicing|principle|principles|principled|principling|rule|rules|ruled|ruling|law|laws|lawed|lawing|regulation|regulations|regulated|regulating|policy|policies|policied|policiying|standard|standards|standardized|standardizing|guideline|guidelines|guidelined|guidelining|requirement|requirements|required|requiring|constraint|constraints|constrained|constraining|limit|limits|limited|limiting|boundary|boundaries|bounded|bounding|scope|scopes|scoped|scoping|range|ranges|ranged|ranging|threshold|thresholds|thresholded|thresholding|tolerance|tolerances|tolerated|tolerating|margin|margins|margined|margining|buffer|buffers|buffered|buffering|reserve|reserves|reserved|reserving|backup|backups|backed|backing|fallback|fallbacks|fallbacked|fallbacking|default|defaults|defaulted|defaulting|baseline|baselines|baselined|baselining|reference|references|referenced|referencing|source|sources|sourced|sourcing|origin|origins|origined|origining|root|roots|rooted|rooting|cause|causes|caused|causing|reason|reasons|reasoned|reasoning|factor|factors|factored|factoring|driver|drivers|driven|driving|trigger|triggers|triggered|triggering|event|events|evented|eventing|incident|incidents|incidented|incidenting|issue|issues|issued|issuing|problem|problems|problemed|probleming|bug|bugs|bugged|bugging|defect|defects|defected|defecting|error|errors|errored|erroring|fault|faults|faulted|faulting|failure|failures|failed|failing|outage|outages|outaged|outaging|downtime|downtimes|downtimed|downtiming|delay|delays|delayed|delaying|blocker|blockers|blocked|blocking|bottleneck|bottlenecks|bottlenecked|bottlenecking|risk|risks|risked|risking|threat|threats|threatened|threatening|vulnerability|vulnerabilities|vulnerabilitied|vulnerabilitying|exposure|exposures|exposed|exposing|impact|impacts|impacted|impacting|consequence|consequences|consequenced|consequencing|effect|effects|effected|effecting|benefit|benefits|benefited|benefiting|advantage|advantages|advantaged|advantaging|disadvantage|disadvantages|disadvantaged|disadvantaging|tradeoff|tradeoffs|tradeoffed|tradeoffing|cost|costs|costed|costing|price|prices|priced|pricing|value|values|valued|valuing|return|returns|returned|returning|roi|rois|roied|roiing|payoff|payoffs|payoffed|payoffing|upside|upsides|upsided|upsiding|downside|downsides|downsided|downsiding)\b/gi, skip, (m) => {
    const w = m[1].toLowerCase();
    if (w === "lightning") return;
    add(matches, m.index, m[1].length, "GRAMMAR_LIGHTNING_LIGHTENING", "“Lightning” (electrical discharge) fits here, not “lightening”.", "Lightning = electrical discharge. Lightening = making lighter.", ["lightning"]);
  });

  matches.push(...checkExtraRules(text, skip));

  for (const s of splitSentences(text)) {
    if (skip(s.start)) continue;
    const pad = leadingSpace(s.raw);
    const body = s.raw.slice(pad);
    const trimmed = body.trim();
    if (!trimmed) continue;
    const contentStart = s.start + pad;
    const words = trimmed.match(/[A-Za-z']+/g) || [];

    if (
      /^[a-z]/.test(trimmed) &&
      !trimmed.startsWith("http") &&
      !trimmed.startsWith("www")
    ) {
      const first = trimmed.match(/^[a-z]+/)?.[0] || trimmed[0];
      if (first.toLowerCase() !== "i") {
        add(
          matches,
          contentStart,
          first.length,
          "GRAMMAR_SENTENCE_CAPITAL",
          "Sentences start with a capital letter.",
          "After a full stop, the next sentence begins with an uppercase letter.",
          [first[0].toUpperCase() + first.slice(1)],
        );
      }
    }

    if (
      /^(Because|Although|Though|Unless|Since)\b/i.test(trimmed) &&
      !/,/.test(trimmed) &&
      /[.!?]$/.test(trimmed) &&
      words.length >= 4
    ) {
      add(
        matches,
        contentStart,
        trimmed.length,
        "GRAMMAR_FRAGMENT",
        "This looks like a sentence fragment — a dependent clause standing alone.",
        "Join it to a main clause, or drop the subordinating word (Because / Although / If…).",
        [],
      );
    }

    if (words.length >= 40) {
      const commaIdx = trimmed.indexOf(",", Math.floor(trimmed.length / 3));
      const splitAt = commaIdx > 0 ? commaIdx + 1 : Math.floor(trimmed.length / 2);
      const splitHint = commaIdx > 0 ? trimmed.slice(0, commaIdx + 1) + " " + trimmed.slice(commaIdx + 1).trim() : trimmed;
      add(
        matches,
        contentStart,
        Math.min(trimmed.length, 48),
        "CLARITY_LONG_SENTENCE",
        `This sentence is long (${words.length} words). Split it for easier reading.`,
        "One idea per sentence is easier to follow. Try a period, semicolon, or dash.",
        commaIdx > 0 ? [splitHint] : [],
        "clarity",
      );
    }

    if (
      words.length >= 5 &&
      /^[A-Z]/.test(trimmed) &&
      /[.!?]$/.test(trimmed) &&
      !FINITE_HINT.test(trimmed) &&
      !/[:;]/.test(trimmed) &&
      !/^(Please|Kindly|Don't|Do not|Never|Always|Let|Let's)\b/i.test(trimmed)
    ) {
      add(
        matches,
        contentStart,
        trimmed.length,
        "GRAMMAR_MISSING_VERB",
        "This sentence may be missing a main verb.",
        "A full English sentence usually needs a subject and a finite verb (is, has, went, wants…).",
        [],
      );
    }

    if (
      s.end === text.length &&
      words.length >= 6 &&
      /^[A-Z]/.test(trimmed) &&
      !/[.!?…]["')\]]*$/.test(trimmed) &&
      FINITE_HINT.test(trimmed)
    ) {
      add(
        matches,
        s.end,
        0,
        "PUNCT_MISSING_PERIOD",
        "This sentence has no end punctuation.",
        "Close a statement with a period, or use ? / ! if it is a question or exclamation.",
        ["."],
        "punctuation",
      );
    }
  }

  return matches;
}
