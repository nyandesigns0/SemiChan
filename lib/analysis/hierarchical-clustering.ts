import { hybridCosine } from "./hybrid-vectors";

/**
 * Dendrogram structure: tree of merges from agglomerative clustering
 */
export interface Dendrogram {
  merges: Array<{ left: number; right: number; distance: number; size: number }>;
}

/**
 * Agglomerative Hierarchical Clustering using Cosine Similarity
 * Simple O(n^2) implementation suitable for < 500 sentences
 */
export function buildDendrogram(vectors: Float64Array[]): Dendrogram {
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

/**
 * Cut dendrogram by distance threshold based on granularity percentage
 * @param dendrogram The pre-built dendrogram tree
 * @param vectors Original vectors (for computing centroids if needed)
 * @param granularityPercent 0-100, where 0% = finest (most clusters), 100% = coarsest (fewest clusters)
 * @returns Cluster assignments array
 */
export function cutDendrogramByThreshold(
  dendrogram: Dendrogram,
  vectors: Float64Array[],
  granularityPercent: number
): number[] {
  const n = vectors.length;
  if (n === 0) return [];
  if (dendrogram.merges.length === 0) {
    // No merges means each vector is its own cluster
    return Array.from({ length: n }, (_, i) => i);
  }

  // Find min and max distances in the dendrogram
  let minDistance = Infinity;
  let maxDistance = -Infinity;
  for (const merge of dendrogram.merges) {
    if (merge.distance < minDistance) minDistance = merge.distance;
    if (merge.distance > maxDistance) maxDistance = merge.distance;
  }

  // Handle edge case where all distances are the same
  if (minDistance === maxDistance) {
    // All merges happen at the same distance, return all in one cluster
    return new Array(n).fill(0);
  }

  // Convert granularity percent to distance threshold
  // 0% = minDistance (finest, most clusters)
  // 100% = maxDistance (coarsest, fewest clusters)
  const threshold = minDistance + (maxDistance - minDistance) * (granularityPercent / 100);

  // Union-Find data structure to track cluster membership
  const parent = new Array(n + dendrogram.merges.length).fill(-1);
  const clusterMap = new Map<number, number[]>(); // cluster id -> vector indices

  // Initialize: each vector is its own cluster
  for (let i = 0; i < n; i++) {
    parent[i] = i;
    clusterMap.set(i, [i]);
  }

  // Process merges up to the threshold
  let nextClusterId = n;
  for (const merge of dendrogram.merges) {
    if (merge.distance > threshold) {
      // Stop merging at this threshold
      break;
    }

    // Find root clusters for left and right
    const leftRoot = findRoot(merge.left, parent);
    const leftIndices = clusterMap.get(leftRoot) || [];
    const rightRoot = findRoot(merge.right, parent);
    const rightIndices = clusterMap.get(rightRoot) || [];

    // Merge clusters
    parent[leftRoot] = nextClusterId;
    parent[rightRoot] = nextClusterId;
    parent[nextClusterId] = nextClusterId;

    clusterMap.set(nextClusterId, [...leftIndices, ...rightIndices]);
    clusterMap.delete(leftRoot);
    if (leftRoot !== rightRoot) {
      clusterMap.delete(rightRoot);
    }

    nextClusterId++;
  }

  // Compress paths and assign final cluster IDs
  const finalAssignments = new Array(n).fill(-1);
  const clusterIdMap = new Map<number, number>();
  let nextFinalId = 0;

  for (let i = 0; i < n; i++) {
    const root = findRoot(i, parent);
    if (!clusterIdMap.has(root)) {
      clusterIdMap.set(root, nextFinalId++);
    }
    finalAssignments[i] = clusterIdMap.get(root)!;
  }

  return finalAssignments;
}

/**
 * Find root with path compression
 */
function findRoot(x: number, parent: number[]): number {
  if (parent[x] !== x && parent[x] !== -1) {
    parent[x] = findRoot(parent[x], parent);
  }
  return parent[x] === -1 ? x : parent[x];
}

