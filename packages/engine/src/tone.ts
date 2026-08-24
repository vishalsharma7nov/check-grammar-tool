import type { CheckGoals, Match } from "../../protocol/src/index";

type Skip = (index: number) => boolean;

export type ToneSignal = "formal" | "casual" | "confident" | "uncertain";

export interface ToneAnalysis {
  signals: ToneSignal[];
  matches: Match[];
}

type ToneRule = {
  re: RegExp;
  id: string;
  signal: ToneSignal;
  message: string;
  explanation: string;
  replacements: string[];
  /** Only flag when formality goal matches. */
  whenFormality?: "formal" | "casual";
};

const TONE_RULES: ToneRule[] = [
  // Casual — flag when formality is formal
  { re: /\bgonna\b/gi, id: "TONE_CASUAL_GONNA", signal: "casual", whenFormality: "formal", message: "“Gonna” is casual; use “going to” in formal writing.", explanation: "Informal contraction of going to.", replacements: ["going to"] },
  { re: /\bwanna\b/gi, id: "TONE_CASUAL_WANNA", signal: "casual", whenFormality: "formal", message: "“Wanna” is casual; use “want to” in formal writing.", explanation: "Informal contraction of want to.", replacements: ["want to"] },
  { re: /\bgotta\b/gi, id: "TONE_CASUAL_GOTTA", signal: "casual", whenFormality: "formal", message: "“Gotta” is casual; use “have to” or “got to” in formal writing.", explanation: "Informal contraction.", replacements: ["have to", "got to"] },
  { re: /\bkinda\b/gi, id: "TONE_CASUAL_KINDA", signal: "casual", whenFormality: "formal", message: "“Kinda” is casual; use “kind of” in formal writing.", explanation: "Informal contraction of kind of.", replacements: ["kind of"] },
  { re: /\bsorta\b/gi, id: "TONE_CASUAL_SORTA", signal: "casual", whenFormality: "formal", message: "“Sorta” is casual; use “sort of” in formal writing.", explanation: "Informal contraction of sort of.", replacements: ["sort of"] },
  { re: /\blol\b/gi, id: "TONE_CASUAL_LOL", signal: "casual", whenFormality: "formal", message: "“LOL” is chat slang; avoid in formal writing.", explanation: "Internet/chat abbreviation.", replacements: [] },
  { re: /\btbh\b/gi, id: "TONE_CASUAL_TBH", signal: "casual", whenFormality: "formal", message: "“TBH” is chat slang; spell out “to be honest” in formal writing.", explanation: "Internet/chat abbreviation.", replacements: ["to be honest"] },
  { re: /\bidk\b/gi, id: "TONE_CASUAL_IDK", signal: "casual", whenFormality: "formal", message: "“IDK” is chat slang; spell out “I don't know” in formal writing.", explanation: "Internet/chat abbreviation.", replacements: ["I don't know"] },
  { re: /\bbtw\b/gi, id: "TONE_CASUAL_BTW", signal: "casual", whenFormality: "formal", message: "“BTW” is casual; use “by the way” in formal writing.", explanation: "Internet/chat abbreviation.", replacements: ["by the way"] },
  { re: /\basap\b/gi, id: "TONE_CASUAL_ASAP", signal: "casual", whenFormality: "formal", message: "“ASAP” is casual; use “as soon as possible” in formal writing.", explanation: "Abbreviation common in chat.", replacements: ["as soon as possible"] },
  { re: /\bthx\b/gi, id: "TONE_CASUAL_THX", signal: "casual", whenFormality: "formal", message: "“Thx” is chat shorthand; use “thanks” in formal writing.", explanation: "Informal abbreviation.", replacements: ["thanks"] },
  { re: /\bpls\b/gi, id: "TONE_CASUAL_PLS", signal: "casual", whenFormality: "formal", message: "“Pls” is chat shorthand; use “please” in formal writing.", explanation: "Informal abbreviation.", replacements: ["please"] },
  { re: /\bhey\b/gi, id: "TONE_CASUAL_HEY", signal: "casual", whenFormality: "formal", message: "“Hey” is casual; use “Hello” or “Hi” in formal writing.", explanation: "Informal greeting.", replacements: ["Hello", "Hi"] },
  { re: /\byep\b/gi, id: "TONE_CASUAL_YEP", signal: "casual", whenFormality: "formal", message: "“Yep” is casual; use “yes” in formal writing.", explanation: "Informal affirmation.", replacements: ["yes"] },
  { re: /\bnope\b/gi, id: "TONE_CASUAL_NOPE", signal: "casual", whenFormality: "formal", message: "“Nope” is casual; use “no” in formal writing.", explanation: "Informal negation.", replacements: ["no"] },
  { re: /\bawesome\b/gi, id: "TONE_CASUAL_AWESOME", signal: "casual", whenFormality: "formal", message: "“Awesome” is casual; try “excellent” or “impressive” in formal writing.", explanation: "Informal intensifier.", replacements: ["excellent", "impressive"] },
  { re: /\bcool\b/gi, id: "TONE_CASUAL_COOL", signal: "casual", whenFormality: "formal", message: "“Cool” is casual; use a more precise adjective in formal writing.", explanation: "Informal approval word.", replacements: ["fine", "acceptable", "good"] },
  { re: /\bstuff\b/gi, id: "TONE_CASUAL_STUFF", signal: "casual", whenFormality: "formal", message: "“Stuff” is vague and casual; be specific in formal writing.", explanation: "Informal catch-all noun.", replacements: ["items", "materials", "content"] },
  { re: /\btons of\b/gi, id: "TONE_CASUAL_TONS", signal: "casual", whenFormality: "formal", message: "“Tons of” is casual; use “many” or “a lot of” in formal writing.", explanation: "Informal quantifier.", replacements: ["many", "a lot of", "numerous"] },
  { re: /\ba lot of\b/gi, id: "TONE_CASUAL_ALOT", signal: "casual", whenFormality: "formal", message: "“A lot of” is informal; try “many”, “much”, or “numerous” in formal writing.", explanation: "Informal quantifier.", replacements: ["many", "much", "numerous"] },

  // Formal — flag when formality is casual
  { re: /\bherein\b/gi, id: "TONE_FORMAL_HEREIN", signal: "formal", whenFormality: "casual", message: "“Herein” is very formal; simplify for casual writing.", explanation: "Legal/formal register.", replacements: ["here", "in this"] },
  { re: /\bthereof\b/gi, id: "TONE_FORMAL_THEREOF", signal: "formal", whenFormality: "casual", message: "“Thereof” is very formal; simplify for casual writing.", explanation: "Legal/formal register.", replacements: ["of it", "of that"] },
  { re: /\bwherein\b/gi, id: "TONE_FORMAL_WHEREIN", signal: "formal", whenFormality: "casual", message: "“Wherein” is very formal; use “where” or “in which” for casual writing.", explanation: "Legal/formal register.", replacements: ["where", "in which"] },
  { re: /\bnotwithstanding\b/gi, id: "TONE_FORMAL_NOTWITHSTANDING", signal: "formal", whenFormality: "casual", message: "“Notwithstanding” is very formal; try “despite” or “even though” for casual writing.", explanation: "Legal/formal register.", replacements: ["despite", "even though"] },
  { re: /\bpursuant to\b/gi, id: "TONE_FORMAL_PURSUANT", signal: "formal", whenFormality: "casual", message: "“Pursuant to” is legal jargon; use “under” or “according to” for casual writing.", explanation: "Legal/formal register.", replacements: ["under", "according to"] },
  { re: /\bwe hereby\b/gi, id: "TONE_FORMAL_HEREBY", signal: "formal", whenFormality: "casual", message: "“We hereby” is very formal; simplify for casual writing.", explanation: "Legal/formal register.", replacements: ["we"] },
  { re: /\butilize\b/gi, id: "TONE_FORMAL_UTILIZE", signal: "formal", whenFormality: "casual", message: "“Utilize” is formal; “use” is simpler for casual writing.", explanation: "Formal synonym of use.", replacements: ["use"] },
  { re: /\bfacilitate\b/gi, id: "TONE_FORMAL_FACILITATE", signal: "formal", whenFormality: "casual", message: "“Facilitate” is formal; try “help” or “enable” for casual writing.", explanation: "Formal business verb.", replacements: ["help", "enable", "make easier"] },
  { re: /\bcommence\b/gi, id: "TONE_FORMAL_COMMENCE", signal: "formal", whenFormality: "casual", message: "“Commence” is formal; use “start” or “begin” for casual writing.", explanation: "Formal synonym of begin.", replacements: ["start", "begin"] },
  { re: /\bhenceforth\b/gi, id: "TONE_FORMAL_HENCEFORTH", signal: "formal", whenFormality: "casual", message: "“Henceforth” is very formal; use “from now on” for casual writing.", explanation: "Legal/formal register.", replacements: ["from now on"] },
  { re: /\bnevertheless\b/gi, id: "TONE_FORMAL_NEVERTHELESS", signal: "formal", whenFormality: "casual", message: "“Nevertheless” is formal; try “still” or “but” for casual writing.", explanation: "Formal connector.", replacements: ["still", "but", "even so"] },
  { re: /\bfurthermore\b/gi, id: "TONE_FORMAL_FURTHERMORE", signal: "formal", whenFormality: "casual", message: "“Furthermore” is formal; try “also” or “plus” for casual writing.", explanation: "Formal connector.", replacements: ["also", "plus", "and"] },
  { re: /\bfor the purpose of\b/gi, id: "TONE_FORMAL_PURPOSE", signal: "formal", whenFormality: "casual", message: "“For the purpose of” is wordy; use “to” for casual writing.", explanation: "Formal filler phrase.", replacements: ["to"] },
  { re: /\bin regard to\b/gi, id: "TONE_FORMAL_REGARD", signal: "formal", whenFormality: "casual", message: "“In regard to” is formal; use “about” for casual writing.", explanation: "Formal prepositional phrase.", replacements: ["about", "regarding"] },
  { re: /\bat your earliest convenience\b/gi, id: "TONE_FORMAL_CONVENIENCE", signal: "formal", whenFormality: "casual", message: "“At your earliest convenience” is very formal; try “when you can” for casual writing.", explanation: "Formal business phrase.", replacements: ["when you can", "as soon as you can"] },
  { re: /\bkindly be advised\b/gi, id: "TONE_FORMAL_ADVISED", signal: "formal", whenFormality: "casual", message: "“Kindly be advised” is very formal; simplify for casual writing.", explanation: "Formal business phrase.", replacements: ["please note", "just so you know"] },
  { re: /\bendeavor\b/gi, id: "TONE_FORMAL_ENDEAVOR", signal: "formal", whenFormality: "casual", message: "“Endeavor” is formal; use “try” or “effort” for casual writing.", explanation: "Formal synonym.", replacements: ["try", "effort"] },

  // Uncertain signals (informational, always detected)
  { re: /\bi guess\b/gi, id: "TONE_UNCERTAIN_GUESS", signal: "uncertain", message: "“I guess” sounds uncertain.", explanation: "Hedging phrase weakens confidence.", replacements: [] },
  { re: /\bi'm not sure\b/gi, id: "TONE_UNCERTAIN_NOT_SURE", signal: "uncertain", message: "“I'm not sure” signals uncertainty.", explanation: "Explicit uncertainty.", replacements: [] },
  { re: /\bnot sure\b/gi, id: "TONE_UNCERTAIN_NOT_SURE_BARE", signal: "uncertain", message: "“Not sure” signals uncertainty.", explanation: "Explicit uncertainty.", replacements: [] },
  { re: /\bi suppose\b/gi, id: "TONE_UNCERTAIN_SUPPOSE", signal: "uncertain", message: "“I suppose” sounds tentative.", explanation: "Hedging phrase.", replacements: [] },
  { re: /\bit seems like\b/gi, id: "TONE_UNCERTAIN_SEEMS", signal: "uncertain", message: "“It seems like” hedges the claim.", explanation: "Softens assertion.", replacements: [] },
  { re: /\bit appears that\b/gi, id: "TONE_UNCERTAIN_APPEARS", signal: "uncertain", message: "“It appears that” hedges the claim.", explanation: "Softens assertion.", replacements: [] },
  { re: /\bas far as i know\b/gi, id: "TONE_UNCERTAIN_AFIK", signal: "uncertain", message: "“As far as I know” limits your claim.", explanation: "Explicit knowledge hedge.", replacements: [] },
  { re: /\bmore or less\b/gi, id: "TONE_UNCERTAIN_MOL", signal: "uncertain", message: "“More or less” signals imprecision.", explanation: "Vague qualifier.", replacements: [] },
  { re: /\bto some extent\b/gi, id: "TONE_UNCERTAIN_EXTENT", signal: "uncertain", message: "“To some extent” hedges the claim.", explanation: "Softens assertion.", replacements: [] },

  // Confident signals (informational, always detected)
  { re: /\bwithout a doubt\b/gi, id: "TONE_CONFIDENT_DOUBT", signal: "confident", message: "“Without a doubt” signals strong confidence.", explanation: "Emphatic certainty.", replacements: [] },
  { re: /\bi am certain\b/gi, id: "TONE_CONFIDENT_CERTAIN", signal: "confident", message: "“I am certain” signals strong confidence.", explanation: "Explicit certainty.", replacements: [] },
  { re: /\bi'm certain\b/gi, id: "TONE_CONFIDENT_CERTAIN_APOS", signal: "confident", message: "“I'm certain” signals strong confidence.", explanation: "Explicit certainty.", replacements: [] },
  { re: /\bthere is no doubt\b/gi, id: "TONE_CONFIDENT_NO_DOUBT", signal: "confident", message: "“There is no doubt” signals strong confidence.", explanation: "Emphatic certainty.", replacements: [] },
  { re: /\bfor sure\b/gi, id: "TONE_CONFIDENT_FOR_SURE", signal: "confident", message: "“For sure” signals confidence.", explanation: "Informal certainty marker.", replacements: [] },
  { re: /\bno question\b/gi, id: "TONE_CONFIDENT_NO_QUESTION", signal: "confident", message: "“No question” signals strong confidence.", explanation: "Emphatic certainty.", replacements: [] },
  { re: /\bunquestionably\b/gi, id: "TONE_CONFIDENT_UNQUESTIONABLY", signal: "confident", message: "“Unquestionably” signals strong confidence.", explanation: "Formal certainty marker.", replacements: [] },
  { re: /\bguaranteed\b/gi, id: "TONE_CONFIDENT_GUARANTEED", signal: "confident", message: "“Guaranteed” signals strong assurance.", explanation: "Absolute commitment.", replacements: [] },
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

function shouldFlag(rule: ToneRule, formality?: CheckGoals["formality"]): boolean {
  if (!rule.whenFormality) return true;
  if (!formality || formality === "neutral") return false;
  if (rule.whenFormality === "formal") return formality === "formal";
  if (rule.whenFormality === "casual") return formality === "casual";
  return false;
}

export function analyzeTone(text: string, goals: CheckGoals | undefined, skip: Skip): ToneAnalysis {
  const formality = goals?.formality;
  const matches: Match[] = [];
  const signalSet = new Set<ToneSignal>();

  for (const rule of TONE_RULES) {
    if (!shouldFlag(rule, formality)) continue;
    each(text, rule.re, skip, (m) => {
      signalSet.add(rule.signal);
      matches.push({
        offset: m.index,
        length: m[0].length,
        ruleId: rule.id,
        category: "tone",
        message: rule.message,
        explanation: rule.explanation,
        replacements: rule.replacements,
      });
    });
  }

  return { signals: [...signalSet], matches };
}
