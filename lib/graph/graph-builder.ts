import type { JurorBlock, HybridAnalysisParams, BM25Model } from "@/types/nlp";
import type { AnalysisResult, SentenceRecord, AnalysisCheckpoint } from "@/types/analysis";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { Stance } from "@/types/nlp";
import { sentenceSplit } from "@/lib/nlp/sentence-splitter";
import { stanceOfSentence } from "@/lib/nlp/stance-classifier";
import { kmeansCosine } from "@/lib/analysis/kmeans";
import { clamp } from "@/lib/utils/text-utils";
import { buildJurorSimilarityLinks, buildConceptSimilarityLinks } from "./projections";
import { computeNode3DPositions } from "./dimensionality-reduction";

// Hybrid analysis imports
import { embedSentences } from "@/lib/analysis/sentence-embeddings";
import { buildBM25 } from "@/lib/analysis/bm25";
import { buildHybridVectors, DEFAULT_HYBRID_PARAMS, hybridCosine } from "@/lib/analysis/hybrid-vectors";
import { hybridLabelCluster, getClusterTopTerms } from "@/lib/analysis/hybrid-concept-labeler";

// New algorithm imports
import { evaluateKRange } from "@/lib/analysis/cluster-eval";
import { buildDendrogram, cutDendrogramByCount, cutDendrogramByThreshold } from "@/lib/analysis/hierarchical-clustering";
import { computeSoftMembership } from "@/lib/analysis/soft-membership";
import { computeCentroids } from "@/lib/analysis/concept-centroids";

/**
 * Build analysis using hybrid semantic-frequency system
 */
export async function buildAnalysis(
  jurorBlocks: JurorBlock[],
  kConcepts: number,
  similarityThreshold: number,
  hybridParams: HybridAnalysisParams = DEFAULT_HYBRID_PARAMS,
  options: {
    clusteringMode?: "kmeans" | "hierarchical" | "hybrid";
    autoK?: boolean;
    kMin?: number;
    kMax?: number;
    softMembership?: boolean;
    softTopN?: number;
    cutType?: "count" | "granularity";
    granularityPercent?: number;
  } = {}
): Promise<AnalysisResult> {
  const {
    clusteringMode = "kmeans",
    autoK = false,
    kMin = 4,
    kMax = 20,
    softMembership = false,
    softTopN = 2,
    cutType = "count",
    granularityPercent = 50,
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
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10,
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

  const hybridVectors = buildHybridVectors(semanticResult, bm25Model, hybridParams);
  const semanticDim = semanticResult.dimension;

  // CHECKPOINT 2: Vectors Built
  // In reality, we might skip this or show them as points in space
  
  // Determine K
  let K = clamp(kConcepts, 4, 30);
  let recommendedK: number | undefined;
  let kSearchMetrics: Array<{ k: number; score: number }> | undefined;

  if (autoK) {
    const evalResult = evaluateKRange(hybridVectors, kMin, kMax);
    recommendedK = evalResult.recommendedK;
    kSearchMetrics = evalResult.metrics;
    K = recommendedK;
  }

  // Clustering
  let assignments: number[];
  let centroids: Float64Array[];

  if (clusteringMode === "hierarchical" || clusteringMode === "hybrid") {
    // Build dendrogram once
    const dendrogram = buildDendrogram(hybridVectors);
    
    if (cutType === "granularity") {
      // Cut by granularity threshold
      assignments = cutDendrogramByThreshold(dendrogram, hybridVectors, granularityPercent);
      // Get actual K from assignments
      K = new Set(assignments).size;
      centroids = computeCentroids(hybridVectors, assignments, K);
    } else {
      // Cut by count (default)
      assignments = cutDendrogramByCount(hybridVectors, K);
      centroids = computeCentroids(hybridVectors, assignments, K);
    }
  } else {
    // Default K-means
    const km = kmeansCosine(hybridVectors, K);
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
    const label = hybridLabelCluster([], bm25Model, centroids[c], semanticDim, 0, 4);
    conceptLabel.set(id, label);

    const topTerms = getClusterTopTerms([], bm25Model, centroids[c], semanticDim, 12);
    conceptTopTerms.set(id, topTerms);

    // Find representative sentences (closest to centroid)
    const sentenceSimilarities = assignments.map((assignment, i) => ({
      idx: i,
      sim: assignment === c ? hybridCosine(hybridVectors[i], centroids[c]) : -1
    }));
    sentenceSimilarities.sort((a, b) => b.sim - a.sim);
    representativeSentencesMap.set(id, sentenceSimilarities.slice(0, 3).filter(s => s.sim > 0).map(s => docs[s.idx]));
  }

  // Assign concept to sentence
  if (softMembership) {
    const memberships = computeSoftMembership(hybridVectors, centroids, softTopN);
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
    const vectorDim = centroids[0].length;
    
    for (const juror of jurorList) {
      const vec = jurorVectors[juror] || {};
      
      // Compute weighted average of concept centroids
      const jurorHighDimVector = new Float64Array(vectorDim);
      for (const [conceptId, weight] of Object.entries(vec)) {
        const conceptIndex = conceptIds.indexOf(conceptId);
        if (conceptIndex >= 0 && weight > 0) {
          for (let i = 0; i < vectorDim; i++) {
            jurorHighDimVector[i] += centroids[conceptIndex][i] * weight;
          }
        }
      }
      
      // L2 normalize the vector
      let norm = 0;
      for (let i = 0; i < vectorDim; i++) {
        norm += jurorHighDimVector[i] * jurorHighDimVector[i];
      }
      norm = Math.sqrt(norm) || 1;
      for (let i = 0; i < vectorDim; i++) {
        jurorHighDimVector[i] /= norm;
      }
      
      // Extract top terms using the same function as concepts
      const topTerms = getClusterTopTerms([], bm25Model, jurorHighDimVector, semanticDim, 12);
      jurorTopTerms[juror] = topTerms;
    }
  }

  // Compute 3D positions
  const positions3D = computeNode3DPositions(
    jurorVectors,
    centroids,
    jurorList,
    conceptIds,
    10 // scale
  );

  // Nodes with 3D positions
  const nodes: GraphNode[] = [];
  for (const j of jurorList) {
    const pos = positions3D.get(`juror:${j}`) ?? { x: 0, y: 0, z: 0 };
    nodes.push({ 
      id: `juror:${j}`, 
      type: "juror", 
      label: j, 
      size: 16, 
      meta: {},
      x: pos.x,
      y: pos.y,
      z: pos.z,
    });
  }

  const concepts = conceptIds.map((id) => ({
    id,
    label: conceptLabel.get(id) || id,
    size: 22 + Math.sqrt(conceptCounts[id] ?? 1) * 6,
    topTerms: conceptTopTerms.get(id) || [],
    representativeSentences: representativeSentencesMap.get(id),
  }));

  for (const c of concepts) {
    const pos = positions3D.get(c.id) ?? { x: 0, y: 0, z: 0 };
    nodes.push({ 
      id: c.id, 
      type: "concept", 
      label: c.label, 
      size: c.size, 
      meta: { topTerms: c.topTerms },
      x: pos.x,
      y: pos.y,
      z: pos.z,
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
  };
}
