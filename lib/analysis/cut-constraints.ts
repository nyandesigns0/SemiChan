import { SentenceRecord } from "../../types/analysis";
import { cosine } from "./tfidf";

export interface CutQualityParams {
  minEffectiveMassPerConcept?: number;
  minJurorSupportPerConcept?: number;
  maxJurorDominance?: number;
  imbalancePenaltyWeight?: number;
  redundancyPenaltyWeight?: number;
}

export interface CutQualityScore {
  isValid: boolean;
  violatingClusterIndices?: number[];
  score: number;
  penalties: {
    imbalance: number;
    redundancy: number;
    supportViolations: number;
    massViolations: number;
  };
  metrics: {
    effectiveMasses: number[];
    jurorSupport: number[];
    maxDominance: number[];
    redundancy: number;
  };
}

/**
 * Evaluate the quality of a cluster cut based on support, balance, and redundancy constraints.
 */
export function evaluateCutQuality(
  assignments: number[],
  sentences: SentenceRecord[],
  centroids: Float64Array[],
  params: CutQualityParams = {}
): CutQualityScore {
  const {
    minEffectiveMassPerConcept = 3,
    minJurorSupportPerConcept = 2,
    maxJurorDominance = 0.5,
    imbalancePenaltyWeight = 0.3,
    redundancyPenaltyWeight = 0.2
  } = params;

  const numClusters = centroids.length;
  if (numClusters === 0) {
    return {
      isValid: false,
      score: 0,
      penalties: { imbalance: 0, redundancy: 0, supportViolations: 0, massViolations: 0 },
      metrics: { effectiveMasses: [], jurorSupport: [], maxDominance: [], redundancy: 0 }
    };
  }

  // 1. Group sentences by cluster assignment to calculate mass and juror support
  const clusterJurorWeights: Map<number, Map<string, number>> = new Map();
  const clusterSentences: Map<number, number> = new Map();

  for (let i = 0; i < assignments.length; i++) {
    const clusterId = assignments[i];
    const juror = sentences[i].juror;
    
    // In hard assignment mode, mass is count (1.0 per sentence)
    const weight = 1.0; 

    if (!clusterJurorWeights.has(clusterId)) {
      clusterJurorWeights.set(clusterId, new Map());
    }
    const jurorWeights = clusterJurorWeights.get(clusterId)!;
    jurorWeights.set(juror, (jurorWeights.get(juror) || 0) + weight);
    
    clusterSentences.set(clusterId, (clusterSentences.get(clusterId) || 0) + weight);
  }

  const effectiveMasses: number[] = [];
  const jurorSupport: number[] = [];
  const maxDominances: number[] = [];
  let supportViolations = 0;
  let massViolations = 0;

  for (let i = 0; i < numClusters; i++) {
    const mass = clusterSentences.get(i) || 0;
    effectiveMasses.push(mass);
    
    const jurorMap = clusterJurorWeights.get(i) || new Map();
    const support = jurorMap.size;
    jurorSupport.push(support);
    
    let maxDom = 0;
    if (mass > 0) {
      for (const jurorWeight of jurorMap.values()) {
        maxDom = Math.max(maxDom, jurorWeight / mass);
      }
    }
    maxDominances.push(maxDom);

    if (support < minJurorSupportPerConcept) supportViolations++;
    if (mass < minEffectiveMassPerConcept) massViolations++;
  }

  const violatingClusterIndices = jurorSupport
    .map((support, index) => (support < minJurorSupportPerConcept ? index : -1))
    .filter((index) => index >= 0);

  // 2. Imbalance Penalty (Gini Coefficient of masses)
  const sortedMasses = [...effectiveMasses].sort((a, b) => a - b);
  const n = numClusters;
  let gini = 0;
  if (n > 1) {
    const sumMasses = sortedMasses.reduce((a, b) => a + b, 0);
    if (sumMasses > 0) {
      let cumulativeSum = 0;
      for (let i = 0; i < n; i++) {
        cumulativeSum += sortedMasses[i];
        gini += cumulativeSum;
      }
      gini = (n + 1) / n - (2 * gini) / (n * sumMasses);
    } else {
        gini = 1.0; // Max imbalance if no mass
    }
  }
  const imbalancePenalty = gini;

  // 3. Redundancy Penalty (Pairwise centroid similarity)
  let maxRedundancy = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = cosine(centroids[i], centroids[j]);
      maxRedundancy = Math.max(maxRedundancy, sim);
      count++;
    }
  }
  
  // Penalty if maxRedundancy > 0.85
  const redundancyPenalty = maxRedundancy > 0.85 ? (maxRedundancy - 0.85) / 0.15 : 0;

  // 4. Final Score
  // Base score 1.0, minus weighted penalties
  const score = Math.max(0, 1.0 - (imbalancePenalty * imbalancePenaltyWeight) - (redundancyPenalty * redundancyPenaltyWeight));

  // A cut is invalid if any concept has too little support or mass
  const isValid = supportViolations === 0 && massViolations === 0;

  return {
    isValid,
    violatingClusterIndices,
    score,
    penalties: {
      imbalance: imbalancePenalty,
      redundancy: redundancyPenalty,
      supportViolations,
      massViolations
    },
    metrics: {
      effectiveMasses,
      jurorSupport,
      maxDominance: maxDominances,
      redundancy: maxRedundancy
    }
  };
}






