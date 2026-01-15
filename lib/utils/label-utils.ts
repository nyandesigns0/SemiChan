export function resolveInsightLabel(shortLabel?: string): string | undefined {
  if (!shortLabel) return undefined;
  const trimmed = shortLabel.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === "concept" || lower === "concepts") return undefined;
  return trimmed;
}

export function resolveConceptLabel(shortLabel: string | undefined, fallback: string): string {
  return resolveInsightLabel(shortLabel) ?? fallback;
}
