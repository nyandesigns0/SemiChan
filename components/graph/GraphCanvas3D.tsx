"use client";

import { useRef, useState, useMemo, useCallback, Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, PerspectiveCamera, Grid } from "@react-three/drei";
import { FileText, Play, FastForward, SkipBack } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Node3D } from "./Node3D";
import { Link3D } from "./Link3D";
import { Graph3DControls } from "./Graph3DControls";
import { GraphLegend } from "./GraphLegend";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { AnalysisCheckpoint } from "@/types/analysis";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

interface GraphCanvas3DProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onNodeClick: (node: GraphNode) => void;
  onLinkClick: (link: GraphLink) => void;
  onNodeDoubleClick: (node: GraphNode) => void;
  empty: boolean;
  checkpoints?: AnalysisCheckpoint[];
}

// Camera controller component to handle reset
function CameraController({ 
  controlsRef 
}: { 
  controlsRef: React.RefObject<OrbitControlsType> 
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.5}
        minDistance={5}
        maxDistance={100}
      />
    </>
  );
}

// Axes helper component
function AxesHelper({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <axesHelper args={[10]} />;
}

// Scene content
function SceneContent({
  nodes,
  links,
  selectedNodeId,
  selectedLinkId,
  onNodeClick,
  onLinkClick,
  onNodeDoubleClick,
  showGrid,
  showAxes,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onNodeClick: (node: GraphNode) => void;
  onLinkClick: (link: GraphLink) => void;
  onNodeDoubleClick: (node: GraphNode) => void;
  showGrid: boolean;
  showAxes: boolean;
}) {
  // Create node lookup map
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      
      {/* Environment for reflections */}
      <Environment preset="city" />
      
      {/* Grid */}
      {showGrid && (
        <Grid
          position={[0, -5, 0]}
          args={[30, 30]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#94a3b8"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#64748b"
          fadeDistance={50}
          fadeStrength={1}
          followCamera={false}
        />
      )}
      
      {/* Axes */}
      <AxesHelper visible={showAxes} />
      
      {/* Links */}
      {links.map((link) => (
        <Link3D
          key={link.id}
          link={link}
          nodes={nodeMap}
          isSelected={selectedLinkId === link.id}
          onClick={onLinkClick}
        />
      ))}
      
      {/* Nodes */}
      {nodes.map((node) => (
        <Node3D
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          onClick={onNodeClick}
          onDoubleClick={onNodeDoubleClick}
        />
      ))}
    </>
  );
}

export function GraphCanvas3D({
  nodes,
  links,
  selectedNodeId,
  selectedLinkId,
  onNodeClick,
  onLinkClick,
  onNodeDoubleClick,
  empty,
  checkpoints = [],
}: GraphCanvas3DProps) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [checkpointIndex, setCheckpointIndex] = useState(-1);
  
  // Reset checkpoint index when new analysis arrives
  useEffect(() => {
    if (checkpoints.length > 0) {
      setCheckpointIndex(checkpoints.length - 1);
    } else {
      setCheckpointIndex(-1);
    }
  }, [checkpoints]);

  const activeNodes = useMemo(() => {
    if (checkpointIndex >= 0 && checkpoints[checkpointIndex]) {
      return checkpoints[checkpointIndex].nodes;
    }
    return nodes;
  }, [nodes, checkpoints, checkpointIndex]);

  const activeLinks = useMemo(() => {
    if (checkpointIndex >= 0 && checkpoints[checkpointIndex]) {
      return checkpoints[checkpointIndex].links;
    }
    return links;
  }, [links, checkpoints, checkpointIndex]);
  
  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  return (
    <>
      <div className="relative h-full w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 to-slate-100">
        {empty ? (
          <div className="flex h-full items-center justify-center p-10 text-center">
            <div className="max-w-md">
              <FileText className="mx-auto h-7 w-7 text-slate-400" />
              <div className="mt-3 text-sm text-slate-600">
                Paste your juror comments (or upload a file) to build the 3D juror↔concept graph.
              </div>
            </div>
          </div>
        ) : (
          <>
            <Canvas
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 2]}
              style={{ background: "transparent" }}
            >
              <Suspense fallback={null}>
                <CameraController controlsRef={controlsRef} />
                <SceneContent
                  nodes={activeNodes}
                  links={activeLinks}
                  selectedNodeId={selectedNodeId}
                  selectedLinkId={selectedLinkId}
                  onNodeClick={onNodeClick}
                  onLinkClick={onLinkClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  showGrid={showGrid}
                  showAxes={showAxes}
                />
              </Suspense>
            </Canvas>
            
            {/* Pipeline Controls Overlay */}
            {checkpoints.length > 0 && (
              <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pipeline Trace</span>
                  <div className="flex items-center gap-1">
                    {checkpoints.map((cp, idx) => (
                      <button
                        key={cp.id}
                        onClick={() => setCheckpointIndex(idx)}
                        className={cn(
                          "h-2 w-8 rounded-full transition-all",
                          idx === checkpointIndex ? "bg-indigo-600" : "bg-slate-200 hover:bg-slate-300"
                        )}
                        title={cp.label}
                      />
                    ))}
                  </div>
                  <span className="min-w-[100px] text-[10px] font-bold text-slate-700">
                    {checkpoints[checkpointIndex]?.label ?? "Final Result"}
                  </span>
                </div>
              </div>
            )}
            
            {/* Controls overlay */}
            <Graph3DControls
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
              showAxes={showAxes}
              onToggleAxes={() => setShowAxes(!showAxes)}
              onResetCamera={handleResetCamera}
            />
            
            {/* Instructions */}
            <div className="absolute bottom-3 right-3 rounded-xl border bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  Drag to rotate
                </Badge>
                <span>Scroll to zoom. Click node/edge to inspect.</span>
              </div>
            </div>
          </>
        )}
      </div>
      <GraphLegend />
    </>
  );
}



