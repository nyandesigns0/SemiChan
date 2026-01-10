import type { KMeansResult } from "@/types/nlp";
import { cosine } from "./tfidf";

/**
 * Simple deterministic PRNG (LCG)
 */
export function createPRNG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function kmeansCosine(vectors: Float64Array[], k: number, iters = 25, seed = 42): KMeansResult {
  // Simple deterministic PRNG
  const rand = createPRNG(seed);

  const n = vectors.length;
  if (n === 0) return { k, assignments: [], centroids: [] };
  const dim = vectors[0].length;

  // Initialize centroids by sampling docs
  const centroids: Float64Array[] = [];
  const used = new Set<number>();
  while (centroids.length < Math.min(k, n)) {
    const idx = Math.floor(rand() * n);
    if (used.has(idx)) continue;
    used.add(idx);
    centroids.push(new Float64Array(vectors[idx]));
  }

  const K = centroids.length;
  const assignments = new Array(n).fill(0);

  for (let iter = 0; iter < iters; iter++) {
    // Assign
    let changed = 0;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestScore = -Infinity;
      for (let c = 0; c < K; c++) {
        const score = cosine(vectors[i], centroids[c]);
        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed++;
      }
    }

    // Recompute
    const sums: Float64Array[] = Array.from({ length: K }, () => new Float64Array(dim));
    const counts = new Array(K).fill(0);
    for (let i = 0; i < n; i++) {
      const a = assignments[i];
      counts[a]++;
      const v = vectors[i];
      const sum = sums[a];
      for (let d = 0; d < dim; d++) sum[d] += v[d];
    }
    for (let c = 0; c < K; c++) {
      const cnt = counts[c] || 1;
      const next = new Float64Array(dim);
      let norm = 0;
      for (let d = 0; d < dim; d++) {
        next[d] = sums[c][d] / cnt;
        norm += next[d] * next[d];
      }
      norm = Math.sqrt(norm) || 1;
      for (let d = 0; d < dim; d++) next[d] /= norm;
      centroids[c] = next;
    }

    if (changed === 0) break;
  }

  return { k: K, assignments, centroids };
}

