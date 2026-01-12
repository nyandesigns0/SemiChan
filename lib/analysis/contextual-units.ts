import type { ContextualUnit } from "../../types/analysis";

function buildUnit(
  id: string,
  sentenceIndices: number[],
  sentences: string[]
): ContextualUnit {
  const texts = sentenceIndices.map((idx) => sentences[idx]).filter(Boolean);
  return {
    id,
    sentences: texts,
    sentenceIndices,
    text: texts.join(" ").trim(),
  };
}

export function createSentenceWindows(
  sentences: string[],
  windowSize: number = 3,
  overlap: number = 1
): ContextualUnit[] {
  if (sentences.length === 0) return [];
  const units: ContextualUnit[] = [];
  const step = Math.max(1, windowSize - overlap);

  for (let start = 0; start < sentences.length; start += step) {
    const end = Math.min(sentences.length, start + windowSize);
    const idxs = Array.from({ length: end - start }, (_, i) => start + i);
    units.push(buildUnit(`chunk:win:${units.length}`, idxs, sentences));
    if (end === sentences.length) break;
  }

  return units;
}

export function createDiscourseChunks(
  sentences: string[],
  maxChunkSize: number = 5
): ContextualUnit[] {
  if (sentences.length === 0) return [];
  const units: ContextualUnit[] = [];

  for (let start = 0; start < sentences.length; start += maxChunkSize) {
    const end = Math.min(sentences.length, start + maxChunkSize);
    const idxs = Array.from({ length: end - start }, (_, i) => start + i);
    units.push(buildUnit(`chunk:disc:${units.length}`, idxs, sentences));
  }

  return units;
}
