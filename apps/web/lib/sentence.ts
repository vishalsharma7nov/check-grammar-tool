/** Return selected span, or the sentence containing the caret. */
export function rewriteTarget(
  text: string,
  selStart: number,
  selEnd: number,
): { snippet: string; offset: number; length: number } | null {
  if (selStart !== selEnd) {
    return { snippet: text.slice(selStart, selEnd), offset: selStart, length: selEnd - selStart };
  }
  const caret = selStart;
  if (!text.trim()) return null;

  let start = caret;
  while (start > 0 && !/[.!?\n]/.test(text[start - 1]!)) start -= 1;
  while (start < text.length && /\s/.test(text[start]!)) start += 1;

  let end = caret;
  while (end < text.length && !/[.!?\n]/.test(text[end]!)) end += 1;
  if (end < text.length && /[.!?]/.test(text[end]!)) end += 1;

  const snippet = text.slice(start, end).trim();
  if (!snippet) return null;
  const offset = text.indexOf(snippet, Math.max(0, start - 1));
  return { snippet, offset: offset >= 0 ? offset : start, length: snippet.length };
}
