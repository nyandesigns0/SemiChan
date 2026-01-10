"use client";

import { useMemo, useRef, useState } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { GraphLink, GraphNode } from "@/types/graph";
import type { Stance } from "@/types/nlp";

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

interface Link3DProps {
  link: GraphLink;
  nodes: Map<string, GraphNode>;
  isSelected: boolean;
  opacity: number; // 0 = grayed out, 0.7 = connected, 1.0 = selected/visible
  onClick: (link: GraphLink, event?: MouseEvent) => void;
}

// Color scheme for stance types
const stanceColors: Record<Stance, string> = {
  praise: "#22c55e", // green-500
  critique: "#ef4444", // red-500
  suggestion: "#f59e0b", // amber-500
  neutral: "#94a3b8", // slate-400
};

// Link kind colors
const kindColors = {
  jurorConcept: "#64748b", // slate-500
  jurorJuror: "#3b82f6", // blue-500
  conceptConcept: "#8b5cf6", // violet-500
};

export function Link3D({ link, nodes, isSelected, opacity, onClick }: Link3DProps) {
  const [hovered, setHovered] = useState(false);
  
  // Get source and target nodes
  const sourceId = typeof link.source === "string" ? link.source : link.source.id;
  const targetId = typeof link.target === "string" ? link.target : link.target.id;
  
  const sourceNode = nodes.get(sourceId);
  const targetNode = nodes.get(targetId);
  
  // Calculate positions
  const points = useMemo(() => {
    if (!sourceNode || !targetNode) return null;
    
    const start = new THREE.Vector3(
      sourceNode.x ?? 0,
      sourceNode.y ?? 0,
      sourceNode.z ?? 0
    );
    
    const end = new THREE.Vector3(
      targetNode.x ?? 0,
      targetNode.y ?? 0,
      targetNode.z ?? 0
    );
    
    return [start, end];
  }, [sourceNode, targetNode]);
  
  if (!points || !sourceNode || !targetNode) return null;
  
  // Determine color based on link kind and stance
  const baseColor = link.kind === "jurorConcept" && link.stance
    ? stanceColors[link.stance]
    : kindColors[link.kind];
  
  const isVisible = opacity > 0;
  let color = baseColor;
  if (opacity === 0) {
    color = hovered ? "#64748b" : "#e2e8f0"; // Darker slate on hover when grayed out
  } else if (isSelected) {
    color = "#fbbf24";
  } else if (hovered) {
    color = "#94a3b8";
  } else if (opacity === 0.7) {
    // Lighten the color for connected links (70% opacity means connected)
    color = lightenColor(baseColor, 0.5);
  }
  
  // Link opacity: keep at 1.0 for color visibility, except when grayed out
  const linkOpacity = opacity === 0
    ? (isSelected ? 0.4 : (hovered ? 0.6 : 0.25)) // Increased opacity on hover when grayed out
    : 1.0;

  // Line width based on weight
  const lineWidth = Math.max(1, Math.min(4, link.weight * 10));
  
  // Apply hover/select width increase
  // Note: For grayed out elements, we follow the node behavior of not changing size on hover
  const finalLineWidth = isVisible && (isSelected || hovered) ? lineWidth * 1.5 : lineWidth;
  
  return (
    <group
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <Line
        points={points}
        color={color}
        lineWidth={finalLineWidth}
        opacity={linkOpacity}
        transparent={linkOpacity < 1}
        onClick={(e) => {
          e.stopPropagation();
          onClick(link, e.nativeEvent as MouseEvent);
        }}
      />
      
      {/* Invisible wider line for easier clicking */}
      <Line
        points={points}
        color="#000000"
        lineWidth={10}
        transparent
        opacity={0}
        onClick={(e) => {
          e.stopPropagation();
          onClick(link, e.nativeEvent as MouseEvent);
        }}
      />
    </group>
  );
}




