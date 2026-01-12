import { cosine } from "./tfidf";
import { SentenceRecord } from "../../types/analysis";
import { evaluateCutQuality, CutQualityParams } from "./cut-constraints";
import { computeCentroids } from "./concept-centroids";

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
        const sim = cosine(clusters[i].centroid, clusters[j].centroid);
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
        const sim = cosine(clusters[i].centroid, clusters[j].centroid);
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
 * Cut dendrogram by distance threshold based on granularity percentage,
 * with support for quality constraints.
 * 
 * @param dendrogram The pre-built dendrogram tree
 * @param vectors Original vectors (for computing centroids if needed)
 * @param sentences Corresponding sentence records
 * @param granularityPercent 0-100, where 0% = finest (most clusters), 100% = coarsest (fewest clusters)
 * @param qualityParams Optional constraints for cut evaluation
 * @returns Cluster assignments array
 */
export function cutDendrogramByThreshold(
  dendrogram: Dendrogram,
  vectors: Float64Array[],
  sentences: SentenceRecord[],
  granularityPercent: number,
  qualityParams: CutQualityParams = {}
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

  // Iteratively adjust threshold to find a valid cut if necessary
  let currentGranularity = granularityPercent;
  let assignments: number[] = [];
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    // Convert granularity percent to distance threshold
    // 0% = minDistance (finest, most clusters)
    // 100% = maxDistance (coarsest, fewest clusters)
    const threshold = minDistance + (maxDistance - minDistance) * (currentGranularity / 100);

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
    assignments = finalAssignments;

    // Quality check
    const centroids = computeCentroids(vectors, assignments, nextFinalId);
    const quality = evaluateCutQuality(assignments, sentences, centroids, qualityParams);

    if (quality.isValid) {
      break;
    }

    // Adjust granularity: if invalid, we likely need fewer, larger clusters
    // So we increase granularityPercent (move towards maxDistance)
    currentGranularity += 10;
    if (currentGranularity > 100) break;
    attempts++;
  }

  return assignments;
}

export interface TwoLayerCut {
  primaryAssignments: number[];
  detailAssignments: number[];
  parentMap: Record<number, number>; // detail cluster index -> primary cluster index
  detailGranularities?: Record<number, number>; // primary cluster id -> chosen detail granularity
}

/**
 * Perform a two-layer hierarchical cut on the dendrogram.
 * 1. Primary cut identifies high-level themes with strong support.
 * 2. For each primary theme, a secondary cut identifies granular sub-themes.
 * 
 * @param dendrogram The pre-built dendrogram tree for the full corpus
 * @param vectors Original vectors
 * @param sentences Corresponding sentence records
 * @param primaryParams Constraints for the primary layer
 * @param detailParams Constraints for the detail layer
 * @param primaryGranularity Coarseness for primary layer (default 70%)
 * @param detailGranularity Fineness for detail layer (default 30%)
 * @returns Primary and detail assignments with mapping
 */
