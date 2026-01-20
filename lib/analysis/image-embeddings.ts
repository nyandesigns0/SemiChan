import { cacheEmbedding, getCachedEmbedding } from "@/lib/utils/image-cache";
import path from "path";
import os from "os";

// Lazy CLIP pipeline loader. Falls back to a deterministic pseudo-embedding when the model is unavailable.
let clipPipelinePromise: Promise<any> | null = null;

async function getClipPipeline() {
  if (clipPipelinePromise) return clipPipelinePromise;
  clipPipelinePromise = (async () => {
    try {
      const transformers = await import("@xenova/transformers");
      // Prefer small quantized model for speed
      transformers.env.cacheDir = path.join(os.tmpdir(), ".cache");
      transformers.env.allowLocalModels = false;
      transformers.env.allowRemoteModels = true;
      return transformers.pipeline("feature-extraction", "Xenova/clip-vit-base-patch32", {
        quantized: true,
      });
    } catch (err) {
      console.warn("[image-embeddings] Falling back to pseudo-embedding:", err);
      return null;
    }
  })();
  return clipPipelinePromise;
}

function pseudoEmbed(seed: string, dim = 384): Float64Array {
  const out = new Float64Array(dim);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    hash ^= hash << 13;
    hash ^= hash >> 17;
    hash ^= hash << 5;
    out[i] = (hash % 1000) / 1000;
  }
  return out;
}

export async function embedImage(imageData: string, imageType: "file" | "url"): Promise<Float64Array> {
  const cacheKey = `${imageType}:${imageData.slice(0, 32)}`;
  const cached = getCachedEmbedding(cacheKey);
  if (cached) return cached;

  const clip = await getClipPipeline();
  let embedding: Float64Array;

  if (clip) {
    try {
      const input = imageType === "url" ? imageData : imageData.startsWith("data:")
        ? imageData
        : `data:image/png;base64,${imageData}`;
      const result = await clip(input);
      const data = Array.isArray(result?.data) ? result.data.flat(Infinity) : (result as any)?.[0] ?? [];
      embedding = new Float64Array(data.slice(0, 384));
    } catch (err) {
      console.warn("[image-embeddings] CLIP embedding failed, using fallback", err);
      embedding = pseudoEmbed(cacheKey);
    }
  } else {
    embedding = pseudoEmbed(cacheKey);
  }

  cacheEmbedding(cacheKey, embedding);
  return embedding;
}

export async function embedImages(images: Array<{ id: string; data: string; type: "file" | "url" }>): Promise<Map<string, Float64Array>> {
  const result = new Map<string, Float64Array>();
  for (const img of images) {
    const vec = await embedImage(img.data, img.type);
    result.set(img.id, vec);
  }
  return result;
}
