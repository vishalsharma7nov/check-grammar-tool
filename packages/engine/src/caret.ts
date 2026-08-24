import type { Match } from "../../protocol/src/index";

/** Prefer the issue under the caret, else the closest one in the same sentence. */
export function matchNearCaret(text: string, matches: Match[], caret: number): Match | undefined {
  if (!matches.length) return undefined;
  const pos = Math.min(Math.max(0, caret), Math.max(0, text.length));
  const inside = matches.find((m) => pos >= m.offset && pos <= m.offset + m.length);
  if (inside) return inside;
  const at = pos >= text.length ? Math.max(0, text.length - 1) : pos;
  const bound = (dir: -1 | 1) => {
    let i = at + (dir === -1 ? -1 : 0);
    while (i >= 0 && i < text.length) {
      if (/[.!?]/.test(text[i])) return dir === -1 ? i + 1 : i + 1;
      i += dir;
    }
    return dir === -1 ? 0 : text.length;
  };
  const from = bound(-1);
  const to = bound(1);
  const same = matches.filter((m) => m.offset >= from && m.offset < to);
  if (!same.length) return undefined;
  return same.reduce((best, m) => {
    const d = Math.abs(m.offset - pos);
    const bd = Math.abs(best.offset - pos);
    return d < bd ? m : best;
  });
}
