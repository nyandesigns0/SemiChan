import type { JurorBlock, BM25Model } from "@/types/nlp";
import type { AnalysisResult, SentenceRecord, AnalysisCheckpoint, Concept } from "@/types/analysis";
import type { AnchorAxis } from "@/types/anchor-axes";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { Stance } from "@/types/nlp";
import { sentenceSplit } from "@/lib/nlp/sentence-splitter";
import { stanceOfSentence } from "@/lib/nlp/stance-classifier";
import { kmeansCosine, createPRNG } from "@/lib/analysis/kmeans";
import { clamp } from "@/lib/utils/text-utils";
import { buildJurorSimilarityLinks, buildConceptSimilarityLinks } from "./projections";
import { 
  computeNode3DPositions, 
  findOptimalDimensionsThreshold, 
  findOptimalDimensionsElbow,
  reduceToND
} from "./dimensionality-reduction";
import { labelAxes } from "./axis-labeler";
import { embedAnchorAxes, projectConceptCentroids, projectJurorVectors } from "@/lib/analysis/anchor-axes";

// Core analysis imports
import { embedSentences } from "@/lib/analysis/sentence-embeddings";
import { buildBM25 } from "@/lib/analysis/bm25";
import { contrastiveLabelCluster, getClusterTopTerms, computeContrastiveTermScores } from "@/lib/analysis/concept-labeler";
import { rankEvidenceForConcept, DEFAULT_EVIDENCE_RANKING_PARAMS } from "@/lib/analysis/evidence-ranker";
import { cosine } from "@/lib/analysis/tfidf";
import { extractNgrams } from "@/lib/nlp/ngram-extractor";

// Clustering algorithm imports
import { evaluateKRange } from "@/lib/analysis/cluster-eval";
import { 
  buildDendrogram, 
  cutDendrogramByCount, 
  cutDendrogramByThreshold,
  cutDendrogramTwoLayer
} from "@/lib/analysis/hierarchical-clustering";
import { computeSoftMembership } from "@/lib/analysis/soft-membership";
import { computeCentroids } from "@/lib/analysis/concept-centroids";

import { evaluateCutQuality, CutQualityParams } from "@/lib/analysis/cut-constraints";

/**
 * Build analysis using semantic clustering with BM25 labeling
 */
