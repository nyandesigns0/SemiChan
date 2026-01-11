"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { getPCColor, lightenColor } from "@/lib/utils/graph-color-utils";
import type { GraphNode, NodeType } from "@/types/graph";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";

interface Node3DProps {
  node: GraphNode;
  isSelected: boolean;
  opacity: number; // 0 = grayed out, 0.7 = connected, 1.0 = selected/visible
  onClick: (node: GraphNode, event?: MouseEvent) => void;
  onDoubleClick: (node: GraphNode) => void;
  insight?: ConceptInsight;
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

export function Node3D({ node, isSelected, opacity, onClick, onDoubleClick, insight }: Node3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectionCageRef = useRef<THREE.Group>(null);
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
  const cageRadius = radius + 0.55;
  const cageColor = "#fbbf24";
  const cageRingOrientations: [number, number, number][] = [
    [Math.PI / 4, 0, 0],
    [0, Math.PI / 3, 0],
  ];
  const highlightColor = "#000000";
  const selectionPulseOffset = useMemo(() => Math.random() * Math.PI * 2, []);
  
  // Animate on hover/select (only if visible)
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const targetScale = (hovered || isSelected) && isVisible ? 1.2 : 1;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );

    if (selectionCageRef.current && isSelected) {
      const time = state.clock.getElapsedTime();
      const pulse = 1 + Math.sin(time * 2.6 + selectionPulseOffset) * 0.07;
      selectionCageRef.current.scale.setScalar(pulse);
      selectionCageRef.current.rotation.y += delta * 0.5;
      selectionCageRef.current.rotation.x += delta * 0.45;
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
      
      {/* Node label - always faces camera */}
      {isVisible || hovered ? (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
        >
          <Text
            position={[0, radius + 0.3, 0]}
            fontSize={0.25}
            color={!isVisible ? "#94a3b8" : isSelected || hovered ? "#1e293b" : "#64748b"}
            fillOpacity={!isVisible ? 0.6 : 1}
            anchorX="center"
            anchorY="bottom"
            maxWidth={3}
            textAlign="center"
          >
            {insight?.shortLabel || node.label}
          </Text>
        </Billboard>
      ) : null}
      
      {/* Selection cage highlight */}
      {isSelected && (
        <>
          <group ref={selectionCageRef}>
            {cageRingOrientations.map((rotation, index) => (
              <mesh key={`cage-ring-${index}`} rotation={rotation}>
                <torusGeometry args={[cageRadius, 0.02, 6, 60]} />
              <meshBasicMaterial
                color={highlightColor}
                transparent
                opacity={0.85}
                wireframe
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
              </mesh>
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
