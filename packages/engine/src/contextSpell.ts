import type { Match } from "../../protocol/src/index";

type Skip = (index: number) => boolean;

type ContextRule = {
  word: RegExp;
  after?: RegExp;
  before?: RegExp;
  ruleId: string;
  suggest: string;
  message: string;
  explanation: string;
};

/** Context patterns for dictionary-valid homophones (their/there/they're, etc.). */
const CONTEXT_RULES: ContextRule[] = [
  {
    word: /\btheir\b/gi,
    after: /^\s+(?:is|are|was|were|will|would|should|could|might|may|can|has|have|had|been|being|going|not|here|also|still|already|just|about|probably|definitely)\b/i,
    ruleId: "SPELL_CONTEXT_THEIR",
    suggest: "they're",
    message: "“Their” is possessive; context suggests “they're” (they are).",
    explanation: "Their = belonging to them. They're = they are.",
  },
  {
    word: /\bthere\b/gi,
    after: /^\s+(?:own|first|last|name|job|team|work|home|car|phone|email|idea|plan|goal|role|task|issue|problem|way|choice|decision|company|office|boss|friend|family|parent|child|colleague|manager|staff|member|product|service|project|report|file|document|account|password|address|number|turn|duty|responsibility|budget|cost|price|fee|salary|schedule|deadline|target|objective|priority|requirement|spec|standard|guideline|procedure|process|workflow|pipeline|framework|architecture|stack|tool|platform|system|module|component|feature|function|option|setting|configuration|parameter|variable|argument|input|output|result|outcome|impact|effect|benefit|risk|bug|fix|patch|update|upgrade|release|version|build|deploy|test|case|suite|scenario|step|action|task|item|list|queue|batch|group|cluster|node|link|connection|route|path|channel|thread|message|conversation|discussion|meeting|call|session|event|request|order|ticket|incident|alert|notification|reminder|email|letter|memo|summary|overview|brief|proposal|plan|roadmap|strategy|vision|mission|values|culture|department|division|unit|branch|location|site|region|market|segment|audience|customer|client|partner|vendor|supplier|stakeholder|investor|shareholder|board|committee|network|industry|sector|field|domain|area|topic|subject|theme|category|tag|label|keyword|term|phrase|word|sentence|paragraph|section|chapter|page|slide|deck|presentation|document|folder|directory|drive|server|host|instance|container|service|api|endpoint|url|domain|hostname|port|protocol|format|schema|model|dataset|table|column|row|field|record|entry|index|key|value|pair|map|set|list|array|object|class|interface|type|enum|module|package|library|dependency|plugin|extension|app|application|program|script|code|snippet|sample|example|demo|tutorial|guide|manual|handbook|reference|documentation|wiki|faq|help|support|guidance|advice|tip|trick|workaround|solution|answer)\b/i,
    ruleId: "SPELL_CONTEXT_THERE",
    suggest: "their",
    message: "“There” is a place; context suggests “their” (possessive).",
    explanation: "Their = belonging to them. There = in that place.",
  },
  {
    word: /\byour\b/gi,
    after: /^\s+(?:going|not|here|there|done|finished|ready|welcome|right|wrong|invited|also|still|already|just|about|probably|definitely|late|early|busy|free|sure|certain|happy|tired|sick|well|ok|okay|fine|good|bad|interested|aware|prepared|qualified|responsible|available|present|absent|correct|wrong|mistaken|confused|lost|stuck|blocked|set|able|willing|eager|excited|nervous|anxious|worried|confident|uncertain|unsure)\b/i,
    ruleId: "SPELL_CONTEXT_YOUR",
    suggest: "you're",
    message: "“Your” is possessive; context suggests “you're” (you are).",
    explanation: "Your = belonging to you. You're = you are.",
  },
  {
    word: /\byou're\b/gi,
    after: /^\s+(?:name|job|team|work|home|car|phone|email|idea|plan|goal|role|task|issue|problem|way|choice|decision|view|approach|method|style|company|office|boss|friend|family|parent|child|colleague|manager|staff|member|product|service|project|report|file|document|account|password|address|number|turn|duty|responsibility|budget|cost|price|fee|salary|schedule|deadline|target|objective|priority|requirement|spec|standard|guideline|procedure|process|workflow|pipeline|framework|architecture|stack|tool|platform|system|module|component|feature|function|option|setting|configuration|parameter|variable|argument|input|output|result|outcome|impact|effect|benefit|risk|bug|fix|patch|update|upgrade|release|version|build|deploy|test|case|suite|scenario|step|action|task|item|list|queue|batch|group|cluster|node|link|connection|route|path|channel|thread|message|conversation|discussion|meeting|call|session|event|request|order|ticket|incident|alert|notification|reminder|email|letter|memo|summary|overview|brief|proposal|plan|roadmap|strategy|vision|mission|values|culture|department|division|unit|branch|location|site|region|market|segment|audience|customer|client|partner|vendor|supplier|stakeholder|investor|shareholder|board|committee|network|industry|sector|field|domain|area|topic|subject|theme|category|tag|label|keyword|term|phrase|word|sentence|paragraph|section|chapter|page|slide|deck|presentation|document|folder|directory|drive|server|host|instance|container|service|api|endpoint|url|domain|hostname|port|protocol|format|schema|model|dataset|table|column|row|field|record|entry|index|key|value|pair|map|set|list|array|object|class|interface|type|enum|module|package|library|dependency|plugin|extension|app|application|program|script|code|snippet|sample|example|demo|tutorial|guide|manual|handbook|reference|documentation|wiki|faq|help|support|guidance|advice|tip|trick|workaround|solution|answer)\b/i,
    ruleId: "SPELL_CONTEXT_YOURE",
    suggest: "your",
    message: "“You're” means you are; context suggests “your” (possessive).",
    explanation: "Your = belonging to you. You're = you are.",
  },
  {
    word: /\bto\b/gi,
    before: /\b(?:want|need|try|plan|go|come|talk|work|buy|pay|move|change|improve|fix|apply|register|download|upload|install|update|delete|remove|add|create|build|develop|design|test|deploy|launch|release|publish|share|post|reply|respond|hope|decide|choose|learn|speak|write|read|send|give|take|make|see|know|think|believe|feel|look|listen|watch|wait|start|stop|begin|finish|continue|help|ask|tell|show|explain|play|study|sell|join|leave|stay|return|visit|travel|sign|handle|manage|solve|avoid|prevent|reduce|increase|enhance|boost|support|maintain|review|check|verify|validate|confirm|approve|reject|accept|decline|cancel|postpone|delay|extend|retry|repeat|skip|drop|save|load|import|export|copy|rename|merge|split|sort|filter|search|find|locate|identify|detect|measure|count|calculate|estimate|predict|expect|intend|aim|seek|strive|struggle|attempt|fail|manage|keep|stop)\s+$/i,
    after: /^\s+(?:much|many|late|early|soon|often|hard|easy|fast|slow|good|bad|great|nice|fine|ok|okay|well|better|worse|best|worst|more|less|enough|so|very|really|quite|pretty|fairly|rather|somewhat|extremely|absolutely|completely|totally|entirely|partly|mostly|mainly|largely|slightly|barely|hardly|nearly|almost|about|around|approximately|roughly|exactly|precisely|literally|figuratively|probably|possibly|maybe|perhaps|likely|unlikely|certainly|definitely|surely|clearly|obviously)\b/i,
    ruleId: "SPELL_CONTEXT_TO_TOO",
    suggest: "too",
    message: "Context suggests “too” (also/excessively), not “to”.",
    explanation: "To = direction/infinitive. Too = also or excessively. Two = the number.",
  },
  {
    word: /\btoo\b/gi,
    after: /^\s+(?:go|do|have|want|need|try|plan|hope|decide|choose|learn|come|talk|speak|write|read|send|give|take|make|see|know|think|believe|feel|look|listen|watch|wait|start|stop|begin|finish|continue|help|ask|tell|show|explain|work|play|study|buy|sell|pay|move|change|improve|fix|solve|handle|manage|join|leave|stay|return|visit|travel|create|build|develop|design|test|deploy|launch|release|publish|share|post|reply|respond|apply|register|sign|download|upload|install|update|delete|remove|add)\b/i,
    ruleId: "SPELL_CONTEXT_TOO_TO",
    suggest: "to",
    message: "Context suggests “to” (infinitive), not “too”.",
    explanation: "To = direction/infinitive. Too = also or excessively.",
  },
  {
    word: /\btwo\b/gi,
    after: /^\s+(?:much|many|late|early|soon|often|rarely|hard|easy|fast|slow|good|bad|great|nice|fine|ok|okay|well|better|worse|best|worst|more|less|enough|so|very|really|quite|pretty|fairly|rather|somewhat|extremely|absolutely|completely|totally|entirely|partly|mostly|mainly|largely|slightly|barely|hardly|nearly|almost|about|around|approximately|roughly|exactly|precisely|literally|figuratively|probably|possibly|maybe|perhaps|likely|unlikely|certainly|definitely|surely|clearly|obviously)\b/i,
    ruleId: "SPELL_CONTEXT_TWO_TOO",
    suggest: "too",
    message: "Context suggests “too” (also/excessively), not “two”.",
    explanation: "Two = the number. Too = also or excessively.",
  },
  {
    word: /\bto\b/gi,
    before: /\b(?:one|1)\s+$/i,
    after: /^\s+(?:of|people|persons|members|users|customers|clients|partners|teams|groups|companies|products|services|projects|reports|files|documents|accounts|orders|tickets|cases|items|tasks|steps|phases|stages|rounds|turns|games|matches|wins|losses|goals|points|errors|warnings|alerts|notifications|reminders|notes|ideas|plans|options|choices|ways|paths|routes|links|nodes|edges|keys|tokens|ids|codes|numbers|accounts|profiles|records|entries|events|sessions|visits|clicks|views|downloads|uploads|installs|updates|upgrades|patches|fixes|releases|versions|builds|deploys|tests|checks|runs|loops|iterations|cycles|rounds|turns|days|weeks|months|years|hours|minutes|seconds|times|attempts|tries|parts|pieces|shares|portions|halves|thirds|quarters|majorities|minorities)\b/i,
    ruleId: "SPELL_CONTEXT_TO_TWO",
    suggest: "two",
    message: "Context suggests “two” (the number), not “to”.",
    explanation: "Two = the number. To = direction/infinitive.",
  },
];

