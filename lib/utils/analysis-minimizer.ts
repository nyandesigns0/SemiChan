import type { AnalysisResult, MinimalAnalysisResult, SentenceRecord } from "@/types/analysis";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { JurorBlock } from "@/types/nlp";
import type { ExportAnalysisParams } from "@/components/inspector/export-types";
import type { Stance } from "@/types/nlp";
import { sentenceSplit } from "@/lib/nlp/sentence-splitter";
import { stanceOfSentence } from "@/lib/nlp/stance-classifier";
import { generateSymmetricAxisDirections } from "@/lib/graph/dimensionality-reduction";
import { buildJurorSimilarityLinks } from "@/lib/graph/projections";
import { cosine } from "@/lib/analysis/tfidf";

/**
 * Convert full AnalysisResult to minimal format for storage.
 * Strips recomputable/redundant data while preserving essential display information.
 */
export function minimizeAnalysis(analysis: AnalysisResult): MinimalAnalysisResult {
  // Extract minimal node data (strip positions)
  const minimalNodes = analysis.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    label: node.label,
    size: node.size,
    meta: node.meta,
    pcValues: node.pcValues,
    layer: node.layer,
    parentConceptId: node.parentConceptId,
    childConceptIds: node.childConceptIds,
    sourceTags: node.sourceTags,
    // x, y, z, fx, fy, fz omitted - will be recomputed
  }));

  // Build minimal result
  const minimal: MinimalAnalysisResult = {
    runId: analysis.runId,
    jurors: analysis.jurors,
    concepts: analysis.concepts,
    primaryConcepts: analysis.primaryConcepts,
    detailConcepts: analysis.detailConcepts,
    conceptHierarchy: analysis.conceptHierarchy,
    // conceptSets omitted
    // sentences omitted - counts preserved in stats
    jurorVectors: analysis.jurorVectors,
    jurorVectorsDetail: analysis.jurorVectorsDetail,
    jurorCounts: analysis.jurorCounts,
    jurorCountsDetail: analysis.jurorCountsDetail,
    minimalNodes,
    // links omitted
    stats: analysis.stats,
    recommendedK: analysis.recommendedK,
    // kSearchMetrics omitted - summary preserved in recommendedK
    autoKReasoning: analysis.autoKReasoning,
    clusteringMode: analysis.clusteringMode,
    // checkpoints omitted
    requestedNumDimensions: analysis.requestedNumDimensions,
    appliedNumDimensions: analysis.appliedNumDimensions,
    layoutNumDimensions: analysis.layoutNumDimensions,
    scanLimitUsed: analysis.scanLimitUsed,
    thresholdNotReached: analysis.thresholdNotReached,
    maxVarianceAchieved: analysis.maxVarianceAchieved,
    dimensionMode: analysis.dimensionMode,
    varianceThreshold: analysis.varianceThreshold,
    finalKUsed: analysis.finalKUsed,
    autoKRecommended: analysis.autoKRecommended,
    policyAdjustedK: analysis.policyAdjustedK,
    conceptCountPolicy: analysis.conceptCountPolicy,
    semanticMerge: analysis.semanticMerge,
    analysisBuildId: analysis.analysisBuildId,
    // jurorTopTerms omitted
    axisLabels: analysis.axisLabels,
    varianceStats: analysis.varianceStats,
    anchorAxes: analysis.anchorAxes,
    anchorAxisScores: analysis.anchorAxisScores,
    // chunks omitted
    // chunkAssignments omitted
    autoSeed: analysis.autoSeed,
    seedChosen: analysis.seedChosen,
    seedCandidatesEvaluated: analysis.seedCandidatesEvaluated,
    // seedLeaderboard omitted - summary preserved in seedChosen
    autoSeedReasoning: analysis.autoSeedReasoning,
    autoUnit: analysis.autoUnit,
    recommendedUnitMode: analysis.recommendedUnitMode,
    // unitSearchMetrics omitted - summary preserved in recommendedUnitMode
    autoUnitReasoning: analysis.autoUnitReasoning,
    autoWeights: analysis.autoWeights,
    recommendedWeights: analysis.recommendedWeights,
    // weightSearchMetrics omitted - summary preserved in recommendedWeights
    autoWeightsReasoning: analysis.autoWeightsReasoning,
    minClusterSize: analysis.minClusterSize,
    minClusterSizeAuto: analysis.minClusterSizeAuto,
    minClusterSizeMerged: analysis.minClusterSizeMerged,
    minClusterSizeDetails: analysis.minClusterSizeDetails,
    dominanceSplitApplied: analysis.dominanceSplitApplied,
    dominanceSplitDetails: analysis.dominanceSplitDetails,
  };

  return minimal;
}

