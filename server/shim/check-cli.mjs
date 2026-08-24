#!/usr/bin/env node
/** One-shot /v1/check via the TS engine (stdin JSON → stdout JSON). Used by the Go API. */
import { analyze } from "../../packages/engine/src/index.ts";

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");

let res = analyze(body);

const ltURL = process.env.LANGUAGETOOL_URL?.replace(/\/$/, "");
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
      const offsets = new Set(res.matches.map((m) => m.offset));
      for (const m of lt.matches ?? []) {
        if (offsets.has(m.offset)) continue;
        offsets.add(m.offset);
        const catName = (m.rule?.category?.name || m.rule?.category?.id || "").toLowerCase();
        let category = "grammar";
        if (catName.includes("spell") || catName.includes("typo")) category = "spelling";
        else if (catName.includes("punct")) category = "punctuation";
        else if (catName.includes("style") || catName.includes("redund")) category = "clarity";
        res.matches.push({
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
      res.matches.sort((a, b) => a.offset - b.offset || b.length - a.length);
    }
  } catch {
    // LT optional — keep TS-only results
  }
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
        model: process.env.LLM_MODEL || "check-gec-v0",
        messages: [
          { role: "system", content: "You are Check Grammar's local writing model. Return only the corrected text." },
          { role: "user", content: `${instruction}\n\n---\n${body.text}` },
        ],
        temperature: 0.2,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const corrected = data.choices?.[0]?.message?.content?.trim() ?? "";
      res.llm = { used: true, provider: "local", model: data.model || process.env.LLM_MODEL || "check-gec-v0" };
      if (corrected && corrected !== body.text) {
        const extra = diffToMatches(body.text, corrected, dialect);
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
