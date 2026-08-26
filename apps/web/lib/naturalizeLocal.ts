/**
 * Light local heuristics when no LLM_API_KEY — cut common AI filler phrases.
 * Not a detector-evasion tool; keeps meaning and citation markers intact.
 */

const FILLER: [RegExp, string][] = [
  [/\bFurthermore,\s*/gi, ""],
  [/\bMoreover,\s*/gi, ""],
  [/\bIn conclusion,\s*/gi, ""],
  [/\bTo summarize,\s*/gi, ""],
  [/\bIn summary,\s*/gi, ""],
  [/\bIt's important to note(?: that)?\s*/gi, ""],
  [/\bIt is important to note(?: that)?\s*/gi, ""],
  [/\bIt is worth noting(?: that)?\s*/gi, ""],
  [/\bIt should be noted(?: that)?\s*/gi, ""],
  [/\bAs previously mentioned,\s*/gi, ""],
  [/\bIn today's (?:fast-paced|digital )?world,?\s*/gi, ""],
  [/\bIn this day and age,?\s*/gi, ""],
  [/\bDelve into\b/gi, "explore"],
  [/\bdelving into\b/gi, "exploring"],
  [/\bdelve\b/gi, "dig"],
  [/\bA myriad of\b/gi, "Many"],
  [/\ba myriad of\b/gi, "many"],
  [/\bAt the end of the day,\s*/gi, ""],
  [/\bNeedless to say,\s*/gi, ""],
  [/\bthe (?:ever-)?changing landscape\b/gi, "the field"],
  [/\b(?:this|the) landscape\b/gi, "this space"],
  [/\ba tapestry of\b/gi, "a mix of"],
  [/\bthe tapestry of\b/gi, "the mix of"],
  [/\bunlock(?:ing)? the (?:full )?potential\b/gi, "make the most"],
  [/\bin the realm of\b/gi, "in"],
  [/\bWhen it comes to\b/gi, "For"],
];

export function localNaturalize(text: string): string {
  let out = text;
  for (const [re, repl] of FILLER) {
    out = out.replace(re, repl);
  }
  return out.replace(/  +/g, " ").replace(/\n{3,}/g, "\n\n").trim() || text;
}
