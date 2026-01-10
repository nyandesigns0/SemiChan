# Seeded Determinism and Strictness in Clustering and Layout

This document explains the technical resolution for non-deterministic behavior and the implementation of a "strict and faithful" mathematical pipeline in SemiChan.

## The Goal
The SemiChan pipeline is designed to be a reliable analytical instrument. Every visual element in the graph must be a direct, reproducible consequence of the underlying data and the user's parameters. We have removed all "artificially induced" factors, such as visualization jitters or random initializations, to ensure absolute faithfulness to the data.

## Investigation & Root Causes
Three distinct sources of variation were identified and eliminated:

### 1. K-Means Initialization (Seeded)
K-Means clustering requires an initial set of starting points. Previously, these were fixed to a default seed, but toggling Auto-K would still cause shifts.
*   **Resolution**: Implemented a user-controllable **Solution Seed**. The K-Means engine now uses a deterministic Linear Congruential Generator (LCG) initialized by this seed.

### 2. PCA Orientation (Constant Initialization)
Principal Component Analysis (PCA) determines the 3D orientation of the graph. Most PCA implementations initialize their search with random vectors, which can cause the graph to flip or rotate on every run.
*   **Resolution**: We replaced seeded random initialization with **Constant Vector Initialization** (filling the starting vector with `1.0`). This ensures that for the same input data, the PCA components (the axes of the graph) are always pointing in the exact same mathematical direction.

### 3. Artificial Jitter (Eliminated)
To prevent nodes from perfectly overlapping, a small random "jitter" was previously added to node positions. While this helped visibility, it introduced non-data-driven movement.
*   **Resolution**: Removed all jitter. Node positions are now calculated using pure mathematical averages. If two jurors have identical concept profiles, they will occupy the exact same coordinate, accurately reflecting their perfect conceptual alignment.

## The strictness Update
To achieve absolute determinism, the following changes were applied:

1.  **Standardized createPRNG**: A centralized LCG is used for any unavoidable stochastic processes (like K-Means doc sampling).
2.  **Deterministic Checkpoints**: Intermediate "Sentences Extracted" views now use a fixed grid layout instead of a random scatter.
3.  **2D Fallback Stability**: The 2D force simulation hook now initializes all missing positions to the center `[width/2, height/2]` instead of a random cloud.

## Impact on Interpretation
- **100% Reproducibility**: The same data + the same parameters + the same Solution Seed = the exact same visual pixel-perfect graph.
- **Faithful Mapping**: Proximity in the 3D space is now a "strict" indicator of semantic similarity, unpolluted by visualization-only offsets.
- **Scientific Rigor**: Users can rely on the graph as a stable evidence-based map of the architectural discourse.

