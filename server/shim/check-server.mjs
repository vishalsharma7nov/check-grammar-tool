#!/usr/bin/env node
/** Same /v1/check JSON as the Go API, using the TS engine. Use when Go is not installed. */
import { createServer } from "node:http";
import { analyze } from "../../packages/engine/src/index.ts";

const port = Number(process.env.API_PORT || 8080);
const origin = process.env.WEB_ORIGIN || "http://localhost:3000";

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
  res.writeHead(404);
  res.end("not found");
}).listen(port, () => console.log(`shim /v1/check on :${port}`));
