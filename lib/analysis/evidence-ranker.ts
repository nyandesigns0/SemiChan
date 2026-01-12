import type { BM25Model } from "@/types/nlp";
import { cosine } from "./tfidf";
import { extractNgrams } from "@/lib/nlp/ngram-extractor";

export const DEFAULT_EVIDENCE_RANKING_PARAMS = {
  semanticWeight: 0.7,
  frequencyWeight: 0.3,
};

/**
 * Rank sentences within a concept based on a combination of semantic coherence 
 * and frequency salience (signature terms).
 * 
 * @param allSentences - All sentences in the corpus
 * @param clusterIndices - Indices of sentences assigned to this cluster
 * @param semanticCentroid - Centroid of this cluster in semantic space
 * @param semanticVectors - Semantic embedding vectors for all sentences
 * @param bm25Model - BM25 model for signature term scoring
 * @param conceptTopTerms - Signature terms identified for this concept
 * @param params - Weights for semantic vs frequency components
 * @param topK - Number of representative sentences to return
 * @returns Array of ranked sentences with metadata
 */
export function rankEvidenceForConcept(
  allSentences: string[],
  clusterIndices: number[],
  semanticCentroid: Float64Array,
  semanticVectors: Float64Array[],
  bm25Model: BM25Model,
  conceptTopTerms: string[],
  params: { semanticWeight: number; frequencyWeight: number } = DEFAULT_EVIDENCE_RANKING_PARAMS,
  topK: number = 3
): Array<{ sentence: string; index: number; score: number }> {
  if (clusterIndices.length === 0) return [];

  const { semanticWeight, frequencyWeight } = params;
  const signatureTermsSet = new Set(conceptTopTerms);

  const rankedSentences = clusterIndices.map((idx) => {
    const sentence = allSentences[idx];
    const semanticVector = semanticVectors[idx];

    // 1. Semantic similarity to centroid (coherence)
    const semanticSim = semanticVector ? Math.max(0, cosine(semanticVector, semanticCentroid)) : 0;

    // 2. BM25 salience: how well this sentence represents the concept's signature terms
    // We look at the n-grams in this sentence that match the concept's top terms
    const sentenceNgrams = extractNgrams(sentence);
    let termScore = 0;
    let matchCount = 0;

    for (const ngram of sentenceNgrams) {
      if (signatureTermsSet.has(ngram)) {
        // Use the BM25 score of the term from the model
        termScore += (bm25Model.scores.get(ngram) ?? 0);
        matchCount++;
      }
    }

    // Normalize term score (optional: could also use a simple count or density)
    const frequencySalience = matchCount > 0 ? termScore / matchCount : 0;

    // 3. Combined score
    const combinedScore = (semanticWeight * semanticSim) + (frequencyWeight * frequencySalience);

    return {
      sentence,
      index: idx,
      score: combinedScore
    };
  });

  // Sort by score descending
  rankedSentences.sort((a, b) => b.score - a.score);

  return rankedSentences.slice(0, topK);
}


