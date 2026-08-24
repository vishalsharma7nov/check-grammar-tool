#!/usr/bin/env node
/** Same /v1/check JSON as the Go API, using the TS engine. Use when Go is not installed. */
import { createServer } from "node:http";
import { analyze } from "../../packages/engine/src/index.ts";

const port = Number(process.env.API_PORT || 8080);
const origin = process.env.WEB_ORIGIN || "http://localhost:3000";

/**
 * Originality/similarity check via a free-tier provider (Winston AI by default).
 * Mirrors the Go /v1/plagiarism route: no key → 200 with skippedReason.
 * Detection only — helps writers find and cite sources.
 */
async function checkPlagiarism(text) {
  const key = process.env.PLAGIARISM_API_KEY || "";
  const provider = (process.env.PLAGIARISM_PROVIDER || (key ? "winston" : "none")).toLowerCase();
  if (!key || provider === "none") {
    return { score: 0, matches: [], provider: "none", skippedReason: "no provider configured" };
  }
  if (text.trim().length < 100) {
    return { score: 0, matches: [], provider, skippedReason: "text too short — providers need at least 100 characters" };
  }
  const url = process.env.PLAGIARISM_API_URL || "https://api.gowinston.ai/v2/plagiarism";
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ text, language: "auto" }),
  });
  if (!r.ok) {
    return { score: 0, matches: [], provider, skippedReason: `provider returned ${r.status}` };
  }
  const body = await r.json();
  if (typeof body.score === "number" && Array.isArray(body.matches)) return { provider, ...body };
  const matches = (body.sources || [])
    .filter((s) => s.url)
    .map((s) => ({
      text: s.plagiarismFound?.[0]?.sequence || "",
      url: s.url,
      title: s.title || undefined,
      similarity: s.score ?? 0,
    }));
  return { score: body.result?.score ?? 0, matches, provider };
}

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === "/healthz" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, engine: "typescript-shim", note: "Install Go to run server/api" }));
    return;
  }
  if (req.url === "/v1/check" && req.method === "POST") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    const out = analyze(body);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(out));
    return;
  }
  if (req.url === "/v1/plagiarism" && req.method === "POST") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    const out = await checkPlagiarism(body.text || "");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(out));
    return;
  }
  res.writeHead(404);
  res.end("not found");
}).listen(port, () => console.log(`shim /v1/check on :${port}`));
