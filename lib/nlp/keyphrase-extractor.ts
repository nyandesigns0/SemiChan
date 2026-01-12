import { STOPWORDS } from "@/constants/nlp-constants";

const MAX_PHRASE_LEN = 4;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function isCandidateToken(tok: string): boolean {
  if (!tok || tok.length < 2) return false;
  if (STOPWORDS.has(tok)) return false;
  if (/^\d+$/.test(tok)) return false;
  return true;
}

function isValidPhrase(tokens: string[]): boolean {
  if (tokens.length === 0 || tokens.length > MAX_PHRASE_LEN) return false;
  if (tokens.some((t) => !isCandidateToken(t))) return false;
  const phrase = tokens.join(" ");
  if (/^[-']|[-']$/.test(phrase)) return false;
  if (tokens.length === 1 && tokens[0].length < 4) return false;
  return true;
}

function collectPhraseCounts(tokens: string[], maxLen: number = MAX_PHRASE_LEN): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    for (let w = 1; w <= maxLen; w++) {
      const slice = tokens.slice(i, i + w);
      if (slice.length < w) continue;
      if (!isValidPhrase(slice)) continue;
      const phrase = slice.join(" ");
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
  }
  return counts;
}

function dedupePhrases(scored: Array<{ phrase: string; score: number }>, maxPhrases: number): string[] {
  const result: string[] = [];
  for (const cand of scored) {
    const lower = cand.phrase;
    const isDup = result.some((p) => p.includes(lower) || lower.includes(p));
    if (isDup) continue;
    result.push(cand.phrase);
    if (result.length >= maxPhrases) break;
  }
  return result;
}

export function extractKeyphrases(text: string, maxPhrases = 12): string[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];
  const counts = collectPhraseCounts(tokens);
  const scored = [...counts.entries()]
    .map(([phrase, count]) => {
      const len = phrase.split(" ").length;
      const lengthBoost = len >= 2 ? 1.2 : 1;
      return { phrase, score: count * lengthBoost };
    })
    .sort((a, b) => b.score - a.score);
  return dedupePhrases(scored, maxPhrases);
}

export function extractClusterKeyphrases(
  sentencesInCluster: string[],
  allSentences: string[],
  maxPhrases: number = 8
): string[] {
  if (sentencesInCluster.length === 0) return [];
  const clusterTokens = sentencesInCluster.flatMap(tokenize);
  const corpusTokens = allSentences.flatMap(tokenize);

  const clusterCounts = collectPhraseCounts(clusterTokens);
  const corpusCounts = collectPhraseCounts(corpusTokens);

  const clusterSize = Math.max(1, sentencesInCluster.length);
  const restSize = Math.max(1, allSentences.length - sentencesInCluster.length);

  const scored = [...clusterCounts.entries()]
    .map(([phrase, clusterCount]) => {
      const totalCount = corpusCounts.get(phrase) ?? 0;
      const restCount = Math.max(0, totalCount - clusterCount);
      const clusterDensity = clusterCount / clusterSize;
      const restDensity = restCount / Math.max(1, restSize);
      const lift = clusterDensity / Math.max(restDensity, 1e-6);
      const lengthBoost = phrase.split(" ").length >= 2 ? 1.25 : 1;
      const score = clusterDensity * Math.log1p(clusterCount) * Math.log1p(lift) * lengthBoost;
      return { phrase, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);

  return dedupePhrases(scored, maxPhrases);
}

