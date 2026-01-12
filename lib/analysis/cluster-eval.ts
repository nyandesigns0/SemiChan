import { kmeansCosine } from "./kmeans";
import { cosine } from "./tfidf";
import { evaluateCutQuality, CutQualityParams } from "./cut-constraints";
import { SentenceRecord } from "../../types/analysis";

/**
 * Evaluate a range of K values using both silhouette-like separation scores
 * and hierarchical cut quality constraints.
 * 
 * @param vectors - Array of hybrid vectors
 * @param sentences - Corresponding sentence records (for juror support)
 * @param kMin - Minimum K to check
 * @param kMax - Maximum K to check
 * @param seed - Seed for PRNG consistency (default 42)
 * @param qualityParams - Optional constraints for cut evaluation
 * @returns Recommended K and metrics for each valid K
 */
export function evaluateKRange(
  vectors: Float64Array[],
  sentences: SentenceRecord[],
  kMin: number = 4,
  kMax: number = 20,
  seed: number = 42,
  qualityParams: CutQualityParams = {}
): { recommendedK: number; metrics: Array<{ k: number; score: number; quality?: any }> } {
  if (vectors.length < kMin) {
    return { recommendedK: Math.max(1, vectors.length), metrics: [] };
  }

  const metrics: Array<{ k: number; score: number; quality?: any }> = [];
  const actualKMax = Math.min(kMax, vectors.length - 1);

  // Weight for balancing silhouette vs quality score
  const qualityWeight = 0.4;

  for (let k = kMin; k <= actualKMax; k++) {
    // Run K-means with the provided seed
    const result = kmeansCosine(vectors, k, 25, seed);
    
    // 1. Calculate silhouette-lite score
    let totalSilhouette = 0;
    let count = 0;

    for (let i = 0; i < vectors.length; i++) {
      const clusterIdx = result.assignments[i];
      const centroid = result.centroids[clusterIdx];
      
      const cohesion = cosine(vectors[i], centroid);
      
      let maxOtherSim = -1;
      for (let c = 0; c < result.k; c++) {
        if (c === clusterIdx) continue;
        const sim = cosine(vectors[i], result.centroids[c]);
        if (sim > maxOtherSim) maxOtherSim = sim;
      }
      
      totalSilhouette += (cohesion - maxOtherSim);
      count++;
    }

    const silhouetteScore = count > 0 ? totalSilhouette / count : 0;

    // 2. Calculate quality score using constraints
    const quality = evaluateCutQuality(
      result.assignments,
      sentences,
      result.centroids,
      qualityParams
    );

    // If cut is invalid, we penalize it heavily or skip it
    if (!quality.isValid) {
      continue;
    }

    // Combined score: silhouette balances separation, quality balances support/redundancy
    const combinedScore = silhouetteScore * (1 - qualityWeight) + quality.score * qualityWeight;
    
    metrics.push({ k, score: combinedScore, quality });
  }

  // Find K with maximum score
  let bestK = kMin;
  let bestScore = -Infinity;
  for (const m of metrics) {
    if (m.score > bestScore) {
      bestScore = m.score;
      bestK = m.k;
    }
  }

  // If no valid K found, fallback to kMin but warn?
  if (metrics.length === 0) {
    return { recommendedK: kMin, metrics: [] };
  }

  return { recommendedK: bestK, metrics };
}




