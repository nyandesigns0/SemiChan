import { STOPWORDS } from "@/constants/nlp-constants";

/**
 * Tokenize text for n-gram extraction (keeps order, filters stopwords)
 */
function tokenizeForNgrams(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 2);
}

/**
 * Check if an n-gram contains only stopwords (should be filtered out)
 */
function isOnlyStopwords(ngram: string[]): boolean {
  return ngram.every((word) => STOPWORDS.has(word));
}

/**
 * Check if an n-gram starts or ends with a stopword (less meaningful)
 */
function startsOrEndsWithStopword(ngram: string[]): boolean {
  return STOPWORDS.has(ngram[0]) || STOPWORDS.has(ngram[ngram.length - 1]);
}

/**
 * Extract n-grams of a specific size from tokens
 */
function extractNgramsOfSize(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    const ngram = tokens.slice(i, i + n);
    // Filter out n-grams that are only stopwords or start/end with stopwords
    if (!isOnlyStopwords(ngram) && !startsOrEndsWithStopword(ngram)) {
      ngrams.push(ngram.join(" "));
    }
  }
  return ngrams;
}

/**
 * Extract 2-grams and 3-grams from a sentence
 * @param text - The input sentence
 * @param minN - Minimum n-gram size (default 2)
 * @param maxN - Maximum n-gram size (default 3)
 * @returns Array of n-gram strings
 */
export function extractNgrams(text: string, minN: number = 2, maxN: number = 3): string[] {
  const tokens = tokenizeForNgrams(text);
  const ngrams: string[] = [];
  
  for (let n = minN; n <= maxN; n++) {
    ngrams.push(...extractNgramsOfSize(tokens, n));
  }
  
  return ngrams;
}

/**
 * Extract n-grams from multiple sentences and return unique n-grams with counts
 * @param sentences - Array of sentences
 * @param minN - Minimum n-gram size (default 2)
 * @param maxN - Maximum n-gram size (default 3)
 * @returns Map of n-gram to count
 */
export function extractNgramCounts(
  sentences: string[],
  minN: number = 2,
  maxN: number = 3
): Map<string, number> {
  const counts = new Map<string, number>();
  
  for (const sentence of sentences) {
    const ngrams = extractNgrams(sentence, minN, maxN);
    for (const ngram of ngrams) {
      counts.set(ngram, (counts.get(ngram) ?? 0) + 1);
    }
  }
  
  return counts;
}

/**
 * Get the vocabulary of unique n-grams from all sentences
 * @param sentences - Array of sentences
 * @param minN - Minimum n-gram size (default 2)
 * @param maxN - Maximum n-gram size (default 3)
 * @returns Sorted array of unique n-grams
 */
export function getNgramVocab(
  sentences: string[],
  minN: number = 2,
  maxN: number = 3
): string[] {
  const uniqueNgrams = new Set<string>();
  
  for (const sentence of sentences) {
    const ngrams = extractNgrams(sentence, minN, maxN);
    for (const ngram of ngrams) {
      uniqueNgrams.add(ngram);
    }
  }
  
  return [...uniqueNgrams].sort();
}





