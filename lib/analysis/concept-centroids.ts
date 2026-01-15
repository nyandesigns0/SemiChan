/**
 * Compute centroids for a set of vectors given their cluster assignments
 * 
 * @param vectors - Array of vectors to cluster
 * @param assignments - Cluster assignments for each vector (indices)
 * @param k - Number of clusters
 * @returns Array of centroid vectors
 */
export function computeCentroids(
  vectors: Float64Array[],
  assignments: number[],
  k: number
): Float64Array[] {
  if (vectors.length === 0 || assignments.length === 0) return [];
  
  const dim = vectors[0].length;
  const centroids = Array.from({ length: k }, () => new Float64Array(dim));
  const counts = new Array(k).fill(0);

  for (let i = 0; i < vectors.length; i++) {
    const clusterIdx = assignments[i];
    if (clusterIdx === undefined || clusterIdx < 0 || clusterIdx >= k) continue;
    
    const v = vectors[i];
    const centroid = centroids[clusterIdx];
    for (let j = 0; j < dim; j++) {
      centroid[j] += v[j];
    }
    counts[clusterIdx]++;
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









