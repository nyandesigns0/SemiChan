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
  bestSeed?: number;
  seedScore?: number;
  seedLeaderboard?: SeedEvaluationResult[];
};

export type EvaluateKRangeOptions = {
  dominanceThreshold?: number;
  dominancePenaltyWeight?: number;
  kPenalty?: number;
  epsilon?: number;
  enableStability?: boolean;
  stabilityWeight?: number;
};

export type SeedScoreWeights = {
  coherenceWeight?: number;
  separationWeight?: number;
  stabilityWeight?: number;
  labelabilityWeight?: number;
  dominancePenaltyWeight?: number;
  microClusterPenaltyWeight?: number;
  labelPenaltyWeight?: number;
  dominanceThreshold?: number;
};

export interface SeedEvaluationResult {
  seed: number;
  score: number;
  assignments: number[];
  centroids: Float64Array[];
  stability: number;
  coherence?: number;
  separation?: number;
  labelability?: number;
  maxClusterShare: number;
  microClusters: number;
}

export interface SelectBestSeedOptions extends SeedScoreWeights {
  k: number;
  candidateCount?: number;
  perturbations?: number;
  baseSeed?: number;
  evidenceRankingParams?: { semanticWeight: number; frequencyWeight: number };
  extraHashComponent?: string;
  onProgress?: (evaluated: number, total: number, best?: SeedEvaluationResult, k?: number) => void;
}

export function computeDataHash(params: {
  sentences: SentenceRecord[];
  jurorNames?: string[];
  evidenceRankingParams?: { semanticWeight: number; frequencyWeight: number };
  extra?: string;
}): number {
  const jurorNames = (params.jurorNames ?? params.sentences.map((s) => s.juror))
    .filter(Boolean)
    .map((j) => j.trim().toLowerCase())
    .sort();
  const normalizedSentences = [...params.sentences]
    .map((s) => (s.sentence || "").trim().toLowerCase())
    .sort();

  const semanticWeight = params.evidenceRankingParams?.semanticWeight ?? 0;
  const frequencyWeight = params.evidenceRankingParams?.frequencyWeight ?? 0;

  const payload = `${jurorNames.join("|")}::${normalizedSentences.join("||")}::${semanticWeight.toFixed(
    3
  )}:${frequencyWeight.toFixed(3)}${params.extra ? `::${params.extra}` : ""}`;

  // Simple FNV-1a style hash for determinism
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return hash >>> 0;
}

export function generateCandidateSeeds(hash: number, count: number, offset: number = 0): number[] {
  const normalized = Math.abs((hash + offset) % 1_000_000);
  const start = normalized === 0 ? 42 : normalized;
  return Array.from({ length: Math.max(1, count) }, (_, i) => start + i);
}

export function computeCoherence(
  vectors: Float64Array[],
  assignments: number[],
  centroids: Float64Array[]
): number {
  if (vectors.length === 0 || centroids.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < vectors.length; i++) {
    const clusterIdx = assignments[i] ?? 0;
    const centroid = centroids[clusterIdx];
    if (!centroid) continue;
    total += cosine(vectors[i], centroid);
  }
  return total / vectors.length;
}

export function computeSeparation(centroids: Float64Array[]): number {
  if (centroids.length < 2) return 0;
  const comb = (n: number) => (n * (n - 1)) / 2;
  const pairs = comb(centroids.length);
  let totalDistance = 0;
  for (let i = 0; i < centroids.length; i++) {
    for (let j = i + 1; j < centroids.length; j++) {
      const sim = cosine(centroids[i], centroids[j]);
      const dist = (1 - sim) / 2; // normalize cosine distance into [0,1]
      totalDistance += dist;
    }
  }
  return pairs > 0 ? totalDistance / pairs : 0;
}

export function computeLabelability(clusterSizes: number[], total: number): number {
  if (clusterSizes.length === 0 || total === 0) return 0;
  const proportions = clusterSizes
    .map((s) => s / total)
    .filter((p) => Number.isFinite(p) && p > 0);
  if (proportions.length === 0) return 0;

  const entropy =
    proportions.length > 1
      ? -proportions.reduce((acc, p) => acc + p * Math.log(p), 0) / Math.log(proportions.length)
      : 0;
  const maxShare = Math.max(...proportions);
  const microRatio = clusterSizes.filter((s) => s < 3).length / Math.max(1, clusterSizes.length);
  const balanceScore = 1 - Math.abs(maxShare - 1 / Math.max(1, clusterSizes.length));
  const diversityScore = 1 - entropy; // peaked distributions are more labelable

  const labelability = 0.5 * balanceScore + 0.3 * diversityScore + 0.2 * (1 - microRatio);
  return Math.max(0, Math.min(1, labelability));
}

