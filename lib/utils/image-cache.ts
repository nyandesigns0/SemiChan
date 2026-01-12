const memoryCache = new Map<string, Float64Array>();

export function getCachedEmbedding(imageId: string): Float64Array | null {
  return memoryCache.get(imageId) ?? null;
}

export function cacheEmbedding(imageId: string, embedding: Float64Array): void {
  memoryCache.set(imageId, embedding);
}

export function clearImageCache(): void {
  memoryCache.clear();
}