/**
 * Normalize 3D coordinates to fit within a specified range (matches reduceToND behavior)
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
 * Reconstruct 3D node positions from preserved pcValues.
 * Projects N-dimensional pcValues onto 3D space using axis directions, then normalizes.
 */
function reconstructNodePositionsFromPCValues(
  minimalNodes: MinimalAnalysisResult["minimalNodes"],
  appliedNumDimensions: number | undefined,
  scale: number = 10
): Map<string, { x: number; y: number; z: number }> {
  const positions = new Map<string, { x: number; y: number; z: number }>();
  
  if (!minimalNodes || minimalNodes.length === 0) {
    return positions;
  }

  const numDims = appliedNumDimensions ?? 3;
  const axisDirections = generateSymmetricAxisDirections(numDims);

  // Step 1: Project all pcValues to 3D coordinates
  const coords3D: Array<{ id: string; x: number; y: number; z: number }> = [];
  
  for (const node of minimalNodes) {
    if (!node.pcValues || node.pcValues.length === 0) {
      // Default position if no pcValues
      coords3D.push({ id: node.id, x: 0, y: 0, z: 0 });
      continue;
    }

    // Project N-dimensional pcValues onto 3D space using axis directions
    let x = 0;
    let y = 0;
    let z = 0;

    const numComponents = Math.min(node.pcValues.length, numDims);
    for (let i = 0; i < numComponents; i++) {
      const pcValue = node.pcValues[i] || 0;
      const axis = axisDirections[i];
      if (axis) {
        x += pcValue * axis.x;
        y += pcValue * axis.y;
        z += pcValue * axis.z;
      }
    }

    coords3D.push({ id: node.id, x, y, z });
  }

  // Step 2: Normalize all coordinates together (matches reduceToND behavior)
  const normalized = normalizeCoordinates(
    coords3D.map(c => ({ x: c.x, y: c.y, z: c.z })),
    scale
  );

  // Step 3: Map back to node IDs
  for (let i = 0; i < coords3D.length; i++) {
    const norm = normalized[i];
    if (norm) {
      positions.set(coords3D[i].id, norm);
    } else {
      positions.set(coords3D[i].id, { x: 0, y: 0, z: 0 });
    }
  }

  return positions;
}

/**
 * Reconstruct concept-to-concept similarity links from juror vectors.
 * Approximates concept similarity by comparing juror-space vectors.
 * For each concept, builds a vector where each dimension represents a juror's weight for that concept.
 * Computes cosine similarity between these juror-space vectors for each concept pair.
 */
