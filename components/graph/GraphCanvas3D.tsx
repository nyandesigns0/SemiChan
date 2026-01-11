"use client";

import { useRef, useState, useMemo, useCallback, Suspense, memo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, PerspectiveCamera, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { FileText, Play, FastForward, SkipBack } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Node3D } from "./Node3D";
import { Link3D } from "./Link3D";
import { Graph3DControls } from "./Graph3DControls";
import { GraphLegend } from "./GraphLegend";
import { generateSymmetricAxisDirections, AxisDirection } from "@/lib/graph/dimensionality-reduction";
import { getAxisColors } from "@/lib/utils/graph-color-utils";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { AnalysisCheckpoint, AnalysisResult } from "@/types/analysis";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";

interface GraphCanvas3DProps {
  nodes: GraphNode[];
  links: GraphLink[];
  nodeVisibility: Map<string, number>;
  linkVisibility: Map<string, number>;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onNodeClick: (node: GraphNode, event?: MouseEvent) => void;
  onLinkClick: (link: GraphLink, event?: MouseEvent) => void;
  onNodeDoubleClick: (node: GraphNode) => void;
  onDeselect: () => void;
  empty: boolean;
  checkpoints?: AnalysisCheckpoint[];
  insights?: Record<string, ConceptInsight>;
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  onToggleAxisLabelAI?: (enabled: boolean) => void;
  onRefreshAxisLabels?: () => void;
  isRefreshingAxisLabels?: boolean;
  analysis?: AnalysisResult | null;
  filteredNodesCount?: number;
  filteredLinksCount?: number;
  checkpointIndex?: number;
  onCheckpointIndexChange?: (index: number) => void;
  showAxes?: boolean;
  onToggleAxes?: (show: boolean) => void;
  showGraph?: boolean;
  onToggleGraph?: (show: boolean) => void;
  numDimensions?: number;
  apiCallCount?: number;
  apiCostTotal?: number;
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

// Axis end labels component - memoized to prevent unnecessary re-renders
const DynamicAxisLabel = ({ 
  position, 
  label, 
  subLabel, 
  colorClass, 
  textColorClass, 
  borderColorClass,
  customColor
}: { 
  position: [number, number, number]; 
  label: string; 
  subLabel?: string;
  colorClass?: string; 
  textColorClass?: string; 
  borderColorClass?: string;
  customColor?: string;
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const { camera } = useThree();
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const labelPos = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame(() => {
    const distToCamera = labelPos.distanceTo(camera.position);
    const originDistToCamera = origin.distanceTo(camera.position);
    
    // If the label is significantly further than the origin, it's on the "back side"
    // We use a small threshold (1.0) to prevent rapid switching at the boundary
    const shouldBeVisible = distToCamera < originDistToCamera + 1.0;
    
    if (shouldBeVisible !== isVisible) {
      setIsVisible(shouldBeVisible);
    }
  });

  return (
    <Html
      position={position}
      center
      distanceFactor={12}
      pointerEvents="none"
      zIndexRange={[0, 0]}
      style={{ zIndex: 0 }}
    >
      <div 
        className={cn(
          "flex flex-col items-center gap-1 transition-opacity duration-300",
          !customColor && colorClass
        )}
        style={{ 
          opacity: isVisible ? 1 : 0,
          pointerEvents: "none",
          userSelect: "none"
        }}
      >
        <div 
          className={cn(
            "px-1 py-0.5 rounded text-[9px] font-bold text-white shadow-sm border border-white/20",
            !customColor && colorClass
          )}
          style={customColor ? { backgroundColor: customColor } : {}}
        >
          {isVisible ? label : " "}
        </div>
        {subLabel && (
          <div 
            className={cn(
              "px-2 py-0.5 rounded bg-white/90 text-[9px] font-bold shadow-sm border whitespace-nowrap",
              !customColor && (textColorClass || "text-slate-600"),
              !customColor && (borderColorClass || "border-slate-100")
            )}
            style={customColor ? { color: customColor, borderColor: customColor + "40" } : {}}
          >
            {isVisible ? subLabel : " "}
          </div>
        )}
      </div>
    </Html>
  );
};

const MultiAxisLabels = memo(function MultiAxisLabels({ 
  visible, 
  axisLabels, 
  enableAI,
  numDimensions,
  axisDirections
}: { 
  visible: boolean; 
  axisLabels?: AnalysisResult["axisLabels"];
  enableAI?: boolean;
  numDimensions: number;
  axisDirections: AxisDirection[];
}) {
  if (!visible || !axisLabels) return null;
  const size = 10;
  const offset = 1.4;
  const axisColors = getAxisColors(numDimensions);
  
  // Helper to get display label
  const getLabel = (axisIdx: string, end: "negative" | "positive") => {
    const data = axisLabels[axisIdx];
    if (!data) return "";
    if (enableAI) {
      return end === "negative" 
        ? data.synthesizedNegative || data.negative 
        : data.synthesizedPositive || data.positive;
    }
    return end === "negative" ? data.negative : data.positive;
  };
  
  return (
    <group>
      {axisDirections.map((dir, i) => {
        const axisIdx = i.toString();
        const color = axisColors[i];
        
        return (
          <group key={axisIdx}>
            <DynamicAxisLabel 
              position={[dir.x * (size + offset), dir.y * (size + offset), dir.z * (size + offset)]} 
              label={`${i + 1}+`} 
              subLabel={getLabel(axisIdx, "positive")}
              customColor={color}
            />
            <DynamicAxisLabel 
              position={[-dir.x * (size + offset), -dir.y * (size + offset), -dir.z * (size + offset)]} 
              label={`${i + 1}-`} 
              subLabel={getLabel(axisIdx, "negative")}
              customColor={color}
            />
          </group>
        );
      })}
    </group>
  );
});

// New Component for rendering axis lines
function MultiAxisHelper({ 
  visible, 
  numDimensions, 
  axisDirections 
}: { 
  visible: boolean; 
  numDimensions: number; 
  axisDirections: AxisDirection[] 
}) {
  if (!visible) return null;
  const size = 10;
  const axisColors = getAxisColors(numDimensions);

  return (
    <group>
      {axisDirections.map((dir, i) => (
        <primitive 
          key={i}
          object={new THREE.ArrowHelper(
            new THREE.Vector3(dir.x, dir.y, dir.z),
            new THREE.Vector3(0, 0, 0),
            size,
            axisColors[i],
            0.5,
            0.2
          )}
        />
      ))}
      {/* Also render the negative directions */}
      {axisDirections.map((dir, i) => (
        <primitive 
          key={`neg-${i}`}
          object={new THREE.ArrowHelper(
            new THREE.Vector3(-dir.x, -dir.y, -dir.z),
            new THREE.Vector3(0, 0, 0),
            size,
            axisColors[i],
            0.5,
            0.2
          )}
        />
      ))}
    </group>
  );
}

// Scene content
function SceneContent({
  nodes,
  links,
  nodeVisibility,
  linkVisibility,
  selectedNodeId,
  selectedLinkId,
  onNodeClick,
  onLinkClick,
  onNodeDoubleClick,
  onDeselect,
  showGrid,
  showAxes,
  insights = {},
  axisLabels,
  enableAxisLabelAI,
  numDimensions = 3,
  showGraph = true,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  nodeVisibility: Map<string, number>;
  linkVisibility: Map<string, number>;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onNodeClick: (node: GraphNode, event?: MouseEvent) => void;
  onLinkClick: (link: GraphLink, event?: MouseEvent) => void;
  onNodeDoubleClick: (node: GraphNode) => void;
  onDeselect: () => void;
  showGrid: boolean;
  showAxes: boolean;
  insights?: Record<string, ConceptInsight>;
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  numDimensions?: number;
  showGraph?: boolean;
}) {
  // Create node lookup map
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const linksByNode = useMemo(() => {
    const map = new Map<string, GraphLink[]>();
    links.forEach((link) => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;
      if (!map.has(sourceId)) {
        map.set(sourceId, []);
      }
      if (!map.has(targetId)) {
        map.set(targetId, []);
      }
      map.get(sourceId)!.push(link);
      map.get(targetId)!.push(link);
    });
    return map;
  }, [links]);

  // Generate axis directions
  const axisDirections = useMemo(() => 
    generateSymmetricAxisDirections(numDimensions), 
    [numDimensions]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <hemisphereLight skyColor="#f8fafc" groundColor="#0b1220" intensity={0.45} />
      <directionalLight position={[10, 10, 5]} intensity={0.9} />
      <directionalLight position={[-10, -10, -5]} intensity={0.35} />
      <pointLight position={[0, 12, 6]} intensity={0.3} color="#fdfdfd" />
      <spotLight 
        position={[-12, 18, 10]} 
        angle={0.5} 
        penumbra={0.6} 
        intensity={0.25} 
        castShadow={false} 
      />
      
      {/* Environment for reflections */}
      <Environment preset="city" />
      
      {/* Invisible backdrop plane for deselecting on empty space click */}
      <mesh
        position={[0, 0, -20]}
        onClick={(e) => {
          // Only deselect if clicking directly on the backdrop (not through other objects)
          e.stopPropagation();
          onDeselect();
        }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} visible={false} />
      </mesh>
      
      {/* Grids */}
      {showGrid && (
        <group>
          {/* XZ Plane (Ground) */}
          <Grid
            position={[0, 0, 0]}
            args={[30, 30]}
            cellSize={0.3}
            cellThickness={0.3}
            cellColor="#b4c1d1"
            sectionSize={1.5}
            sectionThickness={0.6}
            sectionColor="#7f8fa3"
            fadeDistance={30}
            fadeStrength={1.5}
            followCamera={false}
            infiniteGrid
          />
          {/* XY Plane (Vertical) */}
          <Grid
            position={[0, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            args={[30, 30]}
            cellSize={0.3}
            cellThickness={0.3}
            cellColor="#b4c1d1"
            sectionSize={1.5}
            sectionThickness={0.6}
            sectionColor="#7f8fa3"
            fadeDistance={30}
            fadeStrength={1.5}
            followCamera={false}
            infiniteGrid
          />
          {/* YZ Plane (Side) */}
          <Grid
            position={[0, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            args={[30, 30]}
            cellSize={0.3}
            cellThickness={0.3}
            cellColor="#b4c1d1"
            sectionSize={1.5}
            sectionThickness={0.6}
            sectionColor="#7f8fa3"
            fadeDistance={30}
            fadeStrength={1.5}
            followCamera={false}
            infiniteGrid
          />
        </group>
      )}
      
      {/* Axes */}
      <MultiAxisHelper visible={showAxes} numDimensions={numDimensions} axisDirections={axisDirections} />
      <MultiAxisLabels 
        visible={showAxes} 
        axisLabels={axisLabels} 
        enableAI={enableAxisLabelAI} 
        numDimensions={numDimensions}
        axisDirections={axisDirections}
      />
      
      {/* Links */}
      {showGraph && links.map((link) => (
        <Link3D
          key={link.id}
          link={link}
          nodes={nodeMap}
          isSelected={selectedLinkId === link.id}
          opacity={linkVisibility.get(link.id) ?? 0}
          onClick={onLinkClick}
        />
      ))}
      
      {/* Nodes */}
      {showGraph && nodes.map((node) => (
        <Node3D
          key={node.id}
          node={node}
        isSelected={selectedNodeId === node.id}
        opacity={nodeVisibility.get(node.id) ?? 0}
        onClick={onNodeClick}
        onDoubleClick={onNodeDoubleClick}
        insight={insights[node.id]}
        connectedLinks={linksByNode.get(node.id) || []}
        allNodesMap={nodeMap}
      />
    ))}
    </>
  );
}

export function GraphCanvas3D({
  nodes,
  links,
  nodeVisibility,
  linkVisibility,
  selectedNodeId,
  selectedLinkId,
  onNodeClick,
  onLinkClick,
  onNodeDoubleClick,
  onDeselect,
  empty,
  checkpoints = [],
  insights = {},
  axisLabels,
  enableAxisLabelAI = false,
  onToggleAxisLabelAI,
  onRefreshAxisLabels,
  isRefreshingAxisLabels = false,
  analysis = null,
  filteredNodesCount = 0,
  filteredLinksCount = 0,
  checkpointIndex: checkpointIndexProp = -1,
  onCheckpointIndexChange,
  showAxes: showAxesProp = true,
  onToggleAxes,
  showGraph: showGraphProp = true,
  onToggleGraph,
  numDimensions = 3,
  apiCallCount = 0,
  apiCostTotal = 0,
}: GraphCanvas3DProps) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const [showGrid, setShowGrid] = useState(false);
  const projectionKey = useMemo(() => {
    const stats = analysis?.varianceStats;
    const lastCumulative = stats?.cumulativeVariances?.length ? stats.cumulativeVariances[stats.cumulativeVariances.length - 1] : "";
    const signature = stats ? `${stats.explainedVariances.join(",")}::${lastCumulative}` : "none";
    return `${numDimensions}-${signature}`;
  }, [analysis, numDimensions]);
  
  // Use props if provided, otherwise fall back to internal state (for backwards compatibility)
  const checkpointIndex = checkpointIndexProp;
  const showAxes = showAxesProp;
  const showGraph = showGraphProp;

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
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
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
                  key={projectionKey}
                  nodes={activeNodes}
                  links={activeLinks}
                  nodeVisibility={nodeVisibility}
                  linkVisibility={linkVisibility}
                  selectedNodeId={selectedNodeId}
                  selectedLinkId={selectedLinkId}
                  onNodeClick={onNodeClick}
                  onLinkClick={onLinkClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  onDeselect={onDeselect}
                  showGrid={showGrid}
                  showAxes={showAxes}
                  insights={insights}
                  axisLabels={axisLabels}
                  enableAxisLabelAI={enableAxisLabelAI}
                  numDimensions={numDimensions}
                  showGraph={showGraph}
                />
              </Suspense>
            </Canvas>
            
            {/* Controls overlay */}
              <Graph3DControls
                showGrid={showGrid}
                onToggleGrid={() => setShowGrid(!showGrid)}
                showAxes={showAxes}
                onToggleAxes={onToggleAxes ? () => onToggleAxes(!showAxes) : () => {}}
                showGraph={showGraph}
                onToggleGraph={onToggleGraph ? () => onToggleGraph(!showGraph) : () => {}}
                onResetCamera={handleResetCamera}
                axisLabels={axisLabels}
                enableAxisLabelAI={enableAxisLabelAI}
                onToggleAxisLabelAI={onToggleAxisLabelAI}
                onRefreshAxisLabels={onRefreshAxisLabels}
                isRefreshingAxisLabels={isRefreshingAxisLabels}
                numDimensions={numDimensions}
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
      <GraphLegend 
        analysis={analysis}
        filteredNodesCount={filteredNodesCount}
        filteredLinksCount={filteredLinksCount}
        numDimensions={numDimensions}
        apiCallCount={apiCallCount}
        apiCostTotal={apiCostTotal}
      />
    </>
  );
}
