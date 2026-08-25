import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchRewrite,
  localRewrite,
  localRewriteVariants,
} from "./rewrite.ts";

test("localRewrite clarity shortens wordy phrases", () => {
  const out = localRewrite("We met in order to decide due to the fact that time is short.", ["clarity"]);
  assert.match(out, /\bto decide\b/);
  assert.match(out, /\bbecause\b/);
  assert.notEqual(out, "We met in order to decide due to the fact that time is short.");
});

test("localRewrite clarity rewrites revert back (demo text)", () => {
  const out = localRewrite("I will revert back soon.", ["clarity"]);
  assert.equal(out, "I will reply soon.");
});

test("localRewrite formality expands contractions", () => {
  const out = localRewrite("I don't think it's ready.", ["formality"]);
  assert.match(out, /do not/);
  assert.match(out, /it is/);
});

test("localRewriteVariants always returns one entry per goal", () => {
  const variants = localRewriteVariants("Hello world.", ["clarity", "brevity"]);
  assert.equal(variants.length, 2);
  assert.equal(variants[0].goal, "clarity");
  assert.equal(variants[1].goal, "brevity");
  assert.ok(variants.every((v) => typeof v.text === "string" && v.text.length > 0));
});

test("fetchRewrite localOnly never calls fetch and always returns rules", async () => {
  const original = globalThis.fetch;
  let called = 0;
  globalThis.fetch = (async () => {
    called += 1;
    throw new Error("network should not be used");
  }) as typeof fetch;
  try {
    const out = await fetchRewrite(
      "http://localhost:8080",
      "Please revert back with regard to the plan.",
      ["clarity"],
      "en-US",
      { localOnly: true },
    );
    assert.equal(called, 0);
    assert.equal(out.provider, "rules");
    assert.ok(out.variants.length >= 1);
    assert.match(out.text, /reply/);
    assert.match(out.text, /about/);
  } finally {
    globalThis.fetch = original;
  }
});

test("fetchRewrite falls back to rules when APIs fail", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  // Pretend we are on localhost so Go probe is attempted then fails.
  const desc = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { hostname: "localhost" } },
  });
  try {
    const out = await fetchRewrite(
      "http://localhost:8080",
      "We will make a decision in order to proceed.",
      ["clarity"],
      "en-IN",
    );
    assert.equal(out.provider, "rules");
    assert.match(out.text, /decide/);
    assert.match(out.text, /to proceed/);
    assert.ok(out.warning);
    assert.match(out.warning!, /on-device|unreachable|timed out|API/i);
  } finally {
    globalThis.fetch = original;
    if (desc) Object.defineProperty(globalThis, "window", desc);
    else delete (globalThis as { window?: unknown }).window;
  }
});

test("fetchRewrite uses same-origin rules immediately without waiting on Go", async () => {
  const original = globalThis.fetch;
  let goCalled = false;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/rewrite")) {
      return new Response(
        JSON.stringify({
          text: "We will decide soon.",
          provider: "rules",
          variants: [{ goal: "clarity", text: "We will decide soon." }],
          skippedReason: "no LLM_API_KEY configured",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    goCalled = true;
    await new Promise((r) => setTimeout(r, 50));
    return new Response("slow", { status: 500 });
  }) as typeof fetch;
  try {
    const out = await fetchRewrite(
      "http://localhost:8080",
      "We will make a decision soon.",
      ["clarity"],
      "en-US",
    );
    assert.equal(goCalled, false);
    assert.equal(out.provider, "rules");
    assert.equal(out.text, "We will decide soon.");
    assert.match(out.warning ?? "", /LLM_API_KEY/);
  } finally {
    globalThis.fetch = original;
  }
});

test("fetchRewrite prefers hosted Groq response", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/rewrite")) {
      return new Response(
        JSON.stringify({
          text: "Hosted rewrite.",
          provider: "hosted",
          model: "llama",
          variants: [
            { goal: "clarity", text: "Hosted rewrite." },
            { goal: "brevity", text: "Short." },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    throw new Error("should not call Go");
  }) as typeof fetch;
  try {
    const out = await fetchRewrite("http://localhost:8080", "Original text here.", ["clarity"], "en-US");
    assert.equal(out.provider, "hosted");
    assert.equal(out.text, "Hosted rewrite.");
    assert.equal(out.variants.length, 2);
  } finally {
    globalThis.fetch = original;
  }
});
