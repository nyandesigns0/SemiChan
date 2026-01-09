import { normalizeWhitespace } from "@/lib/utils/text-utils";

export function sentenceSplit(text: string): string[] {
  // Heuristic sentence splitter robust enough for juror comments.
  const cleaned = normalizeWhitespace(text)
    .replace(/\n+/g, " \n ")
    .replace(/\s+/g, " ")
    .trim();

  // Split on punctuation boundaries; keep short fragments if meaningful.
  const rough = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z(""'])/g)
    .map((s) => s.trim())
    .filter(Boolean);

  // Secondary split on semicolons/line breaks
  const refined: string[] = [];
  for (const s of rough) {
    const parts = s
      .split(/\s*;\s*/g)
      .map((p) => p.trim())
      .filter(Boolean);
    refined.push(...parts);
  }
  // Prune very short boilerplate
  return refined
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 18);
}

