import { kmeansCosine } from "./kmeans";
import { cosine } from "./tfidf";
import { evaluateCutQuality, CutQualityParams } from "./cut-constraints";
import { computeCentroids } from "./concept-centroids";
import { embedSentences } from "./sentence-embeddings";
import { createSentenceWindows } from "./contextual-units";
import { rankEvidenceForConcept } from "./evidence-ranker";
import { SentenceRecord } from "../../types/analysis";
import type { JurorBlock, BM25Model } from "../../types/nlp";

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
  qualityParams?: CutQualityParams;
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

function normalizeAssignments(assignments: number[]): number[] {
  const map = new Map<number, number>();
  let nextId = 0;
  return assignments.map((a) => {
    if (a < 0) return a;
    if (!map.has(a)) map.set(a, nextId++);
    return map.get(a)!;
  });
}

export function mergeSmallClusters(
  assignments: number[],
  vectors: Float64Array[],
  minSize: number
): { assignments: number[]; mergedCount: number; details: Array<{ from: number; to: number; size: number }> } {
  if (assignments.length === 0 || vectors.length === 0) {
    return { assignments: assignments.slice(), mergedCount: 0, details: [] };
  }

  const workingAssignments = assignments.slice();
  const clusterMembers = new Map<number, number[]>();
  for (let i = 0; i < workingAssignments.length; i++) {
    const id = workingAssignments[i];
    if (id === undefined || id < 0) continue;
    const list = clusterMembers.get(id) || [];
    list.push(i);
    clusterMembers.set(id, list);
  }

  const clusterIds = Array.from(clusterMembers.keys()).sort((a, b) => a - b);
  if (clusterIds.length <= 1) {
    return { assignments: workingAssignments, mergedCount: 0, details: [] };
  }

  const maxClusterId = Math.max(...clusterIds);
  const centroids = computeCentroids(vectors, workingAssignments, maxClusterId + 1);
  const sizes = new Map<number, number>();
  clusterIds.forEach((id) => sizes.set(id, clusterMembers.get(id)?.length ?? 0));

  const details: Array<{ from: number; to: number; size: number }> = [];
  let mergedCount = 0;

  for (const clusterId of clusterIds) {
    const clusterSize = sizes.get(clusterId) ?? 0;
    if (clusterSize >= minSize) continue;
    if (clusterSize === 0) continue;

    const eligible = clusterIds.filter((id) => id !== clusterId && (sizes.get(id) ?? 0) >= minSize);
    let targetId: number | undefined;
    let bestSim = -Infinity;

    if (eligible.length === 0) {
      const fallback = clusterIds
        .filter((id) => id !== clusterId)
        .sort((a, b) => (sizes.get(b) ?? 0) - (sizes.get(a) ?? 0))[0];
      targetId = fallback;
    } else {
      const sourceCentroid = centroids[clusterId];
      for (const candidate of eligible) {
        const sim = cosine(sourceCentroid, centroids[candidate]);
        if (sim > bestSim) {
          bestSim = sim;
          targetId = candidate;
        }
      }
    }

    if (targetId === undefined) continue;
    const members = clusterMembers.get(clusterId) || [];
    for (const idx of members) {
      workingAssignments[idx] = targetId;
    }
    sizes.set(targetId, (sizes.get(targetId) ?? 0) + members.length);
    sizes.set(clusterId, 0);
    mergedCount++;
    details.push({ from: clusterId, to: targetId, size: clusterSize });
  }

  return { assignments: normalizeAssignments(workingAssignments), mergedCount, details };
}

