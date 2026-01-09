import { STOPWORDS } from "@/constants/nlp-constants";
import { topN } from "@/lib/utils/array-utils";

export function extractKeyphrases(text: string, maxPhrases = 12): string[] {
  // Lightweight noun-phrase-ish extraction: contiguous non-stopword tokens up to length 3.
  const toks = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const phrases: Map<string, number> = new Map();
  const windowMax = 3;

  for (let i = 0; i < toks.length; i++) {
    if (STOPWORDS.has(toks[i]) || toks[i].length < 2) continue;
    for (let w = 1; w <= windowMax; w++) {
      const slice = toks.slice(i, i + w);
      if (slice.length < w) continue;
      if (slice.some((t) => STOPWORDS.has(t) || t.length < 2)) continue;
      const p = slice.join(" ");
      // Penalize phrases starting/ending with apostrophes or hyphens
      if (/^[-']|[-']$/.test(p)) continue;
      phrases.set(p, (phrases.get(p) ?? 0) + 1);
    }
  }

  return topN([...phrases.entries()].map(([p, c]) => ({ p, c })), maxPhrases, (x) => x.c).map((x) => x.p);
}

