import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./index.ts";

describe("privacy engine", () => {
  it("flags teh and recieve", () => {
    const r = analyze({ text: "I recieve teh letter." });
    assert.ok(r.matches.some((m) => m.replacements.includes("the")));
    assert.ok(r.matches.some((m) => m.replacements.includes("receive")));
  });

  it("flags a apple", () => {
    const r = analyze({ text: "She ate a apple." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_A_AN"));
  });

  it("skips fenced code", () => {
    const r = analyze({ text: "ok\n```\nteh teh\n```\n" });
    assert.equal(r.matches.filter((m) => m.ruleId.startsWith("SPELL")).length, 0);
  });

  it("treats prepone as Indian English", () => {
    const inIn = analyze({ text: "Please prepone the meeting.", dialect: "en-IN" });
    const us = analyze({ text: "Please prepone the meeting.", dialect: "en-US" });
    assert.ok(inIn.matches.some((m) => m.ruleId === "DIALECT_PREPONE"));
    assert.ok(us.matches.some((m) => m.ruleId === "DIALECT_PREPONE"));
    assert.ok(us.matches.find((m) => m.ruleId === "DIALECT_PREPONE")?.replacements.includes("move earlier"));
  });

  it("applies style-as-code YAML", () => {
    const r = analyze({
      text: "This is very important.",
      styleGuide: `- id: no-very\n  pattern: very\n  message: Avoid very\n`,
    });
    assert.ok(r.matches.some((m) => m.ruleId === "no-very"));
  });

  it("flags subject-verb agreement", () => {
    const r = analyze({ text: "He go to office." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_SV_3SG"));
    assert.ok(r.matches.some((m) => m.replacements.some((x) => /goes/i.test(x))));
  });

  it("flags missing be in progressive", () => {
    const r = analyze({ text: "I working on that report." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_MISSING_BE"));
  });

  it("flags did plus past tense", () => {
    const r = analyze({ text: "She did went home." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_DID_PAST"));
  });

  it("flags a sentence fragment", () => {
    const r = analyze({ text: "Because the deadline is near." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_FRAGMENT"));
  });

  it("flags question word order", () => {
    const r = analyze({ text: "Why you are late?" });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_QUESTION_ORDER"));
  });
});

describe("writing help", () => {
  it("suggests a word after looking forward", async () => {
    const { writingHelp } = await import("./writingHelp.ts");
    const h = writingHelp("I am looking forward ", "I am looking forward ".length);
    assert.ok(h.next.some((n) => n.token === "to"));
  });

  it("completes a partial word", async () => {
    const { writingHelp } = await import("./writingHelp.ts");
    const h = writingHelp("Please conf", "Please conf".length);
    assert.ok(h.next.some((n) => n.kind === "complete" && n.token.startsWith("conf")));
  });

  it("explains a weak word", async () => {
    const { writingHelp } = await import("./writingHelp.ts");
    const h = writingHelp("This is very good.", 10);
    assert.equal(h.insight?.word, "very");
    assert.ok(h.insight?.synonyms.length);
  });

  it("inserts the next token at the caret", async () => {
    const { insertSuggestion } = await import("./writingHelp.ts");
    const r = insertSuggestion("Thank you ", 10, { token: "for", kind: "next", hint: "" });
    assert.equal(r.text, "Thank you for ");
  });

  it("picks the issue in the sentence being typed", async () => {
    const { analyze, matchNearCaret } = await import("./index.ts");
    const text = "Hello there. He go to school.";
    const r = analyze({ text });
    const m = matchNearCaret(text, r.matches, text.length);
    assert.ok(m);
    assert.equal(m.ruleId, "GRAMMAR_SV_3SG");
  });

  it("does not jump to an earlier sentence's issue", async () => {
    const { analyze, matchNearCaret } = await import("./index.ts");
    const text = "Hello there. He go to school.";
    const r = analyze({ text });
    const m = matchNearCaret(text, r.matches, 5);
    assert.equal(m, undefined);
  });
});

describe("free dictionary spelling", () => {
  it("flags typed misspellings not in the common-typo list", () => {
    const r = analyze({ text: "This helllo is mispelled." });
    assert.ok(r.matches.some((m) => m.ruleId === "SPELL_DICT" && m.message.includes("helllo")));
    assert.ok(r.matches.some((m) => m.ruleId === "SPELL_DICT" && m.message.includes("mispelled")));
    const helloFix = r.matches.find((m) => m.message.includes("helllo"));
    assert.ok(helloFix?.replacements.some((x) => x.toLowerCase() === "hello"));
  });

  it("does not flag correctly spelled words", () => {
    const r = analyze({ text: "Please receive this hello grammar letter." });
    assert.equal(r.matches.filter((m) => m.category === "spelling").length, 0);
  });

  it("accepts Indian English and personal dictionary words", () => {
    const inIn = analyze({ text: "Please prepone the meeting.", dialect: "en-IN" });
    assert.equal(inIn.matches.filter((m) => m.category === "spelling").length, 0);
    const nonce = "the zzxqwv met us.";
    const raw = analyze({ text: nonce });
    assert.ok(raw.matches.some((m) => m.category === "spelling" && m.message.includes("zzxqwv")));
    const personal = analyze({ text: nonce, personalDictionary: ["zzxqwv"] });
    assert.equal(personal.matches.filter((m) => m.category === "spelling").length, 0);
  });

  it("skips the word still being typed when the caret is inside it", () => {
    const typing = analyze({ text: "helllo", caret: 3 });
    assert.equal(typing.matches.filter((m) => m.category === "spelling").length, 0);
    const paused = analyze({ text: "helllo", caret: 6 });
    assert.ok(paused.matches.some((m) => m.ruleId === "SPELL_DICT"));
  });

  it("does not flag contractions", () => {
    const r = analyze({ text: "I don't think it's done." });
    assert.equal(r.matches.filter((m) => m.category === "spelling").length, 0);
  });
});