export function selectOptimalMinClusterSize(
  vectors: Float64Array[],
  candidates: number[],
  assignments?: number[]
): number {
  if (vectors.length === 0) return candidates[0] ?? 2;
  const resolvedCandidates = Array.from(new Set(candidates))
    .map((c) => Math.max(2, Math.round(c)))
    .sort((a, b) => a - b);
  if (resolvedCandidates.length === 0) return 2;

  const baseAssignments =
    assignments && assignments.length === vectors.length
      ? assignments
      : kmeansCosine(
          vectors,
          Math.max(2, Math.min(20, Math.round(Math.sqrt(vectors.length)))),
          20,
          42
        ).assignments;

  let bestCandidate = resolvedCandidates[0];
  let bestScore = -Infinity;

  for (const minSize of resolvedCandidates) {
    const mergeResult = mergeSmallClusters(baseAssignments, vectors, minSize);
    const mergedAssignments = mergeResult.assignments;
    const k = new Set(mergedAssignments).size;
    if (k <= 0) continue;

    const centroids = computeCentroids(vectors, mergedAssignments, k);
    const clusterSizes = new Array(k).fill(0);
    for (const a of mergedAssignments) {
      if (a >= 0 && a < k) clusterSizes[a] += 1;
    }
    const maxClusterShare =
      clusterSizes.length > 0 ? Math.max(...clusterSizes) / Math.max(1, vectors.length) : 0;
    const coherence = computeCoherence(vectors, mergedAssignments, centroids);
    const separation = computeSeparation(centroids);
    const labelability = computeLabelability(clusterSizes, vectors.length);
    const balancePenalty = maxClusterShare > 0.35 ? Math.pow(maxClusterShare - 0.35, 2) : 0;

    const score = coherence * 0.45 + separation * 0.35 + labelability * 0.2 - balancePenalty * 0.25;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = minSize;
    }
  }

  return bestCandidate;
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
  options: SeedScoreWeights & { 
    perturbations?: number;
    sentences?: SentenceRecord[];
    qualityParams?: CutQualityParams;
  } = {}
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

  // Calculate juror support penalty if sentences are provided
  let supportPenalty = 0;
  if (options.sentences) {
    const quality = evaluateCutQuality(assignments, options.sentences, centroids, options.qualityParams);
    if (!quality.isValid) {
      // Scale penalty by number of violations
      const violations = (quality.penalties.supportViolations || 0) + (quality.penalties.massViolations || 0);
      supportPenalty = violations * 0.1; 
    }
  }

  const score = scoreClusteringOutcome(
    { coherence, separation, stability, labelability, maxClusterShare, microClusters, k: effectiveK },
    options
  ) - supportPenalty;

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
    const result = evaluateSeed(vectors, k, candidate, { 
      ...weights, 
      perturbations,
      sentences,
      qualityParams: options.qualityParams 
    });
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
      qualityParams: _qualityParams,
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

  let reason = "Highest Auto-Seed composite score";
  const validMetrics = metrics.filter(m => m.valid);
  const candidatesStr = validMetrics.map(m => m.k).join(", ");

  if (metrics.length > 1) {
    const winner = metrics.find(m => m.k === bestK);
    const objective = `Objective: maximize score (coherence + separation + stability - penalties) with k-penalty=${kPenalty.toFixed(4)} and epsilon=${epsilon.toFixed(3)}`;
    
    if (winner) {
      const candidatesInfo = `Candidates: [${candidatesStr}]`;
      const sortedByScore = [...validMetrics].sort((a, b) => b.score - a.score);
      const topScorer = sortedByScore[0];
      
      if (topScorer.k !== winner.k) {
        const diff = topScorer.score - winner.score;
        if ((winner.maxClusterShare ?? 0) < (topScorer.maxClusterShare ?? 0)) {
          reason = `${objective}. ${candidatesInfo}. K=${winner.k} selected over K=${topScorer.k} due to better distribution (${((winner.maxClusterShare ?? 0) * 100).toFixed(1)}% vs ${((topScorer.maxClusterShare ?? 0) * 100).toFixed(1)}% max share) within epsilon range (score diff=${diff.toFixed(4)})`;
        } else {
          reason = `${objective}. ${candidatesInfo}. K=${winner.k} selected as a more parsimonious or stable model within epsilon range of K=${topScorer.k} (score diff=${diff.toFixed(4)})`;
        }
      } else {
        const runnerUp = sortedByScore[1];
        if (runnerUp) {
          reason = `${objective}. ${candidatesInfo}. K=${winner.k} selected with score ${winner.score.toFixed(3)} (runner-up K=${runnerUp.k} score ${runnerUp.score.toFixed(3)})`;
        } else {
          reason = `${objective}. ${candidatesInfo}. K=${winner.k} selected as the best scoring model.`;
        }
      }
    }
  }

  return {
    recommendedK: bestK,
    recommendedSeed: bestSeed,
    metrics,
    reason,
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
  const candidatesStr = validMetrics.map(m => m.k).join(", ");
  const objective = `Objective: balance silhouette (${(1 - qualityWeight).toFixed(1)}) and quality (${qualityWeight.toFixed(1)}) minus complex/dominance penalties (k-penalty=${kPenalty}, epsilon=${epsilon})`;

  // If no valid K found, fallback to kMin but warn?
  if (validMetrics.length === 0) {
    return { recommendedK: kMin, metrics, reason: `${objective}. No valid K found among tested values; falling back to kMin=${kMin}.` };
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

  let reason = `${objective}. Candidates: [${candidatesStr}]. K=${bestK} selected as best scoring model.`;

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
      reason = `${objective}. Candidates: [${candidatesStr}]. Elbow detection: K=${bestK} selected because adding more clusters yielded diminishing returns (drop after K=${bestK})`;
    } else if (elbowCandidate) {
      bestK = elbowCandidate.k;
      bestScore = elbowCandidate.score;
      reason = `${objective}. Candidates: [${candidatesStr}]. Upper-bound hit; choosing elbow at K=${bestK}`;
    }
  }

  // Prefer smaller K within epsilon generally
  const smallerWithinEpsilon = validMetrics
    .filter((m) => m.k < bestK && bestScore - m.score <= epsilon)
    .sort((a, b) => a.k - b.k);
  if (smallerWithinEpsilon.length > 0) {
    const originalBestK = bestK;
    bestK = smallerWithinEpsilon[0].k;
    bestScore = smallerWithinEpsilon[0].score;
    reason = `${objective}. Candidates: [${candidatesStr}]. Simplicity: K=${bestK} preferred over K=${originalBestK} (scores within epsilon ${epsilon})`;
  }

  // If we have a clear runner up, add it to reason if it's still generic
  if (reason.includes("best scoring model") && validMetrics.length > 1) {
    const sorted = [...validMetrics].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const runnerUp = sorted[1];
    if (winner.score - runnerUp.score > epsilon) {
       reason = `${objective}. Candidates: [${candidatesStr}]. K=${winner.k} (score ${winner.score.toFixed(3)}) significantly outperformed runner-up K=${runnerUp.k} (score ${runnerUp.score.toFixed(3)})`;
    }
  }

  return { recommendedK: bestK, metrics, reason };
}

