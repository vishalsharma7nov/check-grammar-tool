const KEY = "check-grammar-personal-dict";

export function loadPersonalDictionary(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((w) => typeof w === "string" && w.trim()) : [];
  } catch {
    return [];
  }
}

export function savePersonalDictionary(words: string[]): void {
  if (typeof window === "undefined") return;
  const unique = [...new Set(words.map((w) => w.trim()).filter(Boolean))];
  localStorage.setItem(KEY, JSON.stringify(unique));
}

export function addToPersonalDictionary(word: string, existing: string[]): string[] {
  const w = word.trim();
  if (!w) return existing;
  const lower = w.toLowerCase();
  if (existing.some((x) => x.toLowerCase() === lower)) return existing;
  const next = [...existing, w];
  savePersonalDictionary(next);
  return next;
}
