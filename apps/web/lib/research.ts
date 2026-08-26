import { fetchWithTimeout } from "./fetchTimeout";

export type ResearchPassage = {
  title: string;
  sourceUrl: string;
  license: string;
  text: string;
  score?: number;
};

export type ResearchResult = {
  passages: ResearchPassage[];
};

const REDEPLOY_MSG =
  "Research API not deployed yet — redeploy the latest build to enable open-source research.";

/**
 * Same-origin POST /api/research — open-license / public-domain passages for a topic.
 */
export async function fetchResearch(topic: string): Promise<ResearchResult> {
  const r = await fetchWithTimeout(
    "/api/research",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    },
    60_000,
  );
  if (r.status === 404) {
    throw new Error(REDEPLOY_MSG);
  }
  const body = (await r.json().catch(() => ({}))) as {
    passages?: unknown;
    error?: string;
  };
  if (!r.ok) {
    throw new Error(body.error || `research failed (${r.status})`);
  }
  const raw = Array.isArray(body.passages) ? body.passages : [];
  const passages: ResearchPassage[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "";
    const sourceUrl = typeof o.sourceUrl === "string" ? o.sourceUrl : "";
    const license = typeof o.license === "string" ? o.license : "Unknown";
    const text = typeof o.text === "string" ? o.text : "";
    if (!title && !text) continue;
    const item: ResearchPassage = {
      title: title || "Untitled",
      sourceUrl,
      license,
      text,
    };
    if (typeof o.score === "number") item.score = o.score;
    passages.push(item);
  }
  return { passages };
}
