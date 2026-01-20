import { pipeline, env } from "@xenova/transformers";
import type { SentenceEmbeddingResult } from "@/types/nlp";
import path from "path";
import os from "os";

// Configure transformers.js to use a writable cache directory
// In serverless environments (like Vercel), we must use a writable directory like /tmp
env.cacheDir = path.join(os.tmpdir(), ".cache");
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Singleton pipeline instance for reuse
let embeddingPipeline: Awaited<ReturnType<typeof pipeline>> | null = null;

/**
 * Get or initialize the sentence embedding pipeline
 * Uses all-MiniLM-L6-v2 model (384 dimensions, fast and lightweight)
 */
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embeddingPipeline;
}

/**
 * Normalize a vector to unit length (L2 normalization)
 */
function normalizeVector(vector: number[]): Float64Array {
  let norm = 0;
  for (const v of vector) {
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  
  const result = new Float64Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    result[i] = vector[i] / norm;
  }
  return result;
}

/**
 * Embed sentences using Sentence Transformers (all-MiniLM-L6-v2)
 * @param sentences - Array of sentences to embed
 * @returns Promise with embedding vectors (384-dim) for each sentence
 */
export async function embedSentences(sentences: string[]): Promise<SentenceEmbeddingResult> {
  if (sentences.length === 0) {
    return { vectors: [], dimension: 384 };
  }
  
  const pipe = await getEmbeddingPipeline();
  const vectors: Float64Array[] = [];
  
  // Process sentences one at a time to avoid type issues
  for (const sentence of sentences) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = await (pipe as any)(sentence, { pooling: "mean", normalize: true });
    
    // Extract embedding data from output
    // The output is a Tensor with shape [1, hidden_size] after pooling
    const data = output.data as Float32Array;
    const embedding = Array.from(data);
    vectors.push(normalizeVector(embedding));
  }
  
  return {
    vectors,
    dimension: vectors.length > 0 ? vectors[0].length : 384,
  };
}

/**
 * Compute cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: Float64Array, b: Float64Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
  }
  return dot; // Vectors are already normalized
}
