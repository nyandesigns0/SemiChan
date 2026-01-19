import { STOPWORDS } from "@/constants/nlp-constants";

export interface LabelQuality {
  score: number; // 0-1
  passed: boolean;
  violations: string[];
}

/**
 * Evaluates the quality of a generated concept label.
 * Penalizes single-word labels, stopword-heavy labels, non-noun starts, etc.
 */
export function evaluateLabelQuality(
  label: string,
  _context?: { topTerms: string[]; sentences: string[] }
): LabelQuality {
  if (!label || label.trim().length === 0) {
    return { score: 0, passed: false, violations: ["empty"] };
  }

  const trimmed = label.trim();
  const words = trimmed.split(/\s+/);
  const lowerWords = words.map(w => w.toLowerCase());
  
  const violations: string[] = [];
  let score = 1.0;

  // 1. Single word penalty
  if (words.length === 1) {
    score -= 0.4;
    violations.push("single-word");
  }

  // 2. Too short penalty (< 2 words, though single-word already caught most)
  if (words.length < 2) {
    // Already penalized by single-word, but we can add the violation
    violations.push("too-short");
  }

  // 3. Too long penalty (> 7 words)
  if (words.length > 7) {
    score -= 0.1;
    violations.push("too-long");
  }

  // 4. Stopword-heavy (> 40%)
  const stopwordCount = lowerWords.filter(w => STOPWORDS.has(w)).length;
  const stopwordRatio = stopwordCount / words.length;
  if (stopwordRatio > 0.4) {
    score -= 0.3;
    violations.push("stopword-heavy");
  }

  // 5. Non-noun start (Heuristic: starts with stopword or common verb/adjective that isn't usually a noun start)
  const firstWord = lowerWords[0];
  const commonNonNounStarts = new Set([
    "addressing", "shows", "move", "goes", "tells", "appearing", "seems", "is", "are", "about"
  ]);
  if (STOPWORDS.has(firstWord) || commonNonNounStarts.has(firstWord)) {
    score -= 0.45; // Increased from 0.2 to fail threshold 0.6
    violations.push("non-noun-start");
  }

  // 6. Word repetition
  const uniqueWords = new Set(lowerWords);
  if (uniqueWords.size !== lowerWords.length) {
    score -= 0.45; // Increased from 0.25 to fail threshold 0.6
    violations.push("repetition");
  }

  // 7. Forbidden filler words
  const fillers = new Set(["areas", "project", "design", "spaces", "brief", "proposal"]);
  const hasFillers = lowerWords.some(w => fillers.has(w));
  if (hasFillers) {
    score -= 0.1;
    violations.push("filler-words");
  }

  const finalScore = Math.max(0, Math.min(1, score));
  const threshold = 0.6;

  return {
    score: finalScore,
    passed: finalScore >= threshold,
    violations
  };
}
