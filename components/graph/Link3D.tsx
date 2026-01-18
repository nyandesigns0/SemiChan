"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Line2 } from "three-stdlib";
import type { GraphLink, GraphNode } from "@/types/graph";
import type { Stance } from "@/types/nlp";
import { LINK_VISUALIZATION } from "@/lib/utils/link-visualization-constants";
import { applyPowerCurve, buildEvidenceCountCache, computeEvidenceCountPercentile, computeWeightBounds, normalizeWeightByType } from "@/lib/utils/link-normalization";
import { lightenColor } from "@/lib/utils/graph-color-utils";

interface Link3DProps {
  link: GraphLink;
  nodes: Map<string, GraphNode>;
  isSelected: boolean;
  opacity: number; // 0 = grayed out, 1.0 = selected/visible/revealed
  onClick: (link: GraphLink, event?: MouseEvent) => void;
  allLinks?: GraphLink[];
}

// Color scheme for stance types
const stanceColors: Record<Stance, string> = {
  praise: "#22c55e",
  critique: "#ef4444",
  suggestion: "#f59e0b",
  neutral: "#94a3b8",
};

// Link kind colors
const kindColors: Record<GraphLink["kind"], string> = {
  jurorConcept: "#64748b",
  jurorJuror: "#3b82f6",
  conceptConcept: "#8b5cf6",
  jurorDesignerConcept: "#0ea5e9",
};

function adjustColorSaturation(hex: string, saturation: number): string {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  const adjusted = new THREE.Color().setHSL(
    hsl.h,
    Math.min(1, Math.max(0, hsl.s * saturation)),
    hsl.l
  );
  return `#${adjusted.getHexString()}`;
}

export function Link3D({ link, nodes, isSelected, opacity, onClick, allLinks = [] }: Link3DProps) {
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<Line2>(null);
  const linkOpacityRef = useRef(0);
  const lineWidthRef = useRef(0);

  const sourceId = typeof link.source === "string" ? link.source : link.source.id;
  const targetId = typeof link.target === "string" ? link.target : link.target.id;

  const sourceNode = nodes.get(sourceId);
  const targetNode = nodes.get(targetId);

  const weightBounds = useMemo(() => computeWeightBounds(allLinks), [allLinks]);
  const evidenceCache = useMemo(() => buildEvidenceCountCache(allLinks), [allLinks]);

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

  const baseColor = link.kind === "jurorConcept" && link.stance
    ? stanceColors[link.stance]
    : kindColors[link.kind] ?? "#64748b";

  const normalizedWeight = useMemo(
    () => normalizeWeightByType(link.weight, link.kind, allLinks, weightBounds),
    [link.weight, link.kind, allLinks, weightBounds]
  );
  const weightedCurve = useMemo(
    () => applyPowerCurve(normalizedWeight, LINK_VISUALIZATION.WIDTH.POWER_EXPONENT),
    [normalizedWeight]
  );
  const baseLineWidth = useMemo(
    () => LINK_VISUALIZATION.WIDTH.MIN + weightedCurve * (LINK_VISUALIZATION.WIDTH.MAX - LINK_VISUALIZATION.WIDTH.MIN),
    [weightedCurve]
  );
  lineWidthRef.current = baseLineWidth;

  const evidencePercentile = useMemo(
    () => computeEvidenceCountPercentile(link, allLinks, evidenceCache),
    [link, allLinks, evidenceCache]
  );
  const evidenceCount = link.evidenceCount ?? link.evidenceIds?.length ?? 0;
  const baseOpacity = evidenceCount === 0
    ? LINK_VISUALIZATION.OPACITY.NO_EVIDENCE
    : LINK_VISUALIZATION.OPACITY.MIN +
      evidencePercentile * (LINK_VISUALIZATION.OPACITY.MAX - LINK_VISUALIZATION.OPACITY.MIN);

  const visibilityMultiplier = Math.max(0, Math.min(1, opacity));
  const saturationMultiplier = 0.5 + normalizedWeight * 0.5;
  const saturatedColor = adjustColorSaturation(baseColor, saturationMultiplier);

  let displayColor = saturatedColor;
  if (visibilityMultiplier === 0) {
    displayColor = hovered ? "#64748b" : "#94a3b8";
  } else if (isSelected) {
    displayColor = "#fbbf24";
  } else if (hovered) {
    displayColor = lightenColor(saturatedColor, 0.35);
  } else if (visibilityMultiplier < 1) {
    displayColor = lightenColor(saturatedColor, 0.45);
  }

  const computedOpacity = isSelected
    ? LINK_VISUALIZATION.OPACITY.SELECTED_OVERRIDE
    : Math.min(LINK_VISUALIZATION.OPACITY.MAX, baseOpacity * visibilityMultiplier);
  linkOpacityRef.current = computedOpacity;
  const isGhost = !isSelected && visibilityMultiplier < 1;

  const finalLineWidth = visibilityMultiplier > 0 && (isSelected || hovered)
    ? baseLineWidth * LINK_VISUALIZATION.WIDTH.HOVER_SCALE
    : baseLineWidth;

  useEffect(() => {
    linkOpacityRef.current = computedOpacity;
  }, [computedOpacity]);

  useEffect(() => {
    lineWidthRef.current = finalLineWidth;
  }, [finalLineWidth]);

  useFrame(() => {
    if (link.structuralRole !== "bridge" || !glowRef.current) return;
    const material = glowRef.current.material as unknown as (THREE.LineBasicMaterial & { linewidth?: number }) | undefined;
    if (!material) return;

    const distance = camera.position.length();
    const normalizedZoom = 1 - Math.min(1, distance / LINK_VISUALIZATION.PATTERN.MAX_CAMERA_DISTANCE);
    if (normalizedZoom < LINK_VISUALIZATION.PATTERN.MIN_ZOOM_FOR_BRIDGE || linkOpacityRef.current <= 0) {
      if (material.opacity !== 0) {
        material.opacity = 0;
        material.needsUpdate = true;
      }
      return;
    }

    const targetOpacity = Math.min(
      LINK_VISUALIZATION.PATTERN.MAX_GLOW_OPACITY,
      linkOpacityRef.current * LINK_VISUALIZATION.ANIMATION.GLOW_INTENSITY_MIN
    );
    material.opacity = targetOpacity;
    material.linewidth = lineWidthRef.current * LINK_VISUALIZATION.WIDTH.BRIDGE_GLOW_SCALE;
    material.needsUpdate = true;
  });

  return (
    <group
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {link.structuralRole === "bridge" && (
        <Line
          ref={glowRef}
          points={points}
          color={displayColor}
          lineWidth={baseLineWidth * LINK_VISUALIZATION.WIDTH.BRIDGE_GLOW_SCALE}
          opacity={0}
          transparent
          depthWrite={false}
          depthTest={true}
          renderOrder={-1}
        />
      )}

      <Line
        points={points}
        color={displayColor}
        lineWidth={finalLineWidth}
        opacity={computedOpacity}
        transparent
        depthWrite={false}
        depthTest={true}
        renderOrder={0}
        onClick={(e) => {
          e.stopPropagation();
          onClick(link, e.nativeEvent as MouseEvent);
        }}
      />

      <Line
        points={points}
        color="#000000"
        lineWidth={10}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        renderOrder={1}
        onClick={(e) => {
          e.stopPropagation();
          onClick(link, e.nativeEvent as MouseEvent);
        }}
      />
    </group>
  );
}
