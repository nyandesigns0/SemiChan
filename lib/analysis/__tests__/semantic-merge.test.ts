import { semanticMergeConcepts } from "../semantic-merge";

describe("semanticMergeConcepts", () => {
  const mockCentroids = [
    new Float64Array([1, 0, 0]),
    new Float64Array([0.999, 0.001, 0]), // Very similar to index 0, dot product will be 0.999
    new Float64Array([0, 1, 0])
  ];
  
  const mockAssignments = [0, 0, 1, 1, 2, 2];
  const mockVectors = [
    new Float64Array([1, 0, 0]),
    new Float64Array([1, 0, 0]),
    new Float64Array([0.999, 0.001, 0]),
    new Float64Array([0.999, 0.001, 0]),
    new Float64Array([0, 1, 0]),
    new Float64Array([0, 1, 0])
  ];

  test("should merge concepts with similarity above threshold", () => {
    const result = semanticMergeConcepts(
      mockCentroids,
      mockAssignments,
      mockVectors,
      { similarityThreshold: 0.95, maxConceptSize: 10 }
    );

    expect(result.mergedCount).toBe(1);
    const uniqueAssignments = new Set(result.assignments);
    expect(uniqueAssignments.size).toBe(2);
  });

  test("should not merge concepts below threshold", () => {
    const result = semanticMergeConcepts(
      mockCentroids,
      mockAssignments,
      mockVectors,
      { similarityThreshold: 0.999 }
    );

    expect(result.mergedCount).toBe(0);
    const uniqueAssignments = new Set(result.assignments);
    expect(uniqueAssignments.size).toBe(3);
  });
});
