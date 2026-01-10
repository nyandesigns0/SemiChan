import type { GraphNode } from "@/types/graph";

/**
 * Label the X, Y, Z axes of the 3D graph by identifying the most extreme concept nodes on each axis.
 * 
 * For each axis, finds the concept with the minimum coordinate (negative end) and maximum coordinate (positive end).
 * Uses the concept labels directly as axis labels.
 * 
 * @param nodes - Array of graph nodes (should include concept nodes with 3D positions)
 * @returns Axis labels object with negative/positive labels for each axis, or undefined if insufficient data
 */
export function labelAxes(nodes: GraphNode[]): {
  x: { negative: string; positive: string; negativeId: string; positiveId: string };
  y: { negative: string; positive: string; negativeId: string; positiveId: string };
  z: { negative: string; positive: string; negativeId: string; positiveId: string };
} | undefined {
  // Filter to only concept nodes with valid 3D positions
  const conceptNodes = nodes.filter(
    (node) => node.type === "concept" && 
    typeof node.x === "number" && 
    typeof node.y === "number" && 
    typeof node.z === "number"
  );

  // Need at least 2 concepts to establish an axis
  if (conceptNodes.length < 2) {
    return undefined;
  }

  // Find min/max for each axis
  let minXNode = conceptNodes[0];
  let maxXNode = conceptNodes[0];
  let minYNode = conceptNodes[0];
  let maxYNode = conceptNodes[0];
  let minZNode = conceptNodes[0];
  let maxZNode = conceptNodes[0];

  for (const node of conceptNodes) {
    const x = node.x!;
    const y = node.y!;
    const z = node.z!;

    if (x < minXNode.x!) minXNode = node;
    if (x > maxXNode.x!) maxXNode = node;
    if (y < minYNode.y!) minYNode = node;
    if (y > maxYNode.y!) maxYNode = node;
    if (z < minZNode.z!) minZNode = node;
    if (z > maxZNode.z!) maxZNode = node;
  }

  // Handle edge case where all concepts are at the same position on an axis
  // In this case, use the same concept for both ends (or could use "Center" labels)
  const xLabels = { 
    negative: minXNode.label, 
    positive: maxXNode.label,
    negativeId: minXNode.id,
    positiveId: maxXNode.id
  };

  const yLabels = { 
    negative: minYNode.label, 
    positive: maxYNode.label,
    negativeId: minYNode.id,
    positiveId: maxYNode.id
  };

  const zLabels = { 
    negative: minZNode.label, 
    positive: maxZNode.label,
    negativeId: minZNode.id,
    positiveId: maxZNode.id
  };

  return {
    x: xLabels,
    y: yLabels,
    z: zLabels,
  };
}

