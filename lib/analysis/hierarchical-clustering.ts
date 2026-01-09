import { hybridCosine } from "./hybrid-vectors";

/**
 * Agglomerative Hierarchical Clustering using Cosine Similarity
 * Simple O(n^2) implementation suitable for < 500 sentences
 */
export function buildDendrogram(vectors: Float64Array[]) {
  const n = vectors.length;
  if (n === 0) return { merges: [] };

  // Initialize: each vector is its own cluster
  let clusters = vectors.map((v, i) => ({
    id: i,
    indices: [i],
    centroid: v
  }));

  const merges: Array<{ left: number; right: number; distance: number; size: number }> = [];
  let nextId = n;

  // Precompute similarity matrix (optional optimization, but let's keep it simple for now)
  
  while (clusters.length > 1) {
    let bestSim = -Infinity;
    let bestPair = [-1, -1];

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = hybridCosine(clusters[i].centroid, clusters[j].centroid);
        if (sim > bestSim) {
          bestSim = sim;
          bestPair = [i, j];
        }
      }
    }

    const [idx1, idx2] = bestPair;
    const c1 = clusters[idx1];
    const c2 = clusters[idx2];

    // Merge c2 into c1
    const mergedIndices = [...c1.indices, ...c2.indices];
    const newCentroid = new Float64Array(vectors[0].length);
    for (const idx of mergedIndices) {
      const v = vectors[idx];
      for (let d = 0; d < v.length; d++) {
        newCentroid[d] += v[d];
      }
    }
    // L2 Normalize
    let norm = 0;
    for (let d = 0; d < newCentroid.length; d++) norm += newCentroid[d] * newCentroid[d];
    norm = Math.sqrt(norm) || 1;
    for (let d = 0; d < newCentroid.length; d++) newCentroid[d] /= norm;

    const newCluster = {
      id: nextId++,
      indices: mergedIndices,
      centroid: newCentroid
    };

    merges.push({
      left: c1.id,
      right: c2.id,
      distance: 1 - bestSim, // convert similarity to distance
      size: mergedIndices.length
    });

    // Update cluster list: remove c1 and c2, add new cluster
    clusters = clusters.filter((_, i) => i !== idx1 && i !== idx2);
    clusters.push(newCluster);
  }

  return { merges };
}

/**
 * Cut dendrogram to get exactly K clusters
 */
export function cutDendrogramByCount(vectors: Float64Array[], targetK: number): number[] {
  const n = vectors.length;
  if (n <= targetK) return Array.from({ length: n }, (_, i) => i);

  // For a simple cut by count, we can just run the agglomerative process 
  // until we have targetK clusters remaining.
  
  let clusters = vectors.map((v, i) => ({
    indices: [i],
    centroid: v
  }));

  while (clusters.length > targetK) {
    let bestSim = -Infinity;
    let bestPair = [-1, -1];

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = hybridCosine(clusters[i].centroid, clusters[j].centroid);
        if (sim > bestSim) {
          bestSim = sim;
          bestPair = [i, j];
        }
      }
    }

    const [idx1, idx2] = bestPair;
    const c1 = clusters[idx1];
    const c2 = clusters[idx2];

    // Merge c2 into c1
    const mergedIndices = [...c1.indices, ...c2.indices];
    const newCentroid = new Float64Array(vectors[0].length);
    for (const idx of mergedIndices) {
      const v = vectors[idx];
      for (let d = 0; d < v.length; d++) {
        newCentroid[d] += v[d];
      }
    }
    let norm = 0;
    for (let d = 0; d < newCentroid.length; d++) norm += newCentroid[d] * newCentroid[d];
    norm = Math.sqrt(norm) || 1;
    for (let d = 0; d < newCentroid.length; d++) newCentroid[d] /= norm;

    c1.indices = mergedIndices;
    c1.centroid = newCentroid;
    clusters.splice(idx2, 1);
  }

  const assignments = new Array(n).fill(0);
  clusters.forEach((c, clusterIdx) => {
    for (const docIdx of c.indices) {
      assignments[docIdx] = clusterIdx;
    }
  });

  return assignments;
}


