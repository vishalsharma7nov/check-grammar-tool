import type { ResearchPassage } from "./research";
import type { Citation } from "./corpus/types";
import { downloadText } from "./exportCorrected";

export type { Citation };

/** Build Markdown with optional citations appendix for Writer Studio export. */
export function draftToMarkdown(
  draft: string,
  citations: Citation[],
  meta?: { topic?: string; audience?: string; tone?: string },
): string {
  const lines: string[] = [];
  if (meta?.topic?.trim()) {
    lines.push(`# ${meta.topic.trim()}`, "");
  }
  const bits = [meta?.audience, meta?.tone].filter((s) => s?.trim());
  if (bits.length) {
    lines.push(`*${bits.join(" · ")}*`, "");
  }
  lines.push(draft.trim(), "");
  if (citations.length) {
    lines.push("---", "", "## Sources", "");
    citations.forEach((c, i) => {
      const label = c.title || `Source ${i + 1}`;
      const url = c.sourceUrl?.trim();
      const lic = c.license?.trim();
      const link = url ? `[${label}](${url})` : label;
      const suffix = lic ? ` — ${lic}` : "";
      lines.push(`${i + 1}. ${link}${suffix}`);
    });
    lines.push("");
  }
  lines.push(
    "---",
    "",
    "_AI-assisted draft. Edit in your voice. Cite open sources. Not for academic fraud or hiding AI use._",
    "",
  );
  return lines.join("\n");
}

export function citationsFromPassages(passages: ResearchPassage[]): Citation[] {
  return passages.map((p) => ({
    title: p.title,
    sourceUrl: p.sourceUrl,
    license: p.license,
  }));
}

export function exportWriterMarkdown(
  draft: string,
  citations: Citation[],
  meta?: { topic?: string; audience?: string; tone?: string },
  filename = "writer-studio-draft.md",
): void {
  const md = draftToMarkdown(draft, citations, meta);
  downloadText(md, filename);
}
