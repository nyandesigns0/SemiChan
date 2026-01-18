import type { JurorBlock, BM25Model } from "@/types/nlp";
import { extractNgrams, getNgramVocab } from "@/lib/nlp/ngram-extractor";

const K1 = 1.2;
const B = 0.75;

type IdxMaps = {
  ngramVocab: string[];
  sentenceNgrams: string[][];
  avgDocLength: number;
  vocabIndex: Map<string, number>;
};

const EMPTY_MODEL = (sentences: string[]): BM25Model => ({
  ngramVocab: [],
  scores: new Map(),
  docFreq: new Map(),
  vectors: sentences.map(() => new Float64Array(0)),
});

function buildIndexStructures(sentences: string[], ngramVocab: string[]): IdxMaps {
  const sentenceNgrams = sentences.map((s) => extractNgrams(s));
  const avgDocLength =
    sentenceNgrams.reduce((acc, toks) => acc + toks.length, 0) / (sentenceNgrams.length || 1) || 1;
  const vocabIndex = new Map<string, number>();
  ngramVocab.forEach((ngram, idx) => vocabIndex.set(ngram, idx));

  return { ngramVocab, sentenceNgrams, avgDocLength, vocabIndex };
}

function computeJurorDocFreq(jurorBlocks: JurorBlock[], ngramVocab: string[]): Map<string, number> {
  const docFreq = new Map<string, number>();
  const jurorNgramSets = jurorBlocks.map((block) => new Set(extractNgrams(block.text)));

  for (const ngram of ngramVocab) {
    let df = 0;
    for (const ngramSet of jurorNgramSets) {
      if (ngramSet.has(ngram)) df++;
    }
    docFreq.set(ngram, df);
  }

  return docFreq;
}

function computeSentenceDocFreq(sentenceNgrams: string[][], ngramVocab: string[]): Map<string, number> {
  const docFreq = new Map<string, number>();
  const vocabSet = new Set(ngramVocab);

  for (const ngram of vocabSet) {
    docFreq.set(ngram, 0);
  }

  for (const sentence of sentenceNgrams) {
    const unique = new Set(sentence.filter((t) => vocabSet.has(t)));
    for (const tok of unique) {
      docFreq.set(tok, (docFreq.get(tok) ?? 0) + 1);
    }
  }

  return docFreq;
}

function buildIdfFromJurors(docFreq: Map<string, number>, jurorCount: number): Map<string, number> {
  const idf = new Map<string, number>();
  const N = Math.max(1, jurorCount);
  docFreq.forEach((df, term) => {
    const score = df > 0 ? Math.log(1 + df / N) + 1 : 0;
    idf.set(term, score);
  });
  return idf;
}

function buildIdfDiscriminative(docFreq: Map<string, number>, docCount: number): Map<string, number> {
  const idf = new Map<string, number>();
  const N = Math.max(1, docCount);
  docFreq.forEach((df, term) => {
    const raw = df > 0 ? Math.log((N - df + 0.5) / (df + 0.5)) : 0;
    idf.set(term, Math.max(0, raw));
  });
  return idf;
}

function buildVectors(idxMaps: IdxMaps, idf: Map<string, number>): Float64Array[] {
  const { ngramVocab, sentenceNgrams, avgDocLength, vocabIndex } = idxMaps;

  return sentenceNgrams.map((sentenceTokens) => {
    const docLength = sentenceTokens.length || 1;
    const tf = new Map<string, number>();
    for (const tok of sentenceTokens) {
      tf.set(tok, (tf.get(tok) ?? 0) + 1);
    }

    const v = new Float64Array(ngramVocab.length);
    let norm = 0;

    for (const [term, freq] of tf) {
      const idx = vocabIndex.get(term);
      if (idx === undefined) continue;
      const idfVal = idf.get(term) ?? 0;
      const tfNorm = (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (docLength / avgDocLength)));
      const score = idfVal * tfNorm;
      v[idx] = score;
      norm += score * score;
    }

    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= norm;
    return v;
  });
}

function buildScores(
  ngramVocab: string[],
  docFreq: Map<string, number>,
  idf: Map<string, number>
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const ngram of ngramVocab) {
    const df = docFreq.get(ngram) ?? 0;
    const idfVal = idf.get(ngram) ?? 0;
    scores.set(ngram, idfVal * df);
  }
  return scores;
}

export function buildBM25(
  jurorBlocks: JurorBlock[],
  sentences: string[]
): { consensus: BM25Model; discriminative: BM25Model } {
  const ngramVocab = getNgramVocab(sentences);
  if (ngramVocab.length === 0 || sentences.length === 0) {
    const empty = EMPTY_MODEL(sentences);
    return { consensus: empty, discriminative: empty };
  }

  const idxMaps = buildIndexStructures(sentences, ngramVocab);

  const consensusDocFreq = computeJurorDocFreq(jurorBlocks, ngramVocab);
  const discriminativeDocFreq = computeSentenceDocFreq(idxMaps.sentenceNgrams, ngramVocab);

  const consensusIdf = buildIdfFromJurors(consensusDocFreq, jurorBlocks.length);
  const discriminativeIdf = buildIdfDiscriminative(discriminativeDocFreq, sentences.length);

  const consensusVectors = buildVectors(idxMaps, consensusIdf);
  const discriminativeVectors = buildVectors(idxMaps, discriminativeIdf);

  return {
    consensus: {
      ngramVocab,
      scores: buildScores(ngramVocab, consensusDocFreq, consensusIdf),
      docFreq: consensusDocFreq,
      vectors: consensusVectors,
    },
    discriminative: {
      ngramVocab,
      scores: buildScores(ngramVocab, discriminativeDocFreq, discriminativeIdf),
      docFreq: discriminativeDocFreq,
      vectors: discriminativeVectors,
    },
  };
}

export function buildBM25Consensus(jurorBlocks: JurorBlock[], sentences: string[]): BM25Model {
  return buildBM25(jurorBlocks, sentences).consensus;
}

export function buildBM25Discriminative(
  jurorBlocks: JurorBlock[],
  sentences: string[]
): BM25Model {
  return buildBM25(jurorBlocks, sentences).discriminative;
}

export function getTopNgrams(bm25: BM25Model, n: number = 10): string[] {
  const entries = [...bm25.scores.entries()];
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, n).map(([ngram]) => ngram);
}

export function getClusterTopNgrams(
  bm25: BM25Model,
  centroid: Float64Array,
  n: number = 5
): string[] {
  const pairs = bm25.ngramVocab.map((ngram, i) => ({
    ngram,
    weight: centroid[i] ?? 0,
  }));
  pairs.sort((a, b) => b.weight - a.weight);
  return pairs.slice(0, n).map((p) => p.ngram);
}













