import type { BM25Model } from "@/types/nlp";
import { extractNgrams } from "@/lib/nlp/ngram-extractor";
import { topN } from "@/lib/utils/array-utils";

/**
 * Generate concept labels using contrastive BM25 scoring.
 * Finds terms that are frequent in this cluster but infrequent in others.
 * 
 * @param semanticCentroid - Centroid in semantic space (for future topic filtering if needed)
 * @param bm25Model - BM25 model with frequency vectors and vocab
 * @param sentencesInCluster - Sentences assigned to this cluster
 * @param allSentences - All sentences in the corpus
 * @param topNCount - Number of terms to include in the label
 * @returns Combined label string
 */
export function contrastiveLabelCluster(
  semanticCentroid: Float64Array,
  bm25Model: BM25Model,
  sentencesInCluster: string[],
  allSentences: string[],
  topNCount: number = 4
): string {
  const terms = getClusterTopTerms(
    semanticCentroid,
    bm25Model,
    sentencesInCluster,
    allSentences,
    topNCount
  );

  if (terms.length === 0) return "Concept";
  return terms.join(" · ");
}

/**
 * Get top terms for a cluster using contrastive BM25 scoring.
 * Used for concept labels and detailed metadata.
 */
export function getClusterTopTerms(
  semanticCentroid: Float64Array,
  bm25Model: BM25Model,
  sentencesInCluster: string[],
  allSentences: string[],
  topCount: number = 12
): string[] {
  if (sentencesInCluster.length === 0 || bm25Model.ngramVocab.length === 0) {
    return [];
  }

  // 1. Map sentences to their BM25 vectors
  // We need to find the indices of sentencesInCluster in allSentences to get their vectors
  const sentenceToIndex = new Map<string, number>();
  allSentences.forEach((s, i) => sentenceToIndex.set(s, i));

  const clusterIndices = sentencesInCluster
    .map(s => sentenceToIndex.get(s))
    .filter((idx): idx is number => idx !== undefined);

  if (clusterIndices.length === 0) return [];

  // 2. Compute mean BM25 vector for this cluster
  const vocabSize = bm25Model.ngramVocab.length;
  const clusterBm25Centroid = new Float64Array(vocabSize);
  for (const idx of clusterIndices) {
    const v = bm25Model.vectors[idx];
    if (!v) continue;
    for (let i = 0; i < vocabSize; i++) {
      clusterBm25Centroid[i] += v[i];
    }
  }
  for (let i = 0; i < vocabSize; i++) {
    clusterBm25Centroid[i] /= clusterIndices.length;
  }

  // 3. Compute mean BM25 vector for the REST of the corpus
  const otherBm25Centroid = new Float64Array(vocabSize);
  const otherCount = allSentences.length - clusterIndices.length;
  
  if (otherCount > 0) {
    const clusterIndexSet = new Set(clusterIndices);
    for (let i = 0; i < allSentences.length; i++) {
      if (clusterIndexSet.has(i)) continue;
      const v = bm25Model.vectors[i];
      if (!v) continue;
      for (let j = 0; j < vocabSize; j++) {
        otherBm25Centroid[j] += v[j];
      }
    }
    for (let i = 0; i < vocabSize; i++) {
      otherBm25Centroid[i] /= otherCount;
    }
  }

  // 4. Calculate contrastive scores
  const contrastiveScores = bm25Model.ngramVocab.map((term, i) => ({
    term,
    score: clusterBm25Centroid[i] - otherBm25Centroid[i]
  }));

  // 5. Sort and return top terms
  // Filter for positive scores (terms more prominent here than elsewhere)
  const topTerms = contrastiveScores
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topCount)
    .map(t => t.term);

  return topTerms;
}
