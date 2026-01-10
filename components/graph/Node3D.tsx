"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { GraphNode, NodeType } from "@/types/graph";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";

// Helper function to lighten a hex color by mixing with white
function lightenColor(hex: string, amount: number): string {
  // Remove # if present
  const hexClean = hex.replace("#", "");
  // Convert to RGB
  const r = parseInt(hexClean.substring(0, 2), 16);
  const g = parseInt(hexClean.substring(2, 4), 16);
  const b = parseInt(hexClean.substring(4, 6), 16);
  // Mix with white (255, 255, 255)
  const newR = Math.round(r + (255 - r) * amount);
  const newG = Math.round(g + (255 - g) * amount);
  const newB = Math.round(b + (255 - b) * amount);
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

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
  let color: string;
  if (opacity === 0) {
    color = "#e2e8f0"; // Very light gray - no hover effect when not visible
  } else {
    const baseColor = isSelected ? colors.selected : hovered ? colors.hover : colors.base;
    // If opacity is 0.7 (connected node), lighten the color
    if (opacity === 0.7) {
      // Lighten the color by mixing with white (50% original, 50% white)
      color = lightenColor(baseColor, 0.5);
    } else {
      color = baseColor;
    }
  }
  // Mesh opacity: use the provided opacity value (0, 0.7, or 1.0), but keep at 1.0 for color visibility
  const meshOpacity = opacity === 0 ? 0.35 : 1.0;
  const radius = (node.size / 16) * 0.3; // Scale down for 3D space
  
  // Animate on hover/select (only if visible)
  useFrame(() => {
    if (!meshRef.current) return;
    const targetScale = (hovered || isSelected) && isVisible ? 1.2 : 1;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );
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
      {/* Node sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          handleClick(e.nativeEvent as MouseEvent);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.4}
          opacity={meshOpacity}
          transparent={meshOpacity < 1}
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
            color={!isVisible ? "#000000" : isSelected || hovered ? "#1e293b" : "#64748b"}
            anchorX="center"
            anchorY="bottom"
            maxWidth={3}
            textAlign="center"
          >
            {insight?.shortLabel || node.label}
          </Text>
        </Billboard>
      ) : null}
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius + 0.1, radius + 0.15, 32]} />
          <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
