import type { JurorBlock, BM25Model } from "@/types/nlp";
import { extractNgrams, getNgramVocab } from "@/lib/nlp/ngram-extractor";

/**
 * BM25 parameters
 */
const K1 = 1.2; // Term frequency saturation parameter
const B = 0.75; // Document length normalization parameter

/**
 * Build BM25 model scoring n-grams by cross-juror frequency
 * Prioritizes n-grams mentioned by multiple jurors (common values)
 * 
 * @param jurorBlocks - Array of juror blocks with text
 * @param sentences - Array of all sentences (for per-sentence vectors)
 * @returns BM25 model with scores and vectors
 */
export function buildBM25(
  jurorBlocks: JurorBlock[],
  sentences: string[]
): BM25Model {
  // Get vocabulary from all sentences
  const ngramVocab = getNgramVocab(sentences);
  
  if (ngramVocab.length === 0 || jurorBlocks.length === 0) {
    return {
      ngramVocab: [],
      scores: new Map(),
      docFreq: new Map(),
      vectors: sentences.map(() => new Float64Array(0)),
    };
  }
  
  // Count document frequency: how many jurors mention each n-gram
  // This prioritizes n-grams that appear across multiple jurors (common values)
  const docFreq = new Map<string, number>();
  const jurorNgramSets = jurorBlocks.map((block) => {
    const ngrams = extractNgrams(block.text);
    return new Set(ngrams);
  });
  
  for (const ngram of ngramVocab) {
    let df = 0;
    for (const ngramSet of jurorNgramSets) {
      if (ngramSet.has(ngram)) {
        df++;
      }
    }
    docFreq.set(ngram, df);
  }
  
  // Calculate average document length (in n-grams)
  const docLengths = sentences.map((s) => extractNgrams(s).length);
  const avgDocLength = docLengths.reduce((a, b) => a + b, 0) / docLengths.length || 1;
  
  // Calculate IDF for each n-gram based on juror frequency
  // Higher IDF for n-grams mentioned by more jurors (inverted logic for common values)
  const N = jurorBlocks.length;
  const idf = new Map<string, number>();
  for (const ngram of ngramVocab) {
    const df = docFreq.get(ngram) ?? 0;
    // Modified IDF: boost n-grams that appear in more juror documents
    // This surfaces "common values" across individuals
    const idfScore = df > 0 ? Math.log(1 + df / N) + 1 : 0;
    idf.set(ngram, idfScore);
  }
  
  // Calculate BM25 scores for each n-gram
  const scores = new Map<string, number>();
  for (const ngram of ngramVocab) {
    const df = docFreq.get(ngram) ?? 0;
    const idfVal = idf.get(ngram) ?? 0;
    // Score combines document frequency and IDF
    scores.set(ngram, idfVal * df);
  }
  
  // Build BM25-weighted vectors for each sentence
  const vocabIndex = new Map<string, number>();
  for (let i = 0; i < ngramVocab.length; i++) {
    vocabIndex.set(ngramVocab[i], i);
  }
  
  const vectors: Float64Array[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceNgrams = extractNgrams(sentence);
    const docLength = sentenceNgrams.length;
    
    // Count n-gram frequencies in this sentence
    const tf = new Map<string, number>();
    for (const ngram of sentenceNgrams) {
      tf.set(ngram, (tf.get(ngram) ?? 0) + 1);
    }
    
    // Build BM25 vector
    const v = new Float64Array(ngramVocab.length);
    let norm = 0;
    
    for (const [ngram, freq] of tf) {
      const idx = vocabIndex.get(ngram);
      if (idx === undefined) continue;
      
      const idfVal = idf.get(ngram) ?? 0;
      
      // BM25 term frequency component
      const tfNorm = (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (docLength / avgDocLength)));
      
      // BM25 score for this term
      const bm25Score = idfVal * tfNorm;
      v[idx] = bm25Score;
      norm += bm25Score * bm25Score;
    }
    
    // L2 normalize the vector
    norm = Math.sqrt(norm) || 1;
    for (let j = 0; j < v.length; j++) {
      v[j] /= norm;
    }
    
    vectors.push(v);
  }
  
  return {
    ngramVocab,
    scores,
    docFreq,
    vectors,
  };
}

/**
 * Get top n-grams by BM25 score (most common across jurors)
 */
export function getTopNgrams(bm25: BM25Model, n: number = 10): string[] {
  const entries = [...bm25.scores.entries()];
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, n).map(([ngram]) => ngram);
}

/**
 * Get top n-grams for a specific cluster based on centroid weights
 */
export function getClusterTopNgrams(
  bm25: BM25Model,
  centroid: Float64Array,
  n: number = 5
): string[] {
  const pairs = bm25.ngramVocab.map((ngram, i) => ({
    ngram,
    weight: centroid[i] ?? 0,
  }));
  pairs.sort((a, b) => b.weight - a.weight);
  return pairs.slice(0, n).map((p) => p.ngram);
}






