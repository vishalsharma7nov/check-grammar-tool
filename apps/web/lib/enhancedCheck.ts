import { analyze } from "@check-grammar/engine";
import type { CheckRequest, CheckResponse } from "@check-grammar/protocol";
import { fetchWithTimeout } from "./fetchTimeout";
import type { ApiHealth, LlmHealth } from "./ollama";
import { llmFromHealth } from "./ollama";

export interface EnhancedCapabilities extends ApiHealth {
  enhanced?: {
    languageTool: {
      configured: boolean;
      reachable: boolean;
      url?: string;
      error?: string;
    };
    llm?: LlmHealth;
    plagiarism?: {
      configured: boolean;
      provider: string;
    };
  };
  llmProvider?: string;
  llmBaseUrl?: string;
}

export type EnhancedCheckResult = {
  response: CheckResponse;
  mode: "enhanced" | "privacy";
  fallbackReason?: string;
};

export async function fetchEnhancedCapabilities(apiUrl: string): Promise<EnhancedCapabilities | null> {
  try {
    const r = await fetchWithTimeout(`${apiUrl.replace(/\/$/, "")}/healthz`, undefined, 8_000);
    if (!r.ok) return null;
    return (await r.json()) as EnhancedCapabilities;
  } catch {
    return null;
  }
}

export function enhancedAvailable(caps: EnhancedCapabilities | null): boolean {
  if (!caps?.ok) return false;
  const lt = caps.enhanced?.languageTool;
  const llm = llmFromHealth(caps);
  return !!(lt?.configured || lt?.reachable || llm?.configured || llm?.available || caps.llmProvider);
}

export function llmReady(caps: EnhancedCapabilities | null): boolean {
  const llm = llmFromHealth(caps ?? { ok: false });
  return Boolean(llm?.available);
}

export async function enhancedCheck(
  apiUrl: string,
  req: CheckRequest,
  options?: { includeLLM?: boolean; llmAvailable?: boolean },
): Promise<EnhancedCheckResult> {
  const base = apiUrl.replace(/\/$/, "");
  const useLLM = (options?.includeLLM ?? true) && (options?.llmAvailable ?? true);
  try {
    const r = await fetchWithTimeout(`${base}/v1/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, includeLLM: useLLM }),
    });
    if (!r.ok) throw new Error(await r.text());
    const response = (await r.json()) as CheckResponse;
    return { response, mode: "enhanced" };
  } catch (e) {
    return {
      response: analyze(req),
      mode: "privacy",
      fallbackReason: String(e),
    };
  }
}
