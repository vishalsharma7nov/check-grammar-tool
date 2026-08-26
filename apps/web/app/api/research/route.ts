import { NextResponse } from "next/server";
import {
  searchOpenCorpus,
  type ResearchResponse,
  type SearchCorpusOptions,
} from "../../../lib/corpus";

export const runtime = "nodejs";
export const maxDuration = 10;

export type { ResearchResponse, SearchCorpusOptions };

/**
 * POST /api/research — license-safe open corpus passages for grounded writing.
 * Body: { topic: string, limit?: number }
 * Returns: { passages: [...], provider: "open-corpus" }
 *
 * Not for detector evasion. Cite sourceUrl + license when reusing text.
 */
export async function POST(req: Request) {
  let topic = "";
  let limit: number | undefined;
  try {
    const body = (await req.json()) as {
      topic?: unknown;
      limit?: unknown;
    };
    topic = typeof body.topic === "string" ? body.topic : "";
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = body.limit;
    } else if (typeof body.limit === "string" && body.limit.trim()) {
      const n = Number(body.limit);
      if (Number.isFinite(n)) limit = n;
    }
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!topic.trim()) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  const passages = searchOpenCorpus(topic.trim(), { limit });
  const result: ResearchResponse = {
    passages,
    provider: "open-corpus",
  };
  return NextResponse.json(result);
}
