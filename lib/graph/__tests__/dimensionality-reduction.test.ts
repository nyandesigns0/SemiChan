import { reduceToND, findOptimalDimensionsElbow } from "../dimensionality-reduction";

describe("Dimensionality Reduction", () => {
  test("Elbow method detects 2D plane structure", () => {
    // Generate 10 points on a 2D plane in 100D space
    const centroids: Float64Array[] = [];
    for (let i = 0; i < 10; i++) {
      const v = new Float64Array(100).fill(0);
      v[0] = Math.random() * 10;  // x variance
      v[1] = Math.random() * 10;  // y variance
      // All other dims are 0 (pure plane)
      centroids.push(v);
    }
    
    const result = reduceToND(centroids, 12, 10, 42);
    const elbow = findOptimalDimensionsElbow(result.varianceStats.explainedVariances);
    
    expect(elbow).toBeLessThanOrEqual(3);  // Should detect low intrinsic dimensionality
  });

  test("Elbow method detects 3D cloud structure", () => {
    // Manually provide variances that should result in elbow at 3
    // [1500, 1400, 1300, 100] -> chord from (0, 1500) to (3, 100)
    // index 2 (1300) will be furthest from the chord
    const variances = [1500, 1400, 1300, 100, 0, 0];
    const elbow = findOptimalDimensionsElbow(variances);
    
    expect(elbow).toBe(3);
  });

  test("Layout floor enforces 3D when elbow returns 2", () => {
    // Simulate the graph-builder logic
    const centroids: Float64Array[] = [];
    for (let i = 0; i < 10; i++) {
      const v = new Float64Array(100).fill(0);
      v[0] = Math.random() * 10;
      v[1] = Math.random() * 10;
      centroids.push(v);
    }
    
    const result = reduceToND(centroids, 12, 10, 42);
    const finalNumDimensions = findOptimalDimensionsElbow(result.varianceStats.explainedVariances);
    
    // Apply UX floor logic
    const maxPossible = Math.max(1, centroids.length - 1);
    const appliedNumDimensions = Math.min(Math.max(finalNumDimensions, 1), maxPossible);
    const layoutNumDimensions = maxPossible >= 3 ? Math.max(3, appliedNumDimensions) : appliedNumDimensions;
    
    expect(layoutNumDimensions).toBe(3);
    
    // Re-compute with layout dimensions
    const layoutResult = reduceToND(centroids, layoutNumDimensions, 10, 42);
    
    // Check that Z has variance (not flat)
    const zVariances = layoutResult.coords.map(c => c.z);
    const zRange = Math.max(...zVariances) - Math.min(...zVariances);
    expect(zRange).toBeGreaterThan(0.0001); // Using a small epsilon instead of just 0
  });
});
