import type { PlagiarismResult } from "@check-grammar/protocol";

export const NO_PROVIDER_REASON = "no provider configured";

export const NO_PROVIDER_MESSAGE =
  "No plagiarism provider is configured on the API. Get a free API key from Winston AI " +
  "(gowinston.ai — free credits at signup, no card needed) and set PLAGIARISM_API_KEY on the server.";

export const PRIVACY_MODE_MESSAGE =
  "Plagiarism checks compare your text against published web sources, so they need the API. " +
  "Switch to Local API or Enhanced mode to run one — Privacy mode never sends text off this device.";

/** Health payload extension exposed by /healthz → enhanced.plagiarism. */
export interface PlagiarismCapability {
  configured: boolean;
  provider: string;
}

/**
 * Run an originality/similarity check via the API.
 * Never throws on "not configured" — the API answers 200 with skippedReason.
 * Throws only on network/provider failure so the caller can show an error.
 */
export async function checkPlagiarism(api: string, text: string): Promise<PlagiarismResult> {
  const r = await fetch(`${api.replace(/\/$/, "")}/v1/plagiarism`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(await r.text());
  const body = (await r.json()) as PlagiarismResult;
  return { ...body, matches: body.matches ?? [] };
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
