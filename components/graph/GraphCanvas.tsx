"use client";

import { useRef, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ForceGraph } from "./ForceGraph";
import type { GraphNode, GraphLink } from "@/types/graph";

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onNodeClick: (node: GraphNode) => void;
  onLinkClick: (link: GraphLink) => void;
  onNodeDoubleClick: (node: GraphNode, simRef: React.MutableRefObject<any>, width: number, height: number) => void;
  empty: boolean;
}

export function GraphCanvas({
  nodes,
  links,
  selectedNodeId,
  selectedLinkId,
  onNodeClick,
  onLinkClick,
  onNodeDoubleClick,
  empty,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(900);
  const [h, setH] = useState(620);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setW(Math.max(620, Math.floor(rect.width)));
      setH(Math.max(520, Math.floor(rect.height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden rounded-2xl border bg-white"
      >
        {empty ? (
          <div className="flex h-full items-center justify-center p-10 text-center">
            <div className="max-w-md">
              <FileText className="mx-auto h-7 w-7 text-slate-400" />
              <div className="mt-3 text-sm text-slate-600">
                Paste your juror comments (or upload a file) to build the juror↔concept graph.
              </div>
            </div>
          </div>
        ) : (
          <>
            <ForceGraph
              nodes={nodes}
              links={links}
              width={w}
              height={h}
              selectedNodeId={selectedNodeId}
              selectedLinkId={selectedLinkId}
              onNodeClick={onNodeClick}
              onLinkClick={onLinkClick}
              onNodeDoubleClick={(node, simRef) => onNodeDoubleClick(node, simRef, w, h)}
            />
            <div className="absolute bottom-3 left-3 rounded-xl border bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  Drag is implicit
                </Badge>
                <span>Click node/edge to inspect. Double-click node to pin/unpin.</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

