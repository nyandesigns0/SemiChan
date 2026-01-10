import { createPRNG } from "@/lib/analysis/kmeans";

/**
 * Principal Component Analysis (PCA) for dimensionality reduction
 * Reduces high-dimensional vectors to 3D coordinates for visualization
 */

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
    // Initialize random vector
    let pc = new Float64Array(dim);
    for (let i = 0; i < dim; i++) {
      pc[i] = rand() - 0.5;
    }
    
    // Normalize
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
 * Project vectors onto principal components to get 3D coordinates
 */
function projectOntoComponents(
  centered: Float64Array[],
  components: Float64Array[]
): { x: number; y: number; z: number }[] {
  return centered.map((v) => {
    const coords = components.map((pc) => {
      let dot = 0;
      for (let i = 0; i < v.length; i++) {
        dot += v[i] * pc[i];
      }
      return dot;
    });
    
    return {
      x: coords[0] ?? 0,
      y: coords[1] ?? 0,
      z: coords[2] ?? 0,
    };
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
 * Reduce high-dimensional vectors to 3D coordinates using PCA
 * 
 * @param vectors - Array of high-dimensional vectors
 * @param scale - Scale factor for the output coordinates (default 10)
 * @returns Array of 3D coordinates
 */
export function reduceTo3D(
  vectors: Float64Array[],
  scale: number = 10,
  seed: number = 42
): { x: number; y: number; z: number }[] {
  if (vectors.length === 0) {
    return [];
  }
  
  if (vectors.length === 1) {
    return [{ x: 0, y: 0, z: 0 }];
  }
  
  // Compute mean and center data
  const mean = computeMean(vectors);
  const centered = centerVectors(vectors, mean);
  
  // Find top 3 principal components using power iteration
  const components = powerIteration(centered, 3, 100, seed);
  
  if (components.length === 0) {
    return vectors.map(() => ({ x: 0, y: 0, z: 0 }));
  }
  
  // Project onto components
  const coords = projectOntoComponents(centered, components);
  
  // Normalize to fit display range
  return normalizeCoordinates(coords, scale);
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
  scale: number = 10,
  seed: number = 42
): Map<string, { x: number; y: number; z: number }> {
  const positions = new Map<string, { x: number; y: number; z: number }>();
  const rand = createPRNG(seed + 1); // Offset seed for variety
  
  // First, get 3D positions for concepts from centroids
  const conceptCoords = reduceTo3D(conceptCentroids, scale, seed);
  for (let i = 0; i < conceptIds.length; i++) {
    positions.set(conceptIds[i], conceptCoords[i] ?? { x: 0, y: 0, z: 0 });
  }
  
  // For jurors, compute weighted average of their concept positions
  for (const juror of jurorList) {
    const vec = jurorVectors[juror] || {};
    let totalWeight = 0;
    let x = 0, y = 0, z = 0;
    
    for (const [conceptId, weight] of Object.entries(vec)) {
      const conceptPos = positions.get(conceptId);
      if (conceptPos && weight > 0) {
        x += conceptPos.x * weight;
        y += conceptPos.y * weight;
        z += conceptPos.z * weight;
        totalWeight += weight;
      }
    }
    
    if (totalWeight > 0) {
      // Add small random offset to prevent overlapping with concepts
      const offset = 0.5;
      positions.set(`juror:${juror}`, {
        x: x / totalWeight + (rand() - 0.5) * offset,
        y: y / totalWeight + (rand() - 0.5) * offset,
        z: z / totalWeight + (rand() - 0.5) * offset,
      });
    } else {
      // Random position if no concept associations
      positions.set(`juror:${juror}`, {
        x: (rand() - 0.5) * scale,
        y: (rand() - 0.5) * scale,
        z: (rand() - 0.5) * scale,
      });
    }
  }
  
  return positions;
}






