import type { JurorBlock } from "./nlp";
import type { AnalysisResult } from "./analysis";

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
  /** Weight for semantic embeddings (0.0-1.0, default 0.7) */
  semanticWeight?: number;
  /** Weight for frequency/BM25 vectors (0.0-1.0, default 0.3) */
  frequencyWeight?: number;
  /** Number of dimensions for visualization (2-10, default 3) */
  numDimensions?: number;
  /** Method for selecting dimensions: manual, elbow, or threshold */
  dimensionMode?: "manual" | "elbow" | "threshold";
  /** Variance threshold for threshold method (0.0-1.0, default 0.9) */
  varianceThreshold?: number;
  
  // New clustering options
  clusteringMode?: "kmeans" | "hierarchical" | "hybrid";
  autoK?: boolean;
  kMin?: number;
  kMax?: number;
  softMembership?: boolean;
  softTopN?: number;
  cutType?: "count" | "granularity";
  granularityPercent?: number;
  clusterSeed?: number;
  /** LLM model to use for analysis (e.g., GPT-4o) */
  model?: string;
}

export interface AnalyzeResponse {
  analysis: AnalysisResult;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AxisLabelsRequest {
  axisLabels: Record<string, { 
    negative: string; 
    positive: string; 
    negativeContext: { keywords: string[], sentences: string[] }; 
    positiveContext: { keywords: string[], sentences: string[] };
    name?: string;
  }>;
  model?: string;
}

export interface AxisLabelsResponse {
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
}

export interface SynthesizeRequest extends ConceptBrief {
  model?: string;
}

export interface SynthesisResponse {
  concept_title: string;
  concept_one_liner: string;
  is_fallback: boolean;
  usage?: TokenUsage;
}
