import type { GraphLink, GraphNode } from "@/types/graph";

type ClusterMap = Map<string, string>;

const getNodeId = (nodeRef: string | GraphNode) =>
  typeof nodeRef === "string" ? nodeRef : nodeRef.id;

function resolveConceptCluster(node: GraphNode | undefined): string | null {
  if (!node) return null;
  if (node.type !== "concept") return null;
  if (node.layer === "detail" && node.parentConceptId) {
    return node.parentConceptId;
  }
  return node.id;
}

function buildAdjacency(links: GraphLink[]): Map<string, GraphLink[]> {
  const adjacency = new Map<string, GraphLink[]>();

  for (const link of links) {
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);

    if (!adjacency.has(sourceId)) {
      adjacency.set(sourceId, []);
    }
    if (!adjacency.has(targetId)) {
      adjacency.set(targetId, []);
    }
    adjacency.get(sourceId)!.push(link);
    adjacency.get(targetId)!.push(link);
  }

  return adjacency;
}

function resolveNodeCluster(
  nodeId: string,
  nodeMap: Map<string, GraphNode>,
  adjacency: Map<string, GraphLink[]>,
  cache: ClusterMap
): string {
  const cached = cache.get(nodeId);
  if (cached) return cached;

  const node = nodeMap.get(nodeId);
  const conceptCluster = resolveConceptCluster(node);
  if (conceptCluster) {
    cache.set(nodeId, conceptCluster);
    return conceptCluster;
  }

  // For non-concept nodes (jurors/designers), align with their strongest adjacent concept
  const neighbors = adjacency.get(nodeId) ?? [];
  let strongest: { clusterId: string; weight: number } | null = null;
  for (const link of neighbors) {
    const otherId = getNodeId(link.source) === nodeId ? getNodeId(link.target) : getNodeId(link.source);
    const otherNode = nodeMap.get(otherId);
    const otherCluster = resolveConceptCluster(otherNode);
    if (!otherCluster) continue;

    const weight = Number.isFinite(link.weight) ? link.weight : 0;
    if (!strongest || weight > strongest.weight) {
      strongest = { clusterId: otherCluster, weight };
    }
  }

  const resolved = strongest?.clusterId ?? nodeId;
  cache.set(nodeId, resolved);
  return resolved;
}

export function computeStructuralRoles(
  links: GraphLink[],
  nodes: GraphNode[]
): Map<string, NonNullable<GraphLink["structuralRole"]>> {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = buildAdjacency(links);
  const clusterCache: ClusterMap = new Map();
  const result = new Map<string, NonNullable<GraphLink["structuralRole"]>>();

  for (const link of links) {
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    const sourceCluster = resolveNodeCluster(sourceId, nodeMap, adjacency, clusterCache);
    const targetCluster = resolveNodeCluster(targetId, nodeMap, adjacency, clusterCache);

    const role: NonNullable<GraphLink["structuralRole"]> =
      sourceCluster && targetCluster && sourceCluster !== targetCluster
        ? "bridge"
        : "cluster-internal";
    result.set(link.id, role);
  }

  return result;
}
