import { kmeansCosine } from "./kmeans";
import { cosine } from "./tfidf";
import { evaluateCutQuality, CutQualityParams } from "./cut-constraints";
import { SentenceRecord } from "../../types/analysis";

export type KRangeMetric = {
  k: number;
  score: number;
  quality?: any;
  silhouette?: number;
  maxClusterShare?: number;
  stabilityScore?: number;
  valid: boolean;
};

export type EvaluateKRangeOptions = {
  dominanceThreshold?: number;
  dominancePenaltyWeight?: number;
  kPenalty?: number;
  epsilon?: number;
  enableStability?: boolean;
  stabilityWeight?: number;
};

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
  qualityParams: CutQualityParams = {},
  options: EvaluateKRangeOptions = {}
): { recommendedK: number; metrics: KRangeMetric[]; reason?: string } {
  const {
    dominanceThreshold = 0.35,
    dominancePenaltyWeight = 0.5,
    kPenalty = 0.001,
    epsilon = 0.02,
    enableStability = false,
    stabilityWeight = 0.15,
  } = options;

  if (vectors.length < kMin) {
    return { recommendedK: Math.max(1, vectors.length), metrics: [], reason: "Corpus too small for range" };
  }

  const metrics: KRangeMetric[] = [];
  const actualKMax = Math.max(kMin, Math.min(kMax, vectors.length - 1));

  const seeds = enableStability ? [seed, seed + 1, seed + 2] : [seed];

  // Weight for balancing silhouette vs quality score
  const qualityWeight = 0.4;

  for (let k = kMin; k <= actualKMax; k++) {
    let aggregateSilhouette = 0;
    let aggregateQuality = 0;
    let stabilityScore = 0;
    let validRuns = 0;
    let maxClusterShare = 0;
    let valid = true;

    const runAssignments: number[][] = [];

    for (const runSeed of seeds) {
      const result = kmeansCosine(vectors, k, 25, runSeed);
      runAssignments.push(result.assignments);

      // 1. Calculate silhouette-lite score
      let totalSilhouette = 0;
      let count = 0;

      const clusterSizes: Record<number, number> = {};

      for (let i = 0; i < vectors.length; i++) {
        const clusterIdx = result.assignments[i];
        clusterSizes[clusterIdx] = (clusterSizes[clusterIdx] ?? 0) + 1;
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

      // Track cluster share stats
      const sizes = Object.values(clusterSizes);
      if (sizes.length > 0) {
        const largest = Math.max(...sizes);
        maxClusterShare = Math.max(maxClusterShare, largest / vectors.length);
      }

      // Minimum cluster size rules
      const tooSmall = sizes.filter((s) => s < 3).length;
      if (sizes.some((s) => s < 2) || tooSmall / (sizes.length || 1) > 0.25) {
        valid = false;
        continue;
      }

      // 2. Calculate quality score using constraints
      const quality = evaluateCutQuality(
        result.assignments,
        sentences,
        result.centroids,
        qualityParams
      );

      if (!quality.isValid) {
        valid = false;
        continue;
      }

      validRuns++;
      aggregateSilhouette += silhouetteScore;
      aggregateQuality += quality.score;
    }

    if (validRuns === 0) {
      metrics.push({
        k,
        score: -1e6,
        silhouette: 0,
        quality: undefined,
        maxClusterShare,
        stabilityScore: 0,
        valid: false,
      });
      continue;
    }

    const avgSilhouette = aggregateSilhouette / validRuns;
    const avgQuality = aggregateQuality / validRuns;

    // Combined score: silhouette balances separation, quality balances support/redundancy
    const combinedScore = avgSilhouette * (1 - qualityWeight) + avgQuality * qualityWeight;

    // Stability score via average pairwise overlap between runs
    if (enableStability && runAssignments.length > 1) {
      let totalOverlap = 0;
      let comparisons = 0;
      for (let i = 0; i < runAssignments.length; i++) {
        for (let j = i + 1; j < runAssignments.length; j++) {
          totalOverlap += assignmentOverlap(runAssignments[i], runAssignments[j]);
          comparisons++;
        }
      }
      stabilityScore = comparisons > 0 ? totalOverlap / comparisons : 0;
    }

    // Dominance penalty
    let dominancePenalty = 0;
    if (maxClusterShare > dominanceThreshold) {
      const diff = maxClusterShare - dominanceThreshold;
      dominancePenalty = dominancePenaltyWeight * diff * diff;
    }

    // Complexity penalty and final score
    const penalizedScore = combinedScore
      - (k * kPenalty)
      - dominancePenalty
      + (enableStability ? stabilityScore * stabilityWeight : 0);

    metrics.push({
      k,
      score: penalizedScore,
      silhouette: avgSilhouette,
      maxClusterShare,
      stabilityScore: enableStability ? stabilityScore : undefined,
      quality: { score: avgQuality },
      valid,
    });
  }

  const validMetrics = metrics.filter((m) => m.valid && Number.isFinite(m.score));

  // If no valid K found, fallback to kMin but warn?
  if (validMetrics.length === 0) {
    return { recommendedK: kMin, metrics, reason: "No valid K found; fallback to minimum" };
  }

  // Find K with maximum score
  let bestK = validMetrics[0].k;
  let bestScore = validMetrics[0].score;

  for (const m of validMetrics) {
    if (m.score > bestScore + epsilon) {
      bestScore = m.score;
      bestK = m.k;
    } else if (Math.abs(m.score - bestScore) <= epsilon && m.k < bestK) {
      // Prefer simpler (smaller K) when scores are within epsilon
      bestK = m.k;
      bestScore = m.score;
    }
  }

  let reason = "Highest penalized score";

  // Elbow detection if we hit the cap
  if (bestK === actualKMax && validMetrics.length > 1) {
    const deltas: Array<{ k: number; delta: number }> = [];
    for (let i = 1; i < validMetrics.length; i++) {
      const delta = validMetrics[i].score - validMetrics[i - 1].score;
      deltas.push({ k: validMetrics[i].k, delta });
    }
    const largestDrop = deltas.reduce(
      (acc, cur) => (cur.delta < acc.delta ? cur : acc),
      { k: validMetrics[1].k, delta: Infinity }
    );
    const elbowCandidate = validMetrics.find((m) => m.k === largestDrop.k - 1);
    if (elbowCandidate && bestScore - elbowCandidate.score <= epsilon) {
      bestK = elbowCandidate.k;
      bestScore = elbowCandidate.score;
      reason = "Elbow detection near upper bound";
    } else if (elbowCandidate) {
      bestK = elbowCandidate.k;
      bestScore = elbowCandidate.score;
      reason = "Upper-bound hit; choosing elbow";
    }
  }

  // Prefer smaller K within epsilon generally
  const smallerWithinEpsilon = validMetrics
    .filter((m) => m.k < bestK && bestScore - m.score <= epsilon)
    .sort((a, b) => a.k - b.k);
  if (smallerWithinEpsilon.length > 0) {
    bestK = smallerWithinEpsilon[0].k;
    bestScore = smallerWithinEpsilon[0].score;
    reason = "Scores within epsilon; prefer simpler K";
  }

  return { recommendedK: bestK, metrics, reason };
}

/**
 * Compute average overlap between two assignment arrays as Jaccard on pairs.
 */
function assignmentOverlap(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let same = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) same++;
  }
  return same / a.length;
}

