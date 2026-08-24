/** Health / LLM availability from GET /healthz */
export type LlmBackend = "ollama" | "bridge" | "none";

export interface LlmHealth {
  configured: boolean;
  available: boolean;
  backend: LlmBackend;
  provider: string;
  baseUrl: string;
  model?: string;
  models?: string[];
}

export interface ApiHealth {
  ok: boolean;
  llmAvailable?: boolean;
  llmBackend?: LlmBackend;
  llmModel?: string;
  ollamaBaseUrl?: string;
  enhanced?: {
    llm?: LlmHealth;
    languageTool?: { configured: boolean; reachable: boolean; url?: string; error?: string };
  };
}

const DEFAULT_OLLAMA = "http://127.0.0.1:11434";

/** Browser-side Ollama probe (optional; API healthz is preferred). */
export async function probeOllama(base = DEFAULT_OLLAMA): Promise<{ available: boolean; models: string[] }> {
  const url = (process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || base).replace(/\/$/, "");
  try {
    const r = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return { available: false, models: [] };
    const body = await r.json();
    const models = (body.models ?? []).map((m: { name?: string }) => m.name).filter(Boolean);
    return { available: models.length > 0, models };
  } catch {
    return { available: false, models: [] };
  }
}

export function llmFromHealth(body: ApiHealth): LlmHealth | null {
  const nested = body.enhanced?.llm;
  if (nested) return nested;
  if (body.llmAvailable) {
    return {
      configured: true,
      available: true,
      backend: body.llmBackend ?? "bridge",
      provider: "local",
      baseUrl: "",
      model: body.llmModel,
    };
  }
  return null;
}
