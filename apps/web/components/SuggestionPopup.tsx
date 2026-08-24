"use client";

import type { Match } from "@check-grammar/protocol";

const LABELS: Record<string, string> = {
  spelling: "Spelling",
  grammar: "Grammar",
  punctuation: "Punctuation",
  clarity: "Clarity",
  style: "Style",
  dialect: "Dialect",
  tone: "Tone",
};

type Props = {
  match: Match;
  original: string;
  x: number;
  y: number;
  onAccept: (replacement: string) => void;
  onClose: () => void;
  onDismiss: () => void;
  onIgnoreRule: () => void;
};

export default function SuggestionPopup({
  match,
  original,
  x,
  y,
  onAccept,
  onClose,
  onDismiss,
  onIgnoreRule,
}: Props) {
  const primary = match.replacements[0];
  const extras = match.replacements.slice(1, 4);

  return (
    <div
      className={`sg-pop cat-${match.category}`}
      style={{ left: x, top: y }}
      role="dialog"
      aria-label="Writing suggestion"
    >
      <div className="sg-pop-caret" aria-hidden />
      <div className="sg-pop-head">
        <span className="sg-pop-kind">{LABELS[match.category] ?? match.category}</span>
        <button type="button" className="sg-pop-x" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {primary != null ? (
        <button type="button" className="sg-pop-fix" onClick={() => onAccept(primary)}>
          <span className="sg-pop-from">{original}</span>
          <span className="sg-pop-arrow">→</span>
          <span className="sg-pop-to">{primary}</span>
        </button>
      ) : (
        <p className="sg-pop-msg">{match.message}</p>
      )}
      {extras.length > 0 && (
        <div className="sg-pop-alts">
          {extras.map((r) => (
            <button key={r} type="button" onClick={() => onAccept(r)}>
              {r}
            </button>
          ))}
        </div>
      )}
      <p className="sg-pop-why">{match.explanation}</p>
      <div className="sg-pop-actions">
        {primary != null && (
          <button type="button" className="primary" onClick={() => onAccept(primary)}>
            Accept
          </button>
        )}
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
        <button type="button" className="sg-link" onClick={onIgnoreRule}>
          Ignore rule
        </button>
      </div>
    </div>
  );
}