/** Trigram-style phrase hints for common collocations. */
const PHRASE_HINTS: { re: RegExp; ruleId: string; suggest: string; offsetInMatch: number; lengthInMatch: number; message: string; explanation: string }[] = [
  {
    re: /\b(?:go|went|going)\s+their\b/gi,
    ruleId: "SPELL_CONTEXT_PHRASE_GO_THEIR",
    suggest: "there",
    offsetInMatch: 0,
    lengthInMatch: 0,
    message: "“Go there”, not “go their”.",
    explanation: "Their is possessive; there indicates a place.",
  },
  {
    re: /\bsee\s+you\s+their\b/gi,
    ruleId: "SPELL_CONTEXT_PHRASE_SEE_YOU_THEIR",
    suggest: "there",
    offsetInMatch: 0,
    lengthInMatch: 0,
    message: "“See you there”, not “see you their”.",
    explanation: "Their is possessive; there indicates a place.",
  },
  {
    re: /\b(?:if|when|while|unless|until|before|after|once)\s+your\s+(?:ready|done|finished|going|coming|leaving|staying|working|waiting|looking|trying|planning|hoping|thinking|feeling|starting|available|busy|free|late|early|here|there|interested|sure|certain|happy|tired|sick|well|ok|okay|fine|good|bad|right|wrong|welcome|invited|included|involved|concerned|aware|prepared|qualified|eligible|responsible|accountable|present|absent|correct|wrong|mistaken|confused|lost|stuck|blocked|set|able|willing|eager|excited|nervous|anxious|worried|confident|uncertain|unsure)\b/gi,
    ruleId: "SPELL_CONTEXT_PHRASE_IF_YOUR",
    suggest: "you're",
    offsetInMatch: 0,
    lengthInMatch: 0,
    message: "“If you're…”, not “if your…”.",
    explanation: "Your is possessive; you're = you are.",
  },
];

