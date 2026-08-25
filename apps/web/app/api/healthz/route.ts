import { NextResponse } from "next/server";
import { DEFAULT_LLM_BASE, DEFAULT_LLM_MODEL, llmConfigured, llmEnv } from "../../../lib/llmServer";

export const runtime = "nodejs";

/**
 * GET /api/healthz — reports whether Groq / LLM_API_KEY is configured (server-side).
 * Does not call Groq; presence of the key is enough for the UI LLM badge.
 */
export async function GET() {
  const env = llmEnv();
  const configured = llmConfigured(env);
  return NextResponse.json({
    ok: true,
    llmAvailable: configured,
    llmBackend: configured ? "groq" : "none",
    llmModel: configured ? env.model : undefined,
    llmProvider: configured ? "groq" : "none",
    llmBaseUrl: configured ? env.baseUrl : undefined,
    enhanced: {
      llm: {
        configured,
        available: configured,
        backend: configured ? "groq" : "none",
        provider: configured ? "groq" : "none",
        baseUrl: configured ? env.baseUrl : DEFAULT_LLM_BASE,
        model: configured ? env.model : DEFAULT_LLM_MODEL,
      },
    },
  });
}
