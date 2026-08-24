import type { PlagiarismResult } from "@check-grammar/protocol";

export const NO_PROVIDER_REASON = "no provider configured";

export const NO_PROVIDER_MESSAGE =
  "No plagiarism provider is configured. Get a free API key from Winston AI " +
  "(gowinston.ai — free credits at signup, no card needed) and set PLAGIARISM_API_KEY " +
  "as a server env var on Vercel (Project → Settings → Environment Variables) or on the Go API. " +
  "Do not use NEXT_PUBLIC_ — the key must stay server-side. Redeploy after adding it.";

/**
 * Opt-in note for Privacy mode: grammar stays in-browser; plagiarism only runs
 * when the user clicks Check plagiarism (text then goes to the configured provider).
 */
export const PLAGIARISM_OPT_IN_MESSAGE =
  "Plagiarism check sends text to Winston AI when you click Check plagiarism " +
  "(opt-in, not automatic). Spelling and grammar stay in your browser.";

/** @deprecated Use PLAGIARISM_OPT_IN_MESSAGE — Privacy mode can use the Vercel /api/plagiarism route. */
export const PRIVACY_MODE_MESSAGE = PLAGIARISM_OPT_IN_MESSAGE;

/** Health payload extension exposed by /healthz → enhanced.plagiarism. */
export interface PlagiarismCapability {
  configured: boolean;
  provider: string;
}

async function postPlagiarism(url: string, text: string): Promise<PlagiarismResult> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(await r.text());
  const body = (await r.json()) as PlagiarismResult;
  return { ...body, matches: body.matches ?? [] };
}

/**
 * Run an originality/similarity check.
 * Prefers same-origin `/api/plagiarism` (Vercel / Next.js, no Render required).
 * Falls back to `${api}/v1/plagiarism` (self-hosted Go API) when the Next route
 * has no provider configured or is unreachable.
 * Never throws on "not configured" — endpoints answer 200 with skippedReason.
 */
export async function checkPlagiarism(api: string, text: string): Promise<PlagiarismResult> {
  let nextResult: PlagiarismResult | null = null;
  try {
    nextResult = await postPlagiarism("/api/plagiarism", text);
    if (nextResult.skippedReason !== NO_PROVIDER_REASON) {
      return nextResult;
    }
  } catch {
    // Next route missing or down — try Go API below.
  }

  const base = api.replace(/\/$/, "");
  if (base) {
    try {
      return await postPlagiarism(`${base}/v1/plagiarism`, text);
    } catch (e) {
      if (nextResult) return nextResult;
      throw e;
    }
  }

  return (
    nextResult ?? {
      score: 0,
      matches: [],
      provider: "none",
      skippedReason: NO_PROVIDER_REASON,
    }
  );
}

/** Friendly message for a skipped check; empty string when the check ran. */
export function skippedMessage(result: PlagiarismResult): string {
  if (!result.skippedReason) return "";
  if (result.skippedReason === NO_PROVIDER_REASON) return NO_PROVIDER_MESSAGE;
  return result.skippedReason;
}

/** Human summary of the score, framed around citation — not evasion. */
export function scoreSummary(result: PlagiarismResult): string {
  const s = Math.round(result.score);
  if (result.matches.length === 0 && s === 0) {
    return "No matching published sources found. Your text looks original.";
  }
  if (s < 10) {
    return `${s}% of the text overlaps with published sources. A small overlap is normal — check the sources below and cite any you drew from.`;
  }
  if (s < 30) {
    return `${s}% of the text matches published sources. Review the sources below and add citations or quotation marks where you used them.`;
  }
  return `${s}% of the text matches published sources. Cite each source you used, quote passages taken verbatim, or rewrite them in your own words with attribution.`;
}
