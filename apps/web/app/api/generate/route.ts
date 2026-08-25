import { NextResponse } from "next/server";
import type { Dialect } from "@check-grammar/protocol";
import { generateWithLlm } from "../../../lib/llmServer";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIN_WORDS = 100;
const MAX_WORDS = 2000;

const DIALECTS: Dialect[] = ["en-US", "en-GB", "en-CA", "en-AU", "en-IN"];

/**
 * POST /api/generate — original AI draft from a writing brief (not plagiarism check).
 * Requires LLM_API_KEY (Groq or OpenAI-compatible).
 */
export async function POST(req: Request) {
  let context = "";
  let wordCount = 0;
  let dialect: Dialect = "en-US";
  try {
    const body = (await req.json()) as {
      context?: unknown;
      wordCount?: unknown;
      dialect?: unknown;
    };
    context = typeof body.context === "string" ? body.context : "";
    if (typeof body.wordCount === "number" && Number.isFinite(body.wordCount)) {
      wordCount = Math.round(body.wordCount);
    } else if (typeof body.wordCount === "string" && body.wordCount.trim()) {
      wordCount = Math.round(Number(body.wordCount));
    }
    if (DIALECTS.includes(body.dialect as Dialect)) {
      dialect = body.dialect as Dialect;
    }
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!context.trim()) {
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

  const result = await generateWithLlm(context, wordCount, dialect);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
