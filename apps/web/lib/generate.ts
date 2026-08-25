import type { Dialect } from "@check-grammar/protocol";
import { fetchWithTimeout } from "./fetchTimeout";

export type GenerateResult = {
  text: string;
  wordCount: number;
  provider: string;
  model?: string;
};

/**
 * Same-origin POST /api/generate — original AI draft from a writing brief (Groq when LLM_API_KEY is set).
 */
export async function fetchGenerate(
  context: string,
  wordCount: number,
  dialect: Dialect,
): Promise<GenerateResult> {
  const r = await fetchWithTimeout(
    "/api/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, wordCount, dialect }),
    },
    90_000,
  );
  const body = (await r.json().catch(() => ({}))) as {
    text?: string;
    wordCount?: number;
    provider?: string;
    model?: string;
    error?: string;
  };
  if (!r.ok) {
    throw new Error(body.error || `generate failed (${r.status})`);
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) throw new Error("empty draft from generate API");
  return {
    text,
    wordCount: typeof body.wordCount === "number" ? body.wordCount : text.split(/\s+/).filter(Boolean).length,
    provider: body.provider || "hosted",
    model: body.model,
  };
}
