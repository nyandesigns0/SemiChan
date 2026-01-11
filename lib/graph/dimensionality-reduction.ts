import { createPRNG } from "@/lib/analysis/kmeans";

/**
 * Principal Component Analysis (PCA) for dimensionality reduction
 * Reduces high-dimensional vectors to N-dimensional axes projected into 3D space
 */

export interface AxisDirection {
  x: number;
  y: number;
  z: number;
}

/**
 * Generate symmetric axis directions in 3D space for N dimensions.
 * For 2D and 3D, uses standard orthogonal axes.
 * For N > 3, uses a Fibonacci sphere distribution for near-uniformity.
 */
export function generateSymmetricAxisDirections(numDimensions: number): AxisDirection[] {
  // Special cases for 2 and 3 dimensions to maintain standard behavior
  if (numDimensions === 2) {
    return [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }
    ];
  }
  if (numDimensions === 3) {
    return [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 }
    ];
  }

  // Fibonacci sphere algorithm for relatively even distribution
  const directions: AxisDirection[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < numDimensions; i++) {
    const y = 1 - ((i + 0.5) / numDimensions) * 2; // step inside [-1,1] without hitting exact poles
    const radius = Math.sqrt(Math.max(0, 1 - y * y)); // radius at y

    const theta = (2 * Math.PI * i) / numDimensions;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    // Normalize
    const mag = Math.sqrt(x * x + y * y + z * z) || 1;
    directions.push({ x: x / mag, y: y / mag, z: z / mag });
  }

  return directions;
}

/**
 * Compute the mean vector across all vectors
 */
function computeMean(vectors: Float64Array[]): Float64Array {
  if (vectors.length === 0) return new Float64Array(0);
  const dim = vectors[0].length;
  const mean = new Float64Array(dim);
  
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      mean[i] += v[i];
    }
  }
  
  for (let i = 0; i < dim; i++) {
    mean[i] /= vectors.length;
  }
  
  return mean;
}

/**
 * Center vectors by subtracting the mean
 */
function centerVectors(vectors: Float64Array[], mean: Float64Array): Float64Array[] {
  return vectors.map((v) => {
    const centered = new Float64Array(v.length);
    for (let i = 0; i < v.length; i++) {
      centered[i] = v[i] - mean[i];
    }
    return centered;
  });
}

/**
 * Compute covariance matrix (simplified for high dimensions)
 * Uses power iteration method to find top 3 principal components
 */
function powerIteration(
  centered: Float64Array[],
  numComponents: number = 3,
  iterations: number = 100,
  seed: number = 42
): Float64Array[] {
  if (centered.length === 0 || centered[0].length === 0) {
    return [];
  }
  
  const dim = centered[0].length;
  const n = centered.length;
  const components: Float64Array[] = [];
  const rand = createPRNG(seed);
  
  // Create a copy to work with (we'll deflate the data)
  let data = centered.map((v) => new Float64Array(v));
  
  for (let comp = 0; comp < numComponents; comp++) {
    // Use a fixed unit vector for initialization instead of a seeded random vector
    // This ensures that for the same input data, the PCA components are identical
    let pc = new Float64Array(dim).fill(1.0);
    
    // Normalize initial vector
    let norm = Math.sqrt(pc.reduce((a, b) => a + b * b, 0)) || 1;
    for (let i = 0; i < dim; i++) pc[i] /= norm;
    
    // Power iteration to find principal component
    for (let iter = 0; iter < iterations; iter++) {
      // Compute X^T * X * v (covariance times vector)
      const newPc = new Float64Array(dim);
      
      // First: project data onto pc (X * v)
      const projections = data.map((row) => {
        let dot = 0;
        for (let i = 0; i < dim; i++) dot += row[i] * pc[i];
        return dot;
      });
      
      // Second: compute X^T * projections
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < n; j++) {
          newPc[i] += data[j][i] * projections[j];
        }
      }
      
      // Normalize
      norm = Math.sqrt(newPc.reduce((a, b) => a + b * b, 0)) || 1;
      for (let i = 0; i < dim; i++) {
        pc[i] = newPc[i] / norm;
      }
    }
    
    components.push(pc);
    
    // Deflate: remove this component's contribution from data
    for (let j = 0; j < n; j++) {
      let dot = 0;
      for (let i = 0; i < dim; i++) dot += data[j][i] * pc[i];
      for (let i = 0; i < dim; i++) {
        data[j][i] -= dot * pc[i];
      }
    }
  }
  
  return components;
}

/**
 * Project vectors onto principal components to get N-dimensional coordinates
 */
function projectToND(
  centered: Float64Array[],
  components: Float64Array[]
): number[][] {
  return centered.map((v) => {
    return components.map((pc) => {
      let dot = 0;
      for (let i = 0; i < v.length; i++) {
        dot += v[i] * pc[i];
      }
      return dot;
    });
  });
}

/**
 * Project N-dimensional coordinates to 3D space using axis directions
 */
function projectNDTo3D(
  ndCoords: number[][],
  axisDirections: AxisDirection[]
): { x: number; y: number; z: number }[] {
  return ndCoords.map((coords) => {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < coords.length; i++) {
      const val = coords[i];
      const dir = axisDirections[i] || { x: 0, y: 0, z: 0 };
      x += val * dir.x;
      y += val * dir.y;
      z += val * dir.z;
    }
    return { x, y, z };
  });
}

/**
 * Normalize 3D coordinates to fit within a specified range
 */