export async function evaluateUnitMode(
  jurorBlocks: JurorBlock[],
  sentences: SentenceRecord[],
  docs: string[],
  kRange: { min: number; max: number },
  seed: number,
  options: {
    unitModes?: Array<{ windowSize: number; label: string }>;
    onProgress?: (mode: string, progress: number, total: number) => void;
    onLog?: (message: string) => void;
  } = {}
): Promise<{
  recommendedMode: { windowSize: number; label: string };
  unitSearchMetrics: Array<{
    mode: { windowSize: number; label: string };
    score: number;
    coherence?: number;
    separation?: number;
    dominance?: number;
    kUsed?: number;
    reasoning?: string;
  }>;
  reasoning: string;
}> {
  const unitModes = options.unitModes ?? [
    { windowSize: 1, label: "sentence-only" },
    { windowSize: 3, label: "window-3 (A1)" },
    { windowSize: 5, label: "window-5 (A2)" },
  ];

  const embeddingCache = new Map<number, { vectors: Float64Array[] }>();
  const unitSearchMetrics: Array<{
    mode: { windowSize: number; label: string };
    score: number;
    coherence?: number;
    separation?: number;
    dominance?: number;
    kUsed?: number;
    reasoning?: string;
  }> = [];

  const jurorCount = jurorBlocks.length;
  const sentenceCount = sentences.length;

  let bestMode = unitModes[0];
  let bestScore = -Infinity;
  let bestDominance = 1;

  for (const mode of unitModes) {
    const windowSize = Math.max(1, Math.round(mode.windowSize));
    const units = createSentenceWindows(docs, windowSize, 1);
    const unitTexts = units.length > 0 ? units.map((u) => u.text) : docs.slice();

    let cached = embeddingCache.get(windowSize);
    if (!cached) {
      const embeddingResult = await embedSentences(unitTexts);
      cached = { vectors: embeddingResult.vectors };
      embeddingCache.set(windowSize, cached);
    }

    const vectors = cached.vectors;
    if (vectors.length < 2) {
      const dominance = vectors.length === 0 ? 0 : 1;
      unitSearchMetrics.push({
        mode,
        score: 0,
        coherence: 0,
        separation: 0,
        dominance,
        kUsed: vectors.length,
        reasoning: "Insufficient vectors for clustering",
      });
      continue;
    }

    const maxK = Math.max(2, Math.min(kRange.max, vectors.length - 1));
    const minK = Math.max(2, Math.min(kRange.min, maxK));
    const totalK = Math.max(0, maxK - minK + 1);

    let modeBestScore = -Infinity;
    let modeBestK = minK;
    let modeBestCoherence = 0;
    let modeBestSeparation = 0;
    let modeBestDominance = 1;

    for (let k = minK; k <= maxK; k++) {
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
      const score = scoreClusteringOutcome(
        {
          coherence,
          separation,
          labelability,
          maxClusterShare,
          microClusters,
          k: effectiveK,
        },
        {
          dominanceThreshold: 0.35,
        }
      );

      options.onProgress?.(mode.label, k - minK + 1, totalK);

      if (
        score > modeBestScore + 1e-6 ||
        (Math.abs(score - modeBestScore) <= 1e-6 &&
          (maxClusterShare < modeBestDominance ||
            (maxClusterShare === modeBestDominance && k < modeBestK)))
      ) {
        modeBestScore = score;
        modeBestK = k;
        modeBestCoherence = coherence;
        modeBestSeparation = separation;
        modeBestDominance = maxClusterShare;
      }
    }

    unitSearchMetrics.push({
      mode,
      score: modeBestScore,
      coherence: modeBestCoherence,
      separation: modeBestSeparation,
      dominance: modeBestDominance,
      kUsed: modeBestK,
      reasoning: `Best K=${modeBestK} (score=${modeBestScore.toFixed(4)})`,
    });

    if (
      modeBestScore > bestScore + 1e-6 ||
      (Math.abs(modeBestScore - bestScore) <= 1e-6 && modeBestDominance < bestDominance)
    ) {
      bestScore = modeBestScore;
      bestMode = mode;
      bestDominance = modeBestDominance;
    }
  }

  const reasoning = `Evaluated ${unitSearchMetrics.length} modes across ${sentenceCount} sentences and ${jurorCount} jurors; selected ${bestMode.label}.`;
  options.onLog?.(reasoning);

  return {
    recommendedMode: bestMode,
    unitSearchMetrics,
    reasoning,
  };
}

