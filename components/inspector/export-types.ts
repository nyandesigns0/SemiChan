import type { JurorBlock } from "@/types/nlp";

export interface ExportAnalysisParams {
  kConcepts: number;
  minEdgeWeight: number;
  similarityThreshold: number;
  evidenceRankingParams?: { semanticWeight: number; frequencyWeight: number };
  clusteringMode: "kmeans" | "hierarchical";
  autoK: boolean;
  autoKStability?: boolean;
  autoKDominanceThreshold?: number;
  autoKKPenalty?: number;
  autoKEpsilon?: number;
  autoMinClusterSize?: boolean;
  minClusterSize?: number;
  autoDominanceCap?: boolean;
  autoDominanceCapThreshold?: number;
  autoUnit?: boolean;
  autoWeights?: boolean;
  autoSeed?: boolean;
  clusterSeed: number;
  seedCandidates?: number;
  seedPerturbations?: number;
  seedCoherenceWeight?: number;
  seedSeparationWeight?: number;
  seedStabilityWeight?: number;
  seedDominancePenaltyWeight?: number;
  seedMicroClusterPenaltyWeight?: number;
  seedLabelPenaltyWeight?: number;
  seedDominanceThreshold?: number;
  kMinOverride?: number;
  kMaxOverride?: number;
  softMembership: boolean;
  cutType: "count" | "granularity";
  granularityPercent: number;
  numDimensions: number;
  appliedNumDimensions: number;
  dimensionMode: "manual" | "elbow" | "threshold";
  varianceThreshold: number;
  showAxes: boolean;
  showGraph: boolean;
  enableAxisLabelAI: boolean;
  autoSynthesize: boolean;
  recommendedUnitMode?: { windowSize: number; label: string };
  recommendedWeights?: { semanticWeight: number; frequencyWeight: number };
}

export interface ExportLogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  data?: unknown;
}

export interface RawDataExportContext {
  rawText: string;
  jurorBlocks: JurorBlock[];
  analysisParams: ExportAnalysisParams;
  logs: ExportLogEntry[];
  apiCallCount: number;
  apiCostTotal: number;
  selectedModel: string;
  exportTimestamp?: string | null;
  autoSeed?: boolean;
  seedChosen?: number;
  seedCandidatesEvaluated?: number;
}