function computeStability(
  vectors: Float64Array[],
  k: number,
  seed: number,
  baseAssignments: number[],
  perturbations: number
): number {
  if (perturbations <= 0 || vectors.length === 0) return 1;
  const dropCount = Math.floor(vectors.length * 0.1);
  if (dropCount <= 0) return 1;

  let totalAri = 0;
  let runs = 0;
  for (let p = 0; p < perturbations; p++) {
    const stride = Math.max(2, Math.floor(vectors.length / Math.max(1, dropCount)));
    const keptVectors: Float64Array[] = [];
    const keptIndices: number[] = [];
    let dropped = 0;

    for (let i = 0; i < vectors.length; i++) {
      const shouldDrop = dropped < dropCount && (i + p) % stride === 0;
      if (shouldDrop) {
        dropped++;
        continue;
      }
      keptVectors.push(vectors[i]);
      keptIndices.push(i);
    }

    if (keptVectors.length <= k) continue;

    const km = kmeansCosine(keptVectors, k, 20, seed + p + 1);
    const pertAssignments = km.assignments;
    const baseSubset = keptIndices.map((idx) => baseAssignments[idx]);
    const ari = adjustedRandIndex(baseSubset, pertAssignments);
    if (Number.isFinite(ari)) {
      totalAri += ari;
      runs++;
    }
  }

  return runs > 0 ? totalAri / runs : 0;
}

export function scoreClusteringOutcome(
  metrics: {
    coherence?: number;
    separation?: number;
    stability?: number;
    labelability?: number;
    maxClusterShare: number;
    microClusters: number;
    k: number;
  },
  weights: SeedScoreWeights = {}
): number {
  const {
    coherenceWeight = 0.3,
    separationWeight = 0.25,
    stabilityWeight = 0.2,
    labelabilityWeight = 0.05,
    dominancePenaltyWeight = 0.15,
    microClusterPenaltyWeight = 0.05,
    labelPenaltyWeight = 0.05,
    dominanceThreshold = 0.35,
  } = weights;

  const dominancePenalty =
    metrics.maxClusterShare > dominanceThreshold
      ? Math.pow(metrics.maxClusterShare - dominanceThreshold, 2)
      : 0;
  const microPenalty = metrics.microClusters / Math.max(1, metrics.k);
  const labelPenalty = metrics.labelability !== undefined ? 1 - metrics.labelability : 0.5;

  return (
    (metrics.coherence ?? 0) * coherenceWeight +
    (metrics.separation ?? 0) * separationWeight +
    (metrics.stability ?? 0) * stabilityWeight +
    (metrics.labelability ?? 0) * labelabilityWeight -
    dominancePenalty * dominancePenaltyWeight -
    microPenalty * microClusterPenaltyWeight -
    labelPenalty * labelPenaltyWeight
  );
}

export function evaluateSeed(
  vectors: Float64Array[],
  k: number,
  seed: number,
  options: SeedScoreWeights & { perturbations?: number } = {}
): SeedEvaluationResult {
  const km = kmeansCosine(vectors, k, 25, seed);
  const assignments = km.assignments;
  const centroids = km.centroids;
  const effectiveK = Math.max(1, km.k || k);

  const clusterSizes: number[] = Array.from({ length: effectiveK }, () => 0);
  for (const a of assignments) {
    clusterSizes[a] = (clusterSizes[a] ?? 0) + 1;
  }

  const maxClusterShare =
    clusterSizes.length > 0 ? Math.max(...clusterSizes) / Math.max(1, vectors.length) : 0;
  const microClusters = clusterSizes.filter((s) => s < 3).length;
  const coherence = computeCoherence(vectors, assignments, centroids);
  const separation = computeSeparation(centroids);
  const labelability = computeLabelability(clusterSizes, vectors.length);
  const stability = computeStability(
    vectors,
    effectiveK,
    seed,
    assignments,
    options.perturbations ?? 3
  );

  const score = scoreClusteringOutcome(
    { coherence, separation, stability, labelability, maxClusterShare, microClusters, k: effectiveK },
    options
  );

  return {
    seed,
    score,
    assignments,
    centroids,
    stability,
    coherence,
    separation,
    labelability,
    maxClusterShare,
    microClusters,
  };
}

