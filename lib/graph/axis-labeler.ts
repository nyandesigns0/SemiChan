import type { GraphNode } from "@/types/graph";

/**
 * Label the axes of the graph by identifying the most extreme concept nodes on each axis.
 * 
 * For each axis, finds the concept with the minimum coordinate (negative end) and maximum coordinate (positive end).
 * Uses the concept labels directly as axis labels.
 * 
 * @param nodes - Array of graph nodes (should include concept nodes)
 * @param numDimensions - Number of dimensions to label
 * @param conceptPcValues - Map of concept ID to its raw PC values
 * @returns Axis labels record with negative/positive labels for each axis index
 */
export function labelAxes(
  nodes: GraphNode[],
  numDimensions: number = 3,
  conceptPcValues: Map<string, number[]>
): Record<string, { negative: string; positive: string; negativeId: string; positiveId: string }> | undefined {
  // Filter to only concept nodes
  const conceptNodes = nodes.filter((node) => node.type === "concept");

  // Need at least 2 concepts to establish an axis
  if (conceptNodes.length < 2 || conceptPcValues.size === 0) {
    return undefined;
  }

  const result: Record<string, { negative: string; positive: string; negativeId: string; positiveId: string }> = {};

  for (let dim = 0; dim < numDimensions; dim++) {
    let minNode = conceptNodes[0];
    let maxNode = conceptNodes[0];
    let minVal = conceptPcValues.get(minNode.id)?.[dim] ?? 0;
    let maxVal = minVal;

    for (const node of conceptNodes) {
      const pcValues = conceptPcValues.get(node.id);
      if (!pcValues) continue;
      
      const val = pcValues[dim] ?? 0;
      if (val < minVal) {
        minVal = val;
        minNode = node;
      }
      if (val > maxVal) {
        maxVal = val;
        maxNode = node;
      }
    }

    result[dim.toString()] = {
      negative: minNode.label,
      positive: maxNode.label,
      negativeId: minNode.id,
      positiveId: maxNode.id
    };
  }

  // Add backward compatibility aliases for x, y, z if numDimensions >= 3
  if (numDimensions >= 3) {
    if (result["0"]) result["x"] = result["0"];
    if (result["1"]) result["y"] = result["1"];
    if (result["2"]) result["z"] = result["2"];
  }

  return result;
}