function each(text: string, re: RegExp, skip: Skip, fn: (m: RegExpExecArray) => void) {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (skip(m.index)) continue;
    fn(m);
    if (!re.global) break;
  }
}

function wordOffsetInMatch(m: RegExpExecArray, word: string): { offset: number; length: number } {
  const idx = m[0].toLowerCase().lastIndexOf(word.toLowerCase());
  if (idx >= 0) return { offset: m.index + idx, length: word.length };
  return { offset: m.index, length: m[0].length };
}

export function checkContextSpelling(text: string, skip: Skip): Match[] {
  const matches: Match[] = [];
  const seen = new Set<string>();

  for (const rule of CONTEXT_RULES) {
    each(text, rule.word, skip, (m) => {
      const start = m.index;
      const end = start + m[0].length;
      const before = text.slice(Math.max(0, start - 80), start);
      const after = text.slice(end, end + 80);
      if (rule.before && !rule.before.test(before)) return;
      if (rule.after && !rule.after.test(after)) return;
      const key = `${rule.ruleId}:${start}`;
      if (seen.has(key)) return;
      seen.add(key);
      matches.push({
        offset: start,
        length: m[0].length,
        ruleId: rule.ruleId,
        category: "spelling",
        message: rule.message,
        explanation: rule.explanation,
        replacements: [rule.suggest],
      });
    });
  }

  for (const hint of PHRASE_HINTS) {
    each(text, hint.re, skip, (m) => {
      const wrong = hint.re.source.includes("their") ? "their" : hint.re.source.includes("your") ? "your" : "";
      const span = wrong ? wordOffsetInMatch(m, wrong) : { offset: m.index, length: m[0].length };
      const key = `${hint.ruleId}:${span.offset}`;
      if (seen.has(key)) return;
      seen.add(key);
      matches.push({
        offset: span.offset,
        length: span.length,
        ruleId: hint.ruleId,
        category: "spelling",
        message: hint.message,
        explanation: hint.explanation,
        replacements: [hint.suggest],
      });
    });
  }

  return matches;
}