function normalizeCoordinates(
  coords: { x: number; y: number; z: number }[],
  scale: number = 10
): { x: number; y: number; z: number }[] {
  if (coords.length === 0) return coords;
  
  // Find min/max for each dimension
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  for (const c of coords) {
    minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
    minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
    minZ = Math.min(minZ, c.z); maxZ = Math.max(maxZ, c.z);
  }
  
  // Compute range (avoid division by zero)
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;
  const maxRange = Math.max(rangeX, rangeY, rangeZ);
  
  // Normalize to [-scale, scale] centered at 0
  return coords.map((c) => ({
    x: ((c.x - (minX + maxX) / 2) / maxRange) * scale * 2,
    y: ((c.y - (minY + maxY) / 2) / maxRange) * scale * 2,
    z: ((c.z - (minZ + maxZ) / 2) / maxRange) * scale * 2,
  }));
}

/**
 * Reduce high-dimensional vectors to N-dimensional coordinates projected to 3D using PCA
 * 
 * @param vectors - Array of high-dimensional vectors
 * @param numDimensions - Number of principal components to use (2-10)
 * @param scale - Scale factor for the output coordinates (default 10)
 * @returns Object containing 3D coordinates and raw N-D PC values
 */
export function reduceToND(
  vectors: Float64Array[],
  numDimensions: number = 3,
  scale: number = 10,
  seed: number = 42
): { coords: { x: number; y: number; z: number }[], pcValues: number[][] } {
  if (vectors.length === 0) {
    return { coords: [], pcValues: [] };
  }
  
  if (vectors.length === 1) {
    return { 
      coords: [{ x: 0, y: 0, z: 0 }], 
      pcValues: [new Array(numDimensions).fill(0)] 
    };
  }
  
  // Compute mean and center data
  const mean = computeMean(vectors);
  const centered = centerVectors(vectors, mean);
  
  // Find top N principal components using power iteration
  const components = powerIteration(centered, numDimensions, 100, seed);
  
  if (components.length === 0) {
    return { 
      coords: vectors.map(() => ({ x: 0, y: 0, z: 0 })), 
      pcValues: vectors.map(() => new Array(numDimensions).fill(0)) 
    };
  }
  
  // 1. Get N-dimensional coordinates
  const ndCoords = projectToND(centered, components);
  
  // 2. Generate axis directions for 3D projection
  const axisDirections = generateSymmetricAxisDirections(numDimensions);
  
  // 3. Project N-D to 3D
  const coords3D = projectNDTo3D(ndCoords, axisDirections);
  
  // 4. Normalize to fit display range
  const normalizedCoords = normalizeCoordinates(coords3D, scale);
  
  return {
    coords: normalizedCoords,
    pcValues: ndCoords
  };
}

/**
 * Compute 3D positions for graph nodes based on their cluster assignments
 * Juror nodes get positions based on their concept vector
 * Concept nodes get positions based on their centroid
 */
export function computeNode3DPositions(
  jurorVectors: Record<string, Record<string, number>>,
  conceptCentroids: Float64Array[],
  jurorList: string[],
  conceptIds: string[],
  numDimensions: number = 3,
  scale: number = 10,
  seed: number = 42
): { 
  positions: Map<string, { x: number; y: number; z: number }>; 
  conceptPcValues: Map<string, number[]>;
  jurorPcValues: Map<string, number[]>;
} {
  const positions = new Map<string, { x: number; y: number; z: number }>();
  const conceptPcValues = new Map<string, number[]>();
  const jurorPcValues = new Map<string, number[]>();
  
  // First, get N-D positions for concepts from centroids
  const { coords: conceptCoords, pcValues: conceptRawPcValues } = reduceToND(conceptCentroids, numDimensions, scale, seed);
  
  for (let i = 0; i < conceptIds.length; i++) {
    positions.set(conceptIds[i], conceptCoords[i] ?? { x: 0, y: 0, z: 0 });
    conceptPcValues.set(conceptIds[i], conceptRawPcValues[i] ?? []);
  }
  
  // For jurors, compute weighted average of their concept positions AND their PC values
  for (const juror of jurorList) {
    const vec = jurorVectors[juror] || {};
    let totalWeight = 0;
    let x = 0, y = 0, z = 0;
    
    // Weighted average for PC values
    const mixedPc = new Array(numDimensions).fill(0);
    
    for (const [conceptId, weight] of Object.entries(vec)) {
      const conceptPos = positions.get(conceptId);
      const cPc = conceptPcValues.get(conceptId);
      
      if (conceptPos && cPc && weight > 0) {
        x += conceptPos.x * weight;
        y += conceptPos.y * weight;
        z += conceptPos.z * weight;
        
        for (let i = 0; i < numDimensions; i++) {
          mixedPc[i] += cPc[i] * weight;
        }
        
        totalWeight += weight;
      }
    }
    
    if (totalWeight > 0) {
      positions.set(`juror:${juror}`, {
        x: x / totalWeight,
        y: y / totalWeight,
        z: z / totalWeight,
      });
      
      jurorPcValues.set(`juror:${juror}`, mixedPc.map(v => v / totalWeight));
    } else {
      positions.set(`juror:${juror}`, { x: 0, y: 0, z: 0 });
      jurorPcValues.set(`juror:${juror}`, new Array(numDimensions).fill(0));
    }
  }
  
  return { positions, conceptPcValues, jurorPcValues };
}




