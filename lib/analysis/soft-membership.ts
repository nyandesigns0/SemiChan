import { cosine } from "./tfidf";

/**
 * Compute soft membership weights for each vector relative to centroids.
 * Includes sharpening controls via temperature and minimum weight thresholds.
 * 
 * @param vectors - Array of sentence vectors
 * @param centroids - Array of cluster centroids
 * @param topN - Number of top concepts to keep (default 3)
 * @param options - Soft membership sharpening parameters
 * @returns Array of membership arrays: { conceptId: string, weight: number }[]
 */
export function computeSoftMembership(
  vectors: Float64Array[],
  centroids: Float64Array[],
  topN: number = 3,
  options: {
    temperature?: number;
    minWeight?: number;
    entropyCap?: number;
  } = {}
): Array<Array<{ conceptId: string; weight: number }>> {
  const {
    temperature = 1.0,
    minWeight = 0.10,
    entropyCap = 0.8
  } = options;

  return vectors.map((v) => {
    const similarities = centroids.map((c, idx) => {
      const sim = cosine(v, c);
      // Apply temperature sharpening: lower temperature = sharper distribution
      // similarity = Math.max(0, sim) / temperature
      return {
        conceptId: `concept:${idx}`,
        similarity: Math.max(0, sim) / temperature
      };
    });

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Take top N candidates
    let top = similarities.slice(0, topN);
    
    // Normalize weights to sum to 1
    let totalSim = top.reduce((acc, s) => acc + s.similarity, 0) || 1;
    let candidates = top.map((s) => ({
      conceptId: s.conceptId,
      weight: s.similarity / totalSim
    }));

    // Filter out memberships below minWeight
    let filtered = candidates.filter(c => c.weight >= minWeight);
    
    // If we filtered everything, keep at least the top-1
    if (filtered.length === 0 && candidates.length > 0) {
      filtered = [candidates[0]];
    }

    // Re-normalize remaining weights
    let newTotal = filtered.reduce((acc, c) => acc + c.weight, 0) || 1;
    let finalMemberships = filtered.map(c => ({
      conceptId: c.conceptId,
      weight: c.weight / newTotal
    }));

    // Apply entropy-based hardening if specified
    if (entropyCap > 0 && finalMemberships.length > 1) {
      const entropy = computeWeightEntropy(finalMemberships.map(m => m.weight));
      if (entropy > entropyCap) {
        // Too smeared, harden to top-1 or top-2
        finalMemberships = finalMemberships.slice(0, 1);
        finalMemberships[0].weight = 1.0;
      }
    }

    return finalMemberships;
  });
}

/**
 * Compute Shannon entropy of a weight distribution (normalized bits)
 */
function computeWeightEntropy(weights: number[]): number {
  if (weights.length <= 1) return 0;
  let ent = 0;
  for (const w of weights) {
    if (w > 0) ent -= w * Math.log2(w);
  }
  // Normalize by max possible entropy for this N
  const maxEnt = Math.log2(weights.length);
  return maxEnt > 0 ? ent / maxEnt : 0;
}






