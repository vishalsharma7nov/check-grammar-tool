"use client";

import type { NextWordSuggestion } from "@check-grammar/protocol";

const TONE_LABEL = {
  formal: "Formal",
  casual: "Casual",
  confident: "Confident",
} as const;

type ToneLabel = keyof typeof TONE_LABEL;

type LlmBadge = {
  active: boolean;
  backend?: string;
  model?: string;
};

type Props = {
  next: NextWordSuggestion[];
  tone: ToneLabel;
  onPick: (s: NextWordSuggestion) => void;
  llm?: LlmBadge;
};

export default function WriteCoach({ next, tone, onPick, llm }: Props) {
  const chips = next.slice(0, 3);

  return (
    <div className="coach-wrap">
      <div className="status-bar-chips">
        <span className={`tone-badge tone-${tone}`} title="Inferred tone of your text">
          {TONE_LABEL[tone]}
        </span>
        {llm?.active ? (
          <span
            className="llm-badge"
            title={llm.model ? `Local LLM: ${llm.model}` : "Local LLM active"}
          >
            LLM{llm.backend === "ollama" ? " · Ollama" : ""}
            {llm.model ? ` · ${llm.model.split(":")[0]}` : ""}
          </span>
        ) : null}
        {!chips.length ? (
          <p className="coach-empty">Type in the editor — next-word hints appear here. Press Tab to insert.</p>
        ) : (
          <div className="coach-row">
            <span className="coach-label">
              {chips[0].kind === "complete" ? "Finish word" : chips[0].token.includes(" ") ? "Next phrase" : "Next word"}
            </span>
            <div className="coach-chips">
              {chips.map((s) => (
                <button key={s.token + s.kind} type="button" title={s.hint} onClick={() => onPick(s)}>
                  {s.token}
                </button>
              ))}
            </div>
            <span className="coach-hint">Tab · {chips[0].hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
