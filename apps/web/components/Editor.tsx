"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { analyze, applyReplacement, insertSuggestion, writingHelp } from "@check-grammar/engine";
import type { CheckGoals, CheckResponse, Dialect, Match, NextWordSuggestion } from "@check-grammar/protocol";
import SuggestionPopup from "./SuggestionPopup";
import WriteCoach from "./WriteCoach";
import RewritePanel from "./RewritePanel";
import {
  highlightSegments,
  matchAtClientPoint,
  matchAtOffset,
  matchRects,
  textareaRangeRect,
} from "../lib/textareaCoords";
import { loadPersonalDictionary, addToPersonalDictionary, savePersonalDictionary } from "../lib/personalDictionary";
import { inferTone } from "../lib/tone";
import { rewriteTarget } from "../lib/sentence";
import { llmFromHealth } from "../lib/ollama";
import { fetchRewrite, localRewrite, wordDiff, type RewriteGoal } from "../lib/rewrite";
import type { RewriteVariant } from "@check-grammar/protocol";
import {
  enhancedCheck,
  enhancedAvailable,
  fetchEnhancedCapabilities,
  type EnhancedCapabilities,
} from "../lib/enhancedCheck";
import { applyAllCorrections, copyToClipboard, downloadText } from "../lib/exportCorrected";
import { DEMO_TEXT, hasSeenOnboarding, markOnboardingSeen } from "../lib/onboarding";
import OnboardingBanner from "./OnboardingBanner";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const HAS_API_ENV = Boolean(process.env.NEXT_PUBLIC_API_URL);

type EditorMode = "privacy" | "local" | "enhanced";