export function selectBestSeed(
  vectors: Float64Array[],
  sentences: SentenceRecord[],
  options: SelectBestSeedOptions
): {
  best: SeedEvaluationResult;
  leaderboard: SeedEvaluationResult[];
  dataHash: number;
  candidates: number[];
  reasoning: string;
} {
  const {
    k,
    candidateCount = 32,
    baseSeed = 42,
    perturbations = 3,
    extraHashComponent,
    onProgress,
    ...weights
  } = options;

  const dataHash = computeDataHash({
    sentences,
    evidenceRankingParams: options.evidenceRankingParams,
    extra: extraHashComponent,
  });

  const candidates = generateCandidateSeeds(dataHash + baseSeed, candidateCount, k);
  const leaderboard: SeedEvaluationResult[] = [];
  let best: SeedEvaluationResult | undefined;

  candidates.forEach((candidate, idx) => {
    const result = evaluateSeed(vectors, k, candidate, { ...weights, perturbations });
    leaderboard.push(result);

    if (
      !best ||
      result.score > best.score + 1e-6 ||
      (Math.abs(result.score - best.score) <= 1e-6 &&
        (result.maxClusterShare < best.maxClusterShare ||
          (result.maxClusterShare === best.maxClusterShare && result.seed < best.seed)))
    ) {
      best = result;
    }

    onProgress?.(idx + 1, candidates.length, best, k);
  });

  leaderboard.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.maxClusterShare !== b.maxClusterShare) return a.maxClusterShare - b.maxClusterShare;
    return a.seed - b.seed;
  });

  const resolvedBest = best ?? leaderboard[0];
  return {
    best: resolvedBest,
    leaderboard,
    dataHash,
    candidates,
    reasoning: `Evaluated ${leaderboard.length} seeds; selected ${resolvedBest.seed} (score=${resolvedBest.score.toFixed(
      4
    )})`,
  };
}

export function evaluateKRangeWithAutoSeed(
  vectors: Float64Array[],
  sentences: SentenceRecord[],
  kMin: number = 4,
  kMax: number = 20,
  seed: number = 42,
  _qualityParams: CutQualityParams = {},
  options: EvaluateKRangeOptions = {},
  seedOptions: Partial<Omit<SelectBestSeedOptions, "k">> = {}
): {
  recommendedK: number;
  recommendedSeed: number;
  metrics: KRangeMetric[];
  reason?: string;
  seedLeaderboard?: SeedEvaluationResult[];
} {
  const {
    kPenalty = 0.001,
    epsilon = 0.02,
    dominanceThreshold = seedOptions.dominanceThreshold,
    dominancePenaltyWeight = seedOptions.dominancePenaltyWeight,
  } = options;

  if (vectors.length < kMin) {
    const fallbackSeed = seed;
    return {
      recommendedK: Math.max(1, vectors.length),
      recommendedSeed: fallbackSeed,
      metrics: [],
      reason: "Corpus too small for range",
      seedLeaderboard: [],
    };
  }

  const metrics: KRangeMetric[] = [];
  const actualKMax = Math.max(kMin, Math.min(kMax, vectors.length - 1));

  let bestK = kMin;
  let bestSeed = seed;
  let bestScore = -Infinity;
  let winningLeaderboard: SeedEvaluationResult[] | undefined;

  for (let k = kMin; k <= actualKMax; k++) {
    const seedResult = selectBestSeed(vectors, sentences, {
      k,
      baseSeed: seed,
      candidateCount: seedOptions.candidateCount,
      perturbations: seedOptions.perturbations ?? 3,
      evidenceRankingParams: seedOptions.evidenceRankingParams,
      extraHashComponent: `k=${k}`,
      coherenceWeight: seedOptions.coherenceWeight,
      separationWeight: seedOptions.separationWeight,
      stabilityWeight: seedOptions.stabilityWeight,
      labelabilityWeight: seedOptions.labelabilityWeight,
      dominancePenaltyWeight: dominancePenaltyWeight,
      microClusterPenaltyWeight: seedOptions.microClusterPenaltyWeight,
      labelPenaltyWeight: seedOptions.labelPenaltyWeight,
      dominanceThreshold: dominanceThreshold,
      onProgress: seedOptions.onProgress,
    });

    const penalizedScore = seedResult.best.score - k * kPenalty;
    const entry: KRangeMetric = {
      k,
      score: penalizedScore,
      silhouette: seedResult.best.coherence,
      maxClusterShare: seedResult.best.maxClusterShare,
      stabilityScore: seedResult.best.stability,
      quality: { score: seedResult.best.score },
      valid: Number.isFinite(seedResult.best.score),
      bestSeed: seedResult.best.seed,
      seedScore: seedResult.best.score,
      seedLeaderboard: seedResult.leaderboard,
    };
    metrics.push(entry);

    if (penalizedScore > bestScore + epsilon) {
      bestScore = penalizedScore;
      bestK = k;
      bestSeed = seedResult.best.seed;
      winningLeaderboard = seedResult.leaderboard;
    } else if (Math.abs(penalizedScore - bestScore) <= epsilon) {
      if (seedResult.best.maxClusterShare < (metrics.find((m) => m.k === bestK)?.maxClusterShare ?? 1)) {
        bestK = k;
        bestSeed = seedResult.best.seed;
        winningLeaderboard = seedResult.leaderboard;
      } else if (k < bestK) {
        bestK = k;
        bestSeed = seedResult.best.seed;
        winningLeaderboard = seedResult.leaderboard;
      }
    }
  }

  return {
    recommendedK: bestK,
    recommendedSeed: bestSeed,
    metrics,
    reason: "Highest Auto-Seed composite score",
    seedLeaderboard: winningLeaderboard,
  };
}