export async function buildAnalysis(
  jurorBlocks: JurorBlock[],
  kConcepts: number,
  similarityThreshold: number,
  options: {
    evidenceRankingParams?: { semanticWeight: number; frequencyWeight: number };
    clusteringMode?: "kmeans" | "hierarchical";
    autoK?: boolean;
    kMin?: number;
    kMax?: number;
    autoKStability?: boolean;
    autoKDominanceThreshold?: number;
    autoKKPenalty?: number;
    autoKEpsilon?: number;
    softMembership?: boolean;
    softTopN?: number;
    cutType?: "count" | "granularity";
    granularityPercent?: number;
    seed?: number;
    numDimensions?: number;
    dimensionMode?: "manual" | "elbow" | "threshold";
    varianceThreshold?: number;
    cutQualityParams?: CutQualityParams;
    softMembershipParams?: {
      temperature?: number;
      minWeight?: number;
      entropyCap?: number;
    };
    useTwoLayer?: boolean;
    primaryGranularity?: number;
    detailGranularity?: number;
    applyPopularityDampening?: boolean;
    anchorAxes?: AnchorAxis[];
    onLog?: (type: "analysis" | "quality" | "hierarchy", message: string, data?: any) => void;
  } = {}
): Promise<AnalysisResult> {
  const {
    evidenceRankingParams = DEFAULT_EVIDENCE_RANKING_PARAMS,
    clusteringMode = "hierarchical",
    autoK = true,
    kMin,
    kMax,
    autoKStability = false,
    autoKDominanceThreshold = 0.35,
    autoKKPenalty = 0.001,
    autoKEpsilon = 0.02,
    softMembership = true,
    softTopN = 3,
    cutType = "count",
    granularityPercent = 60,
    seed = 42,
    numDimensions = 3,
    dimensionMode = "manual",
    varianceThreshold = 0.9,
    cutQualityParams = {},
    softMembershipParams = {
      temperature: 1.0,
      minWeight: 0.10,
      entropyCap: 0.8
    },
    useTwoLayer = true,
    primaryGranularity = 75,
    detailGranularity = 30,
    applyPopularityDampening = false,
    anchorAxes = [],
    onLog,
  } = options;

  const log = (type: "analysis" | "quality" | "hierarchy", message: string, data?: any) => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    onLog?.(type, message, data);
  };

  const checkpoints: AnalysisCheckpoint[] = [];
  const jurors = jurorBlocks.map((b) => b.juror).filter((j) => j !== "Unattributed");
  const sentences: SentenceRecord[] = [];
  
  for (const b of jurorBlocks) {
    const sents = sentenceSplit(b.text);
    for (let i = 0; i < sents.length; i++) {
      const id = `${b.juror}::${i}`;
      sentences.push({ id, juror: b.juror, sentence: sents[i], stance: stanceOfSentence(sents[i]) });
    }
  }

  // Filter out unattributed unless it is the only source
  const effectiveSentences = sentences.filter((s) => jurors.length === 0 || s.juror !== "Unattributed");
  
  // CHECKPOINT 1: Sentences extracted
  checkpoints.push({
    id: "sentences",
    label: "Sentences Extracted",
    nodes: effectiveSentences.map((s, i) => ({
      id: s.id,
      type: "sentence" as any, // Temporary type for checkpoint visualization
      label: s.sentence.slice(0, 30) + "...",
      size: 10,
      meta: { juror: s.juror },
      // Use a deterministic layout (e.g., a simple line or grid)
      x: (i % 10) * 2,
      y: Math.floor(i / 10) * 2,
      z: 0,
    })),
    links: [],
  });

  if (effectiveSentences.length === 0) {
    return {
      jurors: jurors.length ? jurors : ["Unattributed"],
      concepts: [],
      sentences: [],
      jurorVectors: {},
      nodes: [],
      links: [],
      stats: {
        totalJurors: jurors.length,
        totalSentences: 0,
        totalConcepts: 0,
        stanceCounts: { praise: 0, critique: 0, suggestion: 0, neutral: 0 },
      },
      checkpoints,
    };
  }

  // Extract sentence texts
  const docs = effectiveSentences.map((s) => s.sentence);

  // Build hybrid vectors: semantic embeddings + BM25 frequency
  const [semanticResult, bm25Model] = await Promise.all([
    embedSentences(docs),
    Promise.resolve(buildBM25(jurorBlocks, docs)),
  ]);

  // Use semantic vectors for clustering
  const semanticVectors = semanticResult.vectors;
  const semanticDim = semanticResult.dimension;

  const resolvedCutQualityParams: CutQualityParams = {
    minEffectiveMassPerConcept: 3,
    maxJurorDominance: 0.35,
    ...cutQualityParams,
  };

  // CHECKPOINT 2: Vectors Built
  // In reality, we might skip this or show them as points in space
  
  // Determine K
  let K = clamp(kConcepts, 4, 30);
  let recommendedK: number | undefined;
  let kSearchMetrics: Array<{
    k: number;
    score: number;
    silhouette?: number;
    maxClusterShare?: number;
    stabilityScore?: number;
    valid: boolean;
  }> | undefined;
  let autoKReasoning: string | undefined;
  const requestedNumDimensions = numDimensions;

  if (autoK) {
    const sentenceCount = effectiveSentences.length;
    const dynamicKMin = Math.max(4, Math.round(Math.sqrt(sentenceCount)));
    const dynamicKMax = Math.max(
      dynamicKMin + 1,
      Math.min(20, Math.floor(sentenceCount / 4) || dynamicKMin + 1)
    );
    const resolvedKMin = clamp(kMin ?? dynamicKMin, 2, dynamicKMax);
    const resolvedKMax = Math.max(
      resolvedKMin + 1,
      clamp(kMax ?? dynamicKMax, resolvedKMin + 1, Math.max(dynamicKMax, resolvedKMin + 1))
    );

    log("analysis", `AutoK testing K range: ${resolvedKMin} to ${resolvedKMax} (N=${sentenceCount})`);

    const evalResult = evaluateKRange(
      semanticVectors,
      effectiveSentences,
      resolvedKMin,
      resolvedKMax,
      seed,
      resolvedCutQualityParams,
      {
        dominanceThreshold: autoKDominanceThreshold,
        kPenalty: autoKKPenalty,
        epsilon: autoKEpsilon,
        enableStability: autoKStability,
      }
    );
    recommendedK = evalResult.recommendedK;
    kSearchMetrics = evalResult.metrics;
    autoKReasoning = evalResult.reason;
    kSearchMetrics?.forEach((m) => {
      log(
        "analysis",
        `AutoK K=${m.k}: score=${Number.isFinite(m.score) ? m.score.toFixed(4) : "-inf"}, silhouette=${(m.silhouette ?? 0).toFixed(4)}, dominance=${((m.maxClusterShare ?? 0) * 100).toFixed(1)}%, valid=${m.valid}${m.stabilityScore !== undefined ? `, stability=${m.stabilityScore.toFixed(3)}` : ""}`
      );
    });
    if (recommendedK !== undefined) {
      log(
        "analysis",
        `AutoK selected K=${recommendedK}${autoKReasoning ? ` (reason: ${autoKReasoning})` : ""}`
      );
    }
    K = recommendedK;
  }

  // Clustering
  let assignments: number[];
  let detailAssignments: number[] | undefined;
  let parentMap: Record<number, number> | undefined;
  let centroids: Float64Array[];
  let detailCentroids: Float64Array[] | undefined;

  if (clusteringMode === "hierarchical") {
    // Build dendrogram once
    const dendrogram = buildDendrogram(semanticVectors);
    
    if (useTwoLayer) {
      // Perform two-layer cut
      const detailAutoRange = autoK ? { min: 20, max: 50, step: 5 } : undefined;
      const twoLayerResult = cutDendrogramTwoLayer(
        dendrogram,
        semanticVectors,
        effectiveSentences,
        resolvedCutQualityParams,
        { ...resolvedCutQualityParams, minJurorSupportPerConcept: 1, minEffectiveMassPerConcept: 1 }, // Looser constraints for detail
        primaryGranularity,
        detailGranularity,
        detailAutoRange
      );
      assignments = twoLayerResult.primaryAssignments;
      detailAssignments = twoLayerResult.detailAssignments;
      parentMap = twoLayerResult.parentMap;
      
      K = new Set(assignments).size;
      centroids = computeCentroids(semanticVectors, assignments, K);
      
      const numDetail = new Set(detailAssignments).size;
      detailCentroids = computeCentroids(semanticVectors, detailAssignments, numDetail);
      
      log("analysis", `Two-layer cut complete: Primary=${K}, Detail=${numDetail} concepts`);
      if (twoLayerResult.detailGranularities && Object.keys(twoLayerResult.detailGranularities).length > 0) {
        const detailLog = Object.entries(twoLayerResult.detailGranularities)
          .map(([p, g]) => `P${p}: ${g}%`)
          .join(", ");
        log("analysis", `Detail granularity selections: ${detailLog}`);
      }
      
      // Compute avg detail per primary
      const detailCounts = Object.values(parentMap).reduce((acc, pId) => {
        acc[pId] = (acc[pId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      const avgDetail = numDetail / K;
      log("hierarchy", `Built hierarchy: ${K} primary → ${numDetail} detail (avg ${avgDetail.toFixed(1)}/primary)`);
    } else if (cutType === "granularity") {
      // Cut by granularity threshold with quality constraints
      assignments = cutDendrogramByThreshold(
        dendrogram, 
        semanticVectors, 
        effectiveSentences, 
        granularityPercent, 
        resolvedCutQualityParams
      );
      // Get actual K from assignments
      K = new Set(assignments).size;
      centroids = computeCentroids(semanticVectors, assignments, K);
    } else {
      // Cut by count (default)
      assignments = cutDendrogramByCount(semanticVectors, K);
      centroids = computeCentroids(semanticVectors, assignments, K);
    }
  } else {
    // Default K-means
    const km = kmeansCosine(semanticVectors, K, 25, seed);
    assignments = km.assignments;
    centroids = km.centroids;
  }

  // Enforce cluster size cap in single-layer mode
  if (!useTwoLayer) {
    const capShare = 0.35;
    const maxClusterSize = Math.max(1, Math.floor(effectiveSentences.length * capShare));
    const clusterMembers: Record<number, number[]> = {};
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      clusterMembers[a] = clusterMembers[a] || [];
      clusterMembers[a].push(i);
    }

    const newAssignments = new Array(assignments.length).fill(-1);
    let nextClusterId = 0;
    let appliedSplit = false;

    for (const [clusterIdStr, indices] of Object.entries(clusterMembers)) {
      const clusterSize = indices.length;
      if (clusterSize > maxClusterSize) {
        appliedSplit = true;
        const targetK = Math.min(
          clusterSize,
          Math.max(2, Math.ceil(clusterSize / maxClusterSize))
        );
        const clusterVectors = indices.map((idx) => semanticVectors[idx]);
        const dendro = buildDendrogram(clusterVectors);
        const subAssignments = cutDendrogramByCount(clusterVectors, targetK);
        const subIds = Array.from(new Set(subAssignments)).sort((a, b) => a - b);
        const subMap = new Map<number, number>();
        for (const subId of subIds) {
          subMap.set(subId, nextClusterId++);
        }
        for (let i = 0; i < subAssignments.length; i++) {
          const globalId = subMap.get(subAssignments[i])!;
          newAssignments[indices[i]] = globalId;
        }
        log(
          "quality",
          `Cluster cap split applied: cluster ${clusterIdStr} size ${clusterSize} -> ${subIds.length} clusters (cap ${maxClusterSize})`
        );
      } else {
        const globalId = nextClusterId++;
        for (const idx of indices) {
          newAssignments[idx] = globalId;
        }
      }
    }

    if (appliedSplit) {
      assignments = newAssignments;
      K = nextClusterId;
      centroids = computeCentroids(semanticVectors, assignments, K);
    }
  }

  // Quality check for primary layer
  const quality = evaluateCutQuality(assignments, effectiveSentences, centroids, resolvedCutQualityParams);
  log("quality", `Primary cut quality for K=${K}: score=${quality.score.toFixed(2)}, valid=${quality.isValid}`, quality);
  if (quality.penalties.supportViolations > 0) {
    log("quality", `Quality warning: ${quality.penalties.supportViolations} primary concepts violate minJurorSupport`);
  }

  // Build primary concept objects
  const primaryConceptIds = Array.from({ length: K }, (_, i) => `concept:${i}`);
  const primaryConcepts: Concept[] = [];
  
  for (let c = 0; c < K; c++) {
    const id = primaryConceptIds[c];
    const clusterSentenceIndices = assignments.map((a, i) => a === c ? i : -1).filter(i => i >= 0);
    const clusterSentences = clusterSentenceIndices.map(i => docs[i]);
    
    const label = contrastiveLabelCluster(centroids[c], bm25Model, clusterSentences, docs, 4);
    const topTerms = getClusterTopTerms(centroids[c], bm25Model, clusterSentences, docs, 12);
    
    const rankedEvidence = rankEvidenceForConcept(
      docs,
      clusterSentenceIndices,
      centroids[c],
      semanticVectors,
      bm25Model,
      topTerms,
      evidenceRankingParams,
      3
    );

    primaryConcepts.push({
      id,
      label,
      size: 0, // Will be computed later
      topTerms,
      representativeSentences: rankedEvidence.map(r => r.sentence)
    });
  }

  // Build detail concept objects if in two-layer mode
  let detailConcepts: Concept[] = [];
  let conceptHierarchy: Record<string, string[]> = {};
  
  if (useTwoLayer && detailAssignments && parentMap && detailCentroids) {
    const numDetail = detailCentroids.length;
    const detailConceptIds = Array.from({ length: numDetail }, (_, i) => `concept:detail:${i}`);
    
    for (let d = 0; d < numDetail; d++) {
      const id = detailConceptIds[d];
      const clusterSentenceIndices = detailAssignments.map((a, i) => a === d ? i : -1).filter(i => i >= 0);
      const clusterSentences = clusterSentenceIndices.map(i => docs[i]);
      
      const label = contrastiveLabelCluster(detailCentroids[d], bm25Model, clusterSentences, docs, 4);
      const topTerms = getClusterTopTerms(detailCentroids[d], bm25Model, clusterSentences, docs, 12);
      
      const rankedEvidence = rankEvidenceForConcept(
        docs,
        clusterSentenceIndices,
        detailCentroids[d],
        semanticVectors,
        bm25Model,
        topTerms,
        evidenceRankingParams,
        3
      );

      detailConcepts.push({
        id,
        label,
        size: 0,
        topTerms,
        representativeSentences: rankedEvidence.map(r => r.sentence)
      });

      const primaryId = `concept:${parentMap[d]}`;
      conceptHierarchy[primaryId] = conceptHierarchy[primaryId] || [];
      conceptHierarchy[primaryId].push(id);
    }
  }

  // Assign concepts to sentences
  let detailMemberships: Array<Array<{ conceptId: string; weight: number }>> | undefined;
  
  if (softMembership) {
    const primaryMemberships = computeSoftMembership(semanticVectors, centroids, softTopN, softMembershipParams);
    
    if (useTwoLayer && detailCentroids) {
      // For detail layer, we use same softTopN and params
      const rawDetailMemberships = computeSoftMembership(semanticVectors, detailCentroids, softTopN, softMembershipParams);
      // Map IDs correctly
      detailMemberships = rawDetailMemberships.map(mList => mList.map(m => ({
        ...m,
        conceptId: m.conceptId.replace("concept:", "concept:detail:")
      })));
    }

    for (let i = 0; i < effectiveSentences.length; i++) {
      effectiveSentences[i].conceptMembership = primaryMemberships[i];
      // Set primary for backward compatibility
      effectiveSentences[i].conceptId = primaryMemberships[i][0].conceptId;
    }
  } else {
    for (let i = 0; i < effectiveSentences.length; i++) {
      effectiveSentences[i].conceptId = `concept:${assignments[i]}`;
    }
  }

  // Juror → concept weights
  const jurorVectors: Record<string, Record<string, number>> = {};
  const jurorVectorsDetail: Record<string, Record<string, number>> = {};
  const primaryConceptCounts: Record<string, number> = {};
  const detailConceptCounts: Record<string, number> = {};
  const stanceCounts: Record<Stance, number> = { praise: 0, critique: 0, suggestion: 0, neutral: 0 };

  for (let i = 0; i < effectiveSentences.length; i++) {
    const s = effectiveSentences[i];
    stanceCounts[s.stance]++;
    const j = s.juror;
    
    // Primary layer weights
    if (softMembership && s.conceptMembership) {
      jurorVectors[j] = jurorVectors[j] || {};
      for (const m of s.conceptMembership) {
        jurorVectors[j][m.conceptId] = (jurorVectors[j][m.conceptId] ?? 0) + m.weight;
        primaryConceptCounts[m.conceptId] = (primaryConceptCounts[m.conceptId] ?? 0) + m.weight;
      }
    } else {
      const c = s.conceptId!;
      jurorVectors[j] = jurorVectors[j] || {};
      jurorVectors[j][c] = (jurorVectors[j][c] ?? 0) + 1;
      primaryConceptCounts[c] = (primaryConceptCounts[c] ?? 0) + 1;
    }

    // Detail layer weights
    if (useTwoLayer) {
      jurorVectorsDetail[j] = jurorVectorsDetail[j] || {};
      if (softMembership && detailMemberships) {
        for (const m of detailMemberships[i]) {
          jurorVectorsDetail[j][m.conceptId] = (jurorVectorsDetail[j][m.conceptId] ?? 0) + m.weight;
          detailConceptCounts[m.conceptId] = (detailConceptCounts[m.conceptId] ?? 0) + m.weight;
        }
      } else if (detailAssignments) {
        const dId = `concept:detail:${detailAssignments[i]}`;
        jurorVectorsDetail[j][dId] = (jurorVectorsDetail[j][dId] ?? 0) + 1;
        detailConceptCounts[dId] = (detailConceptCounts[dId] ?? 0) + 1;
      }
    }
  }

  // Normalize per juror
  for (const j of Object.keys(jurorVectors)) {
    const total = Object.values(jurorVectors[j]).reduce((a, b) => a + b, 0) || 1;
    for (const c of Object.keys(jurorVectors[j])) jurorVectors[j][c] /= total;
  }
  if (useTwoLayer) {
    for (const j of Object.keys(jurorVectorsDetail)) {
      const total = Object.values(jurorVectorsDetail[j]).reduce((a, b) => a + b, 0) || 1;
      for (const c of Object.keys(jurorVectorsDetail[j])) jurorVectorsDetail[j][c] /= total;
    }
  }

  // Compute high-dimensional juror vectors and extract top terms
  const jurorList = [...new Set(effectiveSentences.map((s) => s.juror))].filter(Boolean);
  // Extract contrastive top terms per juror
  const jurorTopTerms: Record<string, string[]> = {};
  if (jurorList.length > 0) {
    for (const juror of jurorList) {
      const jurorSentences = effectiveSentences
        .filter(s => s.juror === juror)
        .map(s => s.sentence);
      
      const scores = computeContrastiveTermScores(
        jurorSentences,
        docs,
        bm25Model,
        2, // minDF
        0.8 // maxDFPercent
      );
      
      jurorTopTerms[juror] = scores.slice(0, 12).map(x => x.term);
    }
  }

  // Determine final number of dimensions if in automatic mode
  let finalNumDimensions = numDimensions;
  if (dimensionMode !== "manual" && centroids.length > 1) {
    const scanTargetDimensions = Math.max(12, numDimensions);
    const scanResult = reduceToND(centroids, scanTargetDimensions, 10, seed);

    if (dimensionMode === "threshold") {
      finalNumDimensions = findOptimalDimensionsThreshold(
        scanResult.varianceStats.explainedVariances,
        scanResult.varianceStats.totalVariance,
        varianceThreshold
      );
    } else if (dimensionMode === "elbow") {
      finalNumDimensions = findOptimalDimensionsElbow(scanResult.varianceStats.explainedVariances);
    }

    // Clamp to available scan dimensions to avoid trailing zero-variance axes
    const maxAvailable = Math.max(1, scanResult.varianceStats.explainedVariances.length || 1);
    finalNumDimensions = Math.max(1, Math.min(maxAvailable, finalNumDimensions));
  }

  // Compute 3D positions
  const { positions: positions3D, conceptPcValues, jurorPcValues, varianceStats } = computeNode3DPositions(
    jurorVectors,
    centroids,
    jurorList,
    primaryConceptIds,
    finalNumDimensions,
    10, // scale
    seed
  );

  // Nodes with 3D positions
  const nodes: GraphNode[] = [];
  for (const j of jurorList) {
    const pos = positions3D.get(`juror:${j}`) ?? { x: 0, y: 0, z: 0 };
    nodes.push({ 
      id: `juror:${j}`, 
      type: "juror", 
      label: j, 
      size: 28, 
      meta: {},
      x: pos.x,
      y: pos.y,
      z: pos.z,
      pcValues: jurorPcValues.get(`juror:${j}`),
    });
  }

  // Build Primary Concept Nodes
  for (const c of primaryConcepts) {
    const pos = positions3D.get(c.id) ?? { x: 0, y: 0, z: 0 };
    const weight = primaryConceptCounts[c.id] ?? 0;
    c.size = Math.min(6 + Math.log2(weight + 1) * 8.4, 48.0);
    c.weight = weight;

    const jurorDistribution = jurorList
      .map(j => ({ juror: j, weight: jurorVectors[j]?.[c.id] ?? 0 }))
      .filter(d => d.weight > 0);

    nodes.push({ 
      id: c.id, 
      type: "concept", 
      label: c.label, 
      size: c.size, 
      meta: { 
        topTerms: c.topTerms,
        weight: c.weight,
        jurorDistribution
      },
      x: pos.x,
      y: pos.y,
      z: pos.z,
      pcValues: conceptPcValues.get(c.id),
      layer: "primary",
      childConceptIds: conceptHierarchy[c.id]
    });
  }

  // Build Detail Concept Nodes
  if (useTwoLayer) {
    for (const c of detailConcepts) {
      const weight = detailConceptCounts[c.id] ?? 0;
      c.size = Math.min(4 + Math.log2(weight + 1) * 6.0, 32.0);
      c.weight = weight;

      const jurorDistribution = jurorList
        .map(j => ({ juror: j, weight: jurorVectorsDetail[j]?.[c.id] ?? 0 }))
        .filter(d => d.weight > 0);

      // Find parent primary concept
      const parentId = Object.keys(conceptHierarchy).find(pId => conceptHierarchy[pId].includes(c.id));
      const parentNode = nodes.find(n => n.id === parentId);
      
      // Initially position near parent with slight random offset
      const offset = 2.0;
      nodes.push({
        id: c.id,
        type: "concept",
        label: c.label,
        size: c.size,
        meta: {
          topTerms: c.topTerms,
          weight: c.weight,
          jurorDistribution
        },
        x: (parentNode?.x || 0) + (Math.random() - 0.5) * offset,
        y: (parentNode?.y || 0) + (Math.random() - 0.5) * offset,
        z: (parentNode?.z || 0) + (Math.random() - 0.5) * offset,
        layer: "detail",
        parentConceptId: parentId
      });
    }
  }

  // Links
  const links: GraphLink[] = [];
  
  // 1. Juror → Primary Concept Links
  for (const j of jurorList) {
    const vec = jurorVectors[j] || {};
    for (const c of primaryConcepts) {
      const w = vec[c.id] ?? 0;
      if (w <= 0.05) continue; // Threshold for cleaner graph
      
      let finalWeight = w;
      if (applyPopularityDampening) {
        const conceptCount = primaryConceptCounts[c.id] || 1;
        finalWeight = w / Math.sqrt(conceptCount);
      }

      // Determine dominant stance for this link
      const linkSentences = effectiveSentences.filter(s => s.juror === j && 
        (softMembership ? s.conceptMembership?.some(m => m.conceptId === c.id) : s.conceptId === c.id));
      
      const localStances: Record<Stance, number> = { praise: 0, critique: 0, suggestion: 0, neutral: 0 };
      linkSentences.forEach(s => localStances[s.stance]++);
      const dominantStance = (Object.entries(localStances) as [Stance, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";

      links.push({
        id: `link:juror:${j}__${c.id}`,
        source: `juror:${j}`,
        target: c.id,
        weight: finalWeight,
        stance: dominantStance,
        evidenceIds: linkSentences.map(s => s.id),
        kind: "jurorConcept",
      });
    }
  }

  // 2. Juror → Detail Concept Links (UI will filter these based on expansion)
  if (useTwoLayer) {
    for (const j of jurorList) {
      const vec = jurorVectorsDetail[j] || {};
      for (const c of detailConcepts) {
        const w = vec[c.id] ?? 0;
        if (w <= 0.05) continue;

        let finalWeight = w;
        if (applyPopularityDampening) {
          const conceptCount = detailConceptCounts[c.id] || 1;
          finalWeight = w / Math.sqrt(conceptCount);
        }

        // Determine dominant stance for this detail link
        const linkSentences = effectiveSentences.filter((s, idx) => {
          if (s.juror !== j) return false;
          if (softMembership && detailMemberships) {
            return detailMemberships[idx].some(m => m.conceptId === c.id);
          } else if (detailAssignments) {
            return `concept:detail:${detailAssignments[idx]}` === c.id;
          }
          return false;
        });

        const localStances: Record<Stance, number> = { praise: 0, critique: 0, suggestion: 0, neutral: 0 };
        linkSentences.forEach(s => localStances[s.stance]++);
        const dominantStance = (Object.entries(localStances) as [Stance, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";

        links.push({
          id: `link:juror:${j}__${c.id}`,
          source: `juror:${j}`,
          target: c.id,
          weight: finalWeight,
          stance: dominantStance,
          evidenceIds: linkSentences.map(s => s.id),
          kind: "jurorConcept",
        });
      }
    }
  }

  // Derived projections (using primary layer)
  const jurorSimilarityLinks = buildJurorSimilarityLinks(jurorList, jurorVectors, primaryConceptIds, similarityThreshold);
  links.push(...jurorSimilarityLinks);

  const conceptConceptThreshold = similarityThreshold * 0.7;
  const conceptSimilarityLinks = buildConceptSimilarityLinks(
    primaryConceptIds,
    centroids,
    similarityThreshold,
    conceptConceptThreshold
  );
  links.push(...conceptSimilarityLinks);

  // Anchored axis projections (optional, measurement only)
  let resolvedAnchorAxes = anchorAxes;
  let anchorAxisScores: AnalysisResult["anchorAxisScores"] | undefined;
  if (anchorAxes && anchorAxes.length > 0) {
    resolvedAnchorAxes = await embedAnchorAxes(anchorAxes);
    anchorAxisScores = {
      concepts: projectConceptCentroids(centroids, resolvedAnchorAxes),
      jurors: projectJurorVectors(jurorVectors, centroids, resolvedAnchorAxes),
    };
  }

  // Compute axis labels from 3D node positions
  const axisLabels = labelAxes(nodes, finalNumDimensions, conceptPcValues);

  // Final Checkpoint
  checkpoints.push({
    id: "final",
    label: "Graph Built",
    nodes,
    links,
  });

  return {
    jurors: jurorList,
    concepts: primaryConcepts,
    primaryConcepts,
    detailConcepts,
    conceptHierarchy,
    sentences: effectiveSentences,
    jurorVectors,
    jurorVectorsDetail,
    nodes,
    links,
    stats: {
      totalJurors: jurorList.length,
      totalSentences: effectiveSentences.length,
      totalConcepts: primaryConcepts.length,
      stanceCounts,
    },
    recommendedK,
    kSearchMetrics,
    autoKReasoning,
    clusteringMode,
    checkpoints,
    jurorTopTerms,
    axisLabels,
    anchorAxes: resolvedAnchorAxes,
    anchorAxisScores,
    varianceStats,
    requestedNumDimensions,
    appliedNumDimensions: varianceStats?.explainedVariances.length ?? finalNumDimensions,
    dimensionMode,
    varianceThreshold,
  };
}