export function cutDendrogramTwoLayer(
  dendrogram: Dendrogram,
  vectors: Float64Array[],
  sentences: SentenceRecord[],
  primaryParams: CutQualityParams,
  detailParams: CutQualityParams,
  primaryGranularity: number = 70,
  detailGranularity: number = 30,
  detailAutoRange?: { min: number; max: number; step?: number }
): TwoLayerCut {
  const n = vectors.length;
  if (n === 0) {
    return { primaryAssignments: [], detailAssignments: [], parentMap: {} };
  }

  // 1. Get primary assignments using coarse threshold and quality constraints
  const primaryAssignments = cutDendrogramByThreshold(
    dendrogram, 
    vectors, 
    sentences, 
    primaryGranularity, 
    primaryParams
  );
  
  const primaryClusterIds = Array.from(new Set(primaryAssignments)).sort((a, b) => a - b);
  const numPrimary = primaryClusterIds.length;

  // 2. For each primary cluster, perform a detail cut
  const detailAssignments = new Array(n).fill(-1);
  const parentMap: Record<number, number> = {};
  const detailGranularities: Record<number, number> = {};
  let nextDetailId = 0;

  for (let pIdx = 0; pIdx < numPrimary; pIdx++) {
    const pId = primaryClusterIds[pIdx];
    // Indices of sentences in this primary cluster
    const clusterIndices = [];
    for (let i = 0; i < n; i++) {
      if (primaryAssignments[i] === pId) {
        clusterIndices.push(i);
      }
    }
    
    if (clusterIndices.length === 0) continue;

    // If only one sentence, it's its own detail cluster
    if (clusterIndices.length === 1) {
      const globalDetailId = nextDetailId++;
      detailAssignments[clusterIndices[0]] = globalDetailId;
      parentMap[globalDetailId] = pId;
      continue;
    }

    const clusterVectors = clusterIndices.map(i => vectors[i]);
    const clusterSentences = clusterIndices.map(i => sentences[i]);

    // Build sub-dendrogram for this cluster
    const subDendrogram = buildDendrogram(clusterVectors);

    let chosenGranularity = detailGranularity;
    let subAssignments: number[] = [];

    if (detailAutoRange) {
      const detailEval = findOptimalDetailGranularity(
        subDendrogram,
        clusterVectors,
        clusterSentences,
        detailParams,
        detailAutoRange.min,
        detailAutoRange.max,
        detailAutoRange.step ?? 5
      );
      chosenGranularity = detailEval.granularity;
      subAssignments = detailEval.assignments;
    } else {
      // Cut sub-dendrogram with finer granularity
      subAssignments = cutDendrogramByThreshold(
        subDendrogram,
        clusterVectors,
        clusterSentences,
        detailGranularity,
        detailParams
      );
    }

    const subClusterIds = Array.from(new Set(subAssignments)).sort((a, b) => a - b);
    
    // Map sub-assignments to global detailAssignments
    const subIdToGlobalMap = new Map<number, number>();
    for (const subId of subClusterIds) {
      const globalDetailId = nextDetailId++;
      subIdToGlobalMap.set(subId, globalDetailId);
      parentMap[globalDetailId] = pId;
      detailGranularities[pId] = chosenGranularity;
    }

    for (let i = 0; i < clusterIndices.length; i++) {
      detailAssignments[clusterIndices[i]] = subIdToGlobalMap.get(subAssignments[i])!;
    }
  }

  return { primaryAssignments, detailAssignments, parentMap, detailGranularities };
}

export function findOptimalDetailGranularity(
  dendrogram: Dendrogram,
  vectors: Float64Array[],
  sentences: SentenceRecord[],
  detailParams: CutQualityParams,
  minGranularity: number,
  maxGranularity: number,
  step: number = 5
): { granularity: number; assignments: number[] } {
  const candidates: number[] = [];
  for (let g = minGranularity; g <= maxGranularity; g += step) {
    candidates.push(g);
  }
  if (candidates.length === 0) {
    candidates.push(30);
  }

  let bestGranularity = candidates[0];
  let bestScore = -Infinity;
  let bestAssignments: number[] = [];

  for (const gran of candidates) {
    const assignments = cutDendrogramByThreshold(
      dendrogram,
      vectors,
      sentences,
      gran,
      detailParams
    );
    const numClusters = new Set(assignments).size;
    if (numClusters <= 1) {
      continue;
    }
    const centroids = computeCentroids(vectors, assignments, numClusters);
    const quality = evaluateCutQuality(assignments, sentences, centroids, detailParams);
    if (!quality.isValid) continue;
    if (quality.score > bestScore) {
      bestScore = quality.score;
      bestGranularity = gran;
      bestAssignments = assignments;
    }
  }

  if (bestAssignments.length === 0) {
    bestAssignments = cutDendrogramByThreshold(
      dendrogram,
      vectors,
      sentences,
      bestGranularity,
      detailParams
    );
  }

  return { granularity: bestGranularity, assignments: bestAssignments };
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
