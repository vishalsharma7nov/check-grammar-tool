import { analyze } from "@check-grammar/engine";
import type { CheckRequest, CheckResponse } from "@check-grammar/protocol";
import { fetchWithTimeout } from "./fetchTimeout";
import type { ApiHealth, LlmHealth } from "./ollama";
import { llmFromHealth } from "./ollama";

export interface EnhancedCapabilities extends ApiHealth {
  enhanced?: {
    languageTool?: {
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

/** Prefer same-origin /api/healthz (Vercel Groq), then remote Go API /healthz. */
export async function fetchEnhancedCapabilities(apiUrl: string): Promise<EnhancedCapabilities | null> {
  let sameOrigin: EnhancedCapabilities | null = null;
  try {
    const r = await fetchWithTimeout("/api/healthz", undefined, 8_000);
    if (r.ok) sameOrigin = (await r.json()) as EnhancedCapabilities;
  } catch {
    /* no Next route */
  }

  let remote: EnhancedCapabilities | null = null;
  const base = apiUrl.replace(/\/$/, "");
  if (base) {
    try {
      const r = await fetchWithTimeout(`${base}/healthz`, undefined, 8_000);
      if (r.ok) remote = (await r.json()) as EnhancedCapabilities;
    } catch {
      /* remote down */
    }
  }

  if (sameOrigin?.ok && remote?.ok) {
    // Merge: keep LT from remote; prefer LLM when either side reports available.
    const sameLlm = llmFromHealth(sameOrigin);
    const remoteLlm = llmFromHealth(remote);
    const preferSame = Boolean(sameLlm?.available);
    return {
      ...remote,
      ...sameOrigin,
      ok: true,
      llmAvailable: Boolean(sameLlm?.available || remoteLlm?.available),
      llmBackend: preferSame ? sameOrigin.llmBackend : remote.llmBackend,
      llmModel: preferSame ? sameOrigin.llmModel : remote.llmModel,
      llmProvider: preferSame ? sameOrigin.llmProvider : remote.llmProvider,
      enhanced: {
        languageTool: remote.enhanced?.languageTool ?? {
          configured: false,
          reachable: false,
        },
        llm: preferSame ? sameLlm ?? undefined : remoteLlm ?? sameLlm ?? undefined,
        plagiarism: remote.enhanced?.plagiarism,
      },
    };
  }

  return sameOrigin?.ok ? sameOrigin : remote;
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

/**
 * Prefer same-origin POST /api/check (Vercel engine + optional Groq), then Go /v1/check,
 * then in-browser analyze().
 */
export async function enhancedCheck(
  apiUrl: string,
  req: CheckRequest,
  options?: { includeLLM?: boolean; llmAvailable?: boolean },
): Promise<EnhancedCheckResult> {
  const useLLM = (options?.includeLLM ?? true) && (options?.llmAvailable ?? true);
  const payload = { ...req, includeLLM: useLLM };

  try {
    const r = await fetchWithTimeout(
      "/api/check",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      60_000,
    );
    if (r.ok) {
      const response = (await r.json()) as CheckResponse;
      return { response, mode: "enhanced" };
    }
  } catch {
    /* try Go API */
  }

  const base = apiUrl.replace(/\/$/, "");
  if (base) {
    try {
      const r = await fetchWithTimeout(`${base}/v1/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  return {
    response: analyze(req),
    mode: "privacy",
    fallbackReason: "no /api/check and no API URL",
  };
}
