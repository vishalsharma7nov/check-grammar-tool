"use client";

import type { PlagiarismResult } from "@check-grammar/protocol";
import { scoreSummary, skippedMessage } from "../lib/plagiarism";

type Props = {
  result: PlagiarismResult | null;
  loading: boolean;
  error: string;
  /** Set when the check could not run in the current mode (legacy; prefer hint). */
  modeNote: string;
  /** Non-blocking context (e.g. Privacy mode opt-in). Shown above the result. */
  hint?: string;
  onClose: () => void;
};

function scoreTone(score: number): string {
  if (score < 10) return "plg-low";
  if (score < 30) return "plg-mid";
  return "plg-high";
}

export default function PlagiarismPanel({ result, loading, error, modeNote, hint, onClose }: Props) {
  const skipped = result ? skippedMessage(result) : "";

  return (
    <>
      <div className="rw-backdrop" aria-hidden onClick={onClose} />
      <div className="rw-panel" role="dialog" aria-label="Plagiarism check">
        <div className="rw-head">
          <h3>Plagiarism check</h3>
          <button type="button" className="sg-pop-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {hint && !modeNote && <p className="rw-meta plg-hint">{hint}</p>}
        {loading ? (
          <p className="rw-status">Comparing against published sources…</p>
        ) : error ? (
          <p className="rw-status rw-err">{error}</p>
        ) : modeNote ? (
          <p className="rw-status">{modeNote}</p>
        ) : skipped ? (
          <p className="rw-status">{skipped}</p>
        ) : result ? (
          <>
            <div className="plg-score-row">
              <span className={`plg-score ${scoreTone(result.score)}`}>{Math.round(result.score)}%</span>
              <p className="plg-summary">{scoreSummary(result)}</p>
            </div>
            {result.matches.length > 0 && (
              <div className="plg-sources">
                <span className="rw-label">Matched sources</span>
                <ul className="plg-source-list">
                  {result.matches.map((m, i) => (
                    <li key={i} className="plg-source">
                      <a href={m.url} target="_blank" rel="noopener noreferrer">
                        {m.title || m.url}
                      </a>
                      <span className="plg-sim">{Math.round(m.similarity)}% match</span>
                      {m.text && <p className="plg-excerpt">“{m.text}”</p>}
                    </li>
                  ))}
                </ul>
                <p className="plg-nudge">
                  Used one of these sources? Add a citation or quotation marks — giving credit strengthens
                  your writing and lets readers verify your claims.
                </p>
              </div>
            )}
            <p className="rw-meta">via {result.provider}</p>
          </>
        ) : null}
        <div className="sg-pop-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}
