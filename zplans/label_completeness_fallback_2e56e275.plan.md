---
name: Label Completeness Fallback
overview: Add semantic fallback labeling using centroid-nearest sentences when BM25/keyphrase extraction yields sparse or empty results, ensuring every cluster gets a meaningful label instead of "Concept".
todos:
  - id: modify-contrastive-label-cluster
    content: Modify contrastiveLabelCluster to accept nearestSentences parameter and implement sparse fallback logic (< 3 candidates)
    status: pending
  - id: compute-nearest-primary
    content: Compute top 3 nearest sentences for primary concepts in graph-builder.ts and pass to contrastiveLabelCluster
    status: pending
    dependencies:
      - modify-contrastive-label-cluster
  - id: compute-nearest-detail
    content: Compute top 3 nearest sentences for detail concepts in graph-builder.ts and pass to contrastiveLabelCluster
    status: pending
    dependencies:
      - modify-contrastive-label-cluster
  - id: test-fallback
    content: Verify fallback works for sparse/empty cases and does not interfere with normal labeling
    status: pending
    dependencies:
      - compute-nearest-primary
      - compute-nearest-detail
---

# Label Completeness Fallback Implementation

## Problem

When `contrastiveLabelCluster` fails to extract sufficient keyphrases or BM25 terms, it falls back to the placeholder `"Concept"`. This happens when:

- Clusters are very small
- All candidates are filtered out by deduplication
- Terms are too generic/common

## Solution

Add a semantic fallback that uses the top 3 centroid-nearest sentences to extract keyphrases when the primary labeling method yields fewer than 3 candidates.

## Implementation Steps

### 1. Modify `contrastiveLabelCluster` function signature

**File**: `lib/analysis/concept-labeler.ts`

- Add optional parameter `nearestSentences?: string[]` to accept the top 3 centroid-nearest sentences
- Modify the fallback logic at line 72:
- Current: `const label = deduped.length > 0 ? deduped.slice(0, topNCount).join(" · ") : "Concept";`
- New: Check if `deduped.length < 3` (sparse results), and if so, use semantic fallback
- If `nearestSentences` is provided and results are sparse, call `extractClusterKeyphrases(nearestSentences, allSentences, topNCount)` to get fallback keyphrases
- Merge fallback keyphrases with existing `deduped` array (avoid duplicates using existing deduplication logic)
- Only return `"Concept"` if both primary and fallback methods fail

### 2. Compute nearest sentences in `graph-builder.ts`

**File**: `lib/graph/graph-builder.ts`

- Before calling `contrastiveLabelCluster` (around lines 977 and 1015):
- For each cluster, compute cosine similarity between `sentenceVectors` and the centroid
- Sort sentences by similarity and take top 3
- Map indices back to sentence strings: `nearestSentences = top3Indices.map(i => docs[i])`
- Pass `nearestSentences` as the new parameter to `contrastiveLabelCluster`

### 3. Reuse existing utilities

- Use `cosine` function from `lib/analysis/tfidf.ts` for similarity computation (already imported)
- Use `extractClusterKeyphrases` from `lib/nlp/keyphrase-extractor.ts` (already imported)
- Reuse the existing deduplication logic in `contrastiveLabelCluster` to merge fallback results

### 4. Apply to both primary and detail concepts

- Update both call sites: primary concepts (line 977) and detail concepts (line 1015)
- Ensure the same fallback logic works for both layers

## Data Flow

```javascript
graph-builder.ts:
    - Has: centroids, sentenceVectors, docs, clusterSentenceIndices
    - Compute: top 3 nearest sentences per centroid
    - Call: contrastiveLabelCluster(centroid, bm25, clusterSentences, docs, 4, nearestSentences)

concept-labeler.ts:
    - Try: extractClusterKeyphrases + getClusterTopTerms
    - If sparse (< 3 candidates): use extractClusterKeyphrases(nearestSentences, allSentences)
    - Merge and deduplicate results
    - Return label (never "Concept" if fallback succeeded)
```



## Testing Considerations

- Verify clusters that previously got "Concept" now get meaningful labels
- Ensure fallback doesn't degrade quality when primary method works well
- Test with very small clusters (1-2 sentences)