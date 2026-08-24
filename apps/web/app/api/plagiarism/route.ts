import { NextResponse } from "next/server";
import { checkPlagiarism } from "./providers";

export const runtime = "nodejs";
/** Winston can be slow; Pro plan allows up to 60s. Hobby caps lower. */
export const maxDuration = 60;

/**
 * POST /api/plagiarism — originality check via Winston (or Prepostseo/generic).
 * Reads PLAGIARISM_API_KEY / PLAGIARISM_PROVIDER / PLAGIARISM_API_URL (server-only).
 * Missing key → 200 { skippedReason: "no provider configured" }.
 */
export async function POST(req: Request) {
  let text = "";
  try {
    const body = (await req.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const result = await checkPlagiarism(text);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
