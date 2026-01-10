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
  
  // New clustering options
  clusteringMode?: "kmeans" | "hierarchical" | "hybrid";
  autoK?: boolean;
  kMin?: number;
  kMax?: number;
  softMembership?: boolean;
  softTopN?: number;
  cutType?: "count" | "granularity";
  granularityPercent?: number;
}

export interface AnalyzeResponse {
  analysis: AnalysisResult;
}
