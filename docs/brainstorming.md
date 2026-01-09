# Brainstorming Ideas - Graph Visualization Enhancements

## Overview
Exploring ways to improve the 3D graph visualization and provide more insight into the data processing and filtering pipeline.

## Key Ideas

### 1. Display N-grams in 3D Graph
- **Goal**: Display 2-grams, 3-grams, and all n-grams in the 3D graph visualization
- **Feature**: Add an option/toggle to control which n-gram levels are displayed
- **Benefit**: See relationships at different granularity levels, not just individual tokens/concepts

### 2. Trace Filtering Process Through Graph
- **Current State**: Only the final filtered result is visible in the graph
- **Desired State**: 
  - Visualize the complete filtering pipeline/process
  - Show how the graph transforms through each filtering stage
  - Display intermediate states of the graph during processing
- **Benefit**: Better understanding of how filters affect the data structure and relationships

### 3. Graph Formation Visualization
- **Current State**: Only see the final rendered graph
- **Desired State**: 
  - Visualize how the graph is forming/being constructed
  - See connections being established in real-time or through an animation/timeline
  - Understand the graph building process step-by-step
- **Benefit**: More transparency into how the graph is generated from the source data

### 4. Enhanced Process Connections
- **Goal**: Show more of the connection between processing steps
- **Feature**: 
  - Visual trace from source data → processing stages → final graph
  - Interactive timeline or step-by-step view of the analysis pipeline
  - Highlight relationships between different phases of processing
- **Benefit**: Better comprehension of the entire data flow and how different analysis stages relate to each other

## Implementation Considerations
- Add controls/UI to toggle n-gram display levels
- Consider animation or step-by-step view for graph formation
- Design a way to show filtering stages (perhaps as layers or states)
- Think about performance implications of displaying more granular data (2-grams, 3-grams, etc.)

---

## Hybrid Clustering Enhancement Plan (Options 1 + 2 + 4)

### Overview
Enhance the current clustering system to support:
- **Option 1 (Auto-K)**: Automatically recommend optimal number of concepts K* from the dataset
- **Option 2 (Hierarchy)**: Hierarchical clustering with zoomable concept granularity via dendrogram cuts
- **Option 4 (Soft Membership)**: Allow sentences to partially belong to multiple concepts (top-2 or top-3)

### Current Implementation State
The codebase currently uses:
- **Clustering**: `kmeansCosine()` from `lib/analysis/kmeans.ts` (hard assignments, fixed K)
- **Vectors**: Hybrid vectors (semantic embeddings + BM25) via `buildHybridVectors()` in `lib/analysis/hybrid-vectors.ts`
- **Sentence Assignment**: Single `conceptId?: string` in `SentenceRecord` (line 9, `types/analysis.ts`)
- **Juror Vectors**: `Record<string, Record<string, number>>` mapping juror → conceptId → weight (hard counts normalized)
- **Analysis Pipeline**: `buildAnalysis()` in `lib/graph/graph-builder.ts` (lines 28-236)
- **API**: `app/api/analyze/route.ts` accepts `kConcepts` as manual input
- **Controls**: `components/controls/AnalysisControls.tsx` has K slider (lines 89-106)

### Implementation Steps

#### Phase 1: Type System Updates

**File: `types/analysis.ts`**
- Extend `SentenceRecord`:
  - Keep `conceptId?: string` for backward compatibility (hard mode)
  - Add `conceptMembership?: Array<{ conceptId: string; weight: number }>` for soft mode
- Extend `AnalysisResult`:
  - Add `recommendedK?: number` (from Auto-K)
  - Add `kSearchMetrics?: Array<{ k: number; score: number; silScore?: number }>`
  - Add `clusteringMode?: "kmeans" | "hierarchical" | "hybrid"`
  - Add `dendrogram?: { merges: Array<{ left: number; right: number; distance: number; size: number }> }`
  - Add `cut?: { type: "threshold" | "count"; value: number }`

