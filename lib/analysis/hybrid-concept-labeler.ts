import { topN } from "@/lib/utils/array-utils";
import type { BM25Model } from "@/types/nlp";
import { getFrequencyCentroid, getSemanticCentroid } from "./hybrid-vectors";

/**
 * Generate concept labels using both semantic terms and n-grams
 * Combines centroid-based terms with BM25 n-grams for better descriptions
 * 
 * @param vocab - Vocabulary for semantic dimension (can be empty if using embeddings)
 * @param bm25Model - BM25 model with n-gram vocabulary
 * @param hybridCentroid - Combined centroid vector
 * @param semanticDim - Dimension of semantic portion
 * @param topSemantic - Number of top semantic terms to include
 * @param topNgrams - Number of top n-grams to include
 * @returns Combined label string
 */
export function hybridLabelCluster(
  vocab: string[],
  bm25Model: BM25Model,
  hybridCentroid: Float64Array,
  semanticDim: number,
  topSemantic: number = 2,
  topNgrams: number = 2
): string {
  const labels: string[] = [];
  
  // Extract top semantic terms (if vocab is provided)
  if (vocab.length > 0 && semanticDim > 0) {
    const semanticCentroid = getSemanticCentroid(hybridCentroid, semanticDim);
    const semanticPairs = vocab.map((term, i) => ({ 
      term, 
      weight: semanticCentroid[i] ?? 0 
    }));
    const topSemanticTerms = topN(semanticPairs, topSemantic, (p) => p.weight)
      .map((p) => p.term)
      .filter(Boolean);
    labels.push(...topSemanticTerms);
  }
  
  // Extract top n-grams from frequency portion
  if (bm25Model.ngramVocab.length > 0) {
    const frequencyCentroid = getFrequencyCentroid(hybridCentroid, semanticDim);
    const ngramPairs = bm25Model.ngramVocab.map((ngram, i) => ({ 
      ngram, 
      weight: frequencyCentroid[i] ?? 0 
    }));
    const topNgramTerms = topN(ngramPairs, topNgrams, (p) => p.weight)
      .map((p) => p.ngram)
      .filter(Boolean);
    
    // Add n-grams that aren't duplicates of semantic terms
    for (const ngram of topNgramTerms) {
      const ngramLower = ngram.toLowerCase();
      const isDuplicate = labels.some((label) => 
        ngramLower.includes(label.toLowerCase()) || 
        label.toLowerCase().includes(ngramLower)
      );
      if (!isDuplicate) {
        labels.push(ngram);
      }
    }
  }
  
  // Fallback if no labels found
  if (labels.length === 0) {
    return "Concept";
  }
  
  // Join with separator, limit to 4 terms total
  return labels.slice(0, 4).join(" · ");
}

/**
 * Get top terms for a cluster (both semantic and n-grams)
 * Used for node metadata
 */
export function getClusterTopTerms(
  vocab: string[],
  bm25Model: BM25Model,
  hybridCentroid: Float64Array,
  semanticDim: number,
  topCount: number = 12
): string[] {
  const terms: Array<{ term: string; weight: number; isNgram: boolean }> = [];
  
  // Add semantic terms
  if (vocab.length > 0 && semanticDim > 0) {
    const semanticCentroid = getSemanticCentroid(hybridCentroid, semanticDim);
    for (let i = 0; i < vocab.length; i++) {
      terms.push({
        term: vocab[i],
        weight: semanticCentroid[i] ?? 0,
        isNgram: false,
      });
    }
  }
  
  // Add n-grams with slight boost (they're more interpretable)
  if (bm25Model.ngramVocab.length > 0) {
    const frequencyCentroid = getFrequencyCentroid(hybridCentroid, semanticDim);
    for (let i = 0; i < bm25Model.ngramVocab.length; i++) {
      terms.push({
        term: bm25Model.ngramVocab[i],
        weight: (frequencyCentroid[i] ?? 0) * 1.2, // Slight boost for n-grams
        isNgram: true,
      });
    }
  }
  
  // Sort by weight and return top terms
  terms.sort((a, b) => b.weight - a.weight);
  
  // Deduplicate (prefer n-grams over single words they contain)
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const { term } of terms) {
    const termLower = term.toLowerCase();
    let shouldAdd = true;
    
    // Check if this term is contained in an already-added term
    for (const existing of seen) {
      if (existing.includes(termLower) || termLower.includes(existing)) {
        // Prefer the longer (more specific) term
        if (term.length <= existing.length) {
          shouldAdd = false;
          break;
        }
      }
    }
    
    if (shouldAdd) {
      seen.add(termLower);
      result.push(term);
      if (result.length >= topCount) break;
    }
  }
  
  return result;
}






