import { NextResponse } from "next/server";
import type { Dialect, RewriteGoal } from "@check-grammar/protocol";
import { rewriteWithLlm } from "../../../lib/llmServer";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/rewrite — Groq (or OpenAI-compatible) rewrite via LLM_* env vars.
 * Missing LLM_API_KEY → 200 with rule-based variants + skippedReason.
 */
export async function POST(req: Request) {
  let text = "";
  let instruction: string | undefined;
  let dialect: Dialect = "en-US";
  let goals: RewriteGoal[] | undefined;
  try {
    const body = (await req.json()) as {
      text?: unknown;
      instruction?: unknown;
      dialect?: unknown;
      goals?: unknown;
    };
    text = typeof body.text === "string" ? body.text : "";
    if (typeof body.instruction === "string") instruction = body.instruction;
    if (
      body.dialect === "en-US" ||
      body.dialect === "en-GB" ||
      body.dialect === "en-CA" ||
      body.dialect === "en-AU" ||
      body.dialect === "en-IN"
    ) {
      dialect = body.dialect;
    }
    if (Array.isArray(body.goals)) {
      goals = body.goals.filter(
        (g): g is RewriteGoal => g === "clarity" || g === "brevity" || g === "formality",
      );
    }
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    const result = await rewriteWithLlm(text, instruction, dialect, goals);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
