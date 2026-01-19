import { evaluateLabelQuality } from "../label-quality";

describe("evaluateLabelQuality", () => {
  test("should penalize single-word labels", () => {
    const result = evaluateLabelQuality("move");
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("single-word");
  });

  test("should pass multi-word meaningful labels", () => {
    const result = evaluateLabelQuality("Spatial Clarity and Light");
    expect(result.passed).toBe(true);
    expect(result.violations).not.toContain("single-word");
  });

  test("should penalize stopword-heavy labels", () => {
    const result = evaluateLabelQuality("the and or but");
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("stopword-heavy");
  });

  test("should penalize non-noun starts", () => {
    const result = evaluateLabelQuality("shows architectural flow");
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("non-noun-start");
  });

  test("should penalize filler words", () => {
    const result = evaluateLabelQuality("design proposal areas");
    expect(result.score).toBeLessThan(1.0);
    expect(result.violations).toContain("filler-words");
  });

  test("should penalize repetition", () => {
    const result = evaluateLabelQuality("light and light");
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("repetition");
  });
});