function reconstructConceptSimilarityLinks(
  minimal: MinimalAnalysisResult,
  parameters: ExportAnalysisParams
): GraphLink[] {
  const links: GraphLink[] = [];
  const jurorList = minimal.jurors || [];
  const primaryConcepts = minimal.primaryConcepts || minimal.concepts || [];
  const similarityThreshold = parameters.similarityThreshold ?? 0.35;
  const conceptConceptThreshold = similarityThreshold * 0.7; // Match original threshold logic

  // Need at least 2 concepts to create links
  if (primaryConcepts.length < 2 || jurorList.length === 0) {
    return links;
  }

  if (!minimal.jurorVectors || Object.keys(minimal.jurorVectors).length === 0) {
    return links;
  }

  // Build juror-space vectors for each concept
  // Each concept vector has dimension = number of jurors
  // conceptVector[jurorIndex] = jurorVectors[juror][conceptId] || 0
  const conceptVectors = new Map<string, Float64Array>();
  
  for (const concept of primaryConcepts) {
    const vec = new Float64Array(jurorList.length);
    for (let i = 0; i < jurorList.length; i++) {
      const juror = jurorList[i];
      const weight = minimal.jurorVectors[juror]?.[concept.id] ?? 0;
      vec[i] = weight;
    }
    
    // L2 normalize the vector (required for cosine similarity)
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= norm;
    }
    
    conceptVectors.set(concept.id, vec);
  }

  // Compute pairwise similarities
  for (let i = 0; i < primaryConcepts.length; i++) {
    for (let j = i + 1; j < primaryConcepts.length; j++) {
      const conceptA = primaryConcepts[i];
      const conceptB = primaryConcepts[j];
      
      const vecA = conceptVectors.get(conceptA.id);
      const vecB = conceptVectors.get(conceptB.id);
      
      if (!vecA || !vecB) continue;

      // Compute cosine similarity (vectors are L2-normalized)
      const similarity = cosine(vecA, vecB);
      
      if (similarity >= conceptConceptThreshold) {
        links.push({
          id: `sim:${conceptA.id}__${conceptB.id}`,
          source: conceptA.id,
          target: conceptB.id,
          weight: similarity,
          kind: "conceptConcept",
        });
      }
    }
  }

  return links;
}

/**
 * Reconstruct links from minimal analysis data.
 * Builds Juror-Concept links, Juror-Juror similarity links, and Concept-Concept similarity links from preserved jurorVectors.
 */
function reconstructLinksFromMinimal(
  minimal: MinimalAnalysisResult,
  parameters: ExportAnalysisParams,
  sentences: SentenceRecord[]
): GraphLink[] {
  const links: GraphLink[] = [];
  const jurorList = minimal.jurors || [];
  const primaryConcepts = minimal.primaryConcepts || minimal.concepts || [];
  const detailConcepts = minimal.detailConcepts || [];
  const similarityThreshold = parameters.similarityThreshold ?? 0.35;
  const minEdgeWeight = parameters.minEdgeWeight ?? 0.05;

  // 1. Juror → Primary Concept Links
  for (const juror of jurorList) {
    const vec = minimal.jurorVectors[juror] || {};
    for (const concept of primaryConcepts) {
      const weight = vec[concept.id] ?? 0;
      if (weight <= minEdgeWeight) continue;

      // Determine dominant stance from sentences
      const linkSentences = sentences.filter((s) => {
        if (s.juror !== juror) return false;
        if (s.conceptMembership?.some((m) => m.conceptId === concept.id)) return true;
        return s.conceptId === concept.id;
      });

      const stanceCounts: Record<Stance, number> = { praise: 0, critique: 0, suggestion: 0, neutral: 0 };
      linkSentences.forEach((s) => {
        stanceCounts[s.stance] = (stanceCounts[s.stance] || 0) + 1;
      });
      const dominantStance = (Object.entries(stanceCounts) as [Stance, number][])
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";

      links.push({
        id: `link:juror:${juror}__${concept.id}`,
        source: `juror:${juror}`,
        target: concept.id,
        weight,
        stance: dominantStance,
        evidenceIds: linkSentences.length > 0 ? linkSentences.map((s) => s.id) : undefined,
        evidenceCount: linkSentences.length,
        kind: "jurorConcept",
      });
    }
  }

  // 2. Juror → Detail Concept Links (if detail layer exists)
  if (minimal.jurorVectorsDetail && detailConcepts.length > 0) {
    for (const juror of jurorList) {
      const vec = minimal.jurorVectorsDetail[juror] || {};
      for (const concept of detailConcepts) {
        const weight = vec[concept.id] ?? 0;
        if (weight <= minEdgeWeight) continue;

        // Determine dominant stance from sentences (may be less accurate for detail)
        const linkSentences = sentences.filter((s) => {
          if (s.juror !== juror) return false;
          if (s.conceptMembership?.some((m) => m.conceptId === concept.id)) return true;
          return false;
        });

        const stanceCounts: Record<Stance, number> = { praise: 0, critique: 0, suggestion: 0, neutral: 0 };
        linkSentences.forEach((s) => {
          stanceCounts[s.stance] = (stanceCounts[s.stance] || 0) + 1;
        });
        const dominantStance = (Object.entries(stanceCounts) as [Stance, number][])
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";

        links.push({
          id: `link:juror:${juror}__${concept.id}`,
          source: `juror:${juror}`,
          target: concept.id,
          weight,
          stance: dominantStance,
          evidenceIds: linkSentences.length > 0 ? linkSentences.map((s) => s.id) : undefined,
          evidenceCount: linkSentences.length,
          kind: "jurorConcept",
        });
      }
    }
  }

  // 3. Juror → Juror similarity links
  if (primaryConcepts.length > 0) {
    const conceptIds = primaryConcepts.map((c) => c.id);
    const jurorSimilarityLinks = buildJurorSimilarityLinks(
      jurorList,
      minimal.jurorVectors,
      conceptIds,
      similarityThreshold
    );
    links.push(...jurorSimilarityLinks);
  }

  // 4. Concept → Concept similarity links
  // Approximate using juror-space vectors since centroids aren't saved
  const conceptSimilarityLinks = reconstructConceptSimilarityLinks(minimal, parameters);
  links.push(...conceptSimilarityLinks);

  return links;
}

