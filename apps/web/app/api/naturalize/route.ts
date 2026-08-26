import { NextResponse } from "next/server";
import { naturalizeWithLlm } from "../../../lib/llmServer";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/naturalize — natural prose pass (rhythm / filler), not detector evasion.
 * Without LLM_API_KEY: light local heuristics, still 200.
 */
export async function POST(req: Request) {
  let text = "";
  let tone: string | undefined;
  try {
    const body = (await req.json()) as { text?: unknown; tone?: unknown };
    text = typeof body.text === "string" ? body.text : "";
    if (typeof body.tone === "string" && body.tone.trim()) {
      tone = body.tone.trim();
    }
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const result = await naturalizeWithLlm(text, tone);
  return NextResponse.json(result);
}
