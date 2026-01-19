import type { GraphNode } from "@/types/graph";

/**
 * Label the axes of the graph by identifying the most extreme concept nodes on each axis.
 * 
 * For each axis, finds the concept with the minimum coordinate (negative end) and maximum coordinate (positive end).
 * Uses the concept labels directly as axis labels.
 * 
 * @param nodes - Array of graph nodes (should include concept nodes)
 * @param finalNumDimensions - Number of meaningful dimensions to label
 * @param layoutNumDimensions - Total dimensions used for layout
 * @param conceptPcValues - Map of concept ID to its raw PC values
 * @returns Axis labels record with negative/positive labels for each axis index
 */
export function labelAxes(
  nodes: GraphNode[],
  finalNumDimensions: number = 3,
  layoutNumDimensions: number = 3,
  conceptPcValues: Map<string, number[]>
): Record<string, { 
  negative: string; 
  positive: string; 
  negativeId: string; 
  positiveId: string;
  method?: string;
}> | undefined {
  // Filter to only concept nodes
  const conceptNodes = nodes.filter((node) => node.type === "concept");

  // Need at least 2 concepts to establish an axis
  if (conceptNodes.length < 2 || conceptPcValues.size === 0) {
    return undefined;
  }

  const result: Record<string, { 
    negative: string; 
    positive: string; 
    negativeId: string; 
    positiveId: string;
    method?: string;
  }> = {};
  const usedConceptIds = new Set<string>();

  for (let dim = 0; dim < layoutNumDimensions; dim++) {
    if (dim < finalNumDimensions) {
      const candidates = conceptNodes
        .map(node => ({
          node,
          val: conceptPcValues.get(node.id)?.[dim] ?? 0,
          count: (node.meta as any)?.count ?? 0
        }))
        .sort((a, b) => a.val - b.val);

      if (candidates.length < 2) continue;

      // Pick negative extreme
      let minIdx = 0;
      while (minIdx < candidates.length - 1 && usedConceptIds.has(candidates[minIdx].node.id)) {
        minIdx++;
      }
      let minEntry = candidates[minIdx];

      // Pick positive extreme
      let maxIdx = candidates.length - 1;
      while (maxIdx > minIdx && usedConceptIds.has(candidates[maxIdx].node.id)) {
        maxIdx--;
      }
      let maxEntry = candidates[maxIdx];

      // If we couldn't find unused ones, just take the absolute extremes
      if (minEntry.node.id === maxEntry.node.id) {
        minEntry = candidates[0];
        maxEntry = candidates[candidates.length - 1];
      }

      usedConceptIds.add(minEntry.node.id);
      usedConceptIds.add(maxEntry.node.id);

      result[dim.toString()] = {
        negative: minEntry.node.label,
        positive: maxEntry.node.label,
        negativeId: minEntry.node.id,
        positiveId: maxEntry.node.id
      };
    } else {
      // Add neutral labels for extra layout dimensions beyond meaningful ones
      result[dim.toString()] = {
        negative: "Low Variance",
        positive: "Low Variance",
        negativeId: `placeholder:neg:${dim}`,
        positiveId: `placeholder:pos:${dim}`,
        method: "placeholder"
      };
      
      // If it's the 3rd dimension and elbow was 2, give it a better label as requested
      if (dim === 2 && finalNumDimensions === 2) {
        result[dim.toString()].negative = "Depth (layout only)";
        result[dim.toString()].positive = "Depth (layout only)";
      }
    }
  }

  // Add backward compatibility aliases for x, y, z if layoutNumDimensions >= 3
  if (layoutNumDimensions >= 3) {
    if (result["0"]) result["x"] = result["0"];
    if (result["1"]) result["y"] = result["1"];
    if (result["2"]) result["z"] = result["2"];
  }

  return result;
}

