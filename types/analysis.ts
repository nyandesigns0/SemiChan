import type { Stance, JurorBlock } from "./nlp";
import type { GraphNode, GraphLink } from "./graph";
import type { AnchorAxis } from "./anchor-axes";
import type { ExportAnalysisParams } from "@/components/inspector/export-types";

export interface SentenceRecord {
  id: string;
  juror: string;
  sentence: string;
  stance: Stance;
  sourceTags: string[];
  commentId?: string;
  conceptId?: string;
  conceptMembership?: Array<{ conceptId: string; weight: number }>;
  chunkIds?: string[];
}

export interface AnalysisCheckpoint {
  id: string;
  label: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ContextualUnit {
  id: string;
  sentences: string[];
  sentenceIndices: number[];
  text: string;
}

export interface Concept {
  id: string; 
  stableId?: string;
  label: string; 
  title?: string;
  labelSource?: ConceptLabelSource;
  isFallback?: boolean;
  shortLabel?: string;
  summary?: string;
  size: number; 
  topTerms: string[];
  keyphrases?: string[];
  representativeSentences?: string[];
  weight?: number; // Optional total weight (soft mass)
  count?: number; // Optional total count (hard count)
  labelQuality?: {
    score: number;
    passed: boolean;
    violations: string[];
    needsReview: boolean;
  };
}

export type ConceptLabelSource = "llm" | "template" | "seed";

export interface ConceptCountPolicyResult {
  adjustedK: number;
  requiresHierarchy: boolean;
  reasoning: string;
}

export interface SemanticMergeSummary {
  mergedCount: number;
  details: Array<{ from: number; to: number; similarity: number }>;
}

export interface ConceptSet {
  cut: "primary" | "detail" | number;
  assignments: number[];
  centroids: Float64Array[];
  stableIds: string[];
  parentMap?: Record<number, number>;
  unitType?: "sentence" | "chunk";
}

export interface SeedLeaderboardEntry {
  seed: number;
  score: number;
  maxClusterShare: number;
  microClusters: number;
  stability: number;
  coherence?: number;
  separation?: number;
  labelability?: number;
}

export interface AnalysisResult {
  runId?: string;
  jurors: string[];
  concepts: Concept[]; // Backward compat - defaults to primary layer
  primaryConcepts?: Concept[];
  detailConcepts?: Concept[];
  conceptHierarchy?: Record<string, string[]>; // primaryId -> detailIds[]
  conceptSets?: ConceptSet[];
  sentences: SentenceRecord[];
  jurorVectors: Record<string, Record<string, number>>; // juror -> conceptId -> weight (Primary)
  jurorVectorsDetail?: Record<string, Record<string, number>>; // juror -> conceptId -> weight (Detail)
  jurorCounts?: Record<string, Record<string, number>>; // juror -> conceptId -> count (Primary)
  jurorCountsDetail?: Record<string, Record<string, number>>; // juror -> conceptId -> count (Detail)
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    totalJurors: number;
    totalSentences: number;
    totalConcepts: number;
    stanceCounts: Record<Stance, number>;
  };
  recommendedK?: number;
  kSearchMetrics?: Array<{
    k: number;
    score: number;
    quality?: any;
    silhouette?: number;
    maxClusterShare?: number;
    stabilityScore?: number;
    valid: boolean;
  }>;
  autoKReasoning?: string;
  clusteringMode?: "kmeans" | "hierarchical";
  checkpoints?: AnalysisCheckpoint[];
  requestedNumDimensions?: number;
  appliedNumDimensions?: number;
  dimensionMode?: "manual" | "elbow" | "threshold";
  varianceThreshold?: number;
  layoutNumDimensions?: number;        // Dimensions used for 3D geometry
  scanLimitUsed?: number;              // Max dimensions scanned (threshold mode)
  thresholdNotReached?: boolean;       // True if variance threshold not met
  maxVarianceAchieved?: number;        // Best cumulative variance achieved
  jurorTopTerms?: Record<string, string[]>; // juror name -> top terms array
  axisLabels?: Record<string, { 
    negative: string; 
    positive: string; 
    negativeId: string; 
    positiveId: string; 
    synthesizedNegative?: string; 
    synthesizedPositive?: string;
    name?: string;
    synthesizedName?: string;
  }>;
  varianceStats?: {
    totalVariance: number;
    explainedVariances: number[];
    cumulativeVariances: number[];
  };
  anchorAxes?: AnchorAxis[];
  anchorAxisScores?: {
    concepts: Record<string, Record<string, number>>;
    jurors: Record<string, Record<string, number>>;
  };
  finalKUsed?: number;
  autoKRecommended?: number;
  policyAdjustedK?: number;
  conceptCountPolicy?: ConceptCountPolicyResult;
  semanticMerge?: SemanticMergeSummary;
  analysisBuildId?: string;
  chunks?: ContextualUnit[];
  chunkAssignments?: string[];
  autoSeed?: boolean;
  seedChosen?: number;
  seedCandidatesEvaluated?: number;
  seedLeaderboard?: SeedLeaderboardEntry[];
  autoSeedReasoning?: string;
  autoUnit?: boolean;
  recommendedUnitMode?: { windowSize: number; label: string };
  unitSearchMetrics?: Array<{
    mode: { windowSize: number; label: string };
    score: number;
    coherence?: number;
    separation?: number;
    dominance?: number;
    kUsed?: number;
    reasoning?: string;
  }>;
  autoUnitReasoning?: string;
  autoWeights?: boolean;
  recommendedWeights?: { semanticWeight: number; frequencyWeight: number };
  weightSearchMetrics?: Array<{
    weights: { semanticWeight: number; frequencyWeight: number };
    score: number;
    evidenceCoherence?: number;
    evidenceSeparation?: number;
    dominance?: number;
    reasoning?: string;
  }>;
  autoWeightsReasoning?: string;
  minClusterSize?: number;
  minClusterSizeAuto?: boolean;
  minClusterSizeMerged?: number;
  minClusterSizeDetails?: {
    beforeSize: number;
    afterSize: number;
    mergedCount: number;
  };
  dominanceSplitApplied?: boolean;
  dominanceSplitDetails?: {
    primary?: { splitCount: number; originalSizes: number[]; newSizes: number[] };
    detail?: { splitCount: number; originalSizes: number[]; newSizes: number[] };
  };
  reportHealth?: import("@/lib/analysis/report-health").ReportHealth;
}

