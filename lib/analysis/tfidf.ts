import type { TFIDFModel } from "@/types/nlp";
import { tokenize } from "@/lib/nlp/tokenizer";

export function buildTfidf(docs: string[]): TFIDFModel {
  const tokenDocs = docs.map(tokenize);
  const df = new Map<string, number>();
  const tfMaps = tokenDocs.map((tokens) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const unique = new Set(tokens);
    for (const t of unique) df.set(t, (df.get(t) ?? 0) + 1);
    return tf;
  });

  const vocab = [...df.keys()].sort();
  const N = docs.length;
  const idf = new Float64Array(vocab.length);
  for (let i = 0; i < vocab.length; i++) {
    const dfi = df.get(vocab[i]) ?? 1;
    // Smooth IDF
    idf[i] = Math.log((1 + N) / (1 + dfi)) + 1;
  }

  const vectors: Float64Array[] = [];
  for (const tf of tfMaps) {
    const v = new Float64Array(vocab.length);
    let norm = 0;
    for (let i = 0; i < vocab.length; i++) {
      const term = vocab[i];
      const tfi = tf.get(term) ?? 0;
      const val = tfi * idf[i];
      v[i] = val;
      norm += val * val;
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= norm;
    vectors.push(v);
  }

  return { vocab, idf, vectors };
}

export function cosine(a: Float64Array, b: Float64Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

