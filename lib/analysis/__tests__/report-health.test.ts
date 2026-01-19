import { evaluateReportHealth } from "../report-health";
import { AnalysisResult } from "../../../types/analysis";

describe("evaluateReportHealth", () => {
  const mockAnalysis: Partial<AnalysisResult> = {
    stats: {
      totalSentences: 100,
      totalConcepts: 10,
      totalJurors: 5,
      stanceCounts: { praise: 25, critique: 25, suggestion: 25, neutral: 25 }
    },
    concepts: Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      label: `Concept ${i}`,
      size: 10,
      topTerms: [],
      meta: { jurorDistribution: [{ juror: "J1", weight: 1 }, { juror: "J2", weight: 1 }] }
    })) as any,
    appliedNumDimensions: 3,
    maxVarianceAchieved: 0.8
  };

  test("should compute a good health score for balanced reports", () => {
    const health = evaluateReportHealth(mockAnalysis as AnalysisResult);
    expect(health.overallScore).toBeGreaterThanOrEqual(0.8);
    expect(health.metrics.conceptDensity.status).toBe("good");
  });

  test("should penalize reports with too many small concepts", () => {
    const fragmentedAnalysis = {
      ...mockAnalysis,
      stats: { ...mockAnalysis.stats!, totalConcepts: 25 },
      concepts: Array.from({ length: 25 }, (_, i) => ({
        id: `c${i}`,
        meta: { jurorDistribution: [{ juror: "J1", weight: 1 }] }
      })) as any
    };
    const health = evaluateReportHealth(fragmentedAnalysis as AnalysisResult);
    expect(health.overallScore).toBeLessThan(0.6);
    expect(health.metrics.conceptDensity.status).toBe("poor");
  });

  test("should identify single-juror concepts", () => {
    const singleJurorAnalysis = {
      ...mockAnalysis,
      concepts: Array.from({ length: 10 }, (_, i) => ({
        id: `c${i}`,
        meta: { jurorDistribution: [{ juror: "J1", weight: 1 }] }
      })) as any
    };
    const health = evaluateReportHealth(singleJurorAnalysis as AnalysisResult);
    expect(health.metrics.singleJurorConcepts.status).toBe("poor");
    expect(health.recommendations).toContain("Many concepts are driven by single jurors. Consider if these represent shared themes or unique outliers.");
  });
});
