import type { Stance } from "./nlp";
import type { GraphNode, GraphLink } from "./graph";

export interface SentenceRecord {
  id: string;
  juror: string;
  sentence: string;
  stance: Stance;
  conceptId?: string;
  conceptMembership?: Array<{ conceptId: string; weight: number }>;
}

export interface AnalysisCheckpoint {
  id: string;
  label: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface AnalysisResult {
  jurors: string[];
  concepts: { 
    id: string; 
    label: string; 
    shortLabel?: string;
    summary?: string;
    size: number; 
    topTerms: string[];
    representativeSentences?: string[];
  }[];
  sentences: SentenceRecord[];
  jurorVectors: Record<string, Record<string, number>>; // juror -> conceptId -> weight
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    totalJurors: number;
    totalSentences: number;
    totalConcepts: number;
    stanceCounts: Record<Stance, number>;
  };
  recommendedK?: number;
  kSearchMetrics?: Array<{ k: number; score: number }>;
  clusteringMode?: "kmeans" | "hierarchical" | "hybrid";
  checkpoints?: AnalysisCheckpoint[];
  requestedNumDimensions?: number;
  appliedNumDimensions?: number;
  dimensionMode?: "manual" | "elbow" | "threshold";
  varianceThreshold?: number;
  jurorTopTerms?: Record<string, string[]>; // juror name -> top terms array
  axisLabels?: Record<string, { 
    negative: string; 
    positive: string; 
    negativeId: string; 
    positiveId: string; 
    synthesizedNegative?: string; 
    synthesizedPositive?: string 
  }>;
  varianceStats?: {
    totalVariance: number;
    explainedVariances: number[];
    cumulativeVariances: number[];
  };
}
