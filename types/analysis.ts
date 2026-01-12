import type { Stance } from "./nlp";
import type { GraphNode, GraphLink } from "./graph";
import type { AnchorAxis } from "./anchor-axes";

export interface SentenceRecord {
  id: string;
  juror: string;
  sentence: string;
  stance: Stance;
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
  shortLabel?: string;
  summary?: string;
  size: number; 
  topTerms: string[];
  keyphrases?: string[];
  representativeSentences?: string[];
  weight?: number; // Optional total weight
}

export interface ConceptSet {
  cut: "primary" | "detail" | number;
  assignments: number[];
  centroids: Float64Array[];
  stableIds: string[];
  parentMap?: Record<number, number>;
  unitType?: "sentence" | "chunk";
}

export interface AnalysisResult {
  jurors: string[];
  concepts: Concept[]; // Backward compat - defaults to primary layer
  primaryConcepts?: Concept[];
  detailConcepts?: Concept[];
  conceptHierarchy?: Record<string, string[]>; // primaryId -> detailIds[]
  conceptSets?: ConceptSet[];
  sentences: SentenceRecord[];
  jurorVectors: Record<string, Record<string, number>>; // juror -> conceptId -> weight (Primary)
  jurorVectorsDetail?: Record<string, Record<string, number>>; // juror -> conceptId -> weight (Detail)
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
  chunks?: ContextualUnit[];
  chunkAssignments?: string[];
}
