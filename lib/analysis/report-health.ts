import { AnalysisResult } from "../../types/analysis";

export interface ReportHealthMetric {
  value: number;
  status: "good" | "warning" | "poor";
  label: string;
  description: string;
}

export interface ReportHealth {
  overallScore: number; // 0-1
  metrics: {
    conceptDensity: ReportHealthMetric;
    avgSentencesPerConcept: ReportHealthMetric;
    axisVariance: ReportHealthMetric;
    singleJurorConcepts: ReportHealthMetric;
  };
  recommendations: string[];
}

/**
 * Evaluates the overall health and quality of an analysis report.
 * Provides metrics and actionable recommendations.
 */
export function evaluateReportHealth(analysis: AnalysisResult): ReportHealth {
  const { totalSentences, totalConcepts } = analysis.stats;
  
  // 1. Concept Density (sentences per concept ratio)
  const densityValue = totalSentences / (totalConcepts || 1);
  let densityStatus: "good" | "warning" | "poor" = "good";
  if (densityValue < 5 || densityValue > 30) densityStatus = "poor";
  else if (densityValue < 8 || densityValue > 20) densityStatus = "warning";

  // 2. Avg Sentences per Concept
  // (In our case, this is same as densityValue if every sentence is in a concept)
  const avgSentences = densityValue;
  let avgStatus: "good" | "warning" | "poor" = "good";
  if (avgSentences < 4) avgStatus = "poor";
  else if (avgSentences < 7) avgStatus = "warning";

  // 3. Axis Variance (% explained by meaningful dimensions)
  const varianceValue = analysis.maxVarianceAchieved ?? (analysis.varianceStats ? 
    (analysis.varianceStats.cumulativeVariances[analysis.appliedNumDimensions! - 1] / analysis.varianceStats.totalVariance) : 0.8);
  let varianceStatus: "good" | "warning" | "poor" = "good";
  if (varianceValue < 0.6) varianceStatus = "poor";
  else if (varianceValue < 0.75) varianceStatus = "warning";

  // 4. Single-Juror Concepts
  const singleJurorCount = (analysis.nodes || []).filter(n => {
    if (n.type !== "concept") return false;
    const jurors = (n.meta as any)?.jurorDistribution as any[];
    return jurors && jurors.length === 1;
  }).length;
  const singleJurorRatio = totalConcepts > 0 ? singleJurorCount / totalConcepts : 0;
  let singleJurorStatus: "good" | "warning" | "poor" = "good";
  if (singleJurorRatio > 0.4) singleJurorStatus = "poor";
  else if (singleJurorRatio > 0.2) singleJurorStatus = "warning";

  // Compute overall score
  const statusToScore = { good: 1, warning: 0.6, poor: 0.2 };
  const overallScore = (
    statusToScore[densityStatus] * 0.25 +
    statusToScore[avgStatus] * 0.25 +
    statusToScore[varianceStatus] * 0.25 +
    statusToScore[singleJurorStatus] * 0.25
  );

  // Recommendations
  const recommendations: string[] = [];
  if (densityStatus === "poor" && densityValue < 5) recommendations.push("Too many concepts for this dataset size. Try reducing K or enabling hierarchy.");
  if (densityStatus === "poor" && densityValue > 30) recommendations.push("Concepts might be too broad. Try increasing K for more granular insights.");
  if (varianceStatus === "poor") recommendations.push("Low axis variance suggests the graph layout might be noisy. Try changing dimension mode.");
  if (singleJurorStatus !== "good") recommendations.push("Many concepts are driven by single jurors. Consider if these represent shared themes or unique outliers.");

  return {
    overallScore,
    metrics: {
      conceptDensity: {
        value: densityValue,
        status: densityStatus,
        label: "Concept Density",
        description: "Ratio of sentences to concepts."
      },
      avgSentencesPerConcept: {
        value: avgSentences,
        status: avgStatus,
        label: "Avg Concept Size",
        description: "Average number of sentences per concept."
      },
      axisVariance: {
        value: varianceValue * 100,
        status: varianceStatus,
        label: "Axis Variance",
        description: "Percentage of data variance explained by graph axes."
      },
      singleJurorConcepts: {
        value: singleJurorRatio * 100,
        status: singleJurorStatus,
        label: "Solo Concepts",
        description: "Percentage of concepts supported by only one juror."
      }
    },
    recommendations
  };
}
