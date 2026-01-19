import { applyConceptCountPolicy } from "../concept-policy";

describe("applyConceptCountPolicy", () => {
  test("should cap small corpus K to 8", () => {
    const result = applyConceptCountPolicy(12, 50);
    expect(result.adjustedK).toBe(8);
    expect(result.requiresHierarchy).toBe(false);
  });

  test("should cap medium corpus K to 12", () => {
    const result = applyConceptCountPolicy(15, 150);
    expect(result.adjustedK).toBe(12);
    expect(result.requiresHierarchy).toBe(false);
  });

  test("should trigger hierarchy for large corpus if K > 12", () => {
    const result = applyConceptCountPolicy(15, 300);
    expect(result.adjustedK).toBe(12);
    expect(result.requiresHierarchy).toBe(true);
  });

  test("should not adjust K if within limits", () => {
    const result = applyConceptCountPolicy(6, 50);
    expect(result.adjustedK).toBe(6);
    expect(result.requiresHierarchy).toBe(false);
  });
});
