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
  [/\bIt is important to note(?: that)?\s*/gi, ""],
  [/\bIt is worth noting(?: that)?\s*/gi, ""],
  [/\bIt should be noted(?: that)?\s*/gi, ""],
  [/\bAs previously mentioned,\s*/gi, ""],
  [/\bIn today's (?:fast-paced|digital) world,?\s*/gi, ""],
  [/\bDelve into\b/gi, "explore"],
  [/\bdelving into\b/gi, "exploring"],
  [/\bA myriad of\b/gi, "Many"],
  [/\ba myriad of\b/gi, "many"],
  [/\bAt the end of the day,\s*/gi, ""],
  [/\bNeedless to say,\s*/gi, ""],
];

export function localNaturalize(text: string): string {
  let out = text;
  for (const [re, repl] of FILLER) {
    out = out.replace(re, repl);
  }
  return out.replace(/  +/g, " ").replace(/\n{3,}/g, "\n\n").trim() || text;
}
