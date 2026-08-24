import type { Dialect } from "@check-grammar/protocol";

export type RewriteGoal = "clarity" | "brevity" | "formality";

const WORDY: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bat this point in time\b/gi, "now"],
  [/\bfor the purpose of\b/gi, "to"],
  [/\bwith regard to\b/gi, "about"],
  [/\bin the event that\b/gi, "if"],
  [/\bhas the ability to\b/gi, "can"],
  [/\bmake a decision\b/gi, "decide"],
  [/\btake into consideration\b/gi, "consider"],
];

const BRIEF: [RegExp, string][] = [
  [/\bvery\s+(\w+)/gi, "$1"],
  [/\breally\s+(\w+)/gi, "$1"],
  [/\bactually\b/gi, ""],
  [/\bbasically\b/gi, ""],
  [/\bin my opinion\b/gi, ""],
  [/\bI think that\b/gi, ""],
];

const CONTRACTIONS: [RegExp, string][] = [
  [/\bdon't\b/gi, "do not"],
  [/\bcan't\b/gi, "cannot"],
  [/\bwon't\b/gi, "will not"],
  [/\bit's\b/gi, "it is"],
  [/\bI'm\b/gi, "I am"],
  [/\bwe're\b/gi, "we are"],
  [/\bthey're\b/gi, "they are"],
  [/\byou're\b/gi, "you are"],
  [/\bI've\b/gi, "I have"],
  [/\bwe've\b/gi, "we have"],
];

function applyRules(text: string, rules: [RegExp, string][]): string {
  let out = text;
  for (const [re, repl] of rules) out = out.replace(re, repl);
  return out.replace(/  +/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
}

export function localRewrite(text: string, goals: RewriteGoal[]): string {
  let out = text;
  if (goals.includes("clarity")) out = applyRules(out, WORDY);
  if (goals.includes("brevity")) out = applyRules(out, [...WORDY, ...BRIEF]);
  if (goals.includes("formality")) {
    out = applyRules(out, CONTRACTIONS);
    out = out.replace(/\b(hey|yeah|gonna|wanna|kinda)\b/gi, "");
    out = applyRules(out, WORDY);
  }
  return out.trim() || text;
}

export function rewriteInstruction(goals: RewriteGoal[]): string {
  const parts: string[] = ["Rewrite for"];
  if (goals.includes("clarity")) parts.push("clarity");
  if (goals.includes("brevity")) parts.push("brevity");
  if (goals.includes("formality")) parts.push("formal tone");
  parts.push("Preserve meaning. Return only the rewritten text.");
  return parts.join(" ");
}

export async function fetchRewrite(
  api: string,
  snippet: string,
  goals: RewriteGoal[],
  dialect: Dialect,
): Promise<{ text: string; provider: string }> {
  try {
    const r = await fetch(`${api}/v1/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: snippet,
        instruction: rewriteInstruction(goals),
        dialect,
      }),
    });
    if (r.ok) {
      const body = await r.json();
      if (body.text?.trim()) return { text: body.text.trim(), provider: body.provider || "local" };
    }
  } catch {
    /* fall through to local rules */
  }
  return { text: localRewrite(snippet, goals), provider: "rules" };
}

/** Simple word-level diff segments for side-by-side display. */
export type DiffSegment = { kind: "same" | "removed" | "added"; text: string };

export function wordDiff(before: string, after: string): { before: DiffSegment[]; after: DiffSegment[] } {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  const left: DiffSegment[] = [];
  const right: DiffSegment[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    const aw = a[i] ?? "";
    const bw = b[i] ?? "";
    if (aw === bw) {
      if (aw) {
        left.push({ kind: "same", text: aw });
        right.push({ kind: "same", text: bw });
      }
    } else {
      if (aw) left.push({ kind: "removed", text: aw });
      if (bw) right.push({ kind: "added", text: bw });
    }
  }
  return { before: left, after: right };
}
