"use client";

import type { RewriteVariant } from "@check-grammar/protocol";
import type { DiffSegment } from "../lib/rewrite";

function renderSegments(segs: DiffSegment[]) {
  return segs.map((s, i) => (
    <span key={i} className={`rw-${s.kind}`}>
      {s.text}
    </span>
  ));
}

type Props = {
  original: string;
  suggested: string;
  beforeSegs: DiffSegment[];
  afterSegs: DiffSegment[];
  variants?: RewriteVariant[];
  selectedVariant?: number;
  onSelectVariant?: (index: number) => void;
  provider: string;
  loading: boolean;
  error: string;
  warning?: string;
  onAccept: () => void;
  onClose: () => void;
};

export default function RewritePanel({
  original,
  suggested,
  beforeSegs,
  afterSegs,
  variants = [],
  selectedVariant = 0,
  onSelectVariant,
  provider,
  loading,
  error,
  warning = "",
  onAccept,
  onClose,
}: Props) {
  const showVariants = variants.length > 1;
  const unchanged = !loading && !error && Boolean(suggested) && suggested === original;

  return (
    <>
    <div className="rw-backdrop" aria-hidden onClick={onClose} />
    <div className="rw-panel" role="dialog" aria-label="Rewrite suggestion">
      <div className="rw-head">
        <h3>Rewrite</h3>
        <button type="button" className="sg-pop-x" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {loading ? (
        <p className="rw-status">Rewriting…</p>
      ) : error && !suggested ? (
        <p className="rw-status rw-err">{error}</p>
      ) : (
        <>
          {error ? <p className="rw-status rw-err">{error}</p> : null}
          {warning && !error ? <p className="rw-status rw-warn">{warning}</p> : null}
          {showVariants ? (
            <div className="rw-variant-tabs" role="tablist" aria-label="Rewrite variants">
              {variants.map((v, i) => (
                <button
                  key={v.goal}
                  type="button"
                  role="tab"
                  aria-selected={i === selectedVariant}
                  className={i === selectedVariant ? "rw-tab active" : "rw-tab"}
                  onClick={() => onSelectVariant?.(i)}
                >
                  {v.goal}
                </button>
              ))}
            </div>
          ) : null}
          <div className="rw-cols">
            <div className="rw-col">
              <span className="rw-label">Original</span>
              <p className="rw-text">{renderSegments(beforeSegs)}</p>
            </div>
            <div className="rw-col">
              <span className="rw-label">Suggested</span>
              <p className="rw-text">{renderSegments(afterSegs)}</p>
            </div>
          </div>
          <p className="rw-meta">via {provider}</p>
          {unchanged ? (
            <p className="rw-status">No changes suggested for this text with the selected goals. Try another goal, select a phrase with filler wording, or enable Groq (LLM_API_KEY) for stronger rewrites.</p>
          ) : null}
          <div className="sg-pop-actions">
            <button type="button" className="primary" onClick={onAccept} disabled={!suggested || suggested === original}>
              Accept
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
    </>
  );
}
