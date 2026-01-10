/**
 * Generate a high-quality short label for a concept using a heuristic.
 * This is deterministic to avoid LLM hallucinations in the 3D graph.
 */
export async function generateShortLabel(
  topTerms: string[],
  sentences: string[]
): Promise<string> {
  if (topTerms.length === 0) return "Concept";

  // Stop words to filter out for cleaner titles
  const stopWords = new Set([
    "is", "the", "are", "of", "in", "to", "for", "with", "on", "at", "by", 
    "from", "up", "about", "into", "over", "after", "am", "was", "were", 
    "be", "been", "being", "it", "this", "that", "these", "those", "a", "an", "and"
  ]);

  // Heuristic: Take top 2 terms, clean them, and capitalize
  const getTokens = (term: string) => {
    return term
      .split(/\s+/)
      .filter(word => !stopWords.has(word.toLowerCase()))
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
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

  if (finalTokens.length === 0) return "Concept";
  
  // Recompose: Modifier + Head Noun (up to 4 words)
  const result = finalTokens.slice(0, 4).join(" ");
  
  return result;
}
