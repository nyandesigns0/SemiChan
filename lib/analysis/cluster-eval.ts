import { kmeansCosine } from "./kmeans";
import { cosine } from "./tfidf";

/**
 * Evaluate a range of K values using a silhouette-like separation score
 * Returns the recommended K and metrics for each K
 * 
 * @param vectors - Array of hybrid vectors
 * @param kMin - Minimum K to check
 * @param kMax - Maximum K to check
 * @param seed - Seed for PRNG consistency (default 42)
 * @returns Recommended K and metrics
 */
export function evaluateKRange(
  vectors: Float64Array[],
  kMin: number = 4,
  kMax: number = 20,
  seed: number = 42
): { recommendedK: number; metrics: Array<{ k: number; score: number }> } {
  if (vectors.length < kMin) {
    return { recommendedK: Math.max(1, vectors.length), metrics: [] };
  }

  const metrics: Array<{ k: number; score: number }> = [];
  const actualKMax = Math.min(kMax, vectors.length - 1);

  for (let k = kMin; k <= actualKMax; k++) {
    // Run K-means with the provided seed
    const result = kmeansCosine(vectors, k, 25, seed);
    
    // Calculate a simple cohesion/separation score (Silhouette-lite)
    // Score = (Average Intra-cluster Similarity) - (Average Inter-cluster Similarity)
    let totalScore = 0;
    let count = 0;

    for (let i = 0; i < vectors.length; i++) {
      const clusterIdx = result.assignments[i];
      const centroid = result.centroids[clusterIdx];
      
      // Cohesion: similarity to own centroid
      const cohesion = cosine(vectors[i], centroid);
      
      // Separation: similarity to nearest OTHER centroid
      let maxOtherSim = -1;
      for (let c = 0; c < result.k; c++) {
        if (c === clusterIdx) continue;
        const sim = cosine(vectors[i], result.centroids[c]);
        if (sim > maxOtherSim) maxOtherSim = sim;
      }
      
      totalScore += (cohesion - maxOtherSim);
      count++;
    }

    const avgScore = count > 0 ? totalScore / count : 0;
    metrics.push({ k, score: avgScore });
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

  return { recommendedK: bestK, metrics };
}




