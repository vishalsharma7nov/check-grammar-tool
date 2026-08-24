#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { analyze } from "../packages/engine/src/index.ts";

const lines = readFileSync(new URL("./golden.jsonl", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean);
let fail = 0;
for (const line of lines) {
  const ex = JSON.parse(line);
  const r = analyze({ text: ex.text, dialect: ex.dialect, styleGuide: ex.styleGuide, goals: ex.goals });
  if (ex.expectNoSpell && r.matches.some((m) => m.ruleId.startsWith("SPELL"))) {
    console.error("fail expectNoSpell", ex.text);
    fail++;
  }
  if (ex.expectRule && !r.matches.some((m) => m.ruleId === ex.expectRule)) {
    console.error("fail expectRule", ex.expectRule, r.matches.map((m) => m.ruleId));
    fail++;
  }
  if (ex.expectNoRule && r.matches.some((m) => m.ruleId === ex.expectNoRule)) {
    console.error("fail expectNoRule", ex.expectNoRule, ex.text);
    fail++;
  }
  if (ex.expectRulePrefix && !r.matches.some((m) => m.ruleId.startsWith(ex.expectRulePrefix))) {
    console.error("fail prefix", ex.expectRulePrefix);
    fail++;
  }
}
if (fail) process.exit(1);
console.log("golden ok", lines.length);
