import { sentenceSplit } from "@/lib/nlp/sentence-splitter";
import { embedSentences } from "@/lib/analysis/sentence-embeddings";
import { kmeansCosine } from "@/lib/analysis/kmeans";
import { computeCentroids } from "@/lib/analysis/concept-centroids";
import { extractNgramCounts } from "@/lib/nlp/ngram-extractor";
import { cosine } from "@/lib/analysis/tfidf";
import { embedImages } from "@/lib/analysis/image-embeddings";
import type { DesignerAnalysisResult, DesignerBlock, Stance } from "@/types/nlp";
import type { Concept, SentenceRecord } from "@/types/analysis";
import type { GraphLink, GraphNode } from "@/types/graph";

type BuildDesignerOptions = {
  kConcepts?: number;
  similarityThreshold?: number;
  seed?: number;
  onLog?: (msg: string, data?: any) => void;
  imageThreshold?: number;
};

function topNgrams(sentences: string[], n = 8): string[] {
  const counts = extractNgramCounts(sentences);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, n).map(([ng]) => ng);
}

function toSentenceRecords(blocks: DesignerBlock[]): SentenceRecord[] {
  const records: SentenceRecord[] = [];
  for (const block of blocks) {
    const sentences = sentenceSplit(block.text ?? "");
    for (let i = 0; i < sentences.length; i++) {
      const id = `designer:${block.designer}::${i}`;
      records.push({
        id,
        juror: block.designer,
        sentence: sentences[i],
        stance: "neutral" as Stance,
        sourceTags: [],
      });
    }
  }
  return records;
}

function buildDesignerNodes(designers: string[]): GraphNode[] {
  return designers.map((name) => ({
    id: `designer:${name}`,
    type: "designer" as const,
    label: name,
    size: 24,
  }));
}

function buildConceptNodes(concepts: Concept[], centroids: Float64Array[]): GraphNode[] {
  return concepts.map((c, idx) => ({
    id: c.id,
    type: "designerConcept" as const,
    label: c.label,
    size: Math.max(12, c.size * 2),
    meta: {
      topTerms: c.topTerms,
      weight: c.weight ?? c.size,
    },
    pcValues: Array.from(centroids[idx] || []),
    layer: c.id.includes("detail") ? "detail" : "primary",
  }));
}

function buildDesignerConceptLinks(
  designers: string[],
  vectors: Record<string, Record<string, number>>
): GraphLink[] {
  const links: GraphLink[] = [];
  for (const designer of designers) {
    const vec = vectors[designer] || {};
    for (const [conceptId, weight] of Object.entries(vec)) {
      links.push({
        id: `designer:${designer}::${conceptId}`,
        source: `designer:${designer}`,
        target: conceptId,
        weight,
        kind: "jurorConcept",
      });
    }
  }
  return links;
}

function deriveDesignerVectors(assignments: number[], blocks: DesignerBlock[], k: number): Record<string, Record<string, number>> {
  const vectors: Record<string, Record<string, number>> = {};
  let idx = 0;
  for (const block of blocks) {
    const sentences = sentenceSplit(block.text ?? "");
    const total = sentences.length || 1;
    for (let i = 0; i < sentences.length; i++) {
      const cluster = assignments[idx++];
      const cid = `designer-concept:${cluster}`;
      vectors[block.designer] = vectors[block.designer] || {};
      vectors[block.designer][cid] = (vectors[block.designer][cid] || 0) + 1 / total;
    }
  }
  return vectors;
}

export function attachImagesToConcepts(
  images: Map<string, Float64Array>,
  conceptCentroids: Float64Array[],
  threshold: number
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [imageId, vec] of images.entries()) {
    for (let i = 0; i < conceptCentroids.length; i++) {
      const sim = cosine(vec, conceptCentroids[i]);
      if (sim >= threshold) {
        const cid = `designer-concept:${i}`;
        if (!result[imageId]) result[imageId] = [];
        result[imageId].push(cid);
      }
    }
    if (!result[imageId]) result[imageId] = [];
  }
  return result;
}

export async function buildDesignerAnalysis(
  designerBlocks: DesignerBlock[],
  {
    kConcepts = 6,
    seed = 13,
    onLog,
    imageThreshold = 0.25,
  }: BuildDesignerOptions = {}
): Promise<DesignerAnalysisResult> {
  const sentences = toSentenceRecords(designerBlocks);
  const sentenceTexts = sentences.map((s) => s.sentence);
  const designers = designerBlocks.map((b) => b.designer);

  if (sentenceTexts.length === 0) {
    return {
      designers,
      concepts: [],
      sentences: [],
      designerVectors: {},
      imageConcepts: {},
    };
  }

  const embedding = await embedSentences(sentenceTexts);
  const vectors = embedding.vectors;
  const k = Math.min(kConcepts, Math.max(2, sentenceTexts.length));

  const km = kmeansCosine(vectors, k, 20, seed);
  const assignments = km.assignments;
  const centroids = km.centroids;
  const ngramTerms = new Array(k).fill(0).map(() => [] as string[]);

  const clusterSentences: string[][] = new Array(k).fill(null).map(() => []);
  sentences.forEach((s, idx) => {
    const cid = assignments[idx];
    if (!clusterSentences[cid]) clusterSentences[cid] = [];
    clusterSentences[cid].push(s.sentence);
  });

  const concepts: Concept[] = [];
  for (let i = 0; i < k; i++) {
    const label = clusterSentences[i]?.[0]?.slice(0, 32) || `Concept ${i + 1}`;
    const terms = topNgrams(clusterSentences[i] || []);
    ngramTerms[i] = terms;
    concepts.push({
      id: `designer-concept:${i}`,
      label,
      size: clusterSentences[i]?.length ?? 0,
      topTerms: terms,
      weight: clusterSentences[i]?.length ?? 0,
    });
  }

  const designerVectors = deriveDesignerVectors(assignments, designerBlocks, k);
  const nodes: GraphNode[] = [
    ...buildDesignerNodes(designers),
    ...buildConceptNodes(concepts, centroids),
  ];
  const links: GraphLink[] = buildDesignerConceptLinks(designers, designerVectors);

  // Images are attached post-hoc (they don't affect clustering)
  let imageConcepts: Record<string, string[]> = {};
  const allImages = designerBlocks.flatMap((b) => b.images || []);
  if (allImages.length > 0) {
    const imageEmbeddings = await embedImages(allImages.map((i) => ({ id: i.id, data: i.data, type: i.type })));
    imageConcepts = attachImagesToConcepts(imageEmbeddings, centroids, imageThreshold);
  }

  onLog?.("Designer analysis complete", { designers: designers.length, concepts: k });

  return {
    designers,
    concepts,
    sentences,
    designerVectors,
    nodes,
    links,
    conceptHierarchy: {},
    imageConcepts,
  } as DesignerAnalysisResult;
}
