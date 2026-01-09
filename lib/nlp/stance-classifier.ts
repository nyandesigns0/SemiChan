import type { Stance } from "@/types/nlp";
import { PRAISE_MARKERS, CRITIQUE_MARKERS, SUGGESTION_PATTERNS } from "@/constants/nlp-constants";

export function stanceOfSentence(s: string): Stance {
  const sl = s.toLowerCase();
  const hasPraise = PRAISE_MARKERS.some((m) => sl.includes(m));
  const hasCrit = CRITIQUE_MARKERS.some((m) => sl.includes(m));
  const hasSug = SUGGESTION_PATTERNS.some((re) => re.test(s));

  // Priority: explicit critique, then suggestion, then praise
  // (jury language is frequently praise + critique; critique generally more actionable)
  if (hasCrit && !hasPraise) return hasSug ? "suggestion" : "critique";
  if (hasCrit && hasPraise) return hasSug ? "suggestion" : "critique";
  if (hasSug) return "suggestion";
  if (hasPraise) return "praise";
  return "neutral";
}

