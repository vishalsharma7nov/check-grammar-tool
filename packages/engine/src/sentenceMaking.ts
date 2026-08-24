import type { Category, Match } from "../../protocol/src/index";

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
      add(
        matches,
        contentStart,
        Math.min(trimmed.length, 48),
        "CLARITY_LONG_SENTENCE",
        `This sentence is long (${words.length} words). Split it for easier reading.`,
        "One idea per sentence is easier to follow. Try a period, semicolon, or dash.",
        [],
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
