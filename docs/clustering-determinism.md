# Seeded Determinism in Clustering and Layout

This document explains the technical resolution for the non-deterministic behavior observed in the conceptual clustering and 3D graph layout.

## The Problem
Users observed that toggling "Auto-K Discovery" or re-running the analysis with the same parameters would result in a different graph configuration every time. Even if the underlying data hadn't changed, the bubbles (concepts) would move to different positions, the graph would rotate/flip, and the clusters themselves occasionally shifted.

## Investigation & Root Causes
Through runtime debugging and instrumentation, three distinct sources of randomness were identified:

### 1. K-Means Initialization
While the K-Means algorithm in `lib/analysis/kmeans.ts` used a fixed seed (42), it was highly sensitive to the value of $k$. Toggling Auto-K often changed the recommended $k$, which consumed the random number sequence differently, leading to a "shuffle" effect when returning to manual mode.

### 2. PCA (Dimensionality Reduction)
The most significant cause of visual instability was in `lib/graph/dimensionality-reduction.ts`. The Principal Component Analysis (PCA) used a "Power Iteration" method to find 3D coordinates. This method initialized its search with `Math.random()`. Because PCA determines the orientation of the 3D space, a different random start would result in a mirrored, flipped, or rotated graph, even if the clusters were identical.

### 3. 3D Node Positioning
In `computeNode3DPositions`, a small "jitter" (using `Math.random()`) was added to juror nodes to prevent them from perfectly overlapping with concept nodes. This caused nodes to "wiggle" on every re-run.

## The Solution: Seeded Pipeline
To resolve this, we implemented a centralized **Seeded Pseudo-Random Number Generator (PRNG)** across the entire pipeline.

### 1. Implementation of `createPRNG`
We added a deterministic Linear Congruential Generator (LCG) in `lib/analysis/kmeans.ts`:
```typescript
export function createPRNG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
```

### 2. Seed Propagation
The `clusterSeed` (controllable via the UI "Solution Seed" slider) is now passed as a parameter through every layer:
- **Frontend**: `app/page.tsx` maintains the state and sends it in the `POST /api/analyze` request.
- **API**: `app/api/analyze/route.ts` extracts the seed and passes it to `buildAnalysis`.
- **Logic**: `buildAnalysis` passes the seed to:
    - `evaluateKRange` (for consistent Auto-K discovery).
    - `kmeansCosine` (for consistent cluster formation).
    - `computeNode3DPositions` (for consistent 3D layout).

### 3. Replacing Math.random
Every instance of `Math.random()` in the analysis and graph-building libraries was replaced with a call to a seeded `rand()` function derived from the user-provided seed.

## Results
- **Reproducibility**: For a given "Solution Seed", the graph is now 100% deterministic. The same data and the same seed will always produce the exact same clusters and the exact same 3D spatial orientation.
- **Exploration**: Users can use the "Solution Seed" slider to intentionally "re-roll" the clustering and layout if they are unhappy with a specific arrangement, while maintaining the ability to return to a previous "good" state by remembering the seed number.
- **Stability**: Toggling "Auto-K Discovery" and returning to manual mode now preserves the visual state of the graph, provided the $k$ value and seed remain constant.

