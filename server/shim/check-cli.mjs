#!/usr/bin/env node
/** One-shot /v1/check via the TS engine (stdin JSON → stdout JSON). Used by the Go API. */
import { analyze } from "../../packages/engine/src/index.ts";

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
process.stdout.write(JSON.stringify(analyze(body)));
