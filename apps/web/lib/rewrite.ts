import type { Dialect, RewriteVariant } from "@check-grammar/protocol";
import { fetchWithTimeout } from "./fetchTimeout.ts";

export type RewriteGoal = "clarity" | "brevity" | "formality";

const WORDY: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bat this point in time\b/gi, "now"],
  [/\bat the present time\b/gi, "now"],
  [/\bfor the purpose of\b/gi, "to"],
  [/\bwith regard to\b/gi, "about"],
  [/\bwith respect to\b/gi, "about"],
  [/\bin the event that\b/gi, "if"],
  [/\bhas the ability to\b/gi, "can"],
  [/\bmake a decision\b/gi, "decide"],
  [/\btake into consideration\b/gi, "consider"],
  [/\bprior to\b/gi, "before"],
  [/\bin spite of\b/gi, "despite"],
  [/\ba large number of\b/gi, "many"],
  [/\ba number of\b/gi, "several"],
  [/\bin the near future\b/gi, "soon"],
  [/\bon a daily basis\b/gi, "daily"],
  [/\bwith the exception of\b/gi, "except"],
  [/\bin light of\b/gi, "given"],
  [/\bas a matter of fact\b/gi, ""],
  [/\bit is important to note that\b/gi, ""],
  [/\bneedless to say\b/gi, ""],
  [/\brevert back\b/gi, "reply"],
  [/\bkindly revert\b/gi, "please reply"],
];

const BRIEF: [RegExp, string][] = [
  [/\bvery\s+(\w+)/gi, "$1"],
  [/\breally\s+(\w+)/gi, "$1"],
  [/\bactually\b/gi, ""],
  [/\bbasically\b/gi, ""],
  [/\bin my opinion\b/gi, ""],
  [/\bI think that\b/gi, ""],
  [/\bplease be advised that\b/gi, ""],
  [/\bkindly\b/gi, ""],
  [/\bin order to\b/gi, "to"],
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
  [/\bisn't\b/gi, "is not"],
  [/\baren't\b/gi, "are not"],
  [/\bwasn't\b/gi, "was not"],
  [/\bweren't\b/gi, "were not"],
  [/\bhasn't\b/gi, "has not"],
  [/\bhaven't\b/gi, "have not"],
  [/\bdidn't\b/gi, "did not"],
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

export function localRewriteVariants(text: string, goals: RewriteGoal[]): RewriteVariant[] {
  const unique = [...new Set(goals.length ? goals : (["clarity"] as RewriteGoal[]))];
  return unique.map((goal) => ({ goal, text: localRewrite(text, [goal]) }));
}

export type RewriteResult = {
  text: string;
  provider: string;
  model?: string;
  variants: RewriteVariant[];
  /** Soft failure note — result still usable (usually local rules). */
  warning?: string;
};

function rulesResult(snippet: string, goalsActive: RewriteGoal[], warning?: string): RewriteResult {
  const variants = localRewriteVariants(snippet, goalsActive);
  return {
    text: variants[0]?.text ?? snippet,
    provider: "rules",
    variants,
    warning,
  };
}

function parseRewriteBody(
  body: {
    text?: string;
    provider?: string;
    model?: string;
    variants?: RewriteVariant[];
    skippedReason?: string;
    error?: string;
  },
  snippet: string,
  goalsActive: RewriteGoal[],
): RewriteResult | null {
  const variants: RewriteVariant[] = Array.isArray(body.variants)
    ? body.variants.filter((v) => v?.text?.trim())
    : [];
  const text = body.text?.trim() || variants[0]?.text?.trim() || "";
  if (!text) return null;
  return {
    text,
    provider: body.provider || "local",
    model: body.model,
    variants: variants.length ? variants : localRewriteVariants(snippet, goalsActive),
    warning: body.skippedReason || body.error,
  };
}

async function readJson(r: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type FetchRewriteOptions = {
  /** Privacy mode: never call the network; local rules only. */
  localOnly?: boolean;
};

/**
 * Prefer same-origin POST /api/rewrite (Vercel + Groq), then Go `${api}/v1/rewrite`,
 * then local rule variants. Always returns a usable result (rules at minimum).
 */
export async function fetchRewrite(
  api: string,
  snippet: string,
  goals: RewriteGoal[],
  dialect: Dialect,
  opts?: FetchRewriteOptions,
): Promise<RewriteResult> {
  const goalsActive = goals.length ? goals : (["clarity"] as RewriteGoal[]);
  const fallback = () => rulesResult(snippet, goalsActive);

  if (opts?.localOnly) {
    return fallback();
  }

  const payload = {
    text: snippet,
    instruction: rewriteInstruction(goalsActive),
    dialect,
    goals: goalsActive,
  };

  const warnings: string[] = [];

  try {
    const r = await fetchWithTimeout(
      "/api/rewrite",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      25_000,
    );
    if (r.ok) {
      const body = await readJson(r);
      if (body) {
        const parsed = parseRewriteBody(
          body as Parameters<typeof parseRewriteBody>[0],
          snippet,
          goalsActive,
        );
        if (parsed) {
          // Hosted/Groq — use immediately.
          if (parsed.provider && parsed.provider !== "rules") {
            return parsed;
          }
          // Same-origin already gave rules (no key / LLM skip) — do not wait on Go API.
          return {
            ...parsed,
            warning:
              parsed.warning ||
              (typeof body.skippedReason === "string" ? body.skippedReason : undefined),
          };
        }
      }
      warnings.push("Rewrite API returned an empty response.");
    } else if (r.status === 404) {
      warnings.push("Rewrite API not deployed (404).");
    } else {
      const body = await readJson(r);
      const err =
        body && typeof body.error === "string" ? body.error : `Rewrite API failed (${r.status})`;
      warnings.push(err);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnings.push(
      msg.includes("abort") || msg.includes("Timeout")
        ? "Rewrite API timed out."
        : `Rewrite API unreachable (${msg}).`,
    );
  }

  const base = api.replace(/\/$/, "");
  // Skip probing default localhost when the page is not on localhost (e.g. Vercel).
  const onLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const looksLikeLocalDefault = /localhost|127\.0\.0\.1/.test(base);
  const shouldTryGo = Boolean(base) && (onLocalhost || !looksLikeLocalDefault);

  if (shouldTryGo) {
    try {
      const r = await fetchWithTimeout(
        `${base}/v1/rewrite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: snippet,
            instruction: rewriteInstruction(goalsActive),
            dialect,
          }),
        },
        8_000,
      );
      if (r.ok) {
        const body = await readJson(r);
        if (body) {
          const parsed = parseRewriteBody(
            body as Parameters<typeof parseRewriteBody>[0],
            snippet,
            goalsActive,
          );
          if (parsed) {
            return {
              ...parsed,
              warning: warnings.length ? warnings.join(" ") : parsed.warning,
            };
          }
        }
      } else {
        warnings.push(`Go rewrite API failed (${r.status}).`);
      }
    } catch {
      warnings.push("Go rewrite API unreachable.");
    }
  }

  const local = fallback();
  return {
    ...local,
    warning: [...warnings, "Using on-device rewrite rules."].filter(Boolean).join(" "),
  };
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
