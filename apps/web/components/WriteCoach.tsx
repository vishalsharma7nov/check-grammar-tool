"use client";

import type { NextWordSuggestion } from "@check-grammar/protocol";
import type { ToneLabel } from "../lib/tone";

const TONE_LABEL: Record<ToneLabel, string> = {
  formal: "Formal",
  casual: "Casual",
  confident: "Confident",
};

type Props = {
  next: NextWordSuggestion[];
  tone: ToneLabel;
  onPick: (s: NextWordSuggestion) => void;
};

export default function WriteCoach({ next, tone, onPick }: Props) {
  return (
    <div className="coach-wrap">
      <span className={`tone-badge tone-${tone}`} title="Inferred tone of your text">
        {TONE_LABEL[tone]}
      </span>
      {!next.length ? (
        <p className="coach-empty">Type or click in the text — next-word hints appear here. Tab inserts the first one.</p>
      ) : (
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
      )}
    </div>
  );
}
