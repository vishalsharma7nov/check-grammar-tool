import { fetchWithTimeout } from "./fetchTimeout";
import { localNaturalize } from "./naturalizeLocal";

export type NaturalizeResult = {
  text: string;
  provider: string;
  model?: string;
};

export type NaturalizeDraftOptions = {
  text: string;
  tone?: string;
};

/**
 * Same-origin POST /api/naturalize — natural prose pass (not detector evasion).
 * Falls back to local filler heuristics if the route is unavailable.
 */
export async function naturalizeDraft(opts: NaturalizeDraftOptions): Promise<NaturalizeResult> {
  const text = opts.text.trim();
  if (!text) throw new Error("text required");

  try {
    const r = await fetchWithTimeout(
      "/api/naturalize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tone: opts.tone }),
      },
      60_000,
    );
    const body = (await r.json().catch(() => ({}))) as {
      text?: string;
      provider?: string;
      model?: string;
      error?: string;
    };
    if (!r.ok) {
      if (r.status === 404) {
        return { text: localNaturalize(text), provider: "rules" };
      }
      throw new Error(body.error || `naturalize failed (${r.status})`);
    }
    const out = typeof body.text === "string" ? body.text.trim() : "";
    if (!out) throw new Error("empty naturalize response");
    return {
      text: out,
      provider: body.provider || "hosted",
      model: body.model,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/abort|Timeout|Failed to fetch|NetworkError|404/i.test(msg)) {
      return { text: localNaturalize(text), provider: "rules" };
    }
    throw e;
  }
}

export { localNaturalize };
