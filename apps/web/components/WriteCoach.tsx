"use client";

import type { NextWordSuggestion } from "@check-grammar/protocol";

type Props = {
  next: NextWordSuggestion[];
  onPick: (s: NextWordSuggestion) => void;
};

export default function WriteCoach({ next, onPick }: Props) {
  if (!next.length) {
    return (
      <p className="coach-empty">Type or click in the text — next-word hints appear here. Tab inserts the first one.</p>
    );
  }
  return (
    <div className="coach-row">
      <span className="coach-label">{next[0].kind === "complete" ? "Finish word" : "Next word"}</span>
      <div className="coach-chips">
        {next.map((s) => (
          <button key={s.token + s.kind} type="button" title={s.hint} onClick={() => onPick(s)}>
            {s.token}
          </button>
        ))}
      </div>
      <span className="coach-hint">Tab · {next[0].hint}</span>
    </div>
  );
}
