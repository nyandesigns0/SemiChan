import type { BM25Model } from "@/types/nlp";
import { STOPWORDS } from "@/constants/nlp-constants";
import { extractClusterKeyphrases } from "@/lib/nlp/keyphrase-extractor";

const STEM_SUFFIXES = ["ation", "ition", "tion", "sion", "ingly", "edly", "ing", "ed", "est", "er", "ly", "es", "s"];
const SNIPPET_MAX_WORDS = 6;

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

function normalizePhrase(phrase: string): string {
  return phrase.trim().replace(/\s+/g, " ");
}

/**
 * Sanitize a label by removing duplicate consecutive words and stripping leading/trailing stop fragments.
 * Also removes common domain-specific low-information phrases.
 */
export function sanitizeLabel(label: string): string {
  if (!label) return "";
  
  // 1. Remove common low-information n-grams and domain boilerplate
  let cleaned = label.toLowerCase();
  const boilerplate = [
    "goes beyond", "goes goes", "goes", "it's good", "has clear", 
    "rendered rendered", "proposal proposal", "beyond", "project", 
    "designing spaces", "moving forward", "overall", "specifically",
    "seems to", "appears to", "is about", "relates to"
  ];
  
  // 2. Remove duplicate consecutive words (e.g., "rendered rendered" -> "rendered")
  const words = label.split(/\s+/);
  const dedupedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (i === 0 || word.toLowerCase() !== words[i - 1].toLowerCase()) {
      dedupedWords.push(word);
    }
  }
  
  // 3. Filter out words that are leading/trailing stop words or too short
  let start = 0;
  while (start < dedupedWords.length && (STOPWORDS.has(dedupedWords[start].toLowerCase()) || dedupedWords[start].length < 2)) {
    start++;
  }
  
  let end = dedupedWords.length - 1;
  while (end >= start && (STOPWORDS.has(dedupedWords[end].toLowerCase()) || dedupedWords[end].length < 2)) {
    end--;
  }
  
  let finalWords = dedupedWords.slice(start, end + 1);

  // 4. Secondary deduplication and boilerplate removal
  if (finalWords.length > 0) {
    const forbidden = new Set(["beyond", "project", "designing", "spaces", "goes"]);
    // If the label is just a single forbidden word, keep it as fallback but otherwise prune it from start/end
    if (finalWords.length > 1) {
      while (finalWords.length > 0 && forbidden.has(finalWords[0].toLowerCase())) finalWords.shift();
      while (finalWords.length > 0 && forbidden.has(finalWords[finalWords.length - 1].toLowerCase())) finalWords.pop();
    }
  }

  if (finalWords.length === 0) return label; // Fallback to original if we stripped everything
  
  return finalWords.join(" ");
}

function cleanToken(token: string): string {
  return token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
}

function isMeaningfulToken(token: string): boolean {
  const lower = token.toLowerCase();
  if (lower.length < 2) return false;
  return !STOPWORDS.has(lower);
}

