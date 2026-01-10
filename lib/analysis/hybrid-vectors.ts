import type { BM25Model, SentenceEmbeddingResult, HybridAnalysisParams } from "@/types/nlp";

/**
 * Default weights for hybrid analysis
 */
export const DEFAULT_HYBRID_PARAMS: HybridAnalysisParams = {
  semanticWeight: 0.7,
  frequencyWeight: 0.3,
};

/**
 * Combine semantic embeddings with BM25 frequency vectors
 * Creates hybrid vectors weighted by the specified parameters
 * 
 * @param semanticResult - Sentence embedding result (384-dim vectors)
 * @param bm25Model - BM25 model with frequency vectors
 * @param params - Weights for semantic and frequency components
 * @returns Combined hybrid vectors for clustering
 */
export function buildHybridVectors(
  semanticResult: SentenceEmbeddingResult,
  bm25Model: BM25Model,
  params: HybridAnalysisParams = DEFAULT_HYBRID_PARAMS
): Float64Array[] {
  const { semanticWeight, frequencyWeight } = params;
  const semanticVectors = semanticResult.vectors;
  const frequencyVectors = bm25Model.vectors;
  
  // Handle edge cases
  if (semanticVectors.length === 0) {
    return [];
  }
  
  // If frequency vectors are empty or have different length, just use semantic
  if (frequencyVectors.length !== semanticVectors.length || frequencyVectors.length === 0) {
    return semanticVectors;
  }
  
  // Calculate combined dimension
  const semanticDim = semanticResult.dimension;
  const frequencyDim = bm25Model.ngramVocab.length;
  const combinedDim = semanticDim + frequencyDim;
  
  const hybridVectors: Float64Array[] = [];
  
  for (let i = 0; i < semanticVectors.length; i++) {
    const semantic = semanticVectors[i];
    const frequency = frequencyVectors[i];
    
    // Create combined vector: [weighted_semantic, weighted_frequency]
    const combined = new Float64Array(combinedDim);
    
    // Apply semantic weight
    for (let j = 0; j < semanticDim; j++) {
      combined[j] = (semantic[j] ?? 0) * semanticWeight;
    }
    
    // Apply frequency weight
    for (let j = 0; j < frequencyDim; j++) {
      combined[semanticDim + j] = (frequency[j] ?? 0) * frequencyWeight;
    }
    
    // L2 normalize the combined vector
    let norm = 0;
    for (let j = 0; j < combinedDim; j++) {
      norm += combined[j] * combined[j];
    }
    norm = Math.sqrt(norm) || 1;
    for (let j = 0; j < combinedDim; j++) {
      combined[j] /= norm;
    }
    
    hybridVectors.push(combined);
  }
  
  return hybridVectors;
}

/**
 * Extract semantic portion of hybrid centroid
 * Used for labeling clusters with semantic terms
 */
export function getSemanticCentroid(
  hybridCentroid: Float64Array,
  semanticDim: number
): Float64Array {
  return new Float64Array(hybridCentroid.slice(0, semanticDim));
}

/**
 * Extract frequency portion of hybrid centroid
 * Used for labeling clusters with n-grams
 */
export function getFrequencyCentroid(
  hybridCentroid: Float64Array,
  semanticDim: number
): Float64Array {
  return new Float64Array(hybridCentroid.slice(semanticDim));
}

/**
 * Compute cosine similarity between two hybrid vectors
 */
export function hybridCosine(a: Float64Array, b: Float64Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
  }
  return dot; // Vectors are normalized
}





