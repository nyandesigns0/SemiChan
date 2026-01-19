/**
 * Applies a policy layer to the recommended number of clusters (K).
 * Ensures K matches human cognitive limits based on the dataset size.
 */
export function applyConceptCountPolicy(
  recommendedK: number,
  corpusSize: number,
  options: {
    smallCorpusMax?: number; // <100 sentences
    mediumCorpusMax?: number; // 100-200
    largeCorpusMax?: number; // 200+
  } = {}
): { 
  adjustedK: number; 
  requiresHierarchy: boolean;
  reasoning: string;
} {
  const smallMax = options.smallCorpusMax ?? 8;
  const mediumMax = options.mediumCorpusMax ?? 12;
  const largeMax = options.largeCorpusMax ?? 12; // Flat limit, triggers hierarchy if exceeded

  let adjustedK = recommendedK;
  let requiresHierarchy = false;
  let reasoning = "";

  if (corpusSize < 100) {
    if (recommendedK > smallMax) {
      adjustedK = smallMax;
      reasoning = `Small corpus (<100 sentences) policy: capped K from ${recommendedK} to ${smallMax}`;
    } else {
      reasoning = `Small corpus (<100 sentences) policy: K=${recommendedK} is within limits`;
    }
  } else if (corpusSize < 200) {
    if (recommendedK > mediumMax) {
      adjustedK = mediumMax;
      reasoning = `Medium corpus (100-200 sentences) policy: capped K from ${recommendedK} to ${mediumMax}`;
    } else {
      reasoning = `Medium corpus (100-200 sentences) policy: K=${recommendedK} is within limits`;
    }
  } else {
    // Large corpus (>200)
    if (recommendedK > largeMax) {
      adjustedK = largeMax;
      requiresHierarchy = true;
      reasoning = `Large corpus (>200 sentences) policy: capped top-level K to ${largeMax} and enabled hierarchy`;
    } else {
      reasoning = `Large corpus (>200 sentences) policy: K=${recommendedK} is within limits`;
    }
  }

  return { adjustedK, requiresHierarchy, reasoning };
}