**File: `types/api.ts`**
- Extend `AnalyzeRequest`:
  - Add `clusteringMode?: "kmeans" | "hierarchical" | "hybrid"`
  - Add `autoK?: boolean`
  - Add `kMin?: number`, `kMax?: number` (for Auto-K search range)
  - Add `cutType?: "count" | "threshold"`
  - Add `cutValue?: number`
  - Add `softMembership?: boolean`
  - Add `softTopN?: number` (2 or 3)

#### Phase 2: Core Clustering Functions (New Files)

**File: `lib/analysis/cluster-eval.ts` (NEW)**
- Function: `evaluateKRange(vectors: Float64Array[], kMin: number, kMax: number): { recommendedK: number; metrics: Array<{ k: number; score: number }> }`
- Implementation: Run K-means for each K in range, compute silhouette-like or separation score
- Use existing `kmeansCosine()` function
- Return deterministic results (fixed seed)
- Integration point: Called before clustering in `buildAnalysis()` when `autoK=true`

**File: `lib/analysis/hierarchical-clustering.ts` (NEW)**
- Function: `buildDendrogram(vectors: Float64Array[]): Dendrogram`
- Function: `cutDendrogramByThreshold(dendrogram: Dendrogram, threshold: number): number[]` (returns assignments)
- Function: `cutDendrogramByCount(dendrogram: Dendrogram, targetCount: number): number[]` (returns assignments)
- Implementation: Use agglomerative clustering with cosine similarity (can reuse `cosine` from `lib/analysis/tfidf.ts`)
- Performance: O(n²) - acceptable for ~100-500 sentences; consider sampling for larger datasets
- Integration point: Used in `buildAnalysis()` when `clusteringMode === "hierarchical" || "hybrid"`

**File: `lib/analysis/soft-membership.ts` (NEW)**
- Function: `computeSoftMembership(vectors: Float64Array[], centroids: Float64Array[], topN: number): Array<Array<{ conceptId: string; weight: number }>>`
- Implementation: 
  - Compute cosine similarity from each sentence vector to each centroid
  - Keep top-N concepts per sentence
  - Normalize weights (clamp negatives to 0, normalize to sum=1, or use softmax)
- Integration point: Applied after clustering when `softMembership=true`

**File: `lib/analysis/concept-centroids.ts` (NEW)**
- Function: `computeCentroids(vectors: Float64Array[], assignments: number[]): Float64Array[]`
- Purpose: Compute centroids for any cluster assignment (from K-means or hierarchical cut)
- Reuse logic from `kmeans.ts` centroid computation (lines 48-68) but accept assignments as input
- Integration point: Used to compute centroids from hierarchical cut assignments for labeling

#### Phase 3: Graph Builder Modifications

**File: `lib/graph/graph-builder.ts`**

Key changes to `buildAnalysis()` function (lines 28-236):

1. **Add clustering mode selection** (after line 72, hybrid vectors built):
   - If `autoK=true`, call `evaluateKRange()` and set `recommendedK`
   - Choose clustering method based on `clusteringMode`:
     - `"kmeans"`: Use existing `kmeansCosine()` (line 77)
     - `"hierarchical"`: Build dendrogram, cut it, compute centroids
     - `"hybrid"`: Build dendrogram once, cut to target K, derive centroids

2. **Modify sentence assignment** (replace lines 108-112):
   - If `softMembership=true`:
     - Call `computeSoftMembership()` with `softTopN`
     - Store in `sentence.conceptMembership` array
     - Set `sentence.conceptId` to primary (highest weight) for backward compatibility
   - If `softMembership=false`:
     - Keep current behavior (single `conceptId`)

3. **Update juror vector computation** (modify lines 114-132):
   - Hard mode: Keep current logic (count sentences per concept, normalize)
   - Soft mode: 
     - Sum sentence weights into concept totals per juror
     - Normalize per juror (same as current)
   - Example: If sentence has `[{conceptId: "concept:0", weight: 0.67}, {conceptId: "concept:1", weight: 0.33}]`, add 0.67 to juror's concept:0 and 0.33 to concept:1

