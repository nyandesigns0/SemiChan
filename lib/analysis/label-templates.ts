/**
 * Curated templates for common concept types to use as fallbacks
 * when LLM synthesis fails quality gates.
 */
export const FALLBACK_LABEL_TEMPLATES = [
  "Core Feedback Themes",
  "Key Design Observations",
  "Juror Consensus Points",
  "Critical Project Insights",
  "Major Synthesis Categories",
  "Primary Feedback Clusters",
  "Thematic Design Principles",
  "Fundamental Proposal Aspects",
  "Essential Feedback Areas",
  "Key Narrative Elements"
];

/**
 * Gets a deterministic fallback label based on index or ID.
 */
export function getFallbackLabel(id: string | number): string {
  const index = typeof id === 'number' ? id : (id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  return FALLBACK_LABEL_TEMPLATES[index % FALLBACK_LABEL_TEMPLATES.length];
}
