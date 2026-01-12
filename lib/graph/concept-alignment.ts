import type { Concept } from "@/types/analysis";
import type { GraphLink } from "@/types/graph";
import { cosine } from "@/lib/analysis/tfidf";

export function computeConceptAlignment(
  jurorConcepts: Concept[],
  designerConcepts: Concept[],
  jurorCentroids: Float64Array[],
  designerCentroids: Float64Array[],
  threshold: number
): GraphLink[] {
  const links: GraphLink[] = [];
  for (let i = 0; i < jurorConcepts.length; i++) {
    for (let j = 0; j < designerConcepts.length; j++) {
      const sim = cosine(jurorCentroids[i] || new Float64Array(), designerCentroids[j] || new Float64Array());
      if (sim >= threshold) {
        links.push({
          id: `align:${jurorConcepts[i].id}:${designerConcepts[j].id}`,
          source: jurorConcepts[i].id,
          target: designerConcepts[j].id,
          weight: sim,
          kind: "jurorDesignerConcept",
        });
      }
    }
  }
  return links;
}
