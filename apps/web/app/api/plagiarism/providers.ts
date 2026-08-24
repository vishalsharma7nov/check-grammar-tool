/**
 * Server-side plagiarism providers (Winston / Prepostseo / generic).
 * Mirrors server/api/internal/plagiarism — keep request/response mapping in sync.
 */

export type PlagiarismMatch = {
  text: string;
  url: string;
  title?: string;
  similarity: number;
};

export type PlagiarismResult = {
  score: number;
  matches: PlagiarismMatch[];
  provider: string;
  skippedReason?: string;
};

type Config = {
  provider: string;
  apiKey: string;
  apiUrl: string;
};

const DEFAULT_WINSTON_URL = "https://api.gowinston.ai/v2/plagiarism";
const DEFAULT_PREPOSTSEO_URL = "https://www.prepostseo.com/apis/checkPlag";
const MIN_TEXT_LEN = 100;
const REQUEST_TIMEOUT_MS = 90_000;

export function envConfig(): Config {
  return {
    provider: (process.env.PLAGIARISM_PROVIDER ?? "").trim(),
    apiKey: (process.env.PLAGIARISM_API_KEY ?? "").trim(),
    apiUrl: (process.env.PLAGIARISM_API_URL ?? "").trim(),
  };
}

export function resolveProvider(cfg: Config): string {
  const p = cfg.provider.toLowerCase();
  switch (p) {
    case "winston":
    case "prepostseo":
    case "generic":
    case "none":
      return p;
    case "":
      if (cfg.apiKey) {
        return cfg.apiUrl ? "generic" : "winston";
      }
      return "none";
    default:
      return "generic";
  }
}

export async function checkPlagiarism(text: string, cfg = envConfig()): Promise<PlagiarismResult> {
  const provider = resolveProvider(cfg);
  if (provider === "none" || !cfg.apiKey) {
    return { score: 0, matches: [], provider: "none", skippedReason: "no provider configured" };
  }
  if (provider === "generic" && !cfg.apiUrl) {
    return {
      score: 0,
      matches: [],
      provider: "generic",
      skippedReason: "generic provider needs PLAGIARISM_API_URL",
    };
  }
  if (text.trim().length < MIN_TEXT_LEN) {
    return {
      score: 0,
      matches: [],
      provider,
      skippedReason: `text too short — providers need at least ${MIN_TEXT_LEN} characters`,
    };
  }

  switch (provider) {
    case "winston":
      return checkWinston(cfg, text);
    case "prepostseo":
      return checkPrepostseo(cfg, text);
    default:
      return checkGeneric(cfg, text);
  }
}

async function checkWinston(cfg: Config, text: string): Promise<PlagiarismResult> {
  const endpoint = cfg.apiUrl || DEFAULT_WINSTON_URL;
  const body = await postJSON(endpoint, `Bearer ${cfg.apiKey}`, { text, language: "auto" });
  const out = body as {
    result?: { score?: number };
    sources?: Array<{
      score?: number;
      url?: string;
      title?: string;
      plagiarismFound?: Array<{ sequence?: string }>;
    }>;
  };
  const matches: PlagiarismMatch[] = [];
  for (const src of out.sources ?? []) {
    if (!src.url) continue;
    const excerpt = src.plagiarismFound?.[0]?.sequence ?? "";
    matches.push({
      text: excerpt,
      url: src.url,
      title: src.title,
      similarity: src.score ?? 0,
    });
  }
  return { score: out.result?.score ?? 0, matches, provider: "winston" };
}

async function checkPrepostseo(cfg: Config, text: string): Promise<PlagiarismResult> {
  const endpoint = cfg.apiUrl || DEFAULT_PREPOSTSEO_URL;
  const form = new URLSearchParams({ key: cfg.apiKey, data: text });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`prepostseo: provider returned ${res.status}: ${trimMsg(raw)}`);
  }
  const out = JSON.parse(raw) as {
    plagPercent?: number;
    details?: Array<{
      query?: string;
      unique?: string;
      webs?: Array<{ title?: string; url?: string }>;
    }>;
  };
  const matches: PlagiarismMatch[] = [];
  for (const d of out.details ?? []) {
    if ((d.unique ?? "").toLowerCase() !== "false" || !d.webs?.length || !d.webs[0].url) continue;
    matches.push({
      text: d.query ?? "",
      url: d.webs[0].url,
      title: d.webs[0].title,
      similarity: 100,
    });
  }
  return { score: out.plagPercent ?? 0, matches, provider: "prepostseo" };
}

async function checkGeneric(cfg: Config, text: string): Promise<PlagiarismResult> {
  const body = await postJSON(cfg.apiUrl, cfg.apiKey ? `Bearer ${cfg.apiKey}` : "", { text });
  const out = body as PlagiarismResult;
  return {
    score: out.score ?? 0,
    matches: out.matches ?? [],
    provider: "generic",
    skippedReason: out.skippedReason,
  };
}

async function postJSON(endpoint: string, auth: string, payload: Record<string, string>): Promise<unknown> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = auth;
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`provider returned ${res.status}: ${trimMsg(raw)}`);
  }
  return JSON.parse(raw) as unknown;
}

function trimMsg(msg: string): string {
  const t = msg.trim();
  return t.length > 300 ? t.slice(0, 300) : t;
}
