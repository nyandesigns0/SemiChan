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
    // normalize
    let norm = 0;
    for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= norm;
    jurorDense[j] = v;
  }

  for (let i = 0; i < jurorList.length; i++) {
    for (let j = i + 1; j < jurorList.length; j++) {
      const a = jurorList[i];
      const b = jurorList[j];
      const sim = cosine(jurorDense[a], jurorDense[b]);
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

