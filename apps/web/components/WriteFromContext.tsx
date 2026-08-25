"use client";

import { useState } from "react";
import type { Dialect } from "@check-grammar/protocol";
import { fetchGenerate } from "../lib/generate";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [actualCount, setActualCount] = useState(0);
  const [meta, setMeta] = useState("");
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
    setCopyNote("");
    try {
      const out = await fetchGenerate(brief, n, dialect);
      setDraft(out.text);
      setActualCount(out.wordCount);
      setMeta([out.provider, out.model].filter(Boolean).join(" · "));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!draft) return;
    const ok = await copyToClipboard(draft);
    setCopyNote(ok ? "Copied to clipboard" : "Copy failed");
    window.setTimeout(() => setCopyNote(""), 2000);
  }

  return (
    <>
      <div className="rw-backdrop" aria-hidden onClick={onClose} />
      <div className="aiw-panel" role="dialog" aria-label="AI Write — draft from context">
        <div className="rw-head">
          <div>
            <h3>AI Write</h3>
            <p className="aiw-sub">
              Draft original text from your brief. This is a writing assistant — not a plagiarism check.
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
            disabled={loading}
          />
        </label>

        <fieldset className="aiw-words" disabled={loading}>
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
            disabled={loading || !context.trim() || customInvalid}
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
              <span className="rw-label">Generated draft</span>
              <span className="aiw-count">{actualCount} words</span>
            </div>
            <div className="aiw-draft">{draft}</div>
            {meta ? <p className="rw-meta">via {meta}</p> : null}
            <div className="sg-pop-actions">
              <button type="button" className="primary" onClick={() => onInsert(draft, "append")}>
                Insert into editor
              </button>
              <button type="button" className="secondary" onClick={() => onInsert(draft, "replace")}>
                Replace editor
              </button>
              <button type="button" onClick={handleCopy}>
                Copy
              </button>
            </div>
            {copyNote ? <p className="rw-status">{copyNote}</p> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
