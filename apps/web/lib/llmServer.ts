/**
 * Server-only Groq / OpenAI-compatible LLM helpers for Next.js API routes.
 * Secrets stay in process.env (never NEXT_PUBLIC_*).
 */

import type { Dialect, RewriteGoal, RewriteVariant } from "@check-grammar/protocol";
import { localRewriteVariants } from "./rewrite";

export const DEFAULT_LLM_BASE = "https://api.groq.com/openai/v1";
export const DEFAULT_LLM_MODEL = "llama-3.1-8b-instant";

export type LlmEnv = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function llmEnv(): LlmEnv {
  return {
    apiKey: (process.env.LLM_API_KEY ?? "").trim(),
    baseUrl: (process.env.LLM_BASE_URL ?? DEFAULT_LLM_BASE).trim().replace(/\/$/, ""),
    model: (process.env.LLM_MODEL ?? DEFAULT_LLM_MODEL).trim() || DEFAULT_LLM_MODEL,
  };
}

export function llmConfigured(env = llmEnv()): boolean {
  return Boolean(env.apiKey);
}

const REWRITE_SYSTEM = `You are Check Grammar's writing assistant.

Return ONLY the rewritten text — no quotes, labels, markdown, or explanation.
Preserve factual meaning. Apply the user's rewrite goal precisely.`;

const GOAL_PROMPTS: Record<RewriteGoal, string> = {
  clarity: "Rewrite for clarity. Use plain, direct language. Preserve meaning.",
  brevity: "Rewrite to be more concise. Remove filler words. Preserve meaning.",
  formality: "Rewrite in a formal, professional tone. Preserve meaning.",
};

const goalPattern = /\b(clarity|brevity|formal(?:ity| tone)?)\b/gi;

export function goalsFromInstruction(instruction: string | undefined, goals?: RewriteGoal[]): RewriteGoal[] {
  if (goals?.length) return [...new Set(goals)];
  if (!instruction?.trim()) return ["clarity"];
  const seen = new Set<RewriteGoal>();
  const out: RewriteGoal[] = [];
  for (const m of instruction.matchAll(goalPattern)) {
    let g = m[1].toLowerCase();
    if (g.startsWith("formal")) g = "formality";
    const goal = g as RewriteGoal;
    if (seen.has(goal)) continue;
    seen.add(goal);
    out.push(goal);
  }
  return out.length ? out : ["clarity"];
}

export function rewriteGoalPrompt(goal: RewriteGoal): string {
  return GOAL_PROMPTS[goal] ?? GOAL_PROMPTS.clarity;
}

export async function chatCompletion(
  env: LlmEnv,
  system: string,
  user: string,
  opts?: { temperature?: number; timeoutMs?: number },
): Promise<{ content: string; model: string }> {
  const url = `${env.baseUrl}/chat/completions`;
  const body = {
    model: env.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: opts?.temperature ?? 0.35,
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 45_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`llm http ${res.status}: ${raw.slice(0, 400)}`);
    }
    const parsed = JSON.parse(raw) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const content = parsed.choices?.[0]?.message?.content?.trim() ?? "";
    return { content, model: parsed.model || env.model };
  } finally {
    clearTimeout(timer);
  }
}

function stripFence(s: string): string {
  const t = s.trim();
  if (!t.startsWith("```")) return t;
  const lines = t.split("\n");
  if (lines.length < 2) return t;
  const end = lines[lines.length - 1].startsWith("```") ? lines.length - 1 : lines.length;
  return lines.slice(1, end).join("\n").trim();
}

export function parseGrammarResponse(raw: string): {
  corrected: string;
  changes: { from: string; to: string; category?: string; message?: string }[];
  usedJSON: boolean;
} {
  const text = stripFence(raw);
  try {
    const parsed = JSON.parse(text) as {
      corrected?: string;
      changes?: { from?: string; to?: string; category?: string; message?: string }[];
    };
    if (parsed.corrected) {
      return {
        corrected: parsed.corrected,
        changes: (parsed.changes ?? [])
          .filter((c) => c.from && c.to)
          .map((c) => ({
            from: c.from!,
            to: c.to!,
            category: c.category,
            message: c.message,
          })),
        usedJSON: true,
      };
    }
  } catch {
    /* plain text */
  }
  return { corrected: text, changes: [], usedJSON: false };
}

function validateVariant(input: string, output: string): boolean {
  const out = output.trim();
  return Boolean(out) && out !== input.trim();
}

