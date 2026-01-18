import type { Concept, SentenceRecord } from "./analysis";
import type { GraphNode, GraphLink } from "./graph";

export type Stance = "praise" | "critique" | "suggestion" | "neutral";

export interface JurorBlock {
  juror: string;
  text: string;
}

export interface DesignerBlock {
  designer: string;
  text?: string;
  images: Array<{
    id: string;
    type: "file" | "url";
    data: string;
    embedding?: Float64Array;
  }>;
}

export interface TFIDFModel {
  vocab: string[];
  idf: Float64Array;
  vectors: Float64Array[]; // per doc
}

export interface KMeansResult {
  k: number;
  assignments: number[];
  centroids: Float64Array[];
}

/**
 * BM25 model for scoring n-grams by cross-juror frequency
 */
export interface BM25Model {
  /** N-gram vocabulary (sorted) */
  ngramVocab: string[];
  /** BM25 score for each n-gram (higher = more important across jurors) */
  scores: Map<string, number>;
  /** Document frequency: how many jurors mention each n-gram */
  docFreq: Map<string, number>;
  /** N-gram vectors per sentence (BM25-weighted) */
  vectors: Float64Array[];
}

export interface BM25Channels {
  consensus: BM25Model;
  discriminative: BM25Model;
}

/**
 * Sentence embedding model result
 */
export interface SentenceEmbeddingResult {
  /** Embedding vectors per sentence (typically 384-dim) */
  vectors: Float64Array[];
  /** Embedding dimension */
  dimension: number;
}

export interface DesignerAnalysisResult {
  designers: string[];
  concepts: Concept[];
  primaryConcepts?: Concept[];
  detailConcepts?: Concept[];
  conceptHierarchy?: Record<string, string[]>;
  sentences: SentenceRecord[];
  designerVectors: Record<string, Record<string, number>>;
  designerVectorsDetail?: Record<string, Record<string, number>>;
  imageConcepts: Record<string, string[]>;
  nodes?: GraphNode[];
  links?: GraphLink[];
}