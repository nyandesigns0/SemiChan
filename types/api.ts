import type { JurorBlock, DesignerBlock, DesignerAnalysisResult } from "./nlp";
import type { AnalysisResult } from "./analysis";
import type { AnchorAxis } from "./anchor-axes";

export interface SegmentRequest {
  text: string;
}

export interface SegmentResponse {
  blocks: JurorBlock[];
}

export interface AnalyzeRequest {
  blocks: JurorBlock[];
  kConcepts: number;
  similarityThreshold: number;
  progressId?: string;
  /** Evidence ranking parameters (semantic vs frequency salience) */
  evidenceRankingParams?: { semanticWeight: number; frequencyWeight: number };
  /** Number of dimensions for visualization (2-10, default 3) */
  numDimensions?: number;
  /** Method for selecting dimensions: manual, elbow, or threshold */
  dimensionMode?: "manual" | "elbow" | "threshold";
  /** Variance threshold for threshold method (0.0-1.0, default 0.9) */
  varianceThreshold?: number;
  /** Max dimensions to scan in threshold mode (default 30) */
  maxScanDimensions?: number;
  
  // New clustering options
  clusteringMode?: "kmeans" | "hierarchical";
  autoK?: boolean;
  autoUnit?: boolean;
  autoWeights?: boolean;
  kMin?: number;
  kMax?: number;
  autoKStability?: boolean;
  autoKDominanceThreshold?: number;
  autoKKPenalty?: number;
  autoKEpsilon?: number;
  autoMinClusterSize?: boolean;
  minClusterSize?: number;
  autoDominanceCap?: boolean;
  autoDominanceCapThreshold?: number;
  softMembership?: boolean;
  softTopN?: number;
  cutType?: "count" | "granularity";
  granularityPercent?: number;
  clusterSeed?: number;
  softMembershipParams?: {
    temperature?: number;
    minWeight?: number;
    entropyCap?: number;
  };
  autoSeed?: boolean;
  seedCandidates?: number;
  seedPerturbations?: number;
  seedCoherenceWeight?: number;
  seedSeparationWeight?: number;
  seedStabilityWeight?: number;
  seedDominancePenaltyWeight?: number;
  seedMicroClusterPenaltyWeight?: number;
  seedLabelPenaltyWeight?: number;
  seedDominanceThreshold?: number;
  cutQualityParams?: {
    minEffectiveMassPerConcept?: number;
    minJurorSupportPerConcept?: number;
    maxJurorDominance?: number;
    imbalancePenaltyWeight?: number;
    redundancyPenaltyWeight?: number;
  };
  /** LLM model to use for analysis (e.g., GPT-4o) */
  model?: string;
  anchorAxes?: AnchorAxis[];
  enableLabelQualityGate?: boolean;
  semanticMergeThreshold?: number;
  conceptCountPolicyEnabled?: boolean;
  jurorNormalizationEnabled?: boolean;
  reportHealthEnabled?: boolean;
}

export interface AnalyzeResponse {
  analysis: AnalysisResult;
  logs?: Array<{ type: string; message: string; data?: any }>;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AxisSynthesisRequest {
  axisLabels: Record<string, {
    negative: string;
    positive: string;
    negativeContext: { keywords: string[]; sentences: string[] };
    positiveContext: { keywords: string[]; sentences: string[] };
    name?: string;
  }>;
  model?: string;
  analysis?: AnalysisResult;
}

export interface AxisSynthesisResponse {
  axisLabels: Record<string, {
    negative: string;
    positive: string;
    synthesizedNegative: string;
    synthesizedPositive: string;
    name?: string;
    synthesizedName?: string;
  }>;
  usage?: TokenUsage;
}

export interface ConceptBrief {
  id: string;
  label_seed: string;
  top_ngrams: string[];
  evidence_sentences: string[];
  stance_mix: {
    praise: number;
    critique: number;
    suggestion: number;
    neutral: number;
  };
  concept_share_pct?: number;
  centroid_semantic_terms?: string[];
  juror_contribution?: string;
  related_axes_scores?: string;
}

export interface ConceptSynthesisRequest extends ConceptBrief {
  model?: string;
}

export interface ConceptSynthesisResponse {
  concept_title: string;
  concept_one_liner: string;
  is_fallback: boolean;
  usage?: TokenUsage;
}

export interface DesignerAnalyzeRequest {
  blocks: DesignerBlock[];
  kConcepts?: number;
  similarityThreshold?: number;
  clusterSeed?: number;
  imageThreshold?: number;
}

export interface DesignerAnalyzeResponse {
  analysis: DesignerAnalysisResult;
}

export interface AlignRequest {
  jurorAnalysis: AnalysisResult;
  designerAnalysis: DesignerAnalysisResult;
  threshold?: number;
}

export interface AlignResponse {
  links: import("./graph").GraphLink[];
  alignmentStats: {
    totalJurorConcepts: number;
    totalDesignerConcepts: number;
    threshold: number;
    linkCount: number;
  };
}
