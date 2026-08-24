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

  it("flags missing apostrophe contractions", () => {
    const r = analyze({ text: "I dont think its ready." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_MISSING_APOSTROPHE" && m.replacements.includes("don't")));
    assert.ok(r.matches.some((m) => /ITS|SPELL_CONTEXT.*ITS/.test(m.ruleId)));
  });

  it("flags homophone your/you're confusion", () => {
    const r = analyze({ text: "Your going to love this." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_HOMOPHONE_YOUR" || m.ruleId === "SPELL_CONTEXT_YOUR"));
  });

  it("flags then/than comparison mix-up", () => {
    const r = analyze({ text: "She is taller then me." });
    assert.ok(r.matches.some((m) => /THEN_THAN|THAN_THEN/.test(m.ruleId)));
  });

  it("flags less/fewer with countable nouns", () => {
    const r = analyze({ text: "We need less errors in production." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_LESS_FEWER"));
  });

  it("allows legitimate passives", () => {
    const r = analyze({ text: "The form was submitted. He was born in 1990. The company was founded in 2005." });
    assert.equal(r.matches.filter((m) => m.ruleId === "STYLE_PASSIVE").length, 0);
  });

  it("does not flag possessive its before nouns", () => {
    const r = analyze({ text: "The dog wagged its tail." });
    assert.equal(r.matches.filter((m) => m.ruleId === "GRAMMAR_ITS_IT_IS").length, 0);
  });

  it("flags its when it is likely it is", () => {
    const r = analyze({ text: "Its going to rain." });
    assert.ok(r.matches.some((m) => /ITS|SPELL_CONTEXT.*ITS/.test(m.ruleId)));
  });

  it("flags me and lowercase name in subject position", () => {
    const r = analyze({ text: "Me and john went home." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_ME_AND_SUBJECT"));
  });
});

describe("tone analysis", () => {
  it("flags casual slang when formality is formal", () => {
    const r = analyze({ text: "I gonna finish this asap.", goals: { formality: "formal" } });
    assert.ok(r.matches.some((m) => m.ruleId === "TONE_CASUAL_GONNA"));
    assert.ok(r.matches.some((m) => m.ruleId === "TONE_CASUAL_ASAP"));
  });

  it("does not flag casual slang when formality is neutral", () => {
    const r = analyze({ text: "I gonna finish this asap.", goals: { formality: "neutral" } });
    assert.equal(r.matches.filter((m) => m.category === "tone").length, 0);
  });

  it("flags formal jargon when formality is casual", () => {
    const r = analyze({ text: "We will utilize the platform pursuant to policy.", goals: { formality: "casual" } });
    assert.ok(r.matches.some((m) => m.ruleId === "TONE_FORMAL_UTILIZE"));
    assert.ok(r.matches.some((m) => m.ruleId === "TONE_FORMAL_PURSUANT"));
  });

  it("detects uncertain tone signals", () => {
    const r = analyze({ text: "I guess it seems like a good idea.", goals: { formality: "neutral" } });
    assert.ok(r.matches.some((m) => m.ruleId === "TONE_UNCERTAIN_GUESS"));
    assert.ok(r.matches.some((m) => m.ruleId === "TONE_UNCERTAIN_SEEMS"));
  });

  it("detects confident tone signals", () => {
    const r = analyze({ text: "Without a doubt, this is guaranteed to work.", goals: { formality: "neutral" } });
    assert.ok(r.matches.some((m) => m.ruleId === "TONE_CONFIDENT_DOUBT"));
    assert.ok(r.matches.some((m) => m.ruleId === "TONE_CONFIDENT_GUARANTEED"));
  });
});

describe("context-aware spelling", () => {
  it("flags their before a verb as they're", () => {
    const r = analyze({ text: "Their going to the store." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_HOMOPHONE_THEIR" || m.ruleId === "SPELL_CONTEXT_THEIR"));
  });

  it("flags there before possessive noun as their", () => {
    const r = analyze({ text: "There team won the match." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_HOMOPHONE_THERE" || m.ruleId === "SPELL_CONTEXT_THERE"));
  });

  it("flags go their as go there", () => {
    const r = analyze({ text: "We should go their now." });
    assert.ok(r.matches.some((m) => m.ruleId === "SPELL_CONTEXT_PHRASE_GO_THEIR"));
  });

  it("flags if your ready as if you're ready", () => {
    const r = analyze({ text: "If your ready, let's start." });
    assert.ok(
      r.matches.some(
        (m) =>
          m.ruleId === "SPELL_CONTEXT_PHRASE_IF_YOUR" ||
          m.ruleId === "GRAMMAR_HOMOPHONE_YOUR" ||
          m.ruleId === "SPELL_CONTEXT_YOUR",
      ),
    );
  });

  it("does not flag correct possessive their", () => {
    const r = analyze({ text: "Their team won the match." });
    assert.equal(r.matches.filter((m) => /THEIR|THEIR|THEIR/.test(m.ruleId)).length, 0);
  });

  it("flags accept for as except for", () => {
    const r = analyze({ text: "Everyone accept for John attended." });
    assert.ok(r.matches.some((m) => m.ruleId.includes("ACCEPT")));
  });

  it("flags loose before lose context", () => {
    const r = analyze({ text: "We will loose the lead." });
    assert.ok(r.matches.some((m) => m.ruleId.includes("LOOSE") || m.ruleId.includes("LOSE")));
  });

  it("flags passed the deadline as past", () => {
    const r = analyze({ text: "We passed the deadline last week." });
    assert.ok(r.matches.some((m) => m.ruleId.includes("PASSED") || m.ruleId.includes("PAST")));
  });
});

describe("inclusive language", () => {
  it("flags manpower", () => {
    const r = analyze({ text: "We need more manpower on this project." });
    assert.ok(r.matches.some((m) => m.ruleId === "STYLE_INCLUSIVE_MANPOWER"));
    assert.ok(r.matches.some((m) => m.replacements.includes("workforce")));
  });

  it("flags blacklist", () => {
    const r = analyze({ text: "Add the IP to the blacklist." });
    assert.ok(r.matches.some((m) => m.ruleId === "STYLE_INCLUSIVE_BLACKLIST"));
  });

  it("flags chairman", () => {
    const r = analyze({ text: "The chairman approved the plan." });
    assert.ok(r.matches.some((m) => m.replacements.includes("chair") || m.replacements.includes("chairperson")));
  });
});

describe("clarity rules", () => {
  it("flags sentences over 40 words", () => {
    const words = Array.from({ length: 45 }, (_, i) => (i === 0 ? "This" : "word")).join(" ");
    const r = analyze({ text: words + "." });
    assert.ok(r.matches.some((m) => m.ruleId === "CLARITY_LONG_SENTENCE"));
  });
});

describe("expanded grammar rules", () => {
  it("flags could of as could have", () => {
    const r = analyze({ text: "I could of done it." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_MODAL_OF"));
    assert.ok(r.matches.some((m) => m.replacements.includes("could have")));
  });

  it("flags would of and should of", () => {
    const would = analyze({ text: "She would of called." });
    const should = analyze({ text: "You should of known." });
    assert.ok(would.matches.some((m) => m.ruleId === "GRAMMAR_MODAL_OF"));
    assert.ok(should.matches.some((m) => m.ruleId === "GRAMMAR_MODAL_OF"));
  });

  it("flags peak at as peek at", () => {
    const r = analyze({ text: "Take a peak at this." });
    assert.ok(r.matches.some((m) => /PEEK|PEAK/.test(m.ruleId)));
  });

  it("flags bare with me as bear with me", () => {
    const r = analyze({ text: "Bare with me for a moment." });
    assert.ok(r.matches.some((m) => /BEAR|BARE/.test(m.ruleId)));
  });

  it("flags hit the break as hit the brake", () => {
    const r = analyze({ text: "Hit the break now." });
    assert.ok(r.matches.some((m) => /BRAKE|BREAK/.test(m.ruleId)));
  });

  it("flags school principle as principal", () => {
    const r = analyze({ text: "The school principle approved it." });
    assert.ok(r.matches.some((m) => /PRINCIPAL|PRINCIPLE/.test(m.ruleId)));
  });

  it("flags colors compliment as complement", () => {
    const r = analyze({ text: "The colors compliment each other." });
    assert.ok(r.matches.some((m) => m.ruleId === "GRAMMAR_COMPLEMENT"));
  });

  it("flags office stationary as stationery", () => {
    const r = analyze({ text: "Order office stationary today." });
    assert.ok(r.matches.some((m) => /STATIONERY|STATIONARY/.test(m.ruleId)));
  });

  it("flags alot as a lot", () => {
    const r = analyze({ text: "That helps alot." });
    assert.ok(
      r.matches.some((m) => m.ruleId === "GRAMMAR_A_LOT" || (m.ruleId === "SPELL_ALOT" && m.replacements.includes("a lot"))),
    );
  });

  it("flags whom after preposition", () => {
    const r = analyze({ text: "To who did you speak?" });
    assert.ok(r.matches.some((m) => /WHO_WHOM|WHOM/.test(m.ruleId)));
  });

  it("suggests Oxford comma in lists", () => {
    const r = analyze({ text: "We need eggs, milk and bread." });
    assert.ok(r.matches.some((m) => m.ruleId === "PUNCT_OXFORD_COMMA"));
  });

  it("flags missing apostrophe contractions", () => {
    const r = analyze({ text: "Theyre wont come and doesnt matter." });
    const reps = r.matches.filter((m) => m.ruleId === "GRAMMAR_MISSING_APOSTROPHE").flatMap((m) => m.replacements);
    assert.ok(reps.some((x) => x.toLowerCase() === "they're"));
    assert.ok(reps.some((x) => x.toLowerCase() === "won't"));
    assert.ok(reps.some((x) => x.toLowerCase() === "doesn't"));
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

  it("suggests phrase completions after thank you", async () => {
    const { writingHelp } = await import("./writingHelp.ts");
    const h = writingHelp("Thank you ", "Thank you ".length);
    assert.ok(h.next.some((n) => n.token.includes("for")));
  });

  it("suggests three-word phrase after looking forward to", async () => {
    const { writingHelp } = await import("./writingHelp.ts");
    const h = writingHelp("I am looking forward to ", "I am looking forward to ".length);
    assert.ok(h.next.some((n) => n.token === "hearing" || n.token.includes("hearing")));
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

  it("suggests hello for elongated greetings beyond edit distance 2", () => {
    const r = analyze({ text: "I said heeeelooo" });
    const m = r.matches.find((x) => x.message.includes("heeeelooo"));
    assert.ok(m);
    assert.ok(m?.replacements.some((x) => x.toLowerCase() === "hello"));
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

  it("flags capitalized misspellings mid-sentence", () => {
    const r = analyze({ text: "Hello Mispelled word." });
    const m = r.matches.find((x) => x.category === "spelling" && x.message.includes("Mispelled"));
    assert.ok(m);
    assert.ok(m.replacements.some((x) => x.toLowerCase() === "misspelled"));
  });

  it("suggests two-edit-distance corrections when one-edit finds nothing", () => {
    const r = analyze({ text: "speling" });
    const m = r.matches.find((x) => x.category === "spelling");
    assert.ok(m?.replacements.some((x) => x === "spelling"));
  });
});
