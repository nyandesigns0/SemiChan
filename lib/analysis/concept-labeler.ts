import { topN } from "@/lib/utils/array-utils";

export function labelCluster(vocab: string[], centroid: Float64Array, top = 6): string {
  const pairs = vocab.map((t, i) => ({ t, w: centroid[i] }));
  const topTerms = topN(pairs, top, (p) => p.w)
    .map((p) => p.t)
    .filter(Boolean);
  if (topTerms.length === 0) return "Concept";
  // Slightly nicer label
  return topTerms.slice(0, 3).join(" · ");
}

