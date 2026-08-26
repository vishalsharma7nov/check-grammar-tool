"use client";

import { useState } from "react";
import type { Dialect } from "@check-grammar/protocol";
import { generateDraft, type Citation } from "../lib/generate";
import { fetchResearch, type ResearchPassage } from "../lib/research";
import { naturalizeDraft } from "../lib/naturalize";
import { copyToClipboard } from "../lib/exportCorrected";
import {
  citationsFromPassages,
  exportWriterMarkdown,
} from "../lib/writerExport";

type WordPreset = 100 | 500 | "custom";

type Props = {
  dialect: Dialect;
  open: boolean;
  onClose: () => void;
  onInsert: (text: string, mode: "append" | "replace") => void;
};

export default function WriterStudio({ dialect, open, onClose, onInsert }: Props) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [preset, setPreset] = useState<WordPreset>(100);
  const [customCount, setCustomCount] = useState(200);
  const [useOpenResearch, setUseOpenResearch] = useState(true);

  const [loading, setLoading] = useState<"research" | "generate" | "naturalize" | null>(null);
  const [error, setError] = useState("");
  const [passages, setPassages] = useState<ResearchPassage[]>([]);
  const [draft, setDraft] = useState("");
  const [actualCount, setActualCount] = useState(0);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [meta, setMeta] = useState("");
  const [copyNote, setCopyNote] = useState("");

  if (!open) return null;

  const targetWords = preset === "custom" ? customCount : preset;
  const customInvalid = preset === "custom" && (!Number.isFinite(customCount) || customCount < 100);
  const busy = loading !== null;
  const brief = topic.trim();

  function buildContext(): string {
    const parts = [brief];
    if (audience.trim()) parts.push(`Audience: ${audience.trim()}`);
    if (tone.trim()) parts.push(`Tone: ${tone.trim()}`);
    return parts.join("\n");
  }

  async function handleResearch() {
    if (!brief) {
      setError("Enter a topic or brief first.");
      return;
    }
    setLoading("research");
    setError("");
    try {
      const out = await fetchResearch(brief);
      setPassages(out.passages);
      if (!out.passages.length) {
        setError("No open-license passages found for this topic. Try a broader brief.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerate() {
    if (!brief) {
      setError("Enter a topic or brief first.");
      return;
    }
    if (customInvalid) {
      setError("Custom word count must be at least 100.");
      return;
    }
    const n = Math.min(2000, Math.max(100, Math.round(targetWords)));
    setLoading("generate");
    setError("");
    setDraft("");
    setActualCount(0);
    setMeta("");
    setCopyNote("");
    try {
      const out = await generateDraft({
        context: buildContext(),
        wordCount: n,
        dialect,
        useResearch: useOpenResearch,
        topic: brief,
        audience: audience.trim() || undefined,
        tone: tone.trim() || undefined,
        passages:
          useOpenResearch && passages.length
            ? passages.map((p) => ({
                title: p.title,
                sourceUrl: p.sourceUrl,
                license: p.license,
                text: p.text,
              }))
            : undefined,
      });
      setDraft(out.text);
      setActualCount(out.wordCount);
      setMeta([out.provider, out.model].filter(Boolean).join(" · "));
      if (out.citations.length) {
        setCitations(out.citations);
      } else if (useOpenResearch && passages.length) {
        setCitations(citationsFromPassages(passages));
      } else {
        setCitations([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleNaturalize() {
    if (!draft.trim()) {
      setError("Generate a draft first, then naturalize.");
      return;
    }
    setLoading("naturalize");
    setError("");
    try {
      const out = await naturalizeDraft({ text: draft, tone: tone.trim() || undefined });
      setDraft(out.text);
      setActualCount(out.text.split(/\s+/).filter(Boolean).length);
      const via = [out.provider, out.model].filter(Boolean).join(" · ");
      setMeta((m) => {
        const tag = via ? `naturalized (${via})` : "naturalized";
        return m ? `${m} · ${tag}` : tag;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleCopy() {
    if (!draft) return;
    const ok = await copyToClipboard(draft);
    setCopyNote(ok ? "Copied to clipboard" : "Copy failed");
    window.setTimeout(() => setCopyNote(""), 2000);
  }

  function handleExport() {
    if (!draft) return;
    const slug = brief
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    exportWriterMarkdown(
      draft,
      citations,
      { topic: brief, audience: audience.trim(), tone: tone.trim() },
      `${slug || "writer-studio"}-draft.md`,
    );
  }

  return (
    <>
      <div className="rw-backdrop" aria-hidden onClick={onClose} />
      <div className="ws-panel" role="dialog" aria-label="Writer Studio">
        <div className="rw-head">
          <div>
            <h3>Writer Studio</h3>
            <p className="ws-sub">
              Research open sources, draft in your voice, naturalize, then insert or export. For content writers — not
              plagiarism evasion or detector bypass.
            </p>
          </div>
          <button type="button" className="sg-pop-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <label className="ws-field">
          <span className="field-label">Topic / brief</span>
          <textarea
            className="ws-context"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What should the piece cover? Key points, angle, constraints…"
            rows={3}
            disabled={busy}
          />
        </label>

        <div className="ws-row">
          <label className="ws-field">
            <span className="field-label">Audience</span>
            <input
              type="text"
              className="ws-input"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. product managers, blog readers"
              disabled={busy}
            />
          </label>
          <label className="ws-field">
            <span className="field-label">Tone</span>
            <input
              type="text"
              className="ws-input"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. clear, practical, warm"
              disabled={busy}
            />
          </label>
        </div>

        <fieldset className="ws-words" disabled={busy}>
          <legend className="field-label">Word count</legend>
          <div className="ws-word-opts" role="radiogroup" aria-label="Target word count">
            <label className="ws-word-opt">
              <input
                type="radio"
                name="ws-words"
                checked={preset === 100}
                onChange={() => setPreset(100)}
              />
              100
            </label>
            <label className="ws-word-opt">
              <input
                type="radio"
                name="ws-words"
                checked={preset === 500}
                onChange={() => setPreset(500)}
              />
              500
            </label>
            <label className="ws-word-opt">
              <input
                type="radio"
                name="ws-words"
                checked={preset === "custom"}
                onChange={() => setPreset("custom")}
              />
              Custom
            </label>
            {preset === "custom" ? (
              <input
                type="number"
                className="ws-custom-input"
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
            <p className="ws-hint ws-hint-err">Custom must be at least 100 words (max 2000).</p>
          ) : (
            <p className="ws-hint">Minimum 100 · maximum 2000</p>
          )}
        </fieldset>

        <label className="ws-toggle">
          <input
            type="checkbox"
            checked={useOpenResearch}
            onChange={(e) => setUseOpenResearch(e.target.checked)}
            disabled={busy}
          />
          <span>Use open research (public domain / open licenses)</span>
        </label>

        <div className="sg-pop-actions ws-actions">
          <button
            type="button"
            className="secondary"
            onClick={handleResearch}
            disabled={busy || !brief}
          >
            {loading === "research" ? "Researching…" : "Research"}
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleGenerate}
            disabled={busy || !brief || customInvalid}
          >
            {loading === "generate" ? "Generating…" : "Generate draft"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleNaturalize}
            disabled={busy || !draft}
          >
            {loading === "naturalize" ? "Naturalizing…" : "Naturalize"}
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {error ? <p className="rw-status rw-err">{error}</p> : null}

        {passages.length > 0 ? (
          <div className="ws-research">
            <span className="rw-label">Research results</span>
            <ul className="ws-passage-list">
              {passages.map((p, i) => (
                <li key={`${p.sourceUrl || p.title}-${i}`} className="ws-passage">
                  <div className="ws-passage-head">
                    <span className="ws-passage-title">{p.title}</span>
                    <span className="ws-license">{p.license || "Unknown"}</span>
                  </div>
                  {p.text ? <p className="ws-snippet">{p.text}</p> : null}
                  {p.sourceUrl ? (
                    <a
                      className="ws-link"
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open source
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft ? (
          <div className="ws-result">
            <div className="ws-result-head">
              <span className="rw-label">Draft</span>
              <span className="ws-count">{actualCount} words</span>
            </div>
            <div className="ws-draft">{draft}</div>
            {meta ? <p className="rw-meta">via {meta}</p> : null}

            {citations.length > 0 ? (
              <div className="ws-citations">
                <span className="rw-label">Citations</span>
                <ol className="ws-cite-list">
                  {citations.map((c, i) => (
                    <li key={`${c.title}-${i}`}>
                      {c.sourceUrl ? (
                        <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                          {c.title}
                        </a>
                      ) : (
                        c.title
                      )}
                      {c.license ? <span className="ws-cite-lic"> · {c.license}</span> : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

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
              <button type="button" onClick={handleExport}>
                Export Markdown
              </button>
            </div>
            {copyNote ? <p className="rw-status">{copyNote}</p> : null}
          </div>
        ) : null}

        <p className="ws-disclaimer">
          AI-assisted draft. Edit in your voice. Cite open sources. Not for academic fraud or hiding AI use.
        </p>
      </div>
    </>
  );
}
