import * as THREE from "three";

/**
 * Helper to generate consistent axis colors for a given number of dimensions.
 */
export function getAxisColors(numDimensions: number): string[] {
  const colors: string[] = [];
  // For 3 dimensions, use standard RGB colors
  if (numDimensions === 3) {
    return ["#ef4444", "#22c55e", "#3b82f6"]; // Red, Green, Blue
  }
  
  for (let i = 0; i < numDimensions; i++) {
    const hue = (i / numDimensions) * 360;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
}

/**
 * Mix colors based on Principal Component (PC) values to determine a node's visual "profile".
 */
export function getPCColor(pcValues: number[] | undefined, defaultColor: string = "#8b5cf6"): string {
  if (!pcValues || pcValues.length === 0) return defaultColor;
  
  const numDimensions = pcValues.length;
  const axisColors = getAxisColors(numDimensions);
  
  // 1. Normalize PC values (absolute values)
  const absPC = pcValues.map(Math.abs);
  const maxPC = Math.max(...absPC);
  if (maxPC === 0) return defaultColor;
  const normalized = absPC.map(v => v / maxPC);
  
  // 2. Identify strong axes (top 3)
  const indexed = normalized.map((val, i) => ({ val, i }));
  indexed.sort((a, b) => b.val - a.val);
  const topIndices = indexed.slice(0, 3).filter(x => x.val > 0.1);
  
  if (topIndices.length === 0) return defaultColor;
  
  // 3. Mix colors
  let r = 0, g = 0, b = 0;
  let totalWeight = 0;
  
  topIndices.forEach(({ val, i }) => {
    const color = new THREE.Color(axisColors[i]);
    r += color.r * val;
    g += color.g * val;
    b += color.b * val;
    totalWeight += val;
  });
  
  const finalColor = new THREE.Color(r / totalWeight, g / totalWeight, b / totalWeight);
  return `#${finalColor.getHexString()}`;
}

/**
 * Lighten a hex color by mixing with white.
 * @param hex - Hex color string
 * @param amount - Amount to lighten (0 to 1)
 */
export function lightenColor(hex: string, amount: number): string {
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

