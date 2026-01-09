import { useEffect, useRef, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, Simulation } from "d3-force";
import type { GraphNode, GraphLink } from "@/types/graph";

export function useForceGraph(nodes: GraphNode[], links: GraphLink[], width: number, height: number, enabled: boolean) {
  const [tick, setTick] = useState(0);
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!nodes.length) return;

    // Initialize positions
    for (const n of nodes) {
      if (typeof n.x !== "number") n.x = width / 2 + (Math.random() - 0.5) * 50;
      if (typeof n.y !== "number") n.y = height / 2 + (Math.random() - 0.5) * 50;
    }

    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((l) => {
            // Stronger links pull closer
            const w = Math.max(0.1, Math.min(1.0, l.weight));
            return 180 - 120 * w;
          })
          .strength((l) => Math.max(0.05, Math.min(0.7, l.weight)))
      )
      .force("charge", forceManyBody().strength(-220))
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "collide",
        forceCollide<GraphNode>()
          .radius((d) => Math.max(10, d.size + 10))
          .strength(0.9)
      );

    sim.alpha(1).restart();
    sim.on("tick", () => setTick((t) => t + 1));

    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [enabled, nodes, links, width, height]);

  return { tick, simRef };
}

