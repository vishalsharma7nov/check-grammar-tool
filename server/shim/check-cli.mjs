#!/usr/bin/env node
/** One-shot /v1/check via the TS engine (stdin JSON → stdout JSON). Used by the Go API. */
import { analyze } from "../../packages/engine/src/index.ts";

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

let res = analyze(body);

const ltURL = process.env.LANGUAGETOOL_URL?.replace(/\/$/, "");
const mergeStrategy = (process.env.LT_MERGE_STRATEGY || "prefer_lt_grammar").toLowerCase();

function mergeLT(baseMatches, ltMatches) {
  if (!ltMatches.length) return baseMatches;
  if (mergeStrategy === "skip_dupes" || mergeStrategy === "dedupe") {
    const offsets = new Set(baseMatches.map((m) => m.offset));
    const out = [...baseMatches];
    for (const m of ltMatches) {
      if (offsets.has(m.offset)) continue;
      offsets.add(m.offset);
      out.push(m);
    }
    return out;
  }
  const out = [...baseMatches];
  const offsetIndex = new Map(out.map((m, i) => [m.offset, i]));
  for (const m of ltMatches) {
    const idx = offsetIndex.get(m.offset);
    if (idx !== undefined) {
      if (m.category === "grammar" && m.ruleId.startsWith("LT_")) out[idx] = m;
      continue;
    }
    out.push(m);
    offsetIndex.set(m.offset, out.length - 1);
  }
  return out;
}

if (ltURL && body.text) {
  try {
    const dialect = body.dialect || "en-US";
    const form = new URLSearchParams({ text: body.text, language: dialect });
    const resp = await fetch(`${ltURL}/v2/check`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (resp.ok) {
      const lt = await resp.json();
      const ltMatches = [];
      for (const m of lt.matches ?? []) {
        const catName = (m.rule?.category?.name || m.rule?.category?.id || "").toLowerCase();
        let category = "grammar";
        if (catName.includes("spell") || catName.includes("typo")) category = "spelling";
        else if (catName.includes("punct")) category = "punctuation";
        else if (catName.includes("style") || catName.includes("redund")) category = "clarity";
        ltMatches.push({
          offset: m.offset,
          length: m.length,
          ruleId: `LT_${m.rule?.id || "UNKNOWN"}`,
          category,
          message: m.message || m.shortMessage || "LanguageTool suggestion",
          explanation: m.rule?.description || "",
          replacements: (m.replacements ?? []).map((r) => r.value).filter(Boolean),
          dialect: body.dialect,
        });
      }
      res.matches = mergeLT(res.matches, ltMatches);
      res.matches.sort((a, b) => a.offset - b.offset || b.length - a.length);
    }
  } catch {
    // LT optional — keep TS-only results
  }
}

const GRAMMAR_SYSTEM = `You are an expert English grammar, spelling, and clarity checker.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{"corrected":"<full corrected text>","changes":[{"from":"<exact substring in original>","to":"<replacement>","category":"spelling|grammar|clarity|punctuation","message":"<brief reason>"}]}

Rules:
- Preserve meaning and voice unless fixing errors.
- "from" must match the original text exactly (case-sensitive).
- If no changes are needed, return {"corrected":"<original>","changes":[]}.`;

function stripFence(raw) {
  const s = raw.trim();
  if (!s.startsWith("```")) return s;
  const lines = s.split("\n");
  if (lines.length < 2 || !lines.at(-1).startsWith("```")) return s;
  return lines.slice(1, -1).join("\n").trim();
}

function parseGrammarResponse(raw) {
  const trimmed = stripFence(raw.trim());
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.corrected) {
      return { corrected: parsed.corrected, changes: parsed.changes ?? [], usedJSON: true };
    }
  } catch {
    /* plain text fallback */
  }
  return { corrected: trimmed, changes: [], usedJSON: false };
}

function changesToMatches(text, changes, dialect) {
  const out = [];
  let searchFrom = 0;
  for (const ch of changes) {
    if (!ch.from || !ch.to) continue;
    let offset = text.indexOf(ch.from, searchFrom);
    if (offset < 0) offset = text.indexOf(ch.from);
    if (offset < 0) continue;
    out.push({
      offset,
      length: ch.from.length,
      ruleId: "LLM_SUGGEST",
      category: ch.category || "grammar",
      message: ch.message || "LLM suggests a correction.",
      explanation: "From local GEC model.",
      replacements: [ch.to],
      dialect,
    });
    searchFrom = offset + ch.from.length;
  }
  return out;
}

const llmBase = (process.env.LLM_URL || process.env.LLM_BASE_URL || "").replace(/\/$/, "");
if (body.includeLLM && llmBase) {
  try {
    const dialect = body.dialect || "en-IN";
    const instruction = `Fix grammar, spelling, and clarity. Preserve meaning. Dialect: ${dialect}`;
    const resp = await fetch(`${llmBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LLM_API_KEY ? { Authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "llama3.2",
        messages: [
          { role: "system", content: GRAMMAR_SYSTEM },
          { role: "user", content: `${instruction}\n\n---\n${body.text}` },
        ],
        temperature: 0.2,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
      const { corrected, changes, usedJSON } = parseGrammarResponse(raw);
      res.llm = { used: true, provider: "local", model: data.model || process.env.LLM_MODEL || "llama3.2" };
      if (corrected && corrected !== body.text) {
        const extra = usedJSON && changes.length
          ? changesToMatches(body.text, changes, dialect)
          : diffToMatches(body.text, corrected, dialect);
        const existing = res.matches;
        for (const m of extra) {
          if (overlapsAny(m, existing)) continue;
          res.matches.push(m);
        }
        res.matches.sort((a, b) => a.offset - b.offset || b.length - a.length);
      }
    } else {
      res.llm = { used: false, provider: "local", skippedReason: `llm http ${resp.status}` };
    }
  } catch (e) {
    res.llm = { used: false, provider: "local", skippedReason: String(e?.message || e) };
  }
}

process.stdout.write(JSON.stringify(res));

function diffToMatches(original, corrected, dialect) {
  const orig = wordSpans(original);
  const corr = wordSpans(corrected);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < orig.length && j < corr.length) {
    if (orig[i].text.toLowerCase() === corr[j].text.toLowerCase()) {
      i++;
      j++;
      continue;
    }
    out.push({
      offset: orig[i].start,
      length: orig[i].end - orig[i].start,
      ruleId: "LLM_SUGGEST",
      category: "grammar",
      message: "LLM suggests a correction.",
      explanation: "From local GEC model.",
      replacements: [corr[j].text],
      dialect,
    });
    i++;
    j++;
  }
  return out;
}

function wordSpans(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (!/[A-Za-z]/.test(s[i])) {
      i++;
      continue;
    }
    const start = i;
    while (i < s.length && /[A-Za-z'-]/.test(s[i])) i++;
    out.push({ text: s.slice(start, i), start, end: i });
  }
  return out;
}

function overlapsAny(m, others) {
  const end = m.offset + m.length;
  for (const o of others) {
    const oEnd = o.offset + o.length;
    if (m.offset < oEnd && end > o.offset) return true;
  }
  return false;
}
