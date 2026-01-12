import type { GraphLink } from "@/types/graph";
import { cosine } from "@/lib/analysis/tfidf";

export function buildJurorSimilarityLinks(
  jurorList: string[],
  jurorVectors: Record<string, Record<string, number>>,
  conceptIds: string[],
  similarityThreshold: number
): GraphLink[] {
  const links: GraphLink[] = [];
  const conceptIndex = new Map(conceptIds.map((c, i) => [c, i]));

  const jurorDense: Record<string, Float64Array> = {};
  for (const j of jurorList) {
    const v = new Float64Array(conceptIds.length);
    const vec = jurorVectors[j] || {};
    for (const [cId, wt] of Object.entries(vec)) {
      const idx = conceptIndex.get(cId);
      if (typeof idx === "number") v[idx] = wt;
    }
    // Jensen-Shannon expects probability distributions (sum to 1)
    // Our jurorVectors are already L1 normalized, but let's ensure it.
    let sum = 0;
    for (let i = 0; i < v.length; i++) sum += v[i];
    if (sum > 0) {
      for (let i = 0; i < v.length; i++) v[i] /= sum;
    }
    jurorDense[j] = v;
  }

  for (let i = 0; i < jurorList.length; i++) {
    for (let j = i + 1; j < jurorList.length; j++) {
      const a = jurorList[i];
      const b = jurorList[j];
      const sim = jensenShannonSimilarity(jurorDense[a], jurorDense[b]);
      if (sim >= similarityThreshold) {
        links.push({
          id: `sim:juror:${a}__juror:${b}`,
          source: `juror:${a}`,
          target: `juror:${b}`,
          weight: sim,
          kind: "jurorJuror",
        });
      }
    }
  }

  return links;
}

/**
 * Compute Jensen-Shannon Similarity between two probability distributions.
 * JS Divergence is a symmetric version of KL Divergence.
 * similarity = 1 - JS_Divergence
 */
export function jensenShannonSimilarity(p: Float64Array, q: Float64Array): number {
  const n = p.length;
  const m = new Float64Array(n);
  for (let i = 0; i < n; i++) m[i] = 0.5 * (p[i] + q[i]);

  let klPM = 0;
  let klQM = 0;
  for (let i = 0; i < n; i++) {
    if (p[i] > 0 && m[i] > 0) klPM += p[i] * Math.log2(p[i] / m[i]);
    if (q[i] > 0 && m[i] > 0) klQM += q[i] * Math.log2(q[i] / m[i]);
  }

  const jsDivergence = 0.5 * klPM + 0.5 * klQM;
  return Math.max(0, 1 - jsDivergence);
}

export function buildConceptSimilarityLinks(
  conceptIds: string[],
  centroids: Float64Array[],
  similarityThreshold: number
): GraphLink[] {
  const links: GraphLink[] = [];

  for (let i = 0; i < conceptIds.length; i++) {
    for (let j = i + 1; j < conceptIds.length; j++) {
      const ca = conceptIds[i];
      const cb = conceptIds[j];
      const sim = cosine(centroids[i], centroids[j]);
      if (sim >= similarityThreshold) {
        links.push({
          id: `sim:concept:${i}__concept:${j}`,
          source: ca,
          target: cb,
          weight: sim,
          kind: "conceptConcept",
        });
      }
    }
  }

  return links;
}

