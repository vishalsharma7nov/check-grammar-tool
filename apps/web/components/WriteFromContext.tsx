"use client";

import { useState } from "react";
import type { Dialect } from "@check-grammar/protocol";
import { generateDraft, type Citation } from "../lib/generate";
import { naturalizeDraft } from "../lib/naturalize";
import { copyToClipboard } from "../lib/exportCorrected";

type WordPreset = 100 | 500 | "custom";

type Props = {
  dialect: Dialect;
  open: boolean;
  onClose: () => void;
  onInsert: (text: string, mode: "append" | "replace") => void;
};

export default function WriteFromContext({ dialect, open, onClose, onInsert }: Props) {
  const [context, setContext] = useState("");
  const [preset, setPreset] = useState<WordPreset>(100);
  const [customCount, setCustomCount] = useState(200);
  const [useResearch, setUseResearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [naturalizing, setNaturalizing] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [actualCount, setActualCount] = useState(0);
  const [meta, setMeta] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [copyNote, setCopyNote] = useState("");

  if (!open) return null;

  const targetWords = preset === "custom" ? customCount : preset;
  const customInvalid = preset === "custom" && (!Number.isFinite(customCount) || customCount < 100);

  async function handleGenerate() {
    const brief = context.trim();
    if (!brief) {
      setError("Enter a topic, audience, or key points first.");
      return;
    }
    if (customInvalid) {
      setError("Custom word count must be at least 100.");
      return;
    }
    const n = Math.min(2000, Math.max(100, Math.round(targetWords)));
    setLoading(true);
    setError("");
    setDraft("");
    setActualCount(0);
    setMeta("");
    setCitations([]);
    setCopyNote("");
    try {
      const out = await generateDraft({
        context: brief,
        wordCount: n,
        dialect,
        useResearch,
        topic: brief,
      });
      setDraft(out.text);
      setActualCount(out.wordCount);
      setCitations(out.citations);
      setMeta([out.provider, out.model].filter(Boolean).join(" · "));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleNaturalize() {
    if (!draft.trim()) return;
    setNaturalizing(true);
    setError("");
    try {
      const out = await naturalizeDraft({ text: draft });
      setDraft(out.text);
      setActualCount(out.text.split(/\s+/).filter(Boolean).length);
      setMeta([out.provider, out.model].filter(Boolean).join(" · ") || out.provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setNaturalizing(false);
    }
  }

  async function handleCopy() {
    if (!draft) return;
    const ok = await copyToClipboard(draft);
    setCopyNote(ok ? "Copied to clipboard" : "Copy failed");
    window.setTimeout(() => setCopyNote(""), 2000);
  }

  const busy = loading || naturalizing;

  return (
    <>
      <div className="rw-backdrop" aria-hidden onClick={onClose} />
      <div className="aiw-panel" role="dialog" aria-label="AI Write — draft from context">
        <div className="rw-head">
          <div>
            <h3>AI Write</h3>
            <p className="aiw-sub">
              Get a natural draft for you to edit from your brief. Optional open-corpus research adds
              citations — not a plagiarism check or detector bypass.
            </p>
          </div>
          <button type="button" className="sg-pop-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <label className="aiw-field">
          <span className="field-label">Context / brief</span>
          <textarea
            className="aiw-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Topic, audience, tone, and key points…"
            rows={4}
            disabled={busy}
          />
        </label>

        <label className="aiw-field aiw-check">
          <input
            type="checkbox"
            checked={useResearch}
            onChange={(e) => setUseResearch(e.target.checked)}
            disabled={busy}
          />
          <span>Use open research (public domain / open licenses)</span>
        </label>

        <p className="aiw-hint">
          Tip: Add a personal story or specific brand after generating.
        </p>

        <fieldset className="aiw-words" disabled={busy}>
          <legend className="field-label">Word count</legend>
          <div className="aiw-word-opts" role="radiogroup" aria-label="Target word count">
            <label className="aiw-word-opt">
              <input
                type="radio"
                name="aiw-words"
                checked={preset === 100}
                onChange={() => setPreset(100)}
              />
              100 words
            </label>
            <label className="aiw-word-opt">
              <input
                type="radio"
                name="aiw-words"
                checked={preset === 500}
                onChange={() => setPreset(500)}
              />
              500 words
            </label>
            <label className="aiw-word-opt">
              <input
                type="radio"
                name="aiw-words"
                checked={preset === "custom"}
                onChange={() => setPreset("custom")}
              />
              Custom
            </label>
            {preset === "custom" ? (
              <input
                type="number"
                className="aiw-custom-input"
                min={100}
                max={2000}
                step={50}
                value={customCount}
                onChange={(e) => setCustomCount(Number(e.target.value))}
                aria-label="Custom word count (minimum 100)"
              />
            ) : null}
          </div>
          {customInvalid ? (
            <p className="aiw-hint aiw-hint-err">Custom must be at least 100 words (max 2000).</p>
          ) : (
            <p className="aiw-hint">Minimum 100 · maximum 2000</p>
          )}
        </fieldset>

        <div className="sg-pop-actions aiw-actions">
          <button
            type="button"
            className="primary"
            onClick={handleGenerate}
            disabled={busy || !context.trim() || customInvalid}
          >
            {loading ? "Generating…" : "Generate draft"}
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {error ? <p className="rw-status rw-err">{error}</p> : null}

        {draft ? (
          <div className="aiw-result">
            <div className="aiw-result-head">
              <span className="rw-label">Natural draft for you to edit</span>
              <span className="aiw-count">{actualCount} words</span>
            </div>
            <div className="aiw-draft">{draft}</div>
            {meta ? <p className="rw-meta">via {meta}</p> : null}
            {citations.length ? (
              <div className="aiw-citations">
                <span className="rw-label">Citations</span>
                <ul>
                  {citations.map((c) => (
                    <li key={`${c.sourceUrl}-${c.title}`}>
                      {c.sourceUrl ? (
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer">
                          {c.title}
                        </a>
                      ) : (
                        <span>{c.title}</span>
                      )}{" "}
                      <span className="aiw-license">({c.license})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="sg-pop-actions">
              <button type="button" className="primary" onClick={() => onInsert(draft, "append")}>
                Insert into editor
              </button>
              <button type="button" className="secondary" onClick={() => onInsert(draft, "replace")}>
                Replace editor
              </button>
              <button type="button" onClick={handleNaturalize} disabled={busy}>
                {naturalizing ? "Naturalizing…" : "Naturalize"}
              </button>
              <button type="button" onClick={handleCopy}>
                Copy
              </button>
            </div>
            {copyNote ? <p className="rw-status">{copyNote}</p> : null}
          </div>
        ) : null}

        <p className="aiw-disclaimer">
          AI-assisted draft. Edit in your voice. Cite open sources. Not for academic fraud or hiding AI use.
        </p>
      </div>
    </>
  );
}
