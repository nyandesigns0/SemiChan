import { STOPWORDS } from "@/constants/nlp-constants";

const FALLBACK_WORD_LIMIT = 4;

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function tokenizeMeaningful(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => word.length >= 2)
    .filter((word) => !STOPWORDS.has(word));
}

function fallbackFromSentences(sentences: string[]): string | undefined {
  for (const sentence of sentences) {
    if (!sentence || sentence.trim().length === 0) continue;
    const tokens = tokenizeMeaningful(sentence);
    if (tokens.length === 0) continue;
    return tokens.slice(0, FALLBACK_WORD_LIMIT).map(titleCase).join(" ");
  }
  return undefined;
}

/**
 * Generate a high-quality short label for a concept using a heuristic.
 * This is deterministic to avoid LLM hallucinations in the 3D graph.
 */
export async function generateShortLabel(
  topTerms: string[],
  sentences: string[],
  fallbackLabel?: string
): Promise<string> {
  const sentenceFallback = fallbackFromSentences(sentences);
  const fallback = sentenceFallback ?? fallbackLabel?.trim() ?? "Concept";
  if (topTerms.length === 0) return fallback;

  // Heuristic: Take top 2 terms, clean them, and capitalize
  const getTokens = (term: string) => {
    return term
      .split(/\s+/)
      .filter(word => !STOPWORDS.has(word.toLowerCase()))
      .map(word => titleCase(word));
  };

  const primaryTokens = getTokens(topTerms[0]);
  const secondaryTokens = topTerms.length > 1 ? getTokens(topTerms[1]) : [];
  
  // Word-level deduplication
  const seenWords = new Set<string>();
  const finalTokens: string[] = [];

  [...primaryTokens, ...secondaryTokens].forEach(token => {
    const lower = token.toLowerCase();
    // Simple stem-ish check (very basic)
    if (!seenWords.has(lower)) {
      finalTokens.push(token);
      seenWords.add(lower);
    }
  });

  if (finalTokens.length === 0) return fallback;
  
  // Recompose: Modifier + Head Noun (up to 4 words)
  const result = finalTokens.slice(0, 4).join(" ");

  if (result.trim().length === 0) return fallback;
  const normalized = result.trim().toLowerCase();
  if (normalized === "concept" || normalized === "concepts") return fallback;

  return result;
}
