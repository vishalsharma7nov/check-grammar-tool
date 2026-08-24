import type { Match } from "@check-grammar/protocol";

/** Copy textarea typography onto a hidden mirror so we can measure a substring. */
export function textareaRangeRect(
  ta: HTMLTextAreaElement,
  start: number,
  end: number,
): DOMRect {
  const cs = getComputedStyle(ta);
  const mirror = document.createElement("div");
  const props = [
    "boxSizing",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "lineHeight",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "textAlign",
    "textIndent",
    "whiteSpace",
    "wordWrap",
    "wordBreak",
    "overflowWrap",
    "tabSize",
  ] as const;
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.left = "0";
  mirror.style.top = "0";
  mirror.style.width = `${ta.clientWidth}px`;
  for (const p of props) {
    (mirror.style as unknown as Record<string, string>)[p] = String(
      (cs as unknown as Record<string, string>)[p] ?? "",
    );
  }
  const before = document.createTextNode(ta.value.slice(0, start));
  const mid = ta.value.slice(start, end) || " ";
  const span = document.createElement("span");
  span.textContent = mid;
  mirror.append(before, span);
  document.body.appendChild(mirror);
  const sr = span.getBoundingClientRect();
  const tr = ta.getBoundingClientRect();
  const mr = mirror.getBoundingClientRect();
  mirror.remove();
  return new DOMRect(
    tr.left + (sr.left - mr.left) - ta.scrollLeft,
    tr.top + (sr.top - mr.top) - ta.scrollTop,
    sr.width,
    sr.height,
  );
}

export function matchAtOffset(matches: Match[], offset: number): Match | undefined {
  return matches.find((m) => offset >= m.offset && offset <= m.offset + m.length);
}

export type MatchRect = { match: Match; rect: DOMRect };

export function matchRects(ta: HTMLTextAreaElement, matches: Match[]): MatchRect[] {
  return matches.map((match) => ({
    match,
    rect: textareaRangeRect(ta, match.offset, match.offset + match.length),
  }));
}

export function matchAtClientPoint(
  rects: MatchRect[],
  clientX: number,
  clientY: number,
  pad = 4,
): Match | undefined {
  return rects.find(({ rect: r }) => {
    return (
      clientX >= r.left - pad &&
      clientX <= r.right + pad &&
      clientY >= r.top - pad &&
      clientY <= r.bottom + pad
    );
  })?.match;
}

export function highlightSegments(text: string, matches: Match[]): { text: string; match?: Match }[] {
  const sorted = [...matches].sort((a, b) => a.offset - b.offset);
  const out: { text: string; match?: Match }[] = [];
  let i = 0;
  for (const m of sorted) {
    if (m.offset > i) out.push({ text: text.slice(i, m.offset) });
    if (m.offset + m.length > i) {
      out.push({ text: text.slice(Math.max(i, m.offset), m.offset + m.length), match: m });
      i = m.offset + m.length;
    }
  }
  if (i < text.length) out.push({ text: text.slice(i) });
  return out;
}