export function evaluateWeightRange(
  sentences: SentenceRecord[],
  semanticVectors: Float64Array[],
  chunkRecords: SentenceRecord[],
  centroids: Float64Array[],
  assignments: number[],
  bm25Model: BM25Model,
  conceptTopTerms: Record<number, string[]>,
  k: number,
  options: {
    weightCandidates?: Array<{ semanticWeight: number; frequencyWeight: number }>;
    onProgress?: (evaluated: number, total: number) => void;
    clusterSentenceIndicesByConcept?: Record<number, number[]>;
  } = {}
): {
  recommendedWeights: { semanticWeight: number; frequencyWeight: number };
  weightSearchMetrics: Array<{
    weights: { semanticWeight: number; frequencyWeight: number };
    score: number;
    evidenceCoherence?: number;
    evidenceSeparation?: number;
    dominance?: number;
    reasoning?: string;
  }>;
  reasoning: string;
} {
  const weightCandidates = options.weightCandidates ?? [
    { semanticWeight: 0.9, frequencyWeight: 0.1 },
    { semanticWeight: 0.8, frequencyWeight: 0.2 },
    { semanticWeight: 0.7, frequencyWeight: 0.3 },
    { semanticWeight: 0.6, frequencyWeight: 0.4 },
  ];

  const sentenceTexts = sentences.map((s) => s.sentence);
  const clusterSizes: number[] = Array.from({ length: k }, () => 0);
  for (const a of assignments) {
    if (a >= 0 && a < k) clusterSizes[a] += 1;
  }
  const maxClusterShare =
    clusterSizes.length > 0 ? Math.max(...clusterSizes) / Math.max(1, assignments.length) : 0;
  const microClusters = clusterSizes.filter((s) => s < 3).length;
  const labelability = computeLabelability(clusterSizes, Math.max(1, assignments.length));

  const weightSearchMetrics: Array<{
    weights: { semanticWeight: number; frequencyWeight: number };
    score: number;
    evidenceCoherence?: number;
    evidenceSeparation?: number;
    dominance?: number;
    reasoning?: string;
  }> = [];

  let bestWeights = weightCandidates[0];
  let bestScore = -Infinity;
  let bestCoherence = 0;

  const resolveClusterIndices = (conceptIndex: number): number[] => {
    if (options.clusterSentenceIndicesByConcept?.[conceptIndex]) {
      return options.clusterSentenceIndicesByConcept[conceptIndex];
    }
    if (assignments.length === sentences.length) {
      return assignments
        .map((a, idx) => (a === conceptIndex ? idx : -1))
        .filter((idx) => idx >= 0);
    }
    if (assignments.length === chunkRecords.length) {
      return [];
    }
    return [];
  };

  weightCandidates.forEach((weights, idx) => {
    const evidenceIndices = new Set<number>();
    let evidenceTotal = 0;
    let evidenceCoherenceSum = 0;
    let evidenceCoherenceCount = 0;

    for (let c = 0; c < k; c++) {
      const clusterSentenceIndices = resolveClusterIndices(c);
      if (clusterSentenceIndices.length === 0) continue;

      const rankedEvidence = rankEvidenceForConcept(
        sentenceTexts,
        clusterSentenceIndices,
        centroids[c],
        semanticVectors,
        bm25Model,
        conceptTopTerms[c] ?? [],
        weights,
        3
      );

      rankedEvidence.forEach((entry) => {
        const vec = semanticVectors[entry.index];
        if (vec) {
          evidenceCoherenceSum += Math.max(0, cosine(vec, centroids[c]));
          evidenceCoherenceCount += 1;
        }
        evidenceIndices.add(entry.index);
      });
      evidenceTotal += rankedEvidence.length;
    }

    const evidenceCoherence =
      evidenceCoherenceCount > 0 ? evidenceCoherenceSum / evidenceCoherenceCount : 0;
    const evidenceSeparation = evidenceTotal > 0 ? evidenceIndices.size / evidenceTotal : 0;

    const score = scoreClusteringOutcome(
      {
        coherence: evidenceCoherence,
        separation: evidenceSeparation,
        labelability,
        maxClusterShare,
        microClusters,
        k,
      },
      {
        dominanceThreshold: 0.35,
      }
    );

    weightSearchMetrics.push({
      weights,
      score,
      evidenceCoherence,
      evidenceSeparation,
      dominance: maxClusterShare,
      reasoning: `score=${score.toFixed(4)}, evidence=${evidenceCoherence.toFixed(3)}`,
    });

    options.onProgress?.(idx + 1, weightCandidates.length);

    if (
      score > bestScore + 1e-6 ||
      (Math.abs(score - bestScore) <= 1e-6 && evidenceCoherence > bestCoherence)
    ) {
      bestScore = score;
      bestWeights = weights;
      bestCoherence = evidenceCoherence;
    }
  });

  const reasoning = `Evaluated ${weightCandidates.length} weight pairs; selected ${bestWeights.semanticWeight}/${bestWeights.frequencyWeight}.`;

  return {
    recommendedWeights: bestWeights,
    weightSearchMetrics,
    reasoning,
  };
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