function extractSentenceSnippet(sentence: string, maxWords: number): string {
  if (!sentence) return "";
  const tokens = sentence
    .replace(/[^A-Za-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((t) => cleanToken(t))
    .filter(Boolean);

  const meaningful = tokens.filter((t) => isMeaningfulToken(t));
  if (meaningful.length === 0) return "";
  return meaningful.slice(0, maxWords).join(" ");
}

function extractSentenceSnippets(sentences: string[], maxWords: number): string[] {
  return sentences
    .map((sentence) => extractSentenceSnippet(sentence, maxWords))
    .filter(Boolean);
}

function extractEmergencySnippet(sentence: string, maxWords: number): string {
  if (!sentence) return "";
  const tokens = sentence
    .replace(/[^A-Za-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((t) => cleanToken(t))
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.slice(0, maxWords).join(" ");
}

function extractEmergencySnippets(sentences: string[], maxWords: number): string[] {
  return sentences
    .map((sentence) => extractEmergencySnippet(sentence, maxWords))
    .filter(Boolean);
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
  topNCount: number = 4,
  nearestSentences?: string[],
  fallbackId?: string
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
    Math.max(topNCount * 2, 8),
    nearestSentences
  );

  const seenStems = new Set<string>();
  const seenNormalized = new Set<string>();
  const deduped: string[] = [];

  const addCandidate = (phrase: string, mode: "strict" | "relaxed") => {
    const normalized = normalizePhrase(phrase).toLowerCase();
    if (!normalized) return;
    if (seenNormalized.has(normalized)) return;
    const hasContent = normalized.replace(/[^a-z0-9]/g, "").length >= 2;
    if (!hasContent) return;
    if (mode === "strict") {
      const stem = stemTerm(normalized);
      if (!stem) return;
      if (seenStems.has(stem)) return;
      const isSubstringDuplicate = deduped.some((t) => {
        const tNorm = t.toLowerCase();
        return tNorm.includes(normalized) || normalized.includes(tNorm);
      });
      if (isSubstringDuplicate) return;
      seenStems.add(stem);
    }
    seenNormalized.add(normalized);
    deduped.push(normalizePhrase(phrase));
  };

  for (const phrase of keyphrases) {
    addCandidate(phrase, "strict");
    if (deduped.length >= topNCount) break;
  }

  if (deduped.length < topNCount) {
    for (const term of terms) {
      addCandidate(term, "strict");
      if (deduped.length >= topNCount) break;
    }
  }

  const cleanedClusterSentences = sentencesInCluster.filter((s) => s && s.trim().length > 0);
  const cleanedNearestSentences = (nearestSentences ?? []).filter((s) => s && s.trim().length > 0);

  let fallbackKeyphrases: string[] = [];
  if (deduped.length < topNCount) {
    if (cleanedNearestSentences.length > 0) {
      fallbackKeyphrases = extractClusterKeyphrases(
        cleanedNearestSentences,
        allSentences,
        Math.max(topNCount * 2, 8)
      );
      for (const phrase of fallbackKeyphrases) {
        addCandidate(phrase, "relaxed");
        if (deduped.length >= topNCount) break;
      }
    }

    if (deduped.length < topNCount && cleanedNearestSentences.length > 0) {
      const sentenceSnippets = extractSentenceSnippets(cleanedNearestSentences, SNIPPET_MAX_WORDS);
      for (const snippet of sentenceSnippets) {
        addCandidate(snippet, "relaxed");
        if (deduped.length >= topNCount) break;
      }
    }

    if (deduped.length < topNCount && cleanedClusterSentences.length > 0) {
      const clusterSnippets = extractSentenceSnippets(cleanedClusterSentences, SNIPPET_MAX_WORDS);
      for (const snippet of clusterSnippets) {
        addCandidate(snippet, "relaxed");
        if (deduped.length >= topNCount) break;
      }
    }

    if (deduped.length < topNCount) {
      const emergencySource =
        cleanedClusterSentences.length > 0 ? cleanedClusterSentences : cleanedNearestSentences;
      const emergencySnippets = extractEmergencySnippets(emergencySource, SNIPPET_MAX_WORDS);
      for (const snippet of emergencySnippets) {
        addCandidate(snippet, "relaxed");
        if (deduped.length >= topNCount) break;
      }
    }
  }

  const labelParts = deduped.slice(0, topNCount);
  const rawLabel = labelParts.length > 0 ? labelParts.join(" ") : (fallbackId ?? "concept:unknown");
  const label = sanitizeLabel(rawLabel);

  return { label, keyphrases: keyphrases.length > 0 ? keyphrases : fallbackKeyphrases, terms };
}

/**
 * Get top terms for a cluster using contrastive BM25 scoring.
 * Used for concept labels and detailed metadata.
 * 
 * If BM25 terms are empty, backfills with meaningful tokens from nearest sentences.
 */
export function getClusterTopTerms(
  semanticCentroid: Float64Array,
  bm25Model: BM25Model,
  sentencesInCluster: string[],
  allSentences: string[],
  topCount: number = 12,
  nearestSentences?: string[]
): string[] {
  const scores = computeContrastiveTermScores(
    sentencesInCluster,
    allSentences,
    bm25Model,
    2, // minDF
    0.8 // maxDFPercent
  );

  let terms = scores.slice(0, topCount).map(s => s.term);

  // Backfill if empty or too few terms
  if (terms.length < 3) {
    const sourceDocs = nearestSentences && nearestSentences.length > 0 ? nearestSentences : sentencesInCluster;
    const tokenCounts = new Map<string, number>();
    const existingTerms = new Set(terms.map(t => t.toLowerCase()));
    
    for (const doc of sourceDocs) {
      const tokens = doc.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/);
      for (const token of tokens) {
        const cleaned = cleanToken(token);
        if (cleaned && cleaned.length >= 3 && !STOPWORDS.has(cleaned) && !existingTerms.has(cleaned)) {
          tokenCounts.set(cleaned, (tokenCounts.get(cleaned) ?? 0) + 1);
        }
      }
    }
    
    const backfillTerms = Array.from(tokenCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topCount - terms.length)
      .map(entry => entry[0]);
    
    terms = [...terms, ...backfillTerms];
  }

  // Final fallback: if still empty, use a placeholder
  if (terms.length === 0) {
    terms = ["unclassified", "general", "feedback"];
  }

  return terms;
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