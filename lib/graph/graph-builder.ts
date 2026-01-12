import type { JurorBlock, BM25Model } from "@/types/nlp";
import type { AnalysisResult, SentenceRecord, AnalysisCheckpoint } from "@/types/analysis";
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

// Core analysis imports
import { embedSentences } from "@/lib/analysis/sentence-embeddings";
import { buildBM25 } from "@/lib/analysis/bm25";
import { contrastiveLabelCluster, getClusterTopTerms } from "@/lib/analysis/concept-labeler";
import { rankEvidenceForConcept, DEFAULT_EVIDENCE_RANKING_PARAMS } from "@/lib/analysis/evidence-ranker";
import { cosine } from "@/lib/analysis/tfidf";
import { extractNgrams } from "@/lib/nlp/ngram-extractor";

// Clustering algorithm imports
import { evaluateKRange } from "@/lib/analysis/cluster-eval";
import { buildDendrogram, cutDendrogramByCount, cutDendrogramByThreshold } from "@/lib/analysis/hierarchical-clustering";
import { computeSoftMembership } from "@/lib/analysis/soft-membership";
import { computeCentroids } from "@/lib/analysis/concept-centroids";

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
    softMembership?: boolean;
    softTopN?: number;
    cutType?: "count" | "granularity";
    granularityPercent?: number;
    seed?: number;
    numDimensions?: number;
    dimensionMode?: "manual" | "elbow" | "threshold";
    varianceThreshold?: number;
  } = {}
): Promise<AnalysisResult> {
  const {
    evidenceRankingParams = DEFAULT_EVIDENCE_RANKING_PARAMS,
    clusteringMode = "hierarchical",
    autoK = true,
    kMin = 4,
    kMax = 20,
    softMembership = true,
    softTopN = 2,
    cutType = "count",
    granularityPercent = 50,
    seed = 42,
    numDimensions = 3,
    dimensionMode = "manual",
    varianceThreshold = 0.9,
  } = options;

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

  // CHECKPOINT 2: Vectors Built
  // In reality, we might skip this or show them as points in space
  
  // Determine K
  let K = clamp(kConcepts, 4, 30);
  let recommendedK: number | undefined;
  let kSearchMetrics: Array<{ k: number; score: number }> | undefined;
  const requestedNumDimensions = numDimensions;

  if (autoK) {
    const evalResult = evaluateKRange(semanticVectors, kMin, kMax, seed);
    recommendedK = evalResult.recommendedK;
    kSearchMetrics = evalResult.metrics;
    K = recommendedK;
  }

  // Clustering
  let assignments: number[];
  let centroids: Float64Array[];

  if (clusteringMode === "hierarchical") {
    // Build dendrogram once
    const dendrogram = buildDendrogram(semanticVectors);
    
    if (cutType === "granularity") {
      // Cut by granularity threshold
      assignments = cutDendrogramByThreshold(dendrogram, semanticVectors, granularityPercent);
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

  // Build concept nodes
  const conceptIds = Array.from({ length: K }, (_, i) => `concept:${i}`);
  const conceptLabel = new Map<string, string>();
  const conceptTopTerms = new Map<string, string[]>();
  const representativeSentencesMap = new Map<string, string[]>();

  for (let c = 0; c < K; c++) {
    const id = conceptIds[c];
    
    // Get sentences in this cluster
    const clusterSentenceIndices = assignments.map((a, i) => a === c ? i : -1).filter(i => i >= 0);
    const clusterSentences = clusterSentenceIndices.map(i => docs[i]);

    // Contrastive labeling
    const label = contrastiveLabelCluster(centroids[c], bm25Model, clusterSentences, docs, 4);
    conceptLabel.set(id, label);

    // Top terms (also contrastive)
    const topTerms = getClusterTopTerms(centroids[c], bm25Model, clusterSentences, docs, 12);
    conceptTopTerms.set(id, topTerms);

    // Find representative sentences using evidence ranking (semantic + BM25)
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
    representativeSentencesMap.set(id, rankedEvidence.map(r => r.sentence));
  }

  // Assign concept to sentence
  if (softMembership) {
    const memberships = computeSoftMembership(semanticVectors, centroids, softTopN);
    for (let i = 0; i < effectiveSentences.length; i++) {
      effectiveSentences[i].conceptMembership = memberships[i];
      // Set primary for backward compatibility
      effectiveSentences[i].conceptId = memberships[i][0].conceptId;
    }
  } else {
    for (let i = 0; i < effectiveSentences.length; i++) {
      effectiveSentences[i].conceptId = conceptIds[assignments[i]];
    }
  }

  // Juror → concept weights
  const jurorVectors: Record<string, Record<string, number>> = {};
  const conceptCounts: Record<string, number> = {};
  const stanceCounts: Record<Stance, number> = { praise: 0, critique: 0, suggestion: 0, neutral: 0 };

  for (const s of effectiveSentences) {
    stanceCounts[s.stance]++;
    const j = s.juror;
    
    if (softMembership && s.conceptMembership) {
      jurorVectors[j] = jurorVectors[j] || {};
      for (const m of s.conceptMembership) {
        jurorVectors[j][m.conceptId] = (jurorVectors[j][m.conceptId] ?? 0) + m.weight;
        conceptCounts[m.conceptId] = (conceptCounts[m.conceptId] ?? 0) + m.weight;
      }
    } else {
      const c = s.conceptId!;
      jurorVectors[j] = jurorVectors[j] || {};
      jurorVectors[j][c] = (jurorVectors[j][c] ?? 0) + 1;
      conceptCounts[c] = (conceptCounts[c] ?? 0) + 1;
    }
  }

  // Normalize per juror
  for (const j of Object.keys(jurorVectors)) {
    const total = Object.values(jurorVectors[j]).reduce((a, b) => a + b, 0) || 1;
    for (const c of Object.keys(jurorVectors[j])) jurorVectors[j][c] /= total;
  }

  // Compute high-dimensional juror vectors and extract top terms
  const jurorList = [...new Set(effectiveSentences.map((s) => s.juror))].filter(Boolean);
  const jurorTopTerms: Record<string, string[]> = {};
  
  if (centroids.length > 0 && jurorList.length > 0) {
    for (const juror of jurorList) {
      const jurorSentences = effectiveSentences
        .filter(s => s.juror === juror)
        .map(s => s.sentence);
      
      // Use BM25 scores directly on juror's sentences
      const jurorNgrams = new Set<string>();
      for (const sent of jurorSentences) {
        const ngrams = extractNgrams(sent);
        for (const ng of ngrams) jurorNgrams.add(ng);
      }
      
      // Score n-grams by BM25 frequency in juror's sentences
      const ngramScores = Array.from(jurorNgrams).map(ngram => {
        const score = bm25Model.scores.get(ngram) || 0;
        return { ngram, score };
      });
      
      ngramScores.sort((a, b) => b.score - a.score);
      jurorTopTerms[juror] = ngramScores.slice(0, 12).map(x => x.ngram);
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
    conceptIds,
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

  const concepts = conceptIds.map((id) => {
    const weight = conceptCounts[id] ?? 0;
    // Logarithmic scale with a cap at 48 (3x previous 16)
    // multiplier 8.4 (3x 2.8)
    const rawSize = 6 + Math.log2(weight + 1) * 8.4;
    return {
      id,
      label: conceptLabel.get(id) || id,
      size: Math.min(rawSize, 48.0),
      weight,
      topTerms: conceptTopTerms.get(id) || [],
      representativeSentences: representativeSentencesMap.get(id),
    };
  });

  for (const c of concepts) {
    const pos = positions3D.get(c.id) ?? { x: 0, y: 0, z: 0 };
    
    // Get full juror distribution for this concept (even weak ones)
    const jurorDistribution = jurorList
      .map(j => ({
        juror: j,
        weight: jurorVectors[j]?.[c.id] ?? 0
      }))
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
    });
  }

  // Links
  const links: GraphLink[] = [];
  for (const j of jurorList) {
    const vec = jurorVectors[j] || {};
    for (const cId of conceptIds) {
      const w = vec[cId] ?? 0;
      if (w <= 0.05) continue; // Threshold for cleaner graph
      
      // Determine dominant stance for this link
      const linkSentences = effectiveSentences.filter(s => s.juror === j && 
        (softMembership ? s.conceptMembership?.some(m => m.conceptId === cId) : s.conceptId === cId));
      
      const localStances: Record<Stance, number> = { praise: 0, critique: 0, suggestion: 0, neutral: 0 };
      linkSentences.forEach(s => localStances[s.stance]++);
      const dominantStance = (Object.entries(localStances) as [Stance, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";

      links.push({
        id: `link:juror:${j}__${cId}`,
        source: `juror:${j}`,
        target: cId,
        weight: w,
        stance: dominantStance,
        evidenceIds: linkSentences.map(s => s.id),
        kind: "jurorConcept",
      });
    }
  }

  // Derived projections
  const jurorSimilarityLinks = buildJurorSimilarityLinks(jurorList, jurorVectors, conceptIds, similarityThreshold);
  links.push(...jurorSimilarityLinks);

  const conceptSimilarityLinks = buildConceptSimilarityLinks(conceptIds, centroids, similarityThreshold);
  links.push(...conceptSimilarityLinks);

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
    concepts,
    sentences: effectiveSentences,
    jurorVectors,
    nodes,
    links,
    stats: {
      totalJurors: jurorList.length,
      totalSentences: effectiveSentences.length,
      totalConcepts: concepts.length,
      stanceCounts,
    },
    recommendedK,
    kSearchMetrics,
    clusteringMode,
    checkpoints,
    jurorTopTerms,
    axisLabels,
    varianceStats,
    requestedNumDimensions,
    appliedNumDimensions: varianceStats?.explainedVariances.length ?? finalNumDimensions,
    dimensionMode,
    varianceThreshold,
  };
}
