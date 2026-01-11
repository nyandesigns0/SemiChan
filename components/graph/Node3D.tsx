"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { getPCColor, lightenColor, mixColors, offsetColorByIdentity } from "@/lib/utils/graph-color-utils";
import { stanceColor } from "@/lib/utils/stance-utils";
import type { GraphLink, GraphNode, NodeType } from "@/types/graph";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";

// A simple seeded random number generator for deterministic procedural roots
function createPRNG(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return function() {
    hash = (hash + 0x6D2B79F5) | 0;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Node3DProps {
  node: GraphNode;
  isSelected: boolean;
  opacity: number; // 0 = grayed out, 0.7 = connected, 1.0 = selected/visible
  onClick: (node: GraphNode, event?: MouseEvent) => void;
  onDoubleClick: (node: GraphNode) => void;
  insight?: ConceptInsight;
  connectedLinks?: GraphLink[];
  allNodesMap?: Map<string, GraphNode>;
}

// Color scheme for node types
type NodeColorScheme = {
  base: string;
  hover: string;
  selected: string;
};

const defaultNodeColors: NodeColorScheme = {
  base: "#94a3b8",
  hover: "#cbd5f5",
  selected: "#0f172a",
};

const nodeColors: Record<NodeType, NodeColorScheme> = {
  juror: {
    base: "#3b82f6", // blue-500
    hover: "#60a5fa", // blue-400
    selected: "#1d4ed8", // blue-700
  },
  concept: {
    base: "#8b5cf6", // violet-500
    hover: "#a78bfa", // violet-400
    selected: "#6d28d9", // violet-700
  },
};

// Custom Shader for the soft "Photoshop" outer glow halo
const selectionHaloShader = {
  uniforms: {
    uColor: { value: new THREE.Color("#000000") }, // Black glow
    uOpacity: { value: 0.6 },
  },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec3 vNormal;
    void main() {
      // Sharper, more vibrant halo
      float intensity = pow(0.8 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
      gl_FragColor = vec4(uColor, intensity * uOpacity);
    }
  `
};

interface RootSegment {
  points: THREE.Vector3[];
  depth: number;
  startT: number; // When this segment starts growing (0-1)
  endT: number;   // When this segment finishes growing (0-1)
  color: string;
}

interface ProceduralRootProps {
  segment: RootSegment;
  globalGrowth: number;
  pulseOffset: number;
}

/**
 * Renders a single branching root with growth and firing pulse animation.
 */
function ProceduralRoot({ segment, globalGrowth, pulseOffset }: ProceduralRootProps) {
  const { points, startT, endT, color } = segment;
  
  // Calculate local growth for this specific segment
  const localGrowth = useMemo(() => {
    if (globalGrowth <= startT) return 0;
    if (globalGrowth >= endT) return 1;
    return (globalGrowth - startT) / (endT - startT);
  }, [globalGrowth, startT, endT]);

  // Calculate the subset of points based on growth
  const visiblePoints = useMemo(() => {
    if (localGrowth <= 0) return [points[0], points[0]];
    const count = Math.max(2, Math.floor(points.length * localGrowth));
    return points.slice(0, count);
  }, [points, localGrowth]);

  return (
    <group>
      {/* Roots tinted per juror contribution */}
      <Line
        points={visiblePoints}
        color={color}
        lineWidth={2.2}
        transparent
        opacity={1.0}
        depthWrite={false}
      />
    </group>
  );
}

export function Node3D({ 
  node, 
  isSelected, 
  opacity, 
  onClick, 
  onDoubleClick, 
  insight,
  connectedLinks = [],
  allNodesMap
}: Node3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Get position from node (3D coordinates from PCA)
  const position: [number, number, number] = useMemo(() => [
    node.x ?? 0,
    node.y ?? 0,
    node.z ?? 0,
  ], [node.x, node.y, node.z]);
  
  // Calculate size and color
  const colors = nodeColors[node.type as NodeType] ?? defaultNodeColors;
  const isVisible = opacity > 0;
  
  // Static random rotation for juror shapes to look more organic
  const rotation = useMemo(() => {
    if (node.type === "juror") {
      return [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number];
    }
    return [0, 0, 0] as [number, number, number];
  }, [node.id, node.type]);

  // Unified color logic for both jurors and concepts
  const nodeColor = useMemo(() => {
    if (node.pcValues) {
      return getPCColor(node.pcValues, colors.base);
    }
    return isSelected ? colors.selected : hovered ? colors.hover : colors.base;
  }, [node.pcValues, colors, isSelected, hovered]);

  let color: string;
  if (opacity === 0) {
    color = "#94a3b8"; // Slightly darker slate so transparency stays visible against light background
  } else if (opacity === 0.7) {
    color = lightenColor(nodeColor, 0.5);
  } else {
    color = nodeColor;
  }

  // Mesh opacity: 1.0 for selected/primary, 0.3 for others to create "x-ray" effect
  // This ensures both connected (0.7) and grayed out (0) nodes are transparent
  const meshOpacity = opacity === 1.0 ? 1.0 : 0.3;
  const isGhost = meshOpacity < 1.0;
  const radius = (node.size / 16) * 0.3; // Scale down for 3D space
  const labelText = insight?.shortLabel || node.label;
  const shouldShowLabel = isSelected || hovered || isVisible;
  
  // Procedural root structure generation
  const rootSegments = useMemo(() => {
    const rng = createPRNG(node.id);
    const jurorLinks = connectedLinks?.filter((link) => link.kind === "jurorConcept") ?? [];
    const jurorCount = jurorLinks.length;

    const contributions = jurorLinks
      .map((link) => {
        const sourceId = typeof link.source === "string" ? link.source : link.source.id;
        const targetId = typeof link.target === "string" ? link.target : link.target.id;
        const otherId = sourceId === node.id ? targetId : sourceId;
        const otherNode = otherId ? allNodesMap?.get(otherId) : undefined;
        const weight = Math.max(0, link.weight ?? 0);
        if (weight === 0) return null;

        const jurorColor = otherNode?.pcValues
          ? getPCColor(otherNode.pcValues, "#3b82f6")
          : "#3b82f6";

        return { color: jurorColor, weight, identity: otherNode?.label || otherId || "" };
      })
      .filter((c): c is { color: string; weight: number; identity: string } => !!c);

    const totalWeight = contributions.reduce((sum, c) => sum + c.weight, 0);
    const weightedContributions = totalWeight > 0
      ? contributions
          .map((c) => ({ ...c, ratio: c.weight / totalWeight }))
          .sort((a, b) => b.weight - a.weight)
      : [];

    const mainBranchCount = Math.floor(8 + Math.min(jurorCount * 1.5, 12));
    const branchColors: string[] = [];

    if (weightedContributions.length === 0) {
      for (let i = 0; i < mainBranchCount; i++) branchColors.push(nodeColor);
    } else {
      const targets = weightedContributions.map((c) => c.ratio * mainBranchCount);
      const counts = targets.map((t) => Math.floor(t));
      let remaining = mainBranchCount - counts.reduce((sum, c) => sum + c, 0);

      const remainderOrder = targets
        .map((t, i) => ({ i, remainder: t - counts[i] }))
        .sort((a, b) => b.remainder - a.remainder);

      for (let i = 0; i < remaining; i++) {
        const idx = remainderOrder[i]?.i ?? 0;
        counts[idx] = (counts[idx] ?? 0) + 1;
      }

      let placed = 0;
      while (placed < mainBranchCount) {
        let advanced = false;
        for (let i = 0; i < counts.length && placed < mainBranchCount; i++) {
          if (counts[i] > 0) {
            branchColors.push(weightedContributions[i].color);
            counts[i]--;
            placed++;
            advanced = true;
          }
        }
        if (!advanced) break;
      }

      while (branchColors.length < mainBranchCount) {
        branchColors.push(nodeColor);
      }
    }
    const segments: RootSegment[] = [];

    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
    const nodeWeight = (node.meta?.weight as number) || 10;

    const generateBranch = (
      start: THREE.Vector3,
      direction: THREE.Vector3,
      length: number,
      depth: number,
      currentNodeWeight: number,
      branchColor: string
    ) => {
      const segmentRes = 24;
      const controlPoints = [start.clone()];

      const midPoint = start.clone().add(direction.clone().multiplyScalar(length * 0.5));
      midPoint.add(new THREE.Vector3(
        (rng() - 0.5) * length * 0.45,
        (rng() - 0.5) * length * 0.45,
        (rng() - 0.5) * length * 0.45
      ));
      controlPoints.push(midPoint);

      const endPoint = start.clone().add(direction.clone().multiplyScalar(length));
      endPoint.add(new THREE.Vector3(
        (rng() - 0.5) * length * 0.2,
        (rng() - 0.5) * length * 0.2,
        (rng() - 0.5) * length * 0.2
      ));
      controlPoints.push(endPoint);

      const curve = new THREE.CatmullRomCurve3(controlPoints);
      const points = curve.getPoints(segmentRes);

      const startT = depth === 0 ? 0 : 0.6;
      const endT = depth === 0 ? 0.6 : 1.0;

      segments.push({
        points,
        depth,
        startT,
        endT,
        color: branchColor,
      });

      // Procedural branching based on weight
      // Level 0 -> Level 1 -> Level 2
      if (depth < 2) {
        const maxSubBranches = depth === 0
          ? Math.floor(1 + Math.min(currentNodeWeight / 15, 3)) // Up to 4 branches from trunk
          : Math.floor(1 + Math.min(currentNodeWeight / 30, 1)); // Up to 2 branches from sub-branches

        const subBranchCount = rng() > 0.3 ? maxSubBranches : 0;

        for (let i = 0; i < subBranchCount; i++) {
          const splitPoint = points[Math.floor(points.length * (0.6 + rng() * 0.3))];
          const splitDir = direction.clone();
          const angle = (rng() - 0.5) * 1.4;
          const axis = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
          splitDir.applyAxisAngle(axis, angle);
          generateBranch(splitPoint, splitDir, length * 0.65, depth + 1, currentNodeWeight, branchColor);
        }
      }
    };

    for (let i = 0; i < mainBranchCount; i++) {
      const branchColor = branchColors[i] ?? nodeColor;

      const t = i / mainBranchCount;
      const y = 1 - t * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;
      const dir = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).normalize();

      const start = dir.clone().multiplyScalar(radius);
      generateBranch(start, dir, radius * 0.7 + 0.4, 0, nodeWeight, branchColor);
    }

    return segments;
  }, [allNodesMap, connectedLinks, node.id, node.type, node.meta?.weight, radius, nodeColor]);

  const [growthProgress, setGrowthProgress] = useState(0);
  const lastSelectedRef = useRef(isSelected);

  useEffect(() => {
    if (isSelected && !lastSelectedRef.current) {
      setGrowthProgress(0);
    }
    lastSelectedRef.current = isSelected;
  }, [isSelected]);
  
  // Animate on hover/select (only if visible)
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const targetScale = (hovered || isSelected) && isVisible ? 1.2 : 1;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );

    if (isSelected) {
      // Growth animation
      if (growthProgress < 1) {
        setGrowthProgress(prev => Math.min(1, prev + delta * 1.2));
      }
    }
  });

  const pulseRef = useRef(0);
  useFrame((state, delta) => {
    if (isSelected) {
      pulseRef.current = (state.clock.elapsedTime * 0.8) % 1;
    }
  });
  
  // Handle click with debounce for double-click detection
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickEventRef = useRef<MouseEvent | undefined>(undefined);
  
  const handleClick = (event: MouseEvent) => {
    clickEventRef.current = event;
    if (clickTimeout.current) {
      // Double-click detected
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      onDoubleClick(node);
    } else {
      // Single click - wait to see if it's a double-click
      clickTimeout.current = setTimeout(() => {
        onClick(node, clickEventRef.current);
        clickTimeout.current = null;
        clickEventRef.current = undefined;
      }, 200);
    }
  };
  
  return (
    <group position={position}>
      {/* Node geometry - Cubes for jurors, Spheres for concepts */}
      <mesh
        ref={meshRef}
        rotation={rotation}
        onClick={(e) => {
          e.stopPropagation();
          handleClick(e.nativeEvent as MouseEvent);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {node.type === "juror" ? (
          <dodecahedronGeometry args={[radius * 0.8, 0]} />
        ) : (
          <sphereGeometry args={[radius, 32, 32]} />
        )}
        <meshPhysicalMaterial
          color={color}
          opacity={meshOpacity}
          transparent={true} // Always allow the material to blend
          depthWrite={!isGhost}
          roughness={isGhost ? 1 : 0.45}
          metalness={0.18}
          clearcoat={0.35}
          clearcoatRoughness={0.2}
          envMapIntensity={isGhost ? 0.3 : 0.8}
          emissive={isSelected ? color : "#000000"}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>
      {isSelected && (
        <mesh scale={[1.4, 1.4, 1.4]}>
          {node.type === "juror" ? (
            <dodecahedronGeometry args={[radius * 0.8, 0]} />
          ) : (
            <sphereGeometry args={[radius, 32, 32]} />
          )}
          <shaderMaterial
            attach="material"
            args={[selectionHaloShader]}
            transparent={true}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Node label - elevated card when selected, minimalist text otherwise */}
      {shouldShowLabel ? (
        isSelected ? (
          <Html
            position={[0, radius + 0.65, 0]}
            center
            distanceFactor={12}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <div className="flex items-center gap-2 rounded-lg border border-white/60 bg-white/95 px-3 py-1.5 text-[16px] leading-tight font-semibold text-slate-800 shadow-lg backdrop-blur-sm">
              <span
                className="h-2.5 w-2.5 rounded-full shadow-sm"
                style={{
                  backgroundColor: nodeColor,
                  boxShadow: `0 0 0 3px ${nodeColor}33`
                }}
              />
              <span className="whitespace-nowrap">{labelText}</span>
            </div>
          </Html>
        ) : (
          <Billboard
            follow={true}
            lockX={false}
            lockY={false}
            lockZ={false}
          >
            <Text
              position={[0, radius + 0.3, 0]}
              fontSize={0.25}
              color={!isVisible ? "#94a3b8" : hovered ? "#1e293b" : "#64748b"}
              fillOpacity={!isVisible ? 0.6 : 1}
              anchorX="center"
              anchorY="bottom"
              maxWidth={3}
              textAlign="center"
            >
              {labelText}
            </Text>
          </Billboard>
        )
      ) : null}
      
      {/* Selection branch highlight */}
      {isSelected && (
        <>
          <group>
            {rootSegments.map((segment, index) => (
              <ProceduralRoot 
                key={`root-${index}`} 
                segment={segment} 
                globalGrowth={growthProgress}
                pulseOffset={pulseRef.current + (index * 0.13)} // stagger the pulses
              />
            ))}
          </group>

          {/* Internal count/weight label */}
          <Billboard>
            <Text
              position={[0, 0, 0.01]} // Slightly forward to avoid Z-fighting with sphere surface
              fontSize={radius * 0.8}
              color="white"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {node.type === "concept" && node.meta?.weight 
                ? Math.round(node.meta.weight as number).toString() 
                : ""}
            </Text>
          </Billboard>
        </>
      )}
    </group>
  );
}
