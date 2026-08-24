"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyze, applyReplacement, insertSuggestion, matchNearCaret, writingHelp } from "@check-grammar/engine";
import type { CheckResponse, Dialect, Match, NextWordSuggestion } from "@check-grammar/protocol";
import SuggestionPopup from "./SuggestionPopup";
import WriteCoach from "./WriteCoach";
import {
  highlightSegments,
  matchAtClientPoint,
  matchAtOffset,
  matchRects,
  textareaRangeRect,
} from "../lib/textareaCoords";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const SAMPLE =
  "I recieve teh letter in order to do the needful. Please prepone the meeting and kindly revert. She ate a apple. He go to office yesterday. I working on that report. Because the deadline is near. i think its fine.";

export default function Editor() {
  const [text, setText] = useState("");
  const [dialect, setDialect] = useState<Dialect>("en-IN");
  const [mode, setMode] = useState<"privacy" | "local">("privacy");
  const [styleGuide, setStyleGuide] = useState("- id: no-very\n  pattern: very\n  message: Avoid very\n");
  const [personalWords, setPersonalWords] = useState("");
  const [res, setRes] = useState<CheckResponse | null>(null);
  const [err, setErr] = useState("");
  const [ignoredRules, setIgnoredRules] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ match: Match; x: number; y: number } | null>(null);
  const [caret, setCaret] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>(0);
  const userClosed = useRef(false);
  const rectsRef = useRef<ReturnType<typeof matchRects>>([]);

  const personalDictionary = useMemo(
    () =>
      personalWords
        .split(/[,;]+/)
        .map((w) => w.trim())
        .filter(Boolean),
    [personalWords],
  );

  const run = useCallback(async () => {
    setErr("");
    const req = { text, dialect, styleGuide, caret, personalDictionary };
    if (mode === "privacy") {
      setRes(analyze(req));
      return;
    }
    try {
      const r = await fetch(`${API}/v1/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!r.ok) throw new Error(await r.text());
      setRes(await r.json());
    } catch (e) {
      setErr(String(e));
    }
  }, [text, dialect, mode, styleGuide, caret, personalDictionary]);

  useEffect(() => {
    const t = setTimeout(run, 280);
    return () => clearTimeout(t);
  }, [run]);

  const matches = useMemo(() => {
    return (res?.matches ?? []).filter((m) => {
      if (ignoredRules.has(m.ruleId)) return false;
      const key = `${m.ruleId}:${m.offset}:${text.slice(m.offset, m.offset + m.length)}`;
      return !dismissed.has(key);
    });
  }, [res, ignoredRules, dismissed, text]);

  const segments = useMemo(() => highlightSegments(text, matches), [text, matches]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of matches) c[m.category] = (c[m.category] || 0) + 1;
    return c;
  }, [matches]);

  const help = useMemo(() => writingHelp(text, caret), [text, caret]);

  function markCaret() {
    const ta = taRef.current;
    if (ta) setCaret(ta.selectionStart);
  }

  function pickWord(s: NextWordSuggestion) {
    const next = insertSuggestion(text, caret, s);
    setText(next.text);
    setCaret(next.cursor);
    userClosed.current = false;
    setOpen(null);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(next.cursor, next.cursor);
    });
  }

  function refreshRects() {
    const ta = taRef.current;
    if (!ta) {
      rectsRef.current = [];
      return;
    }
    rectsRef.current = matchRects(ta, matches);
  }

  useEffect(() => {
    refreshRects();
  }, [matches, text]);

  function openMatch(m: Match, select = true) {
    const ta = taRef.current;
    if (!ta) return;
    userClosed.current = false;
    const rect = textareaRangeRect(ta, m.offset, m.offset + m.length);
    const pad = 8;
    const width = 320;
    const left = Math.min(Math.max(pad, rect.left), window.innerWidth - width - pad);
    const below = rect.bottom + 10;
    const top = below + 220 > window.innerHeight ? rect.top - 210 : below;
    setOpen({ match: m, x: left, y: Math.max(pad, top) });
    if (select) ta.setSelectionRange(m.offset, m.offset + m.length);
  }

  function loadExample() {
    setText(SAMPLE);
    setCaret(SAMPLE.length);
    userClosed.current = false;
    setOpen(null);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(SAMPLE.length, SAMPLE.length);
    });
  }

  function closePopup() {
    userClosed.current = true;
    setOpen(null);
  }

  function hitFromEvent(e: { clientX: number; clientY: number }): Match | undefined {
    const ta = taRef.current;
    if (!ta) return undefined;
    const fromPoint = matchAtClientPoint(rectsRef.current, e.clientX, e.clientY);
    if (fromPoint) return fromPoint;
    return matchAtOffset(matches, ta.selectionStart);
  }

  function onTextClick(e: React.MouseEvent<HTMLTextAreaElement>) {
    const m = hitFromEvent(e);
    if (m) openMatch(m);
    else closePopup();
  }

  function onTextMove(e: React.MouseEvent<HTMLTextAreaElement>) {
    const ta = taRef.current;
    if (!ta) return;
    const m = matchAtClientPoint(rectsRef.current, e.clientX, e.clientY);
    ta.style.cursor = m ? "pointer" : "text";
    window.clearTimeout(hoverTimer.current);
    if (!m) return;
    if (open && open.match.offset === m.offset && open.match.ruleId === m.ruleId) return;
    hoverTimer.current = window.setTimeout(() => openMatch(m, false), 220);
  }

  function accept(m: Match, replacement: string) {
    const next = applyReplacement(text, m.offset, m.length, replacement);
    setText(next);
    userClosed.current = false;
    setOpen(null);
    if (mode === "privacy") setRes(analyze({ text: next, dialect, styleGuide, caret: m.offset + replacement.length, personalDictionary }));
  }

  function dismiss(m: Match) {
    const key = `${m.ruleId}:${m.offset}:${text.slice(m.offset, m.offset + m.length)}`;
    setDismissed((s) => new Set(s).add(key));
    closePopup();
  }

  useEffect(() => {
    if (!matches.length || userClosed.current) return;
    const stillOpen =
      open &&
      matches.some((m) => m.ruleId === open.match.ruleId && m.offset === open.match.offset);
    if (stillOpen) return;
    const pick = matchNearCaret(text, matches, caret);
    if (!pick) return;
    const id = requestAnimationFrame(() => openMatch(pick, false));
    return () => cancelAnimationFrame(id);
  }, [matches, caret]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopup();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".sg-pop") || t.closest("textarea.doc") || t.closest(".issue") || t.closest(".sg-badge") || t.closest(".coach-chips")) return;
      closePopup();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.clearTimeout(hoverTimer.current);
    };
  }, []);

  const original = open ? text.slice(open.match.offset, open.match.offset + open.match.length) : "";

  return (
    <div className="editor-wrap">
      <div>
        <div className="toolbar">
          <label>
            Dialect{" "}
            <select value={dialect} onChange={(e) => setDialect(e.target.value as Dialect)}>
              <option>en-IN</option>
              <option>en-US</option>
              <option>en-GB</option>
              <option>en-AU</option>
              <option>en-CA</option>
            </select>
          </label>
          <label>
            Mode{" "}
            <select value={mode} onChange={(e) => setMode(e.target.value as "privacy" | "local")}>
              <option value="privacy">Privacy (in-browser)</option>
              <option value="local">Local API</option>
            </select>
          </label>
          <label>
            Personal dict{" "}
            <input
              type="text"
              value={personalWords}
              placeholder="names, jargon"
              onChange={(e) => setPersonalWords(e.target.value)}
            />
          </label>
          <button className="primary" type="button" onClick={run}>
            Recheck
          </button>
          <button type="button" onClick={loadExample}>
            Load example
          </button>
        </div>
        <div className="editor-stage" ref={stageRef}>
          <div className="editor-highlights" aria-hidden>
            {!text ? (
              <span className="doc-ph">Start typing. Spelling is checked against a free on-device English word list.</span>
            ) : (
              segments.map((seg, i) =>
                seg.match ? (
                  <mark key={i} className={`ul cat-${seg.match.category}`}>
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )
            )}
          </div>
          <textarea
            ref={taRef}
            className="doc"
            value={text}
            placeholder="Start typing…"
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              setCaret(e.target.selectionStart);
              userClosed.current = false;
              setOpen(null);
            }}
            onSelect={markCaret}
            onKeyDown={(e) => {
              if (e.key === "Tab" && help.next[0]) {
                e.preventDefault();
                pickWord(help.next[0]);
              }
            }}
            onClick={onTextClick}
            onMouseMove={onTextMove}
            onMouseLeave={() => {
              window.clearTimeout(hoverTimer.current);
              if (taRef.current) taRef.current.style.cursor = "text";
            }}
            onKeyUp={markCaret}
            onScroll={(e) => {
              const h = e.currentTarget.parentElement?.querySelector(".editor-highlights") as HTMLElement | null;
              if (h) {
                h.scrollTop = e.currentTarget.scrollTop;
                h.scrollLeft = e.currentTarget.scrollLeft;
              }
              refreshRects();
            }}
          />
        </div>
        <WriteCoach next={help.next} onPick={pickWord} />
        {res && (
          <p className="stats">
            {res.stats.wordCount} words · {res.stats.sentenceCount} sentences · readability {res.stats.readability} ·{" "}
            {Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(" · ") || "clean"}
          </p>
        )}
        {err && <p className="stats">{err}</p>}
      </div>
      <aside>
        <h2 style={{ fontFamily: "var(--sans)", marginTop: 0 }}>Write better</h2>
        <p className="stats">
          Chips under the text guess the next word. Click a word for synonyms. Underlines still fix errors.{" "}
          {mode === "privacy" ? "All of this stays in this tab." : `POST ${API}/v1/check`}
        </p>
        {help.insight && (
          <div className="issue cat-clarity">
            <h3>Word: {help.insight.word}</h3>
            <p>
              {help.insight.note}
              {help.insight.synonyms.length ? ` Similar: ${help.insight.synonyms.join(", ")}.` : ""}
            </p>
          </div>
        )}
        {help.tips.map((t) => (
          <div key={t.id} className="issue cat-clarity">
            <h3>{t.title}</h3>
            <p>{t.detail}</p>
          </div>
        ))}
        <h2 style={{ fontFamily: "var(--sans)" }}>Issues</h2>
        {matches.map((m, i) => (
          <button
            key={i}
            type="button"
            className={`issue cat-${m.category}`}
            onClick={() => openMatch(m)}
          >
            <h3>{m.message}</h3>
            <p>{m.explanation}</p>
          </button>
        ))}
        <h3>Style-as-code</h3>
        <textarea
          style={{ width: "100%", minHeight: 90, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
          value={styleGuide}
          onChange={(e) => setStyleGuide(e.target.value)}
        />
      </aside>
      {matches.length > 0 && (
        <button
          type="button"
          className="sg-badge"
          aria-label={`${matches.length} suggestions`}
          onClick={() => openMatch(matches[0])}
        >
          {matches.length}
        </button>
      )}
      {open && (
        <SuggestionPopup
          match={open.match}
          original={original}
          x={open.x}
          y={open.y}
          onAccept={(r) => accept(open.match, r)}
          onClose={closePopup}
          onDismiss={() => dismiss(open.match)}
          onIgnoreRule={() => {
            setIgnoredRules((s) => new Set(s).add(open.match.ruleId));
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}
