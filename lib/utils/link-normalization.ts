import type { GraphLink } from "@/types/graph";
import { LINK_VISUALIZATION } from "./link-visualization-constants";

type WeightBounds = { min: number; max: number };

export type WeightBoundsByType = Map<GraphLink["kind"], WeightBounds>;

export interface EvidenceCountCache {
  counts: number[];
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function computeWeightBounds(allLinks: GraphLink[]): WeightBoundsByType {
  const bounds = new Map<GraphLink["kind"], WeightBounds>();

  for (const link of allLinks) {
    if (!link) continue;
    const weight = Number.isFinite(link.weight) ? link.weight : 0;
    const existing = bounds.get(link.kind);
    if (!existing) {
      bounds.set(link.kind, { min: weight, max: weight });
    } else {
      existing.min = Math.min(existing.min, weight);
      existing.max = Math.max(existing.max, weight);
    }
  }

  return bounds;
}

export function normalizeWeightByType(
  weight: number,
  linkType: GraphLink["kind"],
  allLinks: GraphLink[],
  boundsCache?: WeightBoundsByType
): number {
  const safeWeight = Number.isFinite(weight) ? weight : 0;
  const bounds = (boundsCache ?? computeWeightBounds(allLinks)).get(linkType);
  if (!bounds) {
    return clamp01(safeWeight);
  }
  if (Math.abs(bounds.max - bounds.min) < 1e-6) {
    return bounds.max > 0 ? 1 : 0;
  }
  return clamp01((safeWeight - bounds.min) / (bounds.max - bounds.min));
}

export function applyPowerCurve(normalizedWeight: number, exponent: number = LINK_VISUALIZATION.WIDTH.POWER_EXPONENT): number {
  const safeExponent = Math.max(0.01, exponent);
  return Math.pow(clamp01(normalizedWeight), safeExponent);
}

export function buildEvidenceCountCache(allLinks: GraphLink[]): EvidenceCountCache {
  const counts = allLinks
    .map((link) => {
      const value = link?.evidenceCount ?? link?.evidenceIds?.length ?? 0;
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    })
    .filter((count) => count >= 0)
    .sort((a, b) => a - b);

  return { counts };
}

function upperBound(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] <= target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

export function computeEvidenceCountPercentile(
  link: GraphLink,
  allLinks: GraphLink[],
  cache?: EvidenceCountCache
): number {
  const counts = (cache ?? buildEvidenceCountCache(allLinks)).counts;
  if (counts.length === 0) return 0;

  const evidenceCount = Number.isFinite(link.evidenceCount)
    ? (link.evidenceCount as number)
    : Number.isFinite(link.evidenceIds?.length)
      ? (link.evidenceIds?.length ?? 0)
      : 0;
  const clamped = Math.max(0, evidenceCount);
  const rank = upperBound(counts, clamped);
  return clamp01(rank / counts.length);
}
