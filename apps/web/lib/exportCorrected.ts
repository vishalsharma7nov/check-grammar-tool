import { applyReplacement } from "@check-grammar/engine";
import type { Match } from "@check-grammar/protocol";

/** Apply first replacement for each match, right-to-left so offsets stay valid. */
export function applyAllCorrections(text: string, matches: Match[]): string {
  const sorted = [...matches].sort((a, b) => b.offset - a.offset);
  let result = text;
  for (const m of sorted) {
    const replacement = m.replacements?.[0];
    if (!replacement) continue;
    result = applyReplacement(result, m.offset, m.length, replacement);
  }
  return result;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadText(text: string, filename = "corrected.txt"): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
