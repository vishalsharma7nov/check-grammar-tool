import { NextResponse } from "next/server";
import type { Dialect } from "@check-grammar/protocol";
import { searchOpenCorpus } from "../../../lib/corpus";
import type { GeneratePassage } from "../../../lib/llmServer";
import { generateWithLlm } from "../../../lib/llmServer";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIN_WORDS = 100;
const MAX_WORDS = 2000;
const MAX_PASSAGES = 8;

const DIALECTS: Dialect[] = ["en-US", "en-GB", "en-CA", "en-AU", "en-IN"];

type PassageInput = {
  title?: unknown;
  sourceUrl?: unknown;
  license?: unknown;
  text?: unknown;
};

function parsePassages(raw: unknown): GeneratePassage[] {
  if (!Array.isArray(raw)) return [];
  const out: GeneratePassage[] = [];
  for (const item of raw as PassageInput[]) {
    const text = typeof item?.text === "string" ? item.text.trim() : "";
    if (!text) continue;
    out.push({
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled source",
      sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl.trim() : "",
      license: typeof item.license === "string" && item.license.trim() ? item.license.trim() : "unknown",
      text,
    });
    if (out.length >= MAX_PASSAGES) break;
  }
  return out;
}

/**
 * POST /api/generate — original AI draft from a writing brief (not plagiarism check).
 * Optional open-corpus research: pass `passages` or `useResearch` (+ topic/context).
 * Requires LLM_API_KEY (Groq or OpenAI-compatible).
 */
export async function POST(req: Request) {
  let context = "";
  let wordCount = 0;
  let dialect: Dialect = "en-US";
  let useResearch = false;
  let topic = "";
  let audience: string | undefined;
  let tone: string | undefined;
  let passages: GeneratePassage[] = [];

  try {
    const body = (await req.json()) as {
      context?: unknown;
      wordCount?: unknown;
      dialect?: unknown;
      useResearch?: unknown;
      topic?: unknown;
      audience?: unknown;
      tone?: unknown;
      passages?: unknown;
    };
    context = typeof body.context === "string" ? body.context : "";
    topic = typeof body.topic === "string" ? body.topic : "";
    if (typeof body.wordCount === "number" && Number.isFinite(body.wordCount)) {
      wordCount = Math.round(body.wordCount);
    } else if (typeof body.wordCount === "string" && body.wordCount.trim()) {
      wordCount = Math.round(Number(body.wordCount));
    }
    if (DIALECTS.includes(body.dialect as Dialect)) {
      dialect = body.dialect as Dialect;
    }
    useResearch = body.useResearch === true;
    if (typeof body.audience === "string" && body.audience.trim()) {
      audience = body.audience.trim();
    }
    if (typeof body.tone === "string" && body.tone.trim()) {
      tone = body.tone.trim();
    }
    passages = parsePassages(body.passages);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const brief = context.trim() || topic.trim();
  if (!brief) {
    return NextResponse.json({ error: "context required" }, { status: 400 });
  }
  if (!Number.isFinite(wordCount) || wordCount < MIN_WORDS) {
    return NextResponse.json(
      { error: `wordCount must be at least ${MIN_WORDS}` },
      { status: 400 },
    );
  }
  if (wordCount > MAX_WORDS) {
    return NextResponse.json(
      { error: `wordCount must be at most ${MAX_WORDS}` },
      { status: 400 },
    );
  }

  if (!passages.length && useResearch) {
    const query = topic.trim() || brief;
    passages = searchOpenCorpus(query, { limit: 5 }).map((p) => ({
      title: p.title,
      sourceUrl: p.sourceUrl,
      license: p.license,
      text: p.text,
    }));
  }

  const result = await generateWithLlm(brief, wordCount, dialect, {
    passages,
    audience,
    tone,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
