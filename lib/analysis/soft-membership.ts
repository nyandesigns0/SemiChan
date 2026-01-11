import { hybridCosine } from "./hybrid-vectors";

/**
 * Compute soft membership weights for each vector relative to centroids
 * 
 * @param vectors - Array of sentence vectors
 * @param centroids - Array of cluster centroids
 * @param topN - Number of top concepts to keep (default 2)
 * @returns Array of membership arrays: { conceptId: string, weight: number }[]
 */
export function computeSoftMembership(
  vectors: Float64Array[],
  centroids: Float64Array[],
  topN: number = 2
): Array<Array<{ conceptId: string; weight: number }>> {
  return vectors.map((v) => {
    const similarities = centroids.map((c, idx) => ({
      conceptId: `concept:${idx}`,
      similarity: Math.max(0, hybridCosine(v, c)) // Clamp to 0
    }));

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Take top N
    const top = similarities.slice(0, topN);
    
    // Normalize weights to sum to 1
    const totalSim = top.reduce((acc, s) => acc + s.similarity, 0) || 1;
    return top.map((s) => ({
      conceptId: s.conceptId,
      weight: s.similarity / totalSim
    }));
  });
}