4. **Return extended AnalysisResult**:
   - Include `recommendedK`, `kSearchMetrics`, `clusteringMode`, `dendrogram`, `cut` when applicable

**Consider**: Create `buildAnalysisV2()` function that accepts extended params, keep `buildAnalysis()` for backward compatibility, or extend signature with optional params.

#### Phase 4: API Updates

**File: `app/api/analyze/route.ts`**

Extend request parsing (lines 10, 28-51):
- Parse new optional fields: `clusteringMode`, `autoK`, `kMin`, `kMax`, `cutType`, `cutValue`, `softMembership`, `softTopN`
- Validate ranges (kMin/kMax reasonable, softTopN in [2,3])
- Pass to `buildAnalysis()` (or new `buildAnalysisV2()`)

#### Phase 5: UI Controls

**File: `components/controls/AnalysisControls.tsx`**

Add new controls (after line 86, before line 88):

1. **Auto-K Section**:
   - "Recommend K" button
   - Display recommended K value when available
   - Show brief explanation ("best separation score: X.XX")

2. **Granularity Slider** (when hierarchical mode active):
   - Option A: Similarity threshold slider ("merge only if similarity ≥ X")
   - Option B: Target cluster count slider ("show ~N concepts") - recommended
   - Maps to `cutType` and `cutValue`

3. **Soft Membership Toggle**:
   - Toggle switch: "Allow overlap"
   - When on, show `softTopN` selector (2 or 3 concepts)

4. **Clustering Mode Selector** (optional dropdown):
   - "kmeans" | "hierarchical" | "hybrid" (default: "kmeans" for backward compat)

#### Phase 6: Inspector Updates

**File: `components/inspector/NodeInspector.tsx`**

For concept nodes (lines 60-102):
- Already shows top terms (lines 67-99) ✅
- Add: Display representative sentences (closest to centroid) - need to compute/store this
- Add: Show top semantic keywords from representative sentences

For juror nodes (lines 17-58):
- Already shows concept distribution ✅
- In soft mode: Display will automatically reflect weighted sums (no change needed)

**File: `components/inspector/SentenceInspector.tsx` (if exists, or create)**

New component or extend existing sentence display:
- Show primary concept assignment (existing `conceptId`)
- Show secondary concept assignments with weights (from `conceptMembership`)
- Format: "Primary: concept:0 (0.67), Secondary: concept:1 (0.33)"

### Implementation Order (Recommended)

1. **Phase 1: Type System Updates** - Foundation, no breaking changes if optional fields
2. **Phase 2: Auto-K (Option 1)** - Lowest disruption, adds recommendation without changing clustering
3. **Phase 2: Soft Membership (Option 4)** - Touches graph weights but keeps concept count same
4. **Phase 2: Hierarchical Clustering (Option 2)** - Most new code, biggest architectural change
5. **Phase 3-6**: UI and integration work

### Current Code Integration Points

- **Hybrid vectors**: Already built correctly (line 72, `graph-builder.ts`) ✅
- **BM25 model**: Already provides n-gram vocabulary for labeling ✅
- **Concept labeling**: `hybridLabelCluster()` already combines semantic + n-grams ✅
- **Centroid computation**: Logic exists in `kmeans.ts` (lines 48-68), can extract to `concept-centroids.ts`
- **Juror vector normalization**: Already implemented (lines 128-132) ✅
- **3D positioning**: `computeNode3DPositions()` already handles juror vectors ✅

### Backward Compatibility Considerations

- Keep `conceptId` field in `SentenceRecord` even when using soft membership (set to primary)
- Default `clusteringMode` to `"kmeans"` if not specified
- Default `softMembership` to `false`
- Existing `AnalysisResult` structure should remain valid (add optional fields only)

