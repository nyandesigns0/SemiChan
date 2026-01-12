import type { BM25Model } from "@/types/nlp";
import { extractClusterKeyphrases } from "@/lib/nlp/keyphrase-extractor";

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
 * Generate concept labels prioritizing cluster-specific keyphrases and contrastive terms.
 * Finds phrases that are prevalent within the cluster and distinctive relative to the corpus.
 */
export function contrastiveLabelCluster(
  semanticCentroid: Float64Array,
  bm25Model: BM25Model,
  sentencesInCluster: string[],
  allSentences: string[],
  topNCount: number = 4
): { label: string; keyphrases: string[]; terms: string[] } {
  const keyphrases = extractClusterKeyphrases(
    sentencesInCluster,
    allSentences,
    Math.max(topNCount * 2, 8)
  );

  const terms = getClusterTopTerms(
    semanticCentroid,
    bm25Model,
    sentencesInCluster,
    allSentences,
    Math.max(topNCount * 2, 8)
  );

  const seenStems = new Set<string>();
  const deduped: string[] = [];

  const addCandidate = (phrase: string) => {
    const stem = stemTerm(phrase);
    if (!stem) return;
    if (seenStems.has(stem)) return;
    const normalized = phrase.toLowerCase();
    const isSubstringDuplicate = deduped.some((t) => {
      const tNorm = t.toLowerCase();
      return tNorm.includes(normalized) || normalized.includes(tNorm);
    });
    if (isSubstringDuplicate) return;
    seenStems.add(stem);
    deduped.push(phrase);
  };

  for (const phrase of keyphrases) {
    addCandidate(phrase);
    if (deduped.length >= topNCount) break;
  }

  if (deduped.length < topNCount) {
    for (const term of terms) {
      addCandidate(term);
      if (deduped.length >= topNCount) break;
    }
  }

  const label = deduped.length > 0 ? deduped.slice(0, topNCount).join(" · ") : "Concept";

  return { label, keyphrases, terms };
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
 */
export function computeContrastiveTermScores(
  sentencesInGroup: string[],
  allSentences: string[],
  bm25Model: BM25Model,
  minDF: number = 2,
  maxDFPercent: number = 0.8,
  ratioThreshold: number = 1.5
): Array<{ term: string; score: number; df: number; ratio: number; prevalence: number }> {
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
    const prevalence = localDF[i] / sentencesInGroup.length;
    const tfAdvantage = localTF[i] - otherTF[i];
    const ratio = otherTF[i] > 0 ? localTF[i] / otherTF[i] : localTF[i];
    const score = tfAdvantage * prevalence * Math.log2(Math.max(ratio, 1) + 1);
    
    return {
      term,
      score,
      df: localDF[i],
      ratio,
      prevalence,
    };
  })
  .filter(t => t.df >= minDF && t.df <= maxDFCount && t.score > 0 && t.ratio >= ratioThreshold)
  .sort((a, b) => b.score - a.score);
}
