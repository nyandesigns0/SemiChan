export type Stance = "praise" | "critique" | "suggestion" | "neutral";

export interface JurorBlock {
  juror: string;
  text: string;
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

/**
 * Parameters for hybrid analysis (semantic + frequency)
 */
export interface HybridAnalysisParams {
  /** Weight for semantic embeddings (0.0 - 1.0) */
  semanticWeight: number;
  /** Weight for frequency/BM25 vectors (0.0 - 1.0) */
  frequencyWeight: number;
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
