import { SentenceRecord } from "../../types/analysis";

/**
 * Compute centroids for a set of vectors given their cluster assignments.
 * Supports juror influence normalization via weights.
 * 
 * @param vectors - Array of vectors to cluster
 * @param assignments - Cluster assignments for each vector (indices)
 * @param k - Number of clusters
 * @param weights - Optional weights per vector (e.g., to normalize juror influence)
 * @returns Array of centroid vectors
 */
export function computeCentroids(
  vectors: Float64Array[],
  assignments: number[],
  k: number,
  weights?: number[]
): Float64Array[] {
  if (vectors.length === 0 || assignments.length === 0) return [];
  
  const dim = vectors[0].length;
  const centroids = Array.from({ length: k }, () => new Float64Array(dim));
  const counts = new Array(k).fill(0);

  for (let i = 0; i < vectors.length; i++) {
    const clusterIdx = assignments[i];
    if (clusterIdx === undefined || clusterIdx < 0 || clusterIdx >= k) continue;
    
    const v = vectors[i];
    const weight = weights ? weights[i] : 1.0;
    const centroid = centroids[clusterIdx];
    
    for (let j = 0; j < dim; j++) {
      centroid[j] += v[j] * weight;
    }
    counts[clusterIdx] += weight;
  }

  // L2 normalize centroids (for cosine similarity)
  for (let i = 0; i < k; i++) {
    if (counts[i] === 0) continue;
    
    let norm = 0;
    for (let j = 0; j < dim; j++) {
      norm += centroids[i][j] * centroids[i][j];
    }
    norm = Math.sqrt(norm) || 1;
    for (let j = 0; j < dim; j++) {
      centroids[i][j] /= norm;
    }
  }

  return centroids;
}

/**
 * Phase 4.1: Compute juror weights to normalize influence.
 * Penalizes dominant jurors using log weighting.
 */
export function computeJurorWeights(sentences: SentenceRecord[]): number[] {
  const jurorCounts = new Map<string, number>();
  for (const s of sentences) {
    jurorCounts.set(s.juror, (jurorCounts.get(s.juror) ?? 0) + 1);
  }

  const totalSentences = sentences.length;
  const weights = sentences.map(s => {
    const count = jurorCounts.get(s.juror) || 1;
    // Logarithmic dampening: weight = log(total) / log(count)
    // If count is 1, weight is 1. If count is total, weight is minimal.
    // We use a slightly more stable version: sqrt(avgCount / jurorCount)
    const avgCount = totalSentences / jurorCounts.size;
    return Math.sqrt(avgCount / count);
  });

  return weights;
}











