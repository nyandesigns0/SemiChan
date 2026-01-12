import { createHash } from "crypto";
import type { ConceptSet } from "../../types/analysis";
import type { Dendrogram } from "./hierarchical-clustering";

type StableIdOptions = {
  dendrogram?: Dendrogram;
  parentMap?: Record<number, number>;
  parentStableIds?: string[];
  prefix?: string;
  cutLabel?: string;
};

function quantizeCentroid(
  centroid: Float64Array,
  sampleSize: number = 48,
  precision: number = 1e3
): string {
  if (centroid.length === 0) return "empty";
  const step = Math.max(1, Math.floor(centroid.length / sampleSize));
  const parts: number[] = [];
  for (let i = 0; i < centroid.length; i += step) {
    parts.push(Math.round(centroid[i] * precision) / precision);
  }
  return parts.join("|");
}

function hashSignature(signature: string): string {
  return createHash("sha256").update(signature).digest("hex").slice(0, 12);
}

/**
 * Create stable concept IDs using centroid hashing and optional lineage.
 * Stable across permutations because it ignores cluster indices.
 */
export function createStableConceptIds(
  centroids: Float64Array[],
  options: StableIdOptions = {}
): string[] {
  const {
    dendrogram,
    parentMap,
    parentStableIds,
    prefix = "concept",
    cutLabel = ""
  } = options;

  const signatureRoot = dendrogram?.merges?.length
    ? `dendro:${dendrogram.merges.length}`
    : "dendro:none";

  const usedCounts = new Map<string, number>();
  const ids: string[] = [];

  for (let i = 0; i < centroids.length; i++) {
    const centroid = centroids[i];
    const centroidSignature = quantizeCentroid(centroid);
    const parentIdx = parentMap?.[i];
    const parentStable = parentIdx !== undefined ? parentStableIds?.[parentIdx] : undefined;
    const hash = hashSignature(`${signatureRoot}|${cutLabel}|${centroidSignature}|${parentStable ?? ""}`);

    const base = parentStable ? `${parentStable}::${hash}` : `${prefix}:${hash}`;
    const existingCount = usedCounts.get(base) ?? 0;
    const finalId = existingCount === 0 ? base : `${base}-${existingCount}`;
    usedCounts.set(base, existingCount + 1);
    ids.push(finalId);
  }

  return ids;
}

export function buildConceptSet(params: {
  cut: ConceptSet["cut"];
  assignments: number[];
  centroids: Float64Array[];
  parentMap?: Record<number, number>;
  dendrogram?: Dendrogram;
  parentStableIds?: string[];
  unitType?: ConceptSet["unitType"];
}): ConceptSet {
  const stableIds = createStableConceptIds(params.centroids, {
    dendrogram: params.dendrogram,
    parentMap: params.parentMap,
    parentStableIds: params.parentStableIds,
    prefix: "concept",
    cutLabel: typeof params.cut === "string" ? params.cut : `cut:${params.cut}`,
  });

  return {
    cut: params.cut,
    assignments: params.assignments,
    centroids: params.centroids,
    stableIds,
    parentMap: params.parentMap,
    unitType: params.unitType,
  };
}