/**
 * Evaluate a range of K values using both silhouette-like separation scores
 * and hierarchical cut quality constraints.
 * 
 * @param vectors - Array of vectors (embeddings for the units being clustered)
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
  const comb2 = (n: number) => (n * (n - 1)) / 2;

  // Weight for balancing silhouette vs quality score
  const qualityWeight = 0.4;

  for (let k = kMin; k <= actualKMax; k++) {
    let aggregateSilhouette = 0;
    let aggregateQuality = 0;
    let stabilityScore = 0;
    const validAssignments: number[][] = [];
    let maxClusterShare = 0;

    let validRuns = 0;

    for (const runSeed of seeds) {
      const result = kmeansCosine(vectors, k, 25, runSeed);
      let runValid = true;

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
        runValid = false;
      }

      // 2. Calculate quality score using constraints
      const quality = runValid
        ? evaluateCutQuality(
            result.assignments,
            sentences,
            result.centroids,
            qualityParams
          )
        : undefined;

      if (!quality?.isValid) {
        runValid = false;
      }

      if (runValid) {
        validRuns++;
        aggregateSilhouette += silhouetteScore;
        aggregateQuality += quality!.score;
        validAssignments.push(result.assignments);
      }
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

    // Stability score via adjusted Rand index across valid runs
    if (enableStability && validAssignments.length > 1) {
      let totalAgreement = 0;
      let comparisons = 0;
      for (let i = 0; i < validAssignments.length; i++) {
        for (let j = i + 1; j < validAssignments.length; j++) {
          totalAgreement += adjustedRandIndex(validAssignments[i], validAssignments[j], comb2);
          comparisons++;
        }
      }
      stabilityScore = comparisons > 0 ? totalAgreement / comparisons : 0;
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
      valid: validRuns > 0,
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
 * Adjusted Rand Index between two assignment arrays.
 * Handles label permutation invariance and normalizes for chance.
 */
function adjustedRandIndex(
  a: number[],
  b: number[],
  comb2: (n: number) => number = (n) => (n * (n - 1)) / 2
): number {
  if (a.length !== b.length || a.length === 0) return 0;

  const n = a.length;
  const contingency = new Map<string, number>();
  const countA = new Map<number, number>();
  const countB = new Map<number, number>();

  for (let i = 0; i < n; i++) {
    const ca = a[i];
    const cb = b[i];
    countA.set(ca, (countA.get(ca) ?? 0) + 1);
    countB.set(cb, (countB.get(cb) ?? 0) + 1);
    const key = `${ca}::${cb}`;
    contingency.set(key, (contingency.get(key) ?? 0) + 1);
  }

  let sumComb = 0;
  contingency.forEach((cnt) => {
    sumComb += comb2(cnt);
  });

  let sumAComb = 0;
  countA.forEach((cnt) => {
    sumAComb += comb2(cnt);
  });

  let sumBComb = 0;
  countB.forEach((cnt) => {
    sumBComb += comb2(cnt);
  });

  const totalComb = comb2(n);
  if (totalComb === 0) return 0;

  const expectedIndex = (sumAComb * sumBComb) / totalComb;
  const maxIndex = 0.5 * (sumAComb + sumBComb);
  const denom = maxIndex - expectedIndex;
  if (denom === 0) return 0;

  return (sumComb - expectedIndex) / denom;
}