/** When LLM is up, produce clarity / brevity / formality like the Go client. */
export async function rewriteWithLlm(
  text: string,
  instruction: string | undefined,
  dialect: Dialect,
  requestedGoals?: RewriteGoal[],
): Promise<{
  text: string;
  provider: string;
  model?: string;
  variants: RewriteVariant[];
  skippedReason?: string;
}> {
  const env = llmEnv();
  const goals = goalsFromInstruction(instruction, requestedGoals);
  if (!llmConfigured(env)) {
    const variants = localRewriteVariants(text, goals);
    return {
      text: variants[0]?.text ?? text,
      provider: "rules",
      variants,
      skippedReason: "no LLM_API_KEY configured",
    };
  }

  // Match Go client: when LLM is up, always emit clarity / brevity / formality.
  const allGoals: RewriteGoal[] = ["clarity", "brevity", "formality"];
  const variants: RewriteVariant[] = [];
  let usedModel = env.model;
  const singleGoal = goals.length === 1 ? goals[0] : null;

  for (const goal of allGoals) {
    const prompt =
      singleGoal === goal && instruction?.trim() ? instruction.trim() : rewriteGoalPrompt(goal);
    try {
      const { content, model } = await chatCompletion(
        env,
        REWRITE_SYSTEM,
        `${prompt}\nDialect: ${dialect}\n\n---\n${text}`,
      );
      usedModel = model;
      if (validateVariant(text, content)) {
        variants.push({ goal, text: content });
      } else {
        const fallback = localRewriteVariants(text, [goal])[0];
        if (fallback && fallback.text !== text) variants.push(fallback);
      }
    } catch {
      const fallback = localRewriteVariants(text, [goal])[0];
      if (fallback) variants.push(fallback);
    }
  }

  if (!variants.length) {
    const rules = localRewriteVariants(text, goals.length ? goals : (["clarity"] as RewriteGoal[]));
    return { text: rules[0]?.text ?? text, provider: "rules", model: usedModel, variants: rules };
  }

  const preferred = [...variants].sort((a, b) => {
    const ai = goals.indexOf(a.goal);
    const bi = goals.indexOf(b.goal);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  return {
    text: preferred[0].text,
    provider: "hosted",
    model: usedModel,
    variants: preferred,
  };
}

const GENERATE_SYSTEM = `You are Check Grammar's AI writing assistant.

Write ORIGINAL content from the user's brief. Do not copy or closely paraphrase published sources.
Return ONLY the draft text — no title labels, markdown fences, word-count notes, or preamble.
Aim for approximately the requested word count. Use natural paragraphs.`;

function countWords(s: string): number {
  const m = s.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/** Original draft from context via Groq / OpenAI-compatible chat. */
export async function generateWithLlm(
  context: string,
  wordCount: number,
  dialect: Dialect,
): Promise<
  | { text: string; wordCount: number; provider: string; model: string }
  | { error: string; status: number }
> {
  const env = llmEnv();
  if (!llmConfigured(env)) {
    return {
      error:
        "LLM_API_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables (see docs/vercel.md), then redeploy.",
      status: 503,
    };
  }
  const brief = context.trim();
  try {
    const { content, model } = await chatCompletion(
      env,
      GENERATE_SYSTEM,
      `Dialect: ${dialect}\nTarget length: about ${wordCount} words (minimum ${Math.min(wordCount, 100)}).\n\nWriting brief:\n${brief}`,
      { temperature: 0.7, timeoutMs: 90_000 },
    );
    const text = stripFence(content).trim();
    if (!text) {
      return { error: "model returned empty draft", status: 502 };
    }
    return {
      text,
      wordCount: countWords(text),
      provider: "hosted",
      model,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), status: 502 };
  }
}

export async function grammarCorrectWithLlm(
  text: string,
  dialect: Dialect,
): Promise<{ corrected: string; model: string } | { error: string }> {
  const env = llmEnv();
  if (!llmConfigured(env)) return { error: "no LLM_API_KEY configured" };
  try {
    const { content, model } = await chatCompletion(
      env,
      `You are a grammar and spelling corrector. Return ONLY corrected text, or JSON {"corrected":"...","changes":[{"from":"...","to":"...","category":"grammar","message":"..."}]} when you can list changes. Dialect: ${dialect}. Preserve meaning.`,
      text,
      { temperature: 0.2 },
    );
    const { corrected } = parseGrammarResponse(content);
    return { corrected: corrected || text, model };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

type WordSpan = { text: string; start: number; end: number };

function wordSpans(s: string): WordSpan[] {
  const out: WordSpan[] = [];
  const re = /[A-Za-z][A-Za-z'-]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/** Word-level diff → Match-like suggestions (mirrors Go diffToMatches). */
export function diffToLlmMatches(
  original: string,
  corrected: string,
  dialect: Dialect,
): {
  offset: number;
  length: number;
  ruleId: string;
  category: "grammar";
  message: string;
  explanation: string;
  replacements: string[];
  dialect: Dialect;
}[] {
  if (original === corrected) return [];
  const orig = wordSpans(original);
  const corr = wordSpans(corrected);
  const out: ReturnType<typeof diffToLlmMatches> = [];
  let i = 0;
  let j = 0;
  while (i < orig.length && j < corr.length) {
    if (orig[i].text.toLowerCase() === corr[j].text.toLowerCase()) {
      i += 1;
      j += 1;
      continue;
    }
    out.push({
      offset: orig[i].start,
      length: orig[i].end - orig[i].start,
      ruleId: "LLM_SUGGEST",
      category: "grammar",
      message: "LLM suggests a correction.",
      explanation: "From Groq / OpenAI-compatible model.",
      replacements: [corr[j].text],
      dialect,
    });
    i += 1;
    j += 1;
  }
  return out;
}

export function filterNonOverlapping<T extends { offset: number; length: number }>(
  base: T[],
  extra: T[],
): T[] {
  return extra.filter((m) => {
    const end = m.offset + m.length;
    return !base.some((b) => !(end <= b.offset || m.offset >= b.offset + b.length));
  });
}
