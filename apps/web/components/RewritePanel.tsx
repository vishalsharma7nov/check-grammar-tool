"use client";

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
  provider: string;
  loading: boolean;
  error: string;
  onAccept: () => void;
  onClose: () => void;
};

export default function RewritePanel({
  original,
  suggested,
  beforeSegs,
  afterSegs,
  provider,
  loading,
  error,
  onAccept,
  onClose,
}: Props) {
  return (
    <div className="rw-panel" role="dialog" aria-label="Rewrite suggestion">
      <div className="rw-head">
        <h3>Rewrite</h3>
        <button type="button" className="sg-pop-x" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {loading ? (
        <p className="rw-status">Rewriting…</p>
      ) : error ? (
        <p className="rw-status rw-err">{error}</p>
      ) : (
        <>
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
  );
}
