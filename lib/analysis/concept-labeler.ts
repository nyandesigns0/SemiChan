import type { BM25Model } from "@/types/nlp";

const STEM_SUFFIXES = ["ation", "ition", "tion", "sion", "ingly", "edly", "ing", "ed", "est", "er", "ly", "es", "s"];

function stemTerm(term: string): string {
  const cleaned = term.toLowerCase().trim();
  if (!cleaned) return "";
  const token = cleaned.split(/\s+/)[0];
  for (const suffix of STEM_SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

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
    Math.max(topNCount * 2, 8)
  );

  if (terms.length === 0) return "Concept";

  const seenStems = new Set<string>();
  const deduped: string[] = [];

  for (const term of terms) {
    const stem = stemTerm(term);
    if (!stem) continue;
    if (seenStems.has(stem)) continue;
    const normalized = term.toLowerCase();
    const isSubstringDuplicate = deduped.some((t) => {
      const tNorm = t.toLowerCase();
      return tNorm.includes(normalized) || normalized.includes(tNorm);
    });
    if (isSubstringDuplicate) continue;
    seenStems.add(stem);
    deduped.push(term);
    if (deduped.length >= topNCount) break;
  }

  return deduped.join(" Aú ");
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
  const scores = computeContrastiveTermScores(
    sentencesInCluster,
    allSentences,
    bm25Model,
    2, // minDF
    0.8 // maxDFPercent
  );

  return scores.slice(0, topCount).map(s => s.term);
}

/**
 * Compute contrastive term scores for a group of sentences relative to the rest of the corpus.
 * Finds terms that are frequent and prevalent in the group but rare elsewhere.
 * 
 * @param sentencesInGroup - Texts in the focus group (e.g., a cluster or a juror's sentences)
 * @param allSentences - All texts in the corpus
 * @param bm25Model - Pre-built BM25 model
 * @param minDF - Minimum cluster document frequency (default 2)
 * @param maxDFPercent - Maximum cluster document frequency percent (default 0.8)
 */
export function computeContrastiveTermScores(
  sentencesInGroup: string[],
  allSentences: string[],
  bm25Model: BM25Model,
  minDF: number = 2,
  maxDFPercent: number = 0.8
): Array<{ term: string; score: number; df: number }> {
  if (sentencesInGroup.length === 0 || bm25Model.ngramVocab.length === 0) return [];

  const vocabSize = bm25Model.ngramVocab.length;
  const sentenceToIndex = new Map<string, number>();
  allSentences.forEach((s, i) => sentenceToIndex.set(s, i));

  const groupIndices = sentencesInGroup
    .map(s => sentenceToIndex.get(s))
    .filter((idx): idx is number => idx !== undefined);

  if (groupIndices.length === 0) return [];

  // 1. Compute Local TF and DF within the group
  const localTF = new Float64Array(vocabSize);
  const localDF = new Int32Array(vocabSize);
  
  for (const idx of groupIndices) {
    const v = bm25Model.vectors[idx];
    if (!v) continue;
    for (let i = 0; i < vocabSize; i++) {
      if (v[i] > 0) {
        localTF[i] += v[i];
        localDF[i]++;
      }
    }
  }

  // Average TF in group
  for (let i = 0; i < vocabSize; i++) {
    localTF[i] /= groupIndices.length;
  }

  // 2. Compute Average TF in the rest of the corpus
  const otherTF = new Float64Array(vocabSize);
  const otherCount = allSentences.length - groupIndices.length;
  
  if (otherCount > 0) {
    const groupIndexSet = new Set(groupIndices);
    for (let i = 0; i < allSentences.length; i++) {
      if (groupIndexSet.has(i)) continue;
      const v = bm25Model.vectors[i];
      if (!v) continue;
      for (let j = 0; j < vocabSize; j++) {
        otherTF[j] += v[j];
      }
    }
    for (let i = 0; i < vocabSize; i++) {
      otherTF[i] /= otherCount;
    }
  }

  // 3. Score and Prune
  const maxDFCount = Math.ceil(sentencesInGroup.length * maxDFPercent);
  
  return bm25Model.ngramVocab.map((term, i) => {
    // Prevalence weight: how many sentences in this group contain the term
    const prevalence = localDF[i] / sentencesInGroup.length;
    
    // Contrastive score: TF advantage weighted by group prevalence
    const score = (localTF[i] - otherTF[i]) * prevalence;
    
    return {
      term,
      score,
      df: localDF[i]
    };
  })
  .filter(t => t.df >= minDF && t.df <= maxDFCount && t.score > 0)
  .sort((a, b) => b.score - a.score);
}
