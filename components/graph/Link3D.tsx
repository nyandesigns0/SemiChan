"use client";

import { useMemo, useRef, useState } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { GraphLink, GraphNode } from "@/types/graph";
import type { Stance } from "@/types/nlp";

interface Link3DProps {
  link: GraphLink;
  nodes: Map<string, GraphNode>;
  isSelected: boolean;
  onClick: (link: GraphLink) => void;
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

export function Link3D({ link, nodes, isSelected, onClick }: Link3DProps) {
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
  
  const color = isSelected ? "#fbbf24" : hovered ? "#94a3b8" : baseColor;
  
  // Line width based on weight
  const lineWidth = Math.max(1, Math.min(4, link.weight * 10));
  
  return (
    <group
      onClick={() => onClick(link)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <Line
        points={points}
        color={color}
        lineWidth={isSelected || hovered ? lineWidth * 1.5 : lineWidth}
        opacity={isSelected ? 1 : hovered ? 0.8 : 0.6}
        transparent
      />
      
      {/* Invisible wider line for easier clicking */}
      <Line
        points={points}
        color="transparent"
        lineWidth={10}
        transparent
        opacity={0}
      />
    </group>
  );
}




