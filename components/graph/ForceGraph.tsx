"use client";

import { useRef, useEffect } from "react";
import { zoom, type ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import { drag } from "d3-drag";
import { useForceGraph } from "@/lib/graph/force-simulation";
import { clamp } from "@/lib/utils/text-utils";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { Stance } from "@/types/nlp";

interface ForceGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onNodeClick: (node: GraphNode) => void;
  onLinkClick: (link: GraphLink) => void;
  onNodeDoubleClick: (node: GraphNode, simRef: React.MutableRefObject<any>, width: number, height: number) => void;
}

function stanceColor(s?: Stance): string {
  switch (s) {
    case "praise":
      return "#16a34a";
    case "critique":
      return "#dc2626";
    case "suggestion":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

function nodeFill(n: GraphNode): string {
  if (n.type === "juror") return "#0f172a";
  return "#111827";
}

function nodeStroke(n: GraphNode, selectedNodeId: string | null): string {
  if (n.id === selectedNodeId) return "#0ea5e9";
  return "#e2e8f0";
}

function linkStroke(l: GraphLink, selectedLinkId: string | null): string {
  if (l.id === selectedLinkId) return "#0ea5e9";
  // Apply stance colors for jurorConcept links (always has a stance, defaults to neutral)
  if (l.kind === "jurorConcept") {
    return stanceColor(l.stance ?? "neutral");
  }
  // Different colors for other link types
  if (l.kind === "jurorJuror") return "#6366f1"; // Indigo for juror similarity
  if (l.kind === "conceptConcept") return "#8b5cf6"; // Purple for concept similarity
  return "#64748b"; // Neutral gray fallback
}

function linkWidth(l: GraphLink): number {
  // Ensure minimum visible width
  return Math.max(2.5, 1.5 + 8 * clamp(l.weight, 0, 1));
}

export function ForceGraph({
  nodes,
  links,
  width,
  height,
  selectedNodeId,
  selectedLinkId,
  onNodeClick,
  onLinkClick,
  onNodeDoubleClick,
}: ForceGraphProps) {
  const { simRef, tick } = useForceGraph(nodes, links, width, height, true);
  const svgRef = useRef<SVGSVGElement>(null);
  const transformGroupRef = useRef<SVGGElement>(null);
  const backgroundRectRef = useRef<SVGRectElement>(null);
  const draggingRef = useRef(false);
  
  // Use tick to ensure component re-renders when simulation updates coordinates
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = tick; // Force re-render on tick changes
  const getGraphCoords = (x: number, y: number) => {
    const tg = transformGroupRef.current;
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    if (tg) {
      const transform = select(tg).attr("transform");
      if (transform && transform !== "none") {
        const matrix = transform.match(/matrix\(([^)]+)\)/);
        if (matrix) {
          const values = matrix[1].split(",").map(parseFloat);
          scale = values[0] || 1;
          translateX = values[4] || 0;
          translateY = values[5] || 0;
        }
      }
    }
    return {
      x: (x - translateX) / scale,
      y: (y - translateY) / scale,
    };
  };

  // Attach zoom to background rect only (not SVG) to avoid interfering with node dragging
  useEffect(() => {
    if (!backgroundRectRef.current || !transformGroupRef.current) return;

    const rect = select(backgroundRectRef.current);
    const g = select(transformGroupRef.current);

    const zoomBehavior = zoom<SVGRectElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: { transform: ZoomTransform }) => {
        g.attr("transform", event.transform.toString());
      });

    rect.call(zoomBehavior);

    return () => {
      rect.on(".zoom", null);
    };
  }, [width, height]);

  // Setup drag behavior for nodes - using callback refs to attach when nodes are rendered
  const nodeRefs = useRef<Map<string, SVGGElement>>(new Map());

  return (
    <svg ref={svgRef} width={width} height={height} className="absolute inset-0">
      <defs>
        <pattern
          id="grid"
          width="25"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 25 0 L 0 0 0 25"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {/* Grid Background - zoom attached here via useEffect to avoid interfering with nodes */}
      <rect 
        ref={backgroundRectRef}
        width={width} 
        height={height} 
        fill="url(#grid)" 
        style={{ cursor: "grab" }}
      />

      {/* Transform Group for Zoom/Pan */}
      <g ref={transformGroupRef}>
        {/* Links */}
        <g>
          {links.map((l) => {
            // Handle both string and object sources/targets
            const sourceId = typeof l.source === "string" ? l.source : l.source?.id ?? String(l.source);
            const targetId = typeof l.target === "string" ? l.target : l.target?.id ?? String(l.target);
            
            const s = nodes.find((n) => n.id === sourceId);
            const t = nodes.find((n) => n.id === targetId);
            
            if (!s || !t) return null;
            
            // Ensure coordinates are valid numbers and not at default position
            const x1 = typeof s.x === "number" && isFinite(s.x) ? s.x : null;
            const y1 = typeof s.y === "number" && isFinite(s.y) ? s.y : null;
            const x2 = typeof t.x === "number" && isFinite(t.x) ? t.x : null;
            const y2 = typeof t.y === "number" && isFinite(t.y) ? t.y : null;
            
            // Skip rendering if coordinates are invalid or not yet set
            if (x1 === null || y1 === null || x2 === null || y2 === null) return null;
            
            // Skip if both points are at the same location (invisible line)
            if (x1 === x2 && y1 === y2) return null;
            
            return (
              <line
                key={l.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={linkStroke(l, selectedLinkId)}
                strokeWidth={linkWidth(l)}
                strokeOpacity={l.id === selectedLinkId ? 1.0 : 0.85}
                strokeLinecap="round"
                strokeLinejoin="round"
                onClick={() => onLinkClick(l)}
                style={{ cursor: "pointer" }}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((n) => (
            <g
              key={n.id}
              ref={(el) => {
                if (el) {
                  nodeRefs.current.set(n.id, el);
                  // Attach drag handler immediately when ref is set
                  if (simRef.current) {
                    const sim = simRef.current;
                    const dragHandler = drag<SVGGElement, GraphNode>()
                      .on("start", function (event) {
                        event.sourceEvent?.stopPropagation?.();
                        draggingRef.current = false;
                        if (!event.active) sim.alphaTarget(0.3).restart();
                        const node = event.subject as GraphNode;
                        node.fx = node.x;
                        node.fy = node.y;
                        select(this).style("cursor", "grabbing");
                      })
                      .on("drag", function (event) {
                        event.sourceEvent?.stopPropagation?.();
                        draggingRef.current = true;
                        const node = event.subject as GraphNode;
                        const coords = getGraphCoords(event.x, event.y);
                        node.fx = coords.x;
                        node.fy = coords.y;
                        if (sim.alpha() < 0.1) sim.alpha(0.1).restart();
                      })
                      .on("end", function (event) {
                        if (!event.active) sim.alphaTarget(0);
                        select(this).style("cursor", "grab");
                        draggingRef.current = false;
                      });
                    select(el).datum(n).call(dragHandler);
                  }
                } else {
                  nodeRefs.current.delete(n.id);
                }
              }}
              className="node-group"
              transform={`translate(${n.x ?? 0}, ${n.y ?? 0})`}
              onClick={(e) => {
                if (draggingRef.current) {
                  e.preventDefault();
                  draggingRef.current = false;
                  return;
                }
                onNodeClick(n);
              }}
              onDoubleClick={() => onNodeDoubleClick(n, simRef, width, height)}
              onContextMenu={(e) => {
                e.preventDefault();
                // Right-click to unpin the node
                n.fx = null;
                n.fy = null;
                if (simRef.current) simRef.current.alpha(0.3).restart();
              }}
              style={{ cursor: "grab" }}
            >
              <circle
                r={Math.max(10, n.size)}
                fill={nodeFill(n)}
                stroke={nodeStroke(n, selectedNodeId)}
                strokeWidth={n.id === selectedNodeId ? 3 : 2}
              />
              <text x={0} y={Math.max(10, n.size) + 14} textAnchor="middle" fontSize={12} fill="#0f172a">
                {n.label}
              </text>
              {typeof n.fx === "number" && typeof n.fy === "number" && (
                <text x={0} y={4} textAnchor="middle" fontSize={10} fill="#0ea5e9">
                  pinned
                </text>
              )}
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}

