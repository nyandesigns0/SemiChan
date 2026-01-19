import { cosine } from "./tfidf";
import { SentenceRecord } from "../../types/analysis";
import { computeCentroids } from "./concept-centroids";

/**
 * Merges concepts that are semantically very similar.
 * Helps prevent "concept explosion" where near-duplicate concepts are created.
 */
export function semanticMergeConcepts(
  centroids: Float64Array[],
  assignments: number[],
  vectors: Float64Array[],
  options: {
    similarityThreshold?: number; // default 0.85
    maxConceptSize?: number; // avoid merging if both are already large
  } = {}
): {
  assignments: number[];
  mergedCount: number;
  details: Array<{ from: number; to: number; similarity: number }>;
} {
  const threshold = options.similarityThreshold ?? 0.85;
  const maxConceptSize = options.maxConceptSize ?? assignments.length * 0.3; // Cap at 30% of corpus
  
  const K = centroids.length;
  if (K <= 1) return { assignments, mergedCount: 0, details: [] };

  const clusterSizes = new Array(K).fill(0);
  assignments.forEach(a => {
    if (a >= 0 && a < K) clusterSizes[a]++;
  });

  const mergedPairs: Array<{ from: number; to: number; similarity: number }> = [];
  const mergedInto = new Map<number, number>();

  // Compare all pairs of centroids
  for (let i = 0; i < K; i++) {
    if (mergedInto.has(i)) continue;
    
    for (let j = i + 1; j < K; j++) {
      if (mergedInto.has(j)) continue;

      const similarity = cosine(centroids[i], centroids[j]);
      if (similarity > threshold) {
        // Size constraint: don't merge if both are already quite large
        if (clusterSizes[i] > maxConceptSize && clusterSizes[j] > maxConceptSize) {
          continue;
        }

        // Merge smaller into larger
        const source = clusterSizes[i] < clusterSizes[j] ? i : j;
        const target = source === i ? j : i;
        
        mergedInto.set(source, target);
        mergedPairs.push({ from: source, to: target, similarity });
        
        // Update size of target
        clusterSizes[target] += clusterSizes[source];
        clusterSizes[source] = 0;
        
        // If we merged into i, we can't merge i into something else in this pass
        // But we can merge other things into i.
        if (source === i) break;
      }
    }
  }

  if (mergedPairs.length === 0) {
    return { assignments, mergedCount: 0, details: [] };
  }

  // Update assignments
  const newAssignments = assignments.map(a => {
    let current = a;
    while (mergedInto.has(current)) {
      current = mergedInto.get(current)!;
    }
    return current;
  });

  // Re-normalize assignments to be contiguous 0...K'
  const finalAssignments: number[] = [];
  const idMap = new Map<number, number>();
  let nextId = 0;

  for (const a of newAssignments) {
    if (!idMap.has(a)) {
      idMap.set(a, nextId++);
    }
    finalAssignments.push(idMap.get(a)!);
  }

  return {
    assignments: finalAssignments,
    mergedCount: mergedPairs.length,
    details: mergedPairs
  };
}
