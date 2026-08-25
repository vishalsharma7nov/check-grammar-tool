import { NextResponse } from "next/server";
import { analyze } from "@check-grammar/engine";
import type { CheckRequest, CheckResponse, Dialect, Match } from "@check-grammar/protocol";
import {
  diffToLlmMatches,
  filterNonOverlapping,
  grammarCorrectWithLlm,
  llmConfigured,
  llmEnv,
} from "../../../lib/llmServer";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/check — in-process engine analyze() + optional Groq LLM augment.
 * Body matches CheckRequest (includeLLM opt-in). No Go API required on Vercel.
 */
export async function POST(req: Request) {
  let body: CheckRequest;
  try {
    body = (await req.json()) as CheckRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  const dialect: Dialect = body.dialect ?? "en-US";
  const includeLLM = Boolean(body.includeLLM);

  const base = analyze({
    text,
    dialect,
    mode: body.mode,
    goals: body.goals,
    personalDictionary: body.personalDictionary,
    styleGuide: body.styleGuide,
    includeLLM: false,
    caret: body.caret,
  });

  if (!includeLLM || !llmConfigured()) {
    const response: CheckResponse = {
      ...base,
      llm: {
        used: false,
        provider: "none",
        skippedReason: includeLLM ? "no LLM_API_KEY configured" : "includeLLM false",
      },
    };
    return NextResponse.json(response);
  }

  const llmResult = await grammarCorrectWithLlm(text, dialect);
  if ("error" in llmResult) {
    const response: CheckResponse = {
      ...base,
      llm: { used: false, provider: "hosted", skippedReason: llmResult.error },
    };
    return NextResponse.json(response);
  }

  const { corrected, model } = llmResult;
  const env = llmEnv();
  let extra: Match[] = [];
  if (corrected && corrected !== text) {
    extra = filterNonOverlapping(base.matches, diffToLlmMatches(text, corrected, dialect));
  }

  const response: CheckResponse = {
    matches: [...base.matches, ...extra],
    stats: base.stats,
    llm: {
      used: true,
      provider: "hosted",
      model: model || env.model,
    },
  };
  return NextResponse.json(response);
}
