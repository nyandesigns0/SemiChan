"use client";

import { useRef, useState, useMemo, useCallback, useEffect, Suspense, memo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, PerspectiveCamera, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { BrainCircuit, Play, FastForward, SkipBack, Loader2 } from "lucide-react";
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

type SamplePhase = "idle" | "loading" | "ready";

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
  expandedPrimaryConcepts?: Set<string>;
  onPrimaryConceptExpand?: (id: string) => void;
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
  anchorAxes?: import("@/types/anchor-axes").AnchorAxis[];
  anchorAxisScores?: AnalysisResult["anchorAxisScores"];
  selectedAnchorAxisId?: string | null;
  alignmentLinks?: GraphLink[];
  onLoadSample?: () => void;
  loadingSample?: boolean;
  loadingProgress?: number;
  loadingStep?: string;
  samplePhase?: SamplePhase;
  focusScale?: number;
  autoRotateDisabled?: boolean;
  onAutoRotateDisabled?: () => void;
  turntableEnabled?: boolean;
  onToggleTurntable?: () => void;
  onOpenUploadSidebar?: () => void;
}

// Camera controller component to handle reset
function CameraController({ 
  controlsRef,
  turntableEnabled = false,
  autoRotateSpeed = 0.6,
  autoRotateDisabled = false,
  onUserInteraction,
}: { 
  controlsRef: React.RefObject<OrbitControlsType>,
  turntableEnabled?: boolean;
  autoRotateSpeed?: number;
  autoRotateDisabled?: boolean;
  onUserInteraction?: () => void;
}) {
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !onUserInteraction) return;

    const handleStart = () => {
      if (turntableEnabled && !autoRotateDisabled) {
        onUserInteraction();
      }
    };

    controls.addEventListener("start", handleStart);

    return () => {
      controls.removeEventListener("start", handleStart);
    };
  }, [controlsRef, turntableEnabled, autoRotateDisabled, onUserInteraction]);

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
        autoRotate={turntableEnabled && !autoRotateDisabled}
        autoRotateSpeed={autoRotateSpeed}
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
  axisDirections,
  revealedAxisCount
}: { 
  visible: boolean; 
  axisLabels?: AnalysisResult["axisLabels"];
  enableAI?: boolean;
  numDimensions: number;
  axisDirections: AxisDirection[];
  revealedAxisCount: number;
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
      {axisDirections.slice(0, revealedAxisCount).map((dir, i) => {
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

interface NeuronLoaderProps {
  scale?: number;
  pointColor?: string;
  lineColor?: string;
  coreColor?: string;
  disableRotation?: boolean;
  animateClustering?: boolean;
  loadingProgress?: number;
  samplePhase?: "idle" | "loading" | "ready";
}

function NeuronLoader({
  scale = 1,
  pointColor = "#7dd3fc",
  lineColor = "#94a3b8",
  coreColor = "#1d4ed8",
  disableRotation = false,
  animateClustering = false,
  loadingProgress,
  samplePhase = "idle",
}: NeuronLoaderProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const phase2StartTime = useRef<number | null>(null);

  // Store initial positions, colors, sizes, and create color array
  const { initialPositions, initialColors, initialSizes, initialLinePositions } = useMemo(() => {
    const count = 80;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    // Generate colors: varied colors from the start
    const colorVariations = [
      new THREE.Color("#38bdf8"), // blue
      new THREE.Color("#fbbf24"), // amber
      new THREE.Color("#34d399"), // emerald
      new THREE.Color("#f472b6"), // pink
      new THREE.Color("#a78bfa"), // violet
      new THREE.Color("#fb7185"), // rose
    ];
    
    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 2.2 + Math.random() * 0.8;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Assign varied colors immediately
      const targetColor = colorVariations[i % colorVariations.length];
      colors[i * 3] = targetColor.r;
      colors[i * 3 + 1] = targetColor.g;
      colors[i * 3 + 2] = targetColor.b;
      
      // Assign varied sizes (0.12 to 0.25)
      sizes[i] = 0.12 + Math.random() * 0.13;
    }

    const connections = 120;
    const lineArray = new Float32Array(connections * 2 * 3);
    for (let i = 0; i < connections; i += 1) {
      const a = Math.floor(Math.random() * count);
      const b = Math.floor(Math.random() * count);
      lineArray[i * 6] = positions[a * 3];
      lineArray[i * 6 + 1] = positions[a * 3 + 1];
      lineArray[i * 6 + 2] = positions[a * 3 + 2];
      lineArray[i * 6 + 3] = positions[b * 3];
      lineArray[i * 6 + 4] = positions[b * 3 + 1];
      lineArray[i * 6 + 5] = positions[b * 3 + 2];
    }

    return { initialPositions: positions, initialColors: colors, initialSizes: sizes, initialLinePositions: lineArray };
  }, [pointColor]);

  // Store line connections for animation
  const lineConnections = useMemo(() => {
    const connections: Array<[number, number]> = [];
    const connectionsCount = 120;
    for (let i = 0; i < connectionsCount; i++) {
      const a = Math.floor(Math.random() * (initialPositions.length / 3));
      const b = Math.floor(Math.random() * (initialPositions.length / 3));
      connections.push([a, b]);
    }
    return connections;
  }, [initialPositions.length]);

  // Animation state
  const currentPositions = useRef<Float32Array>(new Float32Array(initialPositions));
  const currentColors = useRef<Float32Array>(new Float32Array(initialPositions.length));
  const currentSizes = useRef<Float32Array>(new Float32Array(initialSizes));
  const currentLinePositions = useRef<Float32Array>(new Float32Array(initialLinePositions));
  const previousSamplePhase = useRef<SamplePhase>(samplePhase);
  const phase1StartTime = useRef<number | null>(null);
  
  // Store color variations for glow effects
  const colorVariations = useMemo(() => [
    new THREE.Color("#38bdf8"), // blue
    new THREE.Color("#fbbf24"), // amber
    new THREE.Color("#34d399"), // emerald
    new THREE.Color("#f472b6"), // pink
    new THREE.Color("#a78bfa"), // violet
    new THREE.Color("#fb7185"), // rose
  ], []);
  
  // Initialize current colors and sizes with initial values (varied from start)
  useEffect(() => {
    currentColors.current.set(initialColors);
    currentSizes.current.set(initialSizes);
  }, [initialColors, initialSizes]);

  // Track phase transitions and reset animations
  useEffect(() => {
    if (previousSamplePhase.current === "idle" && samplePhase === "loading") {
      // Phase 1 starts when transitioning from idle to loading
      phase1StartTime.current = null;
    }
    if (previousSamplePhase.current === "loading" && samplePhase === "ready") {
      // Phase 2 starts when transitioning from loading to ready
      phase2StartTime.current = null;
    }
    previousSamplePhase.current = samplePhase;
  }, [samplePhase]);

  // Reset positions when samplePhase goes back to idle
  useEffect(() => {
    if (samplePhase === "idle") {
      currentPositions.current.set(initialPositions);
      currentLinePositions.current.set(initialLinePositions);
      phase1StartTime.current = null;
      phase2StartTime.current = null;
    }
  }, [samplePhase, initialPositions, initialLinePositions]);

  // Easing function (easeOutCubic) for Phase 2
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    
    // Rotation speed
    if (!disableRotation && groupRef.current) {
      groupRef.current.rotation.y = t * 0.08;
      groupRef.current.rotation.x = t * 0.05;
    }

    // Handle two-phase shrinking animation
    if (pointsRef.current && linesRef.current && (samplePhase === "loading" || samplePhase === "ready")) {
      const geometry = pointsRef.current.geometry;
      const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute;
      const colorAttribute = geometry.getAttribute("color") as THREE.BufferAttribute;
      const sizeAttribute = geometry.getAttribute("size") as THREE.BufferAttribute;

      let shrinkFactor = 1.0;

      if (samplePhase === "loading") {
        // Phase 1: Smooth animated shrink from 100% to 50% when loading starts
        if (phase1StartTime.current === null) {
          phase1StartTime.current = clock.getElapsedTime();
        }
        const phase1Duration = 1500; // 1.5 seconds for smooth transition
        const elapsed = (clock.getElapsedTime() - phase1StartTime.current) * 1000;
        const progress = Math.min(elapsed / phase1Duration, 1);
        const easedProgress = easeOutCubic(progress);
        // Animate from 1.0 (100%) to 0.5 (50%)
        shrinkFactor = 1.0 - easedProgress * 0.5;
      } else if (samplePhase === "ready") {
        // Phase 2: Shrink from 50% to 0% after loading completes
        if (phase2StartTime.current === null) {
          phase2StartTime.current = clock.getElapsedTime();
        }
        const phase2Duration = 700; // 700ms duration
        const elapsed = (clock.getElapsedTime() - phase2StartTime.current) * 1000;
        const progress = Math.min(elapsed / phase2Duration, 1);
        const easedProgress = easeOutCubic(progress);
        // Start at 0.5 (50%), end at 0.0 (0%)
        shrinkFactor = 0.5 * (1 - easedProgress);
      }

      const nodeCount = initialPositions.length / 3;
      const glowTimeOffset = 0.15; // Time offset between nodes for staggered effect
      const glowCycleSpeed = 2.5; // Speed of glow cycle

      for (let i = 0; i < nodeCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        
        // Apply shrink factor to positions
        currentPositions.current[ix] = initialPositions[ix] * shrinkFactor;
        currentPositions.current[iy] = initialPositions[iy] * shrinkFactor;
        currentPositions.current[iz] = initialPositions[iz] * shrinkFactor;
        
        // Staggered glow effect
        const glowOffset = i * glowTimeOffset;
        const glowPhase = (t * glowCycleSpeed + glowOffset) % (Math.PI * 2);
        const glowIntensity = Math.max(0, Math.sin(glowPhase));
        
        // Apply glow to colors (blend base color with white for glow)
        const baseColor = colorVariations[i % colorVariations.length];
        const glowColor = new THREE.Color().lerpColors(
          baseColor,
          new THREE.Color(1, 1, 1),
          glowIntensity * 0.6
        );
        
        currentColors.current[ix] = glowColor.r;
        currentColors.current[iy] = glowColor.g;
        currentColors.current[iz] = glowColor.b;
        
        // Sizes stay varied (unchanged)
        currentSizes.current[i] = initialSizes[i];
      }
      
      positionAttribute.array = currentPositions.current;
      positionAttribute.needsUpdate = true;
      if (colorAttribute) {
        colorAttribute.array = currentColors.current;
        colorAttribute.needsUpdate = true;
      }
      if (sizeAttribute) {
        sizeAttribute.array = currentSizes.current;
        sizeAttribute.needsUpdate = true;
      }

      // Update line positions based on stored connections
      const lineGeometry = linesRef.current.geometry;
      const linePositionAttribute = lineGeometry.getAttribute("position") as THREE.BufferAttribute;
      
      for (let i = 0; i < lineConnections.length; i++) {
        const [a, b] = lineConnections[i];
        const ai = a * 3;
        const bi = b * 3;
        const li = i * 6;
        
        currentLinePositions.current[li] = currentPositions.current[ai];
        currentLinePositions.current[li + 1] = currentPositions.current[ai + 1];
        currentLinePositions.current[li + 2] = currentPositions.current[ai + 2];
        currentLinePositions.current[li + 3] = currentPositions.current[bi];
        currentLinePositions.current[li + 4] = currentPositions.current[bi + 1];
        currentLinePositions.current[li + 5] = currentPositions.current[bi + 2];
      }
      
      linePositionAttribute.array = currentLinePositions.current;
      linePositionAttribute.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={currentPositions.current} count={initialPositions.length / 3} itemSize={3} />
          <bufferAttribute attach="attributes-color" array={currentColors.current} count={currentColors.current.length / 3} itemSize={3} />
          <bufferAttribute attach="attributes-size" array={currentSizes.current} count={initialSizes.length} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors={true}
          size={1}
          sizeAttenuation
          transparent
          opacity={0.9}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={currentLinePositions.current} count={initialLinePositions.length / 3} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={lineColor} transparent opacity={0.35 * (animateClustering ? 0.7 : 1)} />
      </lineSegments>
    </group>
  );
}

// New Component for rendering axis lines
function MultiAxisHelper({ 
  visible, 
  numDimensions, 
  axisDirections,
  revealedAxisCount
}: { 
  visible: boolean; 
  numDimensions: number; 
  axisDirections: AxisDirection[];
  revealedAxisCount: number;
}) {
  if (!visible) return null;
  const size = 10;
  const axisColors = getAxisColors(numDimensions);

  return (
    <group>
      {axisDirections.slice(0, revealedAxisCount).map((dir, i) => (
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
      {axisDirections.slice(0, revealedAxisCount).map((dir, i) => (
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
  expandedPrimaryConcepts = new Set(),
  onPrimaryConceptExpand = () => {},
  showGrid,
  showAxes,
  insights = {},
  axisLabels,
  enableAxisLabelAI,
  numDimensions = 3,
  showGraph = true,
  revealedNodeIds,
  revealLinks = true,
  revealedAxisCount = 0,
  focusScale = 1,
  autoRotateDisabled = false,
  onAutoRotateDisabled,
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
  expandedPrimaryConcepts?: Set<string>;
  onPrimaryConceptExpand?: (id: string) => void;
  showGrid: boolean;
  showAxes: boolean;
  insights?: Record<string, ConceptInsight>;
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  numDimensions?: number;
  showGraph?: boolean;
  revealedNodeIds?: Set<string>;
  revealLinks?: boolean;
  revealedAxisCount?: number;
  focusScale?: number;
  autoRotateDisabled?: boolean;
  onAutoRotateDisabled?: () => void;
}) {
  const scaledNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      x: (node.x ?? 0) * focusScale,
      y: (node.y ?? 0) * focusScale,
      z: (node.z ?? 0) * focusScale,
    }));
  }, [nodes, focusScale]);

  // Create node lookup map
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of scaledNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [scaledNodes]);

  // Filter nodes based on expansion
  const visibleNodes = useMemo(() => {
    return scaledNodes.filter(node => {
      if (node.layer === "detail" && !expandedPrimaryConcepts.has(node.parentConceptId || "")) {
        return false;
      }
      if (revealedNodeIds && revealedNodeIds.size > 0 && !revealedNodeIds.has(node.id)) {
        return false;
      }
      if (revealedNodeIds && revealedNodeIds.size === 0) {
        return false;
      }
      return true;
    });
  }, [scaledNodes, expandedPrimaryConcepts, revealedNodeIds]);

  // Filter links based on expansion
  const visibleLinks = useMemo(() => {
    if (!revealLinks) return [];
    return links.filter(link => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;
      const source = nodeMap.get(sourceId);
      const target = nodeMap.get(targetId);
      
      if (source?.layer === "detail" && !expandedPrimaryConcepts.has(source.parentConceptId || "")) return false;
      if (target?.layer === "detail" && !expandedPrimaryConcepts.has(target.parentConceptId || "")) return false;
      
      return true;
    });
  }, [links, nodeMap, expandedPrimaryConcepts, revealLinks]);

  const linksByNode = useMemo(() => {
    const map = new Map<string, GraphLink[]>();
    visibleLinks.forEach((link) => {
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
  }, [visibleLinks]);

  // Generate axis directions
  const axisDirections = useMemo(() => 
    generateSymmetricAxisDirections(numDimensions), 
    [numDimensions]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <hemisphereLight color="#f8fafc" groundColor="#0b1220" intensity={0.45} />
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
          if (onAutoRotateDisabled && !autoRotateDisabled) {
            onAutoRotateDisabled();
          }
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
      <MultiAxisHelper
        visible={showAxes}
        numDimensions={numDimensions}
        axisDirections={axisDirections}
        revealedAxisCount={revealedAxisCount}
      />
      <MultiAxisLabels 
        visible={showAxes} 
        axisLabels={axisLabels} 
        enableAI={enableAxisLabelAI} 
        numDimensions={numDimensions}
        axisDirections={axisDirections}
        revealedAxisCount={revealedAxisCount}
      />
      
      {/* Links */}
      {showGraph && visibleLinks.map((link) => (
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
      {showGraph && visibleNodes.map((node) => (
        <Node3D
          key={node.id}
          node={node}
        isSelected={selectedNodeId === node.id}
        isExpanded={expandedPrimaryConcepts.has(node.id)}
        onExpand={onPrimaryConceptExpand}
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
  expandedPrimaryConcepts,
  onPrimaryConceptExpand = () => {},
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
  anchorAxes,
  anchorAxisScores,
  selectedAnchorAxisId = null,
  alignmentLinks,
  onLoadSample,
  loadingSample = false,
  loadingProgress = 0,
  loadingStep = "Preparing sample...",
  samplePhase = "idle",
  focusScale: focusScaleProp,
  autoRotateDisabled = false,
  onAutoRotateDisabled,
  turntableEnabled = false,
  onToggleTurntable,
  onOpenUploadSidebar,
}: GraphCanvas3DProps) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [revealedAxisCount, setRevealedAxisCount] = useState(numDimensions);
  const [revealedNodeIds, setRevealedNodeIds] = useState<Set<string>>(new Set());
  const [revealLinks, setRevealLinks] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const focusScale = typeof focusScaleProp === "number" ? focusScaleProp : samplePhase === "ready" ? 0.55 : samplePhase === "loading" ? 0.8 : 1;
  const autoRotateSpeed = samplePhase === "ready" ? 1.6 : samplePhase === "loading" ? 1.1 : 0.35;
  const projectionKey = useMemo(() => {
    const stats = analysis?.varianceStats;
    const lastCumulative = stats?.cumulativeVariances?.length ? stats.cumulativeVariances[stats.cumulativeVariances.length - 1] : "";
    const signature = stats ? `${stats.explainedVariances.join(",")}::${lastCumulative}` : "none";
    return `${numDimensions}-${signature}`;
  }, [analysis, numDimensions]);
  const overlayedNodes = useMemo(() => {
    if (!selectedAnchorAxisId) return nodes;
    return nodes.map((n) => {
      let score: number | undefined;
      if (anchorAxisScores?.concepts?.[n.id]?.[selectedAnchorAxisId] !== undefined) {
        score = anchorAxisScores?.concepts?.[n.id]?.[selectedAnchorAxisId];
      } else if (anchorAxisScores?.jurors) {
        const name = n.id.replace(/^(juror:|designer:)/, "");
        if (anchorAxisScores.jurors[name]?.[selectedAnchorAxisId] !== undefined) {
          score = anchorAxisScores.jurors[name][selectedAnchorAxisId];
        }
      }
      if (typeof score === "number") {
        return { ...n, meta: { ...(n.meta || {}), anchorScore: score, anchorAxisId: selectedAnchorAxisId } };
      }
      return n;
    });
  }, [nodes, anchorAxisScores, selectedAnchorAxisId]);
  const mergedLinks = useMemo(() => [...links, ...(alignmentLinks || [])], [links, alignmentLinks]);
  
  // Use props if provided, otherwise fall back to internal state (for backwards compatibility)
  const checkpointIndex = checkpointIndexProp;
  const showAxes = showAxesProp;
  const showGraph = showGraphProp;

  const activeNodes = useMemo(() => {
    if (checkpointIndex >= 0 && checkpoints[checkpointIndex]) {
      return checkpoints[checkpointIndex].nodes;
    }
    return overlayedNodes;
  }, [overlayedNodes, checkpoints, checkpointIndex]);

  const activeLinks = useMemo(() => {
    if (checkpointIndex >= 0 && checkpoints[checkpointIndex]) {
      return checkpoints[checkpointIndex].links;
    }
    return mergedLinks;
  }, [mergedLinks, checkpoints, checkpointIndex]);

  // Ensure we always have a Set to avoid runtime reference errors
  const expandedConcepts = useMemo(
    () => expandedPrimaryConcepts ?? new Set<string>(),
    [expandedPrimaryConcepts]
  );
  
  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  // Mark model as ready after a short delay to allow 3D scene to initialize
  useEffect(() => {
    if (empty && samplePhase === "idle") {
      const timer = setTimeout(() => {
        setModelReady(true);
      }, 800); // Give the 3D scene time to initialize
      return () => clearTimeout(timer);
    } else {
      setModelReady(false);
    }
  }, [empty, samplePhase]);

  useEffect(() => {
    if (!analysis || empty) {
      setRevealedAxisCount(numDimensions);
      setRevealedNodeIds(new Set());
      setRevealLinks(false);
      return;
    }

    const allNodes = analysis.nodes ?? [];
    const importance = (node: GraphNode) => {
      const weight = (node.meta as any)?.weight;
      if (typeof weight === "number") return weight;
      const dx = node.x ?? 0;
      const dy = node.y ?? 0;
      const dz = node.z ?? 0;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return 1 / (distance + 0.001);
    };

    const conceptNodes = allNodes
      .filter((n) => n.type === "concept")
      .sort((a, b) => importance(b) - importance(a));
    const jurorNodes = allNodes
      .filter((n) => n.type === "juror" || n.type === "designer")
      .sort((a, b) => importance(b) - importance(a));
    const otherNodes = allNodes
      .filter((n) => n.type !== "concept" && n.type !== "juror" && n.type !== "designer")
      .sort((a, b) => importance(b) - importance(a));

    const revealIds = new Set<string>();
    let axisTimer: ReturnType<typeof setInterval> | null = null;
    let conceptTimer: ReturnType<typeof setInterval> | null = null;
    let jurorTimer: ReturnType<typeof setInterval> | null = null;

    setRevealLinks(false);
    setRevealedNodeIds(new Set());
    setRevealedAxisCount(0);

    const finishReveal = () => {
      setRevealLinks(true);
      setRevealedAxisCount(numDimensions);
      const all = new Set(allNodes.map((n) => n.id));
      setRevealedNodeIds(all);
    };

    const startJurorReveal = () => {
      const ordered = [...jurorNodes, ...otherNodes];
      if (ordered.length === 0) {
        finishReveal();
        return;
      }
      let index = 0;
      jurorTimer = setInterval(() => {
        if (index >= ordered.length) {
          if (jurorTimer) clearInterval(jurorTimer);
          finishReveal();
          return;
        }
        revealIds.add(ordered[index].id);
        setRevealedNodeIds(new Set(revealIds));
        index += 1;
      }, 70);
    };

    const startConceptReveal = () => {
      if (conceptNodes.length === 0) {
        startJurorReveal();
        return;
      }
      let index = 0;
      conceptTimer = setInterval(() => {
        if (index >= conceptNodes.length) {
          if (conceptTimer) clearInterval(conceptTimer);
          startJurorReveal();
          return;
        }
        revealIds.add(conceptNodes[index].id);
        setRevealedNodeIds(new Set(revealIds));
        index += 1;
      }, 70);
    };

    let axisIndex = 0;
    axisTimer = setInterval(() => {
      axisIndex += 1;
      setRevealedAxisCount(Math.min(numDimensions, axisIndex));
      if (axisIndex >= numDimensions) {
        if (axisTimer) clearInterval(axisTimer);
        startConceptReveal();
      }
    }, 500);

    return () => {
      if (axisTimer) clearInterval(axisTimer);
      if (conceptTimer) clearInterval(conceptTimer);
      if (jurorTimer) clearInterval(jurorTimer);
    };
  }, [analysis, empty, numDimensions]);

  return (
    <>
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        <Canvas
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            <CameraController
              controlsRef={controlsRef}
              turntableEnabled={turntableEnabled}
              autoRotateSpeed={autoRotateSpeed}
              autoRotateDisabled={autoRotateDisabled}
              onUserInteraction={onAutoRotateDisabled}
            />
            {empty ? (
              <NeuronLoader
                scale={6.75}
                pointColor={samplePhase === "idle" ? "#38bdf8" : "#fbbf24"}
                lineColor={samplePhase === "idle" ? "#60a5fa" : "#fcd34d"}
                coreColor={samplePhase === "idle" ? "#1d4ed8" : "#c026d3"}
                disableRotation={autoRotateDisabled}
                animateClustering={samplePhase === "loading"}
                loadingProgress={loadingProgress}
                samplePhase={samplePhase}
              />
            ) : (
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
                expandedPrimaryConcepts={expandedConcepts}
                onPrimaryConceptExpand={onPrimaryConceptExpand}
                showGrid={showGrid}
                showAxes={showAxes}
                insights={insights}
                axisLabels={axisLabels}
                enableAxisLabelAI={enableAxisLabelAI}
                numDimensions={numDimensions}
                showGraph={showGraph}
                revealedNodeIds={revealedNodeIds}
                revealLinks={revealLinks}
                revealedAxisCount={revealedAxisCount}
                focusScale={focusScale}
                autoRotateDisabled={autoRotateDisabled}
                onAutoRotateDisabled={onAutoRotateDisabled}
              />
            )}
          </Suspense>
        </Canvas>

        {empty && samplePhase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div className="max-w-3xl min-w-[32rem] min-h-[28rem] rounded-3xl border border-white/60 bg-white/85 p-8 shadow-2xl shadow-slate-200 backdrop-blur flex flex-col items-center justify-center">
              {!modelReady ? (
                <div className="flex flex-col items-center gap-6">
                  <Loader2 className="h-16 w-16 animate-spin text-slate-400" />
                  <p className="text-base font-medium text-slate-600">Loading 3D model...</p>
                </div>
              ) : (
                <>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg">
                    <BrainCircuit className="h-10 w-10" />
                  </div>
                  <h2 className="mt-6 text-2xl font-bold text-slate-900">
                    Explore juror sentiment in real time.
                  </h2>
                  <p className="mt-3 text-sm text-slate-500">
                    Interactive juror sentiment visualization in real time.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <Button
                      onClick={onLoadSample}
                      className="group relative inline-flex h-14 items-center justify-center rounded-2xl bg-slate-900 px-8 text-sm font-semibold text-white shadow-lg shadow-slate-300/60 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl"
                      disabled={!onLoadSample}
                    >
                      <span className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-slate-800/0 via-slate-700/40 to-slate-800/0 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />
                      Load Sample Dataset
                    </Button>
                    {onOpenUploadSidebar ? (
                      <Button
                        onClick={onOpenUploadSidebar}
                        className="group relative inline-flex h-14 items-center justify-center rounded-2xl bg-slate-900 px-8 text-sm font-semibold text-white shadow-lg shadow-slate-300/60 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl"
                      >
                        <span className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-slate-800/0 via-slate-700/40 to-slate-800/0 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />
                        Upload Your Data
                      </Button>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Or upload via sidebar
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {loadingSample && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full max-w-md rounded-3xl border border-slate-200/60 bg-white/90 px-6 py-5 text-center shadow-xl shadow-slate-200/60 backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Neural Pipeline
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900">
                {Math.round(loadingProgress)}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-600">
                {loadingStep}
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {!empty && (
          <>
            <Graph3DControls
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
              showAxes={showAxes}
              onToggleAxes={onToggleAxes ? () => onToggleAxes(!showAxes) : () => {}}
              showGraph={showGraph}
              onToggleGraph={onToggleGraph ? () => onToggleGraph(!showGraph) : () => {}}
              onResetCamera={handleResetCamera}
              turntableEnabled={turntableEnabled}
              onToggleTurntable={onToggleTurntable}
              axisLabels={axisLabels}
              enableAxisLabelAI={enableAxisLabelAI}
              onToggleAxisLabelAI={onToggleAxisLabelAI}
              onRefreshAxisLabels={onRefreshAxisLabels}
              isRefreshingAxisLabels={isRefreshingAxisLabels}
              numDimensions={numDimensions}
            />
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
