import type { Dialect } from "@check-grammar/protocol";
import { fetchWithTimeout } from "./fetchTimeout";
import type { Citation } from "./corpus/types";

export type { Citation };

export type GeneratePassageInput = {
  title: string;
  sourceUrl: string;
  license: string;
  text: string;
};

export type GenerateResult = {
  text: string;
  wordCount: number;
  provider: string;
  model?: string;
  citations: Citation[];
};

export type GenerateDraftOptions = {
  context: string;
  wordCount: number;
  dialect?: Dialect;
  /** When true, server searches open corpus using topic or context. */
  useResearch?: boolean;
  topic?: string;
  audience?: string;
  tone?: string;
  /** Caller-supplied research passages (skips server search if non-empty). */
  passages?: GeneratePassageInput[];
};

/**
 * Same-origin POST /api/generate — original AI draft from a writing brief (Groq when LLM_API_KEY is set).
 * Optional grounded research via useResearch or passages; response always includes citations[].
 */
export async function fetchGenerate(
  context: string,
  wordCount: number,
  dialect: Dialect,
  extras?: Omit<GenerateDraftOptions, "context" | "wordCount" | "dialect">,
): Promise<GenerateResult> {
  return generateDraft({
    context,
    wordCount,
    dialect,
    ...extras,
  });
}

/** Preferred client helper for Writer Studio and AI Write. */
export async function generateDraft(opts: GenerateDraftOptions): Promise<GenerateResult> {
  const dialect = opts.dialect ?? "en-US";
  const payload: Record<string, unknown> = {
    context: opts.context,
    wordCount: opts.wordCount,
    dialect,
  };
  if (opts.useResearch) payload.useResearch = true;
  if (opts.topic?.trim()) payload.topic = opts.topic.trim();
  if (opts.audience?.trim()) payload.audience = opts.audience.trim();
  if (opts.tone?.trim()) payload.tone = opts.tone.trim();
  if (opts.passages?.length) payload.passages = opts.passages;

  const r = await fetchWithTimeout(
    "/api/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    90_000,
  );
  const body = (await r.json().catch(() => ({}))) as {
    text?: string;
    wordCount?: number;
    provider?: string;
    model?: string;
    citations?: Citation[];
    error?: string;
  };
  if (!r.ok) {
    if (r.status === 404) {
      throw new Error(
        "Generate API not deployed yet — redeploy the latest build to enable AI drafts.",
      );
    }
    throw new Error(body.error || `generate failed (${r.status})`);
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) throw new Error("empty draft from generate API");
  const citations = Array.isArray(body.citations)
    ? body.citations.filter(
        (c): c is Citation =>
          Boolean(c) &&
          typeof c.title === "string" &&
          typeof c.sourceUrl === "string" &&
          typeof c.license === "string",
      )
    : [];
  return {
    text,
    wordCount: typeof body.wordCount === "number" ? body.wordCount : text.split(/\s+/).filter(Boolean).length,
    provider: body.provider || "hosted",
    model: body.model,
    citations,
  };
}