export interface SavedReportMetadata {
  stats: {
    jurors: number;
    sentences: number;
    concepts: number;
  };
  parameters: {
    kConcepts?: number;
    numDimensions?: number;
    clusteringMode?: "kmeans" | "hierarchical";
    autoK?: boolean;
  };
  anchorAxisCount?: number;
  hasAxisLabels?: boolean;
  model?: string;
}

/**
 * Minimal version of AnalysisResult for storage efficiency.
 * Strips recomputable/redundant data while preserving essential display information.
 */
export interface MinimalAnalysisResult {
  runId?: string;
  jurors: string[];
  concepts: Concept[]; // Backward compat - defaults to primary layer
  primaryConcepts?: Concept[];
  detailConcepts?: Concept[];
  conceptHierarchy?: Record<string, string[]>; // primaryId -> detailIds[]
  // conceptSets omitted - recomputed during analysis
  // sentences omitted - redundant (text in jurorBlocks), counts preserved in stats
  jurorVectors: Record<string, Record<string, number>>; // juror -> conceptId -> weight (Primary)
  jurorVectorsDetail?: Record<string, Record<string, number>>; // juror -> conceptId -> weight (Detail)
  jurorCounts?: Record<string, Record<string, number>>; // juror -> conceptId -> count (Primary)
  jurorCountsDetail?: Record<string, Record<string, number>>; // juror -> conceptId -> count (Detail)
  // nodes omitted - positions recomputed, only essential fields preserved in minimalNodes
  minimalNodes?: Array<{
    id: string;
    type: GraphNode["type"];
    label: string;
    size: number;
    meta?: Record<string, unknown>;
    pcValues?: number[];
    layer?: "primary" | "detail";
    parentConceptId?: string;
    childConceptIds?: string[];
    // x, y, z, fx, fy, fz omitted - recomputed by force simulation
  }>;
  // links omitted - recomputed from nodes/vectors
  stats: {
    totalJurors: number;
    totalSentences: number;
    totalConcepts: number;
    stanceCounts: Record<Stance, number>;
  };
  recommendedK?: number;
  // kSearchMetrics omitted - keep only summary
  autoKReasoning?: string;
  clusteringMode?: "kmeans" | "hierarchical";
  // checkpoints omitted - snapshots not needed for reports
  requestedNumDimensions?: number;
  appliedNumDimensions?: number;
  dimensionMode?: "manual" | "elbow" | "threshold";
  varianceThreshold?: number;
  layoutNumDimensions?: number;        // Dimensions used for 3D geometry
  scanLimitUsed?: number;              // Max dimensions scanned (threshold mode)
  thresholdNotReached?: boolean;       // True if variance threshold not met
  maxVarianceAchieved?: number;        // Best cumulative variance achieved
  // jurorTopTerms omitted - can be recomputed
  axisLabels?: Record<string, { 
    negative: string; 
    positive: string; 
    negativeId: string; 
    positiveId: string; 
    synthesizedNegative?: string; 
    synthesizedPositive?: string;
    name?: string;
    synthesizedName?: string;
  }>;
  varianceStats?: {
    totalVariance: number;
    explainedVariances: number[];
    cumulativeVariances: number[];
  };
  anchorAxes?: AnchorAxis[];
  anchorAxisScores?: {
    concepts: Record<string, Record<string, number>>;
    jurors: Record<string, Record<string, number>>;
  };
  finalKUsed?: number;
  autoKRecommended?: number;
  policyAdjustedK?: number;
  conceptCountPolicy?: ConceptCountPolicyResult;
  semanticMerge?: SemanticMergeSummary;
  analysisBuildId?: string;
  // chunks omitted - redundant, text in jurorBlocks
  // chunkAssignments omitted - can be recomputed
  autoSeed?: boolean;
  seedChosen?: number;
  seedCandidatesEvaluated?: number;
  // seedLeaderboard omitted - keep only summary (seedChosen)
  autoSeedReasoning?: string;
  autoUnit?: boolean;
  recommendedUnitMode?: { windowSize: number; label: string };
  // unitSearchMetrics omitted - keep only summary (recommendedUnitMode)
  autoUnitReasoning?: string;
  autoWeights?: boolean;
  recommendedWeights?: { semanticWeight: number; frequencyWeight: number };
  // weightSearchMetrics omitted - keep only summary (recommendedWeights)
  autoWeightsReasoning?: string;
  minClusterSize?: number;
  minClusterSizeAuto?: boolean;
  minClusterSizeMerged?: number;
  minClusterSizeDetails?: {
    beforeSize: number;
    afterSize: number;
    mergedCount: number;
  };
  dominanceSplitApplied?: boolean;
  dominanceSplitDetails?: {
    primary?: { splitCount: number; originalSizes: number[]; newSizes: number[] };
    detail?: { splitCount: number; originalSizes: number[]; newSizes: number[] };
  };
  reportHealth?: import("@/lib/analysis/report-health").ReportHealth;
}

export interface SavedReport {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  analysis: AnalysisResult | MinimalAnalysisResult;
  jurorBlocks: JurorBlock[];
  rawText?: string; // Optional - can be computed from jurorBlocks to save storage
  parameters: ExportAnalysisParams;
  metadata: SavedReportMetadata;
  isMinimal?: boolean; // Flag to indicate if analysis is minimal format
}
