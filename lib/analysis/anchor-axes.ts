import type { AnchorAxis } from "@/types/anchor-axes";
import { embedSentences } from "@/lib/analysis/sentence-embeddings";
import { cosine } from "@/lib/analysis/tfidf";

function meanVector(vectors: Float64Array[]): Float64Array {
  if (vectors.length === 0) return new Float64Array();
  const dim = vectors[0].length;
  const out = new Float64Array(dim);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      out[i] += vec[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    out[i] /= vectors.length;
  }
  return out;
}

function normalize(vec: Float64Array): Float64Array {
  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;
  const out = new Float64Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    out[i] = vec[i] / norm;
  }
  return out;
}

export function computeAxisVector(positiveVector: Float64Array, negativeVector: Float64Array): Float64Array {
  if (!positiveVector?.length || !negativeVector?.length) return new Float64Array();
  const dim = Math.min(positiveVector.length, negativeVector.length);
  const diff = new Float64Array(dim);
  for (let i = 0; i < dim; i++) {
    diff[i] = positiveVector[i] - negativeVector[i];
  }
  return normalize(diff);
}

export async function embedAnchorAxis(axis: AnchorAxis): Promise<AnchorAxis> {
  if (!axis.negativePole.seedPhrases?.length || !axis.positivePole.seedPhrases?.length) {
    return axis;
  }
  const [negEmbeddings, posEmbeddings] = await Promise.all([
    embedSentences(axis.negativePole.seedPhrases || []),
    embedSentences(axis.positivePole.seedPhrases || []),
  ]);

  const negativeVector = meanVector(negEmbeddings.vectors);
  const positiveVector = meanVector(posEmbeddings.vectors);
  const axisVector = computeAxisVector(positiveVector, negativeVector);

  return {
    ...axis,
    negativeVector,
    positiveVector,
    axisVector,
  };
}

export async function embedAnchorAxes(axes: AnchorAxis[]): Promise<AnchorAxis[]> {
  return Promise.all(axes.map(embedAnchorAxis));
}

export function projectToAnchorAxis(vector: Float64Array, axisVector: Float64Array): number {
  if (!vector?.length || !axisVector?.length) return 0;
  const normVec = normalize(vector);
  const normAxis = normalize(axisVector);
  return cosine(normVec, normAxis);
}

export function projectToAnchorAxes(vector: Float64Array, axes: AnchorAxis[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const axis of axes) {
    if (!axis.axisVector) continue;
    scores[axis.id] = projectToAnchorAxis(vector, axis.axisVector);
  }
  return scores;
}

export function projectConceptCentroids(
  centroids: Float64Array[],
  axes: AnchorAxis[],
  conceptIds?: string[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  centroids.forEach((centroid, idx) => {
    const conceptId = conceptIds?.[idx] ?? `concept:${idx}`;
    result[conceptId] = projectToAnchorAxes(centroid, axes);
  });
  return result;
}

export function projectJurorVectors(
  jurorVectors: Record<string, Record<string, number>>,
  conceptCentroids: Float64Array[],
  axes: AnchorAxis[],
  conceptIds?: string[]
): Record<string, Record<string, number>> {
  const conceptScores = projectConceptCentroids(conceptCentroids, axes, conceptIds);
  const result: Record<string, Record<string, number>> = {};

  for (const [juror, vec] of Object.entries(jurorVectors)) {
    const scores: Record<string, number> = {};
    for (const axis of axes) {
      let total = 0;
      let weightSum = 0;
      for (const [conceptId, weight] of Object.entries(vec)) {
        const conceptScore = conceptScores[conceptId]?.[axis.id];
        if (typeof conceptScore === "number") {
          total += weight * conceptScore;
          weightSum += weight;
        }
      }
      scores[axis.id] = weightSum > 0 ? total / weightSum : 0;
    }
    result[juror] = scores;
  }

  return result;
}