/**
 * Partially reconstruct AnalysisResult from minimal format.
 * Reconstructs sentences from jurorBlocks, nodes with positions, and links.
 */
export function expandMinimalAnalysis(
  minimal: MinimalAnalysisResult,
  jurorBlocks: JurorBlock[],
  parameters?: ExportAnalysisParams
): AnalysisResult {
  // Reconstruct sentences from jurorBlocks
  const sentences: SentenceRecord[] = [];
  let sentenceIndex = 0;
  
  for (const block of jurorBlocks) {
    const comments = block.comments || [];
    for (const comment of comments) {
      const blockSentences = sentenceSplit(comment.text);
      for (const sentenceText of blockSentences) {
        sentences.push({
          id: `sentence-${sentenceIndex++}`,
          juror: block.juror,
          sentence: sentenceText,
          stance: stanceOfSentence(sentenceText),
          sourceTags: comment.tags || [],
          // conceptId and conceptMembership will be empty - would need full analysis to reconstruct
        });
      }
    }
  }

  // Reconstruct node positions from pcValues
  const positionsMap = reconstructNodePositionsFromPCValues(
    minimal.minimalNodes,
    minimal.appliedNumDimensions,
    10 // scale factor (matches original)
  );

  // Reconstruct nodes from minimalNodes (with positions)
  const nodes: GraphNode[] = (minimal.minimalNodes || []).map((minNode) => {
    const position = positionsMap.get(minNode.id) || { x: 0, y: 0, z: 0 };
    return {
      id: minNode.id,
      type: minNode.type,
      label: minNode.label,
      size: minNode.size,
      meta: minNode.meta,
      pcValues: minNode.pcValues,
      layer: minNode.layer,
      parentConceptId: minNode.parentConceptId,
      childConceptIds: minNode.childConceptIds,
      sourceTags: (minNode as any).sourceTags,
      x: position.x,
      y: position.y,
      z: position.z,
      // fx, fy, fz will be computed by force simulation if needed
    };
  });

  // Reconstruct links from minimal data
  // Use provided parameters or defaults
  const linkParams: ExportAnalysisParams = parameters || {
    kConcepts: minimal.concepts?.length || 0,
    minEdgeWeight: 0.05,
    similarityThreshold: 0.35,
    clusteringMode: minimal.clusteringMode || "kmeans",
    autoK: false,
    clusterSeed: 42,
    softMembership: false,
    cutType: "count",
    granularityPercent: 60,
    numDimensions: minimal.appliedNumDimensions || 3,
    appliedNumDimensions: minimal.appliedNumDimensions || 3,
    dimensionMode: minimal.dimensionMode || "manual",
    varianceThreshold: minimal.varianceThreshold || 0.9,
    showAxes: true,
    showGraph: true,
    enableAxisLabelAI: true,
    autoSynthesize: true,
  };
  
  const links = reconstructLinksFromMinimal(minimal, linkParams, sentences);

  // Build expanded result
  const expanded: AnalysisResult = {
    runId: minimal.runId,
    jurors: minimal.jurors,
    concepts: minimal.concepts,
    primaryConcepts: minimal.primaryConcepts,
    detailConcepts: minimal.detailConcepts,
    conceptHierarchy: minimal.conceptHierarchy,
    // conceptSets omitted - would need full analysis
    sentences,
    jurorVectors: minimal.jurorVectors,
    jurorVectorsDetail: minimal.jurorVectorsDetail,
    jurorCounts: minimal.jurorCounts,
    jurorCountsDetail: minimal.jurorCountsDetail,
    nodes,
    links,
    stats: minimal.stats,
    recommendedK: minimal.recommendedK,
    // kSearchMetrics omitted - not reconstructable
    autoKReasoning: minimal.autoKReasoning,
    clusteringMode: minimal.clusteringMode,
    // checkpoints omitted
    requestedNumDimensions: minimal.requestedNumDimensions,
    appliedNumDimensions: minimal.appliedNumDimensions,
    layoutNumDimensions: minimal.layoutNumDimensions,
    scanLimitUsed: minimal.scanLimitUsed,
    thresholdNotReached: minimal.thresholdNotReached,
    maxVarianceAchieved: minimal.maxVarianceAchieved,
    dimensionMode: minimal.dimensionMode,
    varianceThreshold: minimal.varianceThreshold,
    finalKUsed: minimal.finalKUsed,
    autoKRecommended: minimal.autoKRecommended,
    policyAdjustedK: minimal.policyAdjustedK,
    conceptCountPolicy: minimal.conceptCountPolicy,
    semanticMerge: minimal.semanticMerge,
    analysisBuildId: minimal.analysisBuildId,
    // jurorTopTerms omitted
    axisLabels: minimal.axisLabels,
    varianceStats: minimal.varianceStats,
    anchorAxes: minimal.anchorAxes,
    anchorAxisScores: minimal.anchorAxisScores,
    // chunks omitted
    // chunkAssignments omitted
    autoSeed: minimal.autoSeed,
    seedChosen: minimal.seedChosen,
    seedCandidatesEvaluated: minimal.seedCandidatesEvaluated,
    // seedLeaderboard omitted
    autoSeedReasoning: minimal.autoSeedReasoning,
    autoUnit: minimal.autoUnit,
    recommendedUnitMode: minimal.recommendedUnitMode,
    // unitSearchMetrics omitted
    autoUnitReasoning: minimal.autoUnitReasoning,
    autoWeights: minimal.autoWeights,
    recommendedWeights: minimal.recommendedWeights,
    // weightSearchMetrics omitted
    autoWeightsReasoning: minimal.autoWeightsReasoning,
    minClusterSize: minimal.minClusterSize,
    minClusterSizeAuto: minimal.minClusterSizeAuto,
    minClusterSizeMerged: minimal.minClusterSizeMerged,
    minClusterSizeDetails: minimal.minClusterSizeDetails,
    dominanceSplitApplied: minimal.dominanceSplitApplied,
    dominanceSplitDetails: minimal.dominanceSplitDetails,
  };

  return expanded;
}

/**
 * Check if an analysis result is in minimal format
 */
export function isMinimalAnalysis(
  analysis: AnalysisResult | MinimalAnalysisResult
): analysis is MinimalAnalysisResult {
  // Minimal format has minimalNodes but no nodes array, or has nodes but they're not GraphNode[] (shouldn't happen but safety check)
  return (
    "minimalNodes" in analysis &&
    (!("nodes" in analysis) || !Array.isArray(analysis.nodes) || analysis.nodes.length === 0)
  );
}