export default function Editor() {
  const [text, setText] = useState("");
  const [dialect, setDialect] = useState<Dialect>("en-IN");
  const [mode, setMode] = useState<EditorMode>("privacy");
  const [apiAvailable, setApiAvailable] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [llmBackend, setLlmBackend] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [capabilities, setCapabilities] = useState<EnhancedCapabilities | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [fallbackNote, setFallbackNote] = useState("");
  const [styleGuide, setStyleGuide] = useState("- id: no-very\n  pattern: very\n  message: Avoid very\n");
  const [personalDict, setPersonalDict] = useState<string[]>([]);
  const [personalWords, setPersonalWords] = useState("");
  const [formality, setFormality] = useState<CheckGoals["formality"]>("neutral");
  const [intent, setIntent] = useState<CheckGoals["intent"]>("other");
  const [res, setRes] = useState<CheckResponse | null>(null);
  const [err, setErr] = useState("");
  const [ignoredRules, setIgnoredRules] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ match: Match; x: number; y: number } | null>(null);
  const [caret, setCaret] = useState(0);
  const [coachCaret, setCoachCaret] = useState(0);
  const [selEnd, setSelEnd] = useState(0);
  const [rewriteGoals, setRewriteGoals] = useState<RewriteGoal[]>(["clarity"]);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState("");
  const [rewriteOriginal, setRewriteOriginal] = useState("");
  const [rewriteSuggested, setRewriteSuggested] = useState("");
  const [rewriteProvider, setRewriteProvider] = useState("");
  const [rewriteVariants, setRewriteVariants] = useState<RewriteVariant[]>([]);
  const [rewriteVariantIdx, setRewriteVariantIdx] = useState(0);
  const [rewriteSpan, setRewriteSpan] = useState<{ offset: number; length: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [exportNote, setExportNote] = useState("");
  const [checking, setChecking] = useState(false);
  const [recheckFlash, setRecheckFlash] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>(0);
  const userClosed = useRef(false);
  const rectsRef = useRef<ReturnType<typeof matchRects>>([]);
  const caretRef = useRef(0);
  const selRef = useRef({ start: 0, end: 0 });
  const openSliceRef = useRef("");

  useEffect(() => {
    const words = loadPersonalDictionary();
    setPersonalDict(words);
    setPersonalWords(words.join(", "));
    setShowOnboarding(!hasSeenOnboarding());
  }, []);

  useEffect(() => {
    fetchEnhancedCapabilities(API).then((caps) => {
      setCapabilities(caps);
      const ok = caps?.ok ?? false;
      setApiAvailable(ok);
      const llm = llmFromHealth(caps ?? { ok: false });
      setLlmAvailable(Boolean(llm?.available));
      setLlmBackend(llm?.backend ?? "");
      setLlmModel(llm?.model ?? caps?.llmModel ?? "");
      if (!ok) return;
      const onLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const suggestEnhanced = HAS_API_ENV || onLocalhost;
      if (suggestEnhanced && enhancedAvailable(caps)) {
        setMode((prev) => (prev === "privacy" ? "enhanced" : prev));
      }
    });
  }, []);

  const goals = useMemo<CheckGoals>(() => ({ formality, intent }), [formality, intent]);

  const personalDictionary = useMemo(() => {
    const fromInput = personalWords
      .split(/[,;]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    return [...new Set([...personalDict, ...fromInput])];
  }, [personalDict, personalWords]);

  const run = useCallback(async () => {
    setErr("");
    setFallbackNote("");
    setRecheckFlash("");
    const req = { text, dialect, styleGuide, caret: caretRef.current, personalDictionary, goals };
    if (mode === "privacy") {
      setRes(analyze(req));
      return;
    }
    if (mode === "enhanced") {
      const out = await enhancedCheck(API, req, { includeLLM: llmAvailable, llmAvailable });
      setRes(out.response);
      if (out.mode === "privacy" && out.fallbackReason) {
        setFallbackNote(`Enhanced unavailable — using Privacy mode (${out.fallbackReason})`);
      }
      return;
    }
    try {
      const r = await fetch(`${API}/v1/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: AbortSignal.timeout(12_000),
      });
      if (!r.ok) throw new Error(await r.text());
      setRes(await r.json());
    } catch (e) {
      setErr(String(e));
      setRes(analyze(req));
    }
  }, [text, dialect, mode, styleGuide, personalDictionary, goals, llmAvailable]);

  const handleRecheck = useCallback(async () => {
    setChecking(true);
    try {
      await run();
      setRecheckFlash("Rechecked just now");
      window.setTimeout(() => setRecheckFlash(""), 2500);
    } catch (e) {
      setErr(String(e));
    } finally {
      setChecking(false);
    }
  }, [run]);

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
  const tone = useMemo(() => inferTone(text), [text]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of matches) c[m.category] = (c[m.category] || 0) + 1;
    return c;
  }, [matches]);

  const help = useMemo(() => writingHelp(text, coachCaret), [text, coachCaret]);

  const rewriteDiff = useMemo(
    () => wordDiff(rewriteOriginal, rewriteSuggested),
    [rewriteOriginal, rewriteSuggested],
  );

  function syncHighlightScroll() {
    const ta = taRef.current;
    const hl = highlightsRef.current;
    if (!ta || !hl) return;
    if (hl.scrollTop !== ta.scrollTop) hl.scrollTop = ta.scrollTop;
    if (hl.scrollLeft !== ta.scrollLeft) hl.scrollLeft = ta.scrollLeft;
  }

  function rememberSelection(ta: HTMLTextAreaElement) {
    caretRef.current = ta.selectionStart;
    selRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
    setCaret(ta.selectionStart);
    setSelEnd(ta.selectionEnd);
  }

  function markCaret() {
    const ta = taRef.current;
    if (ta) rememberSelection(ta);
  }

  function restoreSelectionIfFocused() {
    const ta = taRef.current;
    if (!ta || document.activeElement !== ta) return;
    const { start, end } = selRef.current;
    const len = ta.value.length;
    const s = Math.min(start, len);
    const e = Math.min(Math.max(end, s), len);
    if (ta.selectionStart !== s || ta.selectionEnd !== e) {
      ta.setSelectionRange(s, e);
    }
  }

  function syncPersonalWords(next: string[]) {
    setPersonalDict(next);
    setPersonalWords(next.join(", "));
    savePersonalDictionary(next);
  }

  function addWordToDictionary(word: string) {
    syncPersonalWords(addToPersonalDictionary(word, personalDict));
    closePopup();
  }

  function pickWord(s: NextWordSuggestion) {
    const next = insertSuggestion(text, caretRef.current, s);
    setText(next.text);
    caretRef.current = next.cursor;
    selRef.current = { start: next.cursor, end: next.cursor };
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

  useEffect(() => {
    const t = setTimeout(() => setCoachCaret(caretRef.current), 350);
    return () => clearTimeout(t);
  }, [text, caret]);

  useLayoutEffect(() => {
    syncHighlightScroll();
    restoreSelectionIfFocused();
  }, [segments, res]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const ro = new ResizeObserver(() => {
      syncHighlightScroll();
      refreshRects();
    });
    ro.observe(ta);
    return () => ro.disconnect();
  }, []);

  function openMatch(m: Match, select = true) {
    const ta = taRef.current;
    if (!ta) return;
    userClosed.current = false;
    openSliceRef.current = text.slice(m.offset, m.offset + m.length);
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
    setText(DEMO_TEXT);
    caretRef.current = DEMO_TEXT.length;
    selRef.current = { start: DEMO_TEXT.length, end: DEMO_TEXT.length };
    setCaret(DEMO_TEXT.length);
    userClosed.current = false;
    setOpen(null);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(DEMO_TEXT.length, DEMO_TEXT.length);
    });
  }

  function dismissOnboarding() {
    markOnboardingSeen();
    setShowOnboarding(false);
  }

  function tryExample() {
    dismissOnboarding();
    loadExample();
  }

  const correctedText = useMemo(
    () => (text && matches.length ? applyAllCorrections(text, matches) : text),
    [text, matches],
  );

  async function exportCopy() {
    const payload = correctedText || text;
    if (!payload) return;
    const ok = await copyToClipboard(payload);
    setExportNote(ok ? "Copied to clipboard" : "Copy failed — try Download");
    window.setTimeout(() => setExportNote(""), 2500);
  }

  function exportDownload() {
    const payload = correctedText || text;
    if (!payload) return;
    downloadText(payload);
    setExportNote("Download started");
    window.setTimeout(() => setExportNote(""), 2500);
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
    if (m) openMatch(m, false);
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
    const cursor = m.offset + replacement.length;
    setText(next);
    caretRef.current = cursor;
    selRef.current = { start: cursor, end: cursor };
    setCaret(cursor);
    userClosed.current = false;
    setOpen(null);
    if (mode === "privacy") {
      setRes(analyze({ text: next, dialect, styleGuide, caret: cursor, personalDictionary, goals }));
    }
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  }

  function dismiss(m: Match) {
    const key = `${m.ruleId}:${m.offset}:${text.slice(m.offset, m.offset + m.length)}`;
    setDismissed((s) => new Set(s).add(key));
    closePopup();
  }

  function toggleRewriteGoal(g: RewriteGoal) {
    setRewriteGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function handleRewrite() {
    const { start, end } = selRef.current;
    const target = rewriteTarget(text, start, end);
    if (!target) {
      setRewriteError("Select text or place the caret in a sentence.");
      setRewriteOpen(true);
      return;
    }
    const goalsActive = rewriteGoals.length ? rewriteGoals : (["clarity"] as RewriteGoal[]);
    setRewriteOpen(true);
    setRewriteLoading(true);
    setRewriteError("");
    setRewriteOriginal(target.snippet);
    setRewriteSuggested("");
    setRewriteVariants([]);
    setRewriteVariantIdx(0);
    setRewriteSpan({ offset: target.offset, length: target.length });

    try {
      const useApi = mode === "local" || mode === "enhanced";
      const out = useApi
        ? await fetchRewrite(API, target.snippet, goalsActive, dialect)
        : {
            text: localRewrite(target.snippet, goalsActive),
            provider: "rules",
            variants: goalsActive.map((g) => ({ goal: g, text: localRewrite(target.snippet, [g]) })),
          };
      const variants = out.variants?.length ? out.variants : [{ goal: goalsActive[0], text: out.text }];
      setRewriteVariants(variants);
      setRewriteVariantIdx(0);
      setRewriteSuggested(variants[0]?.text ?? out.text);
      setRewriteProvider(out.provider);
    } catch (e) {
      setRewriteError(String(e));
    } finally {
      setRewriteLoading(false);
    }
  }

  function selectRewriteVariant(index: number) {
    const v = rewriteVariants[index];
    if (!v) return;
    setRewriteVariantIdx(index);
    setRewriteSuggested(v.text);
  }

  function acceptRewrite() {
    if (!rewriteSpan || !rewriteSuggested || rewriteSuggested === rewriteOriginal) return;
    const next = applyReplacement(text, rewriteSpan.offset, rewriteSpan.length, rewriteSuggested);
    const cursor = rewriteSpan.offset + rewriteSuggested.length;
    setText(next);
    caretRef.current = cursor;
    selRef.current = { start: cursor, end: cursor };
    setCaret(cursor);
    setRewriteOpen(false);
    setRewriteSpan(null);
    if (mode === "privacy") {
      setRes(
        analyze({
          text: next,
          dialect,
          styleGuide,
          caret: cursor,
          personalDictionary,
          goals,
        }),
      );
    }
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  }

  useEffect(() => {
    if (!open || userClosed.current) return;
    const still = matches.find((m) => m.ruleId === open.match.ruleId && m.offset === open.match.offset);
    if (!still) {
      setOpen(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      const rect = textareaRangeRect(ta, still.offset, still.offset + still.length);
      const pad = 8;
      const width = 320;
      const left = Math.min(Math.max(pad, rect.left), window.innerWidth - width - pad);
      const below = rect.bottom + 10;
      const top = below + 220 > window.innerHeight ? rect.top - 210 : below;
      setOpen((prev) =>
        prev ? { ...prev, match: still, x: left, y: Math.max(pad, top) } : null,
      );
    });
    return () => cancelAnimationFrame(id);
  }, [matches, open?.match.ruleId, open?.match.offset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePopup();
        setRewriteOpen(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.closest(".sg-pop") ||
        t.closest(".rw-panel") ||
        t.closest(".rw-backdrop") ||
        t.closest(".toolbar") ||
        t.closest("textarea.doc") ||
        t.closest(".issue") ||
        t.closest(".sg-badge") ||
        t.closest(".coach-chips")
      )
        return;
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

  const lt = capabilities?.enhanced?.languageTool;
  const llm = capabilities?.enhanced?.llm;
  const showCapabilityBanner =
    apiAvailable && enhancedAvailable(capabilities) && !bannerDismissed && mode !== "privacy";

  const isClean = matches.length === 0;

  return (
    <div className="editor-wrap">
      {showOnboarding && <OnboardingBanner onDismiss={dismissOnboarding} onTryExample={tryExample} />}
      {showCapabilityBanner && (
        <div className="enhanced-banner" role="status">
          <span>
            Enhanced mode available — LanguageTool
            {lt?.reachable ? " ✓" : lt?.configured ? " (starting…)" : ""} + local LLM
            {llm?.available ? " ✓" : llm?.configured ? " (start Ollama or ml/serve)" : ""}. Checks run via <code>{API}</code>; Privacy mode stays in-browser only.
          </span>
          <button type="button" className="banner-dismiss" onClick={() => setBannerDismissed(true)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="editor-main">
        <div className="toolbar">
          <div className="toolbar-group">
            <span className="toolbar-group-label">Check</span>
            <label>
              <span className="field-label">Dialect</span>
              <select value={dialect} onChange={(e) => setDialect(e.target.value as Dialect)}>
                <option>en-IN</option>
                <option>en-US</option>
                <option>en-GB</option>
                <option>en-AU</option>
                <option>en-CA</option>
              </select>
            </label>
            <label>
              <span className="field-label">Mode</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as EditorMode)}>
                <option value="privacy">Privacy (in-browser)</option>
                <option value="local">Local API</option>
                <option value="enhanced" disabled={!apiAvailable}>
                  Enhanced
                  {apiAvailable
                    ? llmAvailable
                      ? ` (API + LLM${llmBackend === "ollama" ? " · Ollama" : ""})`
                      : " (API — start Ollama for LLM)"
                    : " (start API first)"}
                </option>
              </select>
            </label>
            <label>
              <span className="field-label">Formality</span>
              <select value={formality} onChange={(e) => setFormality(e.target.value as CheckGoals["formality"])}>
                <option value="casual">Casual</option>
                <option value="neutral">Neutral</option>
                <option value="formal">Formal</option>
              </select>
            </label>
            <label>
              <span className="field-label">Intent</span>
              <select value={intent} onChange={(e) => setIntent(e.target.value as CheckGoals["intent"])}>
                <option value="email">Email</option>
                <option value="essay">Essay</option>
                <option value="chat">Chat</option>
                <option value="pr">PR / docs</option>
                <option value="commit">Commit</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span className="field-label">Dictionary</span>
              <input
                type="text"
                value={personalWords}
                placeholder="names, jargon"
                onChange={(e) => {
                  setPersonalWords(e.target.value);
                  const parsed = e.target.value
                    .split(/[,;]+/)
                    .map((w) => w.trim())
                    .filter(Boolean);
                  savePersonalDictionary(parsed);
                  setPersonalDict(parsed);
                }}
              />
            </label>
          </div>
          <div className="toolbar-divider" aria-hidden />
          <div className="toolbar-group">
            <span className="toolbar-group-label">Rewrite</span>
            <span className="rw-goals">
              {(["clarity", "brevity", "formality"] as RewriteGoal[]).map((g) => (
                <label key={g} className="rw-goal">
                  <input
                    type="checkbox"
                    checked={rewriteGoals.includes(g)}
                    onChange={() => toggleRewriteGoal(g)}
                  />
                  {g}
                </label>
              ))}
            </span>
            <button type="button" className="secondary" onClick={handleRewrite} disabled={!text.trim()}>
              Rewrite
            </button>
          </div>
          <div className="toolbar-divider" aria-hidden />
          <div className="toolbar-group toolbar-actions">
            <button className="primary" type="button" onClick={handleRecheck} disabled={checking}>
              {checking ? "Checking…" : "Recheck"}
            </button>
            <button type="button" className="ghost" onClick={loadExample}>
              Try example
            </button>
            <button type="button" className="secondary" onClick={exportCopy} disabled={!text}>
              Copy corrected
            </button>
            <button type="button" className="secondary" onClick={exportDownload} disabled={!text}>
              Download
            </button>
          </div>
        </div>
        <div className="editor-stage" ref={stageRef}>
          <div className="editor-highlights" ref={highlightsRef} aria-hidden>
            {!text ? (
              <span className="doc-ph">Start typing. Spelling is checked against a free on-device English word list.</span>
            ) : (
              segments.map((seg, i) =>
                seg.match ? (
                  <span key={i} className={`hl cat-${seg.match.category}`}>
                    {seg.text}
                  </span>
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
              const v = e.target.value;
              setText(v);
              rememberSelection(e.target);
              if (open) {
                const m = open.match;
                const edited = v.slice(m.offset, m.offset + m.length);
                if (edited !== openSliceRef.current) setOpen(null);
              }
            }}
            onSelect={markCaret}
            onBlur={markCaret}
            onKeyDown={(e) => {
              const chip = help.next[0];
              if (e.key === "Tab" && chip) {
                e.preventDefault();
                pickWord(chip);
              }
            }}
            onClick={(e) => {
              markCaret();
              onTextClick(e);
            }}
            onMouseMove={onTextMove}
            onMouseLeave={() => {
              window.clearTimeout(hoverTimer.current);
              if (taRef.current) taRef.current.style.cursor = "text";
            }}
            onKeyUp={markCaret}
            onScroll={(e) => {
              const hl = highlightsRef.current;
              if (hl) {
                hl.scrollTop = e.currentTarget.scrollTop;
                hl.scrollLeft = e.currentTarget.scrollLeft;
              }
              requestAnimationFrame(refreshRects);
            }}
          />
        </div>
        <div className="status-bar">
          <WriteCoach
            next={help.next}
            tone={tone}
            onPick={pickWord}
            llm={
              mode === "enhanced" && (llmAvailable || res?.llm?.used)
                ? {
                    active: true,
                    backend: llmBackend || (res?.llm?.provider === "ollama" ? "ollama" : res?.llm?.provider),
                    model: res?.llm?.model || llmModel,
                  }
                : undefined
            }
          />
        </div>
        {res && (
          <div className="stats">
            <span className="stat-chip">{res.stats.wordCount} words</span>
            <span className="stat-chip">{res.stats.sentenceCount} sentences</span>
            <span className="stat-chip">Readability {res.stats.readability}</span>
            {Object.entries(counts).map(([k, v]) => (
              <span key={k} className="stat-chip">{k}: {v}</span>
            ))}
            {isClean && Object.keys(counts).length === 0 && (
              <span className="stat-chip stat-clean">No issues</span>
            )}
            {res.llm?.used && <span className="stat-chip">LLM ({res.llm.provider})</span>}
          </div>
        )}
        {exportNote && <p className="stats stats-export">{exportNote}</p>}
        {recheckFlash && <p className="stats stats-export">{recheckFlash}</p>}
        {err && <p className="stats stats-err">{err}</p>}
        {fallbackNote && <p className="stats stats-fallback">{fallbackNote}</p>}
      </div>
      <aside className="sidebar">
        <div className="sidebar-panel">
          <div className="sidebar-panel-head">
            <h2>Write better</h2>
          </div>
          <div className="sidebar-panel-body">
            <p>
              Next-word hints and writing tips appear here. Click underlines in the editor to fix errors.{" "}
              {mode === "privacy"
                ? "All processing stays in this tab."
                : mode === "enhanced"
                  ? llmAvailable
                    ? `Enhanced via ${API} + LLM`
                    : `Enhanced via ${API} (LLM unavailable)`
                  : `Checking via ${API}`}
            </p>
            {help.insight && (
              <div className="issue cat-clarity">
                <h3>{help.insight.word}</h3>
                <p>
                  {help.insight.note}
                  {help.insight.synonyms.length ? ` Similar: ${help.insight.synonyms.join(", ")}.` : ""}
                </p>
              </div>
            )}
            {help.tips.length > 0 ? (
              help.tips.map((t) => (
                <div key={t.id} className="issue cat-clarity">
                  <h3>{t.title}</h3>
                  <p>{t.detail}</p>
                </div>
              ))
            ) : !help.insight ? (
              <div className="sidebar-empty">
                <div className="sidebar-empty-icon" aria-hidden>✦</div>
                <p>Start typing for writing tips and word suggestions.</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="sidebar-panel">
          <div className="sidebar-panel-head">
            <h2>Issues</h2>
            <span className={`issue-count${isClean ? " issue-count-zero" : ""}`} aria-label={`${matches.length} issues`}>
              {matches.length}
            </span>
          </div>
          <div className="sidebar-panel-body">
            {matches.length > 0 ? (
              matches.map((m, i) => (
                <button key={i} type="button" className={`issue cat-${m.category}`} onClick={() => openMatch(m)}>
                  <h3>{m.message}</h3>
                  <p>{m.explanation}</p>
                </button>
              ))
            ) : (
              <div className="sidebar-empty">
                <div className="sidebar-empty-icon" aria-hidden>✓</div>
                <p>Looking good — no issues found.</p>
              </div>
            )}
          </div>
        </div>
        <div className="sidebar-panel">
          <div className="sidebar-panel-head">
            <h2>Style guide</h2>
          </div>
          <div className="sidebar-panel-body">
            <textarea
              className="style-guide-textarea"
              value={styleGuide}
              onChange={(e) => setStyleGuide(e.target.value)}
              aria-label="Custom style rules"
            />
          </div>
        </div>
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
          onAddToDictionary={addWordToDictionary}
        />
      )}
      {rewriteOpen && (
        <RewritePanel
          original={rewriteOriginal}
          suggested={rewriteSuggested}
          beforeSegs={rewriteDiff.before}
          afterSegs={rewriteDiff.after}
          provider={rewriteProvider}
          variants={rewriteVariants}
          selectedVariant={rewriteVariantIdx}
          onSelectVariant={selectRewriteVariant}
          loading={rewriteLoading}
          error={rewriteError}
          onAccept={acceptRewrite}
          onClose={() => setRewriteOpen(false)}
        />
      )}
    </div>
  );
}
