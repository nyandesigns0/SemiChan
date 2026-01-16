---
name: Auto-Weights and Auto-Unit Implementation
overview: Implement Auto-Weights (semanticWeight/frequencyWeight optimization) and Auto-Unit (contextual window size optimization) features with full backend evaluation logic, frontend UI controls, logging, and reporting integration.
todos:
  - id: backend-types
    content: Update types/analysis.ts and types/api.ts with Auto-Unit and Auto-Weights result types
    status: pending
  - id: backend-unit-eval
    content: Implement evaluateUnitMode() function in lib/analysis/cluster-eval.ts
    status: pending
    dependencies:
      - backend-types
  - id: backend-weights-eval
    content: Implement evaluateWeightRange() function in lib/analysis/cluster-eval.ts
    status: pending
    dependencies:
      - backend-types
  - id: backend-integrate-unit
    content: Integrate Auto-Unit into buildAnalysis() - Step 1 (before embeddings)
    status: pending
    dependencies:
      - backend-unit-eval
  - id: backend-integrate-weights
    content: Integrate Auto-Weights into buildAnalysis() - Step 4 (after clustering, before evidence ranking)
    status: pending
    dependencies:
      - backend-weights-eval
  - id: api-layer
    content: Update app/api/analyze/route.ts to accept and validate autoUnit and autoWeights parameters
    status: pending
    dependencies:
      - backend-integrate-unit
      - backend-integrate-weights
  - id: frontend-state
    content: Add autoUnit and autoWeights state to app/page.tsx and include in API requests
    status: pending
    dependencies:
      - api-layer
  - id: frontend-ui-controls
    content: Add 'Model Tuning' section with Auto-Unit and Auto-Weights toggles and settings accordions in AnalysisControls.tsx
    status: pending
    dependencies:
      - frontend-state
  - id: frontend-accordion-props
    content: Update AnalysisControlsAccordion.tsx to pass through Auto-Unit and Auto-Weights props
    status: pending
    dependencies:
      - frontend-ui-controls
  - id: frontend-report-tables
    content: Add Auto-Unit and Auto-Weights metrics tables to AnalysisReport.tsx
    status: pending
    dependencies:
      - frontend-state
  - id: frontend-export-format
    content: Update formatParameters() in AnalysisReport.tsx to include Auto-Unit and Auto-Weights in exports
    status: pending
    dependencies:
      - frontend-report-tables
---

# A

uto-Weights and Auto-Unit Implementation Plan

## Architecture Overview

Two new auto-tuning features following the Auto-K/Auto-Seed pattern:

- **Auto-Unit**: Evaluates sentence-only (1), window-3 (±1), window-5 (±2) contextual units

- **Auto-Weights**: Evaluates evidence ranking weight combinations (0.9/0.1, 0.8/0.2, 0.7/0.3, 0.6/0.4)

**Execution Order (Critical)**:

1. Auto-Unit (determines contextual units for embeddings)

2. Embeddings (sentence + chunk vectors)

3. Auto-K / Auto-Seed (determines K/seed)
4. Auto-Weights (determines evidence ranking weights)

5. Final analysis with all chosen parameters

## Backend Implementation

### 1. Auto-Unit Evaluation Function

**File**: `lib/analysis/cluster-eval.ts` (add new functions)

**Function**: `evaluateUnitMode()`

```typescript
export async function evaluateUnitMode(
  jurorBlocks: JurorBlock[],
  sentences: SentenceRecord[],
  docs: string[],
  kRange: { min: number; max: number }, // From Auto-K on default mode
  seed: number,
  options: {
    unitModes?: Array<{windowSize: number, label: string}>;
    onProgress?: (mode: string, progress: number, total: number) => void;
    onLog?: (message: string) => void;
  }
): Promise<{
  recommendedMode: {windowSize: number, label: string};
  unitSearchMetrics: Array<{
    mode: {windowSize: number, label: string};
    score: number;
    coherence?: number;
    separation?: number;
    dominance?: number;
    kUsed?: number;
    reasoning?: string;
  }>;
  reasoning: string;
}>
```



**Implementation Details**:

- Default modes: `[{windowSize:1, label:"sentence-only"}, {windowSize:3, label:"window-3 (±1)"}, {windowSize:5, label:"window-5 (±2)"}]`

- For each mode:

- Create contextual units with `createSentenceWindows(docs, windowSize, overlap=1)`

- Embed units using `embedSentences()` (cache embeddings per mode in Map)

- Run clustering evaluation at K values from kRange (use `evaluateKRange()` pattern but with fixed K range)

- Compute metrics using `scoreClusteringOutcome()` pattern

- Store metrics for mode

- Return best mode + full metrics array

- Cache embeddings per windowSize to avoid re-embedding

**Evaluation Strategy**: Run Auto-K once on default mode (windowSize=3) first, get K range, then evaluate all modes at those K values.---

### 2. Auto-Weights Evaluation Function

**File**: `lib/analysis/cluster-eval.ts` (add new functions)

**Function**: `evaluateWeightRange()`

```typescript
export function evaluateWeightRange(
  sentences: SentenceRecord[],
  semanticVectors: Float64Array[], // Sentence embeddings
  chunkRecords: SentenceRecord[],
  centroids: Float64Array[], // From clustering
  assignments: number[], // From clustering
  bm25Model: BM25Model,
  conceptTopTerms: Record<number, string[]>, // conceptIdx -> top terms
  k: number,
  options: {
    weightCandidates?: Array<{semanticWeight: number, frequencyWeight: number}>;
    onProgress?: (evaluated: number, total: number) => void;
  }
): {
  recommendedWeights: {semanticWeight: number, frequencyWeight: number};
  weightSearchMetrics: Array<{
    weights: {semanticWeight: number, frequencyWeight: number};
    score: number;
    evidenceCoherence?: number;
    evidenceSeparation?: number;
    dominance?: number;
    reasoning?: string;
  }>;
  reasoning: string;
}
```



**Implementation Details**:

- Default candidates: `[{0.9,0.1}, {0.8,0.2}, {0.7,0.3}, {0.6,0.4}]`

- For each weight combo:

- Re-rank evidence for ALL concepts using `rankEvidenceForConcept()` with those weights
- Compute concept-level metrics:

    - Evidence coherence: avg cosine similarity of top evidence sentences to centroids

    - Evidence separation: diversity of evidence across concepts

    - Dominance: max cluster share (reuse from clustering)

- Score using adapted `scoreClusteringOutcome()` pattern (hybrid: evidence quality + clustering metrics)

- Return best weights + full metrics array

- Use existing centroids/assignments (no re-clustering)

**Evaluation Strategy**: Hybrid metrics - use existing clustering results, evaluate evidence ranking quality, combine with clustering metrics.

---

### 3. Integration in `buildAnalysis()`

**File**: `lib/graph/graph-builder.ts`

**Step 1: Auto-Unit (before embeddings)**

```typescript
// After sentence splitting, before contextual units creation
let contextualUnits: ContextualUnit[];
let autoUnitResult: {...} | undefined;
let resolvedWindowSize = 3; // default

if (options.autoUnit) {
  // First: Run Auto-K on default mode to get K range
  const defaultUnits = createSentenceWindows(docs, 3, 1);
  const defaultChunkTexts = defaultUnits.map(u => u.text);
  const defaultEmbeddings = await embedSentences(defaultChunkTexts);
  
  // Determine K range (use same logic as Auto-K)
  const unitCount = defaultUnits.length;
  const dynamicKMin = Math.max(4, Math.round(Math.sqrt(unitCount)));
  const dynamicKMax = Math.max(dynamicKMin + 1, Math.min(20, Math.floor(unitCount / 4)));
  const kRange = {
    min: clamp(kMin ?? dynamicKMin, 2, dynamicKMax),
    max: Math.max(dynamicKMin + 1, clamp(kMax ?? dynamicKMax, dynamicKMin + 1, Math.max(dynamicKMax, dynamicKMin + 1)))
  };
  
  log("analysis", `Auto-Unit: Running Auto-K on default mode to determine K range ${kRange.min}-${kRange.max}...`);
  // ... run Auto-K evaluation on default mode ...
  
  // Then: Evaluate all unit modes
  log("analysis", `Auto-Unit evaluating modes: sentence-only, window-3 (±1), window-5 (±2)...`);
  const unitResult = await evaluateUnitMode(
    jurorBlocks,
    effectiveSentences,
    docs,
    kRange,
    seed,
    {
      onProgress: (mode, progress, total) => {
        log("analysis", `Auto-Unit progress (${mode}): ${progress}/${total} K values evaluated`);
      },
      onLog: (msg) => log("analysis", msg)
    }
  );
  
  resolvedWindowSize = unitResult.recommendedMode.windowSize;
  contextualUnits = createSentenceWindows(docs, resolvedWindowSize, 1);
  autoUnitResult = unitResult;
  
  log("analysis", `Auto-Unit selected: ${unitResult.recommendedMode.label} (score=${unitResult.unitSearchMetrics.find(m => m.mode.windowSize === resolvedWindowSize)?.score.toFixed(4)})`);
  unitResult.unitSearchMetrics.forEach(m => {
    log("analysis", `Auto-Unit mode=${m.mode.label}: score=${m.score.toFixed(4)}, coherence=${(m.coherence ?? 0).toFixed(4)}, dominance=${((m.dominance ?? 0) * 100).toFixed(1)}%`);
  });
} else {
  contextualUnits = createSentenceWindows(docs, 3, 1); // default
}
```



**Step 4: Auto-Weights (after clustering, before evidence ranking)**

```typescript
// After clustering (have centroids, assignments, K), before evidence ranking
let finalEvidenceRankingParams = evidenceRankingParams;
let autoWeightsResult: {...} | undefined;

if (options.autoWeights && centroids && assignments.length > 0) {
  log("analysis", `Auto-Weights evaluating combinations: 0.9/0.1, 0.8/0.2, 0.7/0.3, 0.6/0.4...`);
  
  // Pre-compute concept top terms (needed for evaluation)
  const conceptTopTermsMap: Record<number, string[]> = {};
  for (let c = 0; c < centroids.length; c++) {
    const clusterIndices = assignments
      .map((a, idx) => a === c ? idx : -1)
      .filter(i => i >= 0);
    const clusterSentences = clusterIndices.map(i => docs[i]);
    conceptTopTermsMap[c] = getClusterTopTerms(centroids[c], bm25Discriminative, clusterSentences, docs, 12);
  }
  
  const weightsResult = evaluateWeightRange(
    effectiveSentences,
    sentenceVectors,
    chunkRecords,
    centroids,
    assignments,
    bm25Consensus,
    conceptTopTermsMap,
    K,
    {
      onProgress: (evaluated, total) => {
        log("analysis", `Auto-Weights progress: ${evaluated}/${total} combinations evaluated`);
      }
    }
  );
  
  finalEvidenceRankingParams = weightsResult.recommendedWeights;
  autoWeightsResult = weightsResult;
  
  log("analysis", `Auto-Weights selected: ${weightsResult.recommendedWeights.semanticWeight}/${weightsResult.recommendedWeights.frequencyWeight} (score=${weightsResult.weightSearchMetrics.find(m => 
    m.weights.semanticWeight === weightsResult.recommendedWeights.semanticWeight &&
    m.weights.frequencyWeight === weightsResult.recommendedWeights.frequencyWeight
  )?.score.toFixed(4)})`);
  weightsResult.weightSearchMetrics.forEach(m => {
    log("analysis", `Auto-Weights weights=${m.weights.semanticWeight}/${m.weights.frequencyWeight}: score=${m.score.toFixed(4)}, coherence=${(m.evidenceCoherence ?? 0).toFixed(4)}, dominance=${((m.dominance ?? 0) * 100).toFixed(1)}%`);
  });
}

// Use finalEvidenceRankingParams in all rankEvidenceForConcept() calls
```



**Return Value Updates**: Add to `AnalysisResult`:

- `autoUnit?: boolean`

- `recommendedUnitMode?: {windowSize: number, label: string}`

- `unitSearchMetrics?: Array<{...}>`

- `autoUnitReasoning?: string`

- `autoWeights?: boolean`

- `recommendedWeights?: {semanticWeight: number, frequencyWeight: number}`
- `weightSearchMetrics?: Array<{...}>`

- `autoWeightsReasoning?: string`

---

### 4. Type Updates

**File**: `types/analysis.ts`

Add to `AnalysisResult` interface:

```typescript
autoUnit?: boolean;
recommendedUnitMode?: {windowSize: number, label: string};
unitSearchMetrics?: Array<{
  mode: {windowSize: number, label: string};
  score: number;
  coherence?: number;
  separation?: number;
  dominance?: number;
  kUsed?: number;
}>;
autoUnitReasoning?: string;

autoWeights?: boolean;
recommendedWeights?: {semanticWeight: number, frequencyWeight: number};
weightSearchMetrics?: Array<{
  weights: {semanticWeight: number, frequencyWeight: number};
  score: number;
  evidenceCoherence?: number;
  evidenceSeparation?: number;
  dominance?: number;
}>;
autoWeightsReasoning?: string;
```



**File**: `types/api.ts`

Add to `AnalyzeRequest`:

```typescript
autoUnit?: boolean;
autoWeights?: boolean;
```



---

### 5. API Route Updates

**File**: `app/api/analyze/route.ts`

- Add `autoUnit?: boolean` and `autoWeights?: boolean` to request validation

- Pass through to `buildAnalysis()` options object

- Validate boolean types

---

## Frontend Implementation

### 6. State Management

**File**: `app/page.tsx`

Add state variables:

```typescript
const [autoUnit, setAutoUnit] = useState(false);
const [autoWeights, setAutoWeights] = useState(false);
```



Add to API request payload (in `useEffect` that triggers analysis):

```typescript
autoUnit,
autoWeights,
```



Add to `rawDataExportContext`:

```typescript
autoUnit,
autoWeights,
recommendedUnitMode: analysis?.recommendedUnitMode,
recommendedWeights: analysis?.recommendedWeights,
```



---

### 7. UI Controls - New "Model Tuning" Section

**File**: `components/controls/AnalysisControls.tsx`**Add Props**:

```typescript
autoUnit: boolean;
onAutoUnitChange: (value: boolean) => void;
autoWeights: boolean;
onAutoWeightsChange: (value: boolean) => void;
```



**Add UI Section** (after "Clustering Engine", before "Evidence Ranking"):

```typescript
{/* Category: Model Tuning */}
<div className="space-y-2">
  <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900">
    <Sparkles className="h-3 w-3" />
    Model Tuning
  </Label>
  
  <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/30 p-2.5">
    {/* Auto-Unit Toggle */}
    <div className="flex items-center justify-between group">
      <div className="space-y-0.5">
        <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <Target className="h-3 w-3 text-indigo-500" />
          Auto-Unit Discovery
        </Label>
        <p className="text-[9px] text-slate-500">Optimize contextual window size</p>
      </div>
      <Switch checked={autoUnit} onCheckedChange={onAutoUnitChange} className="scale-75" />
    </div>
    
    {/* Auto-Unit Settings Accordion */}
    {autoUnit && (
      <div className="space-y-1">
        <button onClick={() => setShowAutoUnitSettings(!showAutoUnitSettings)} className="...">
          <Gauge className="h-3 w-3" /> Auto-Unit Settings
        </button>
        {showAutoUnitSettings && (
          <div className="space-y-2 rounded-lg border border-slate-100 bg-white/60 p-2">
            {/* Settings UI (similar to Auto-K pattern) */}
          </div>
        )}
      </div>
    )}
    
    {/* Auto-Weights Toggle */}
    <div className="flex items-center justify-between group">
      <div className="space-y-0.5">
        <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <Scale className="h-3 w-3 text-indigo-500" />
          Auto-Weights Discovery
        </Label>
        <p className="text-[9px] text-slate-500">Optimize semantic/frequency balance</p>
      </div>
      <Switch checked={autoWeights} onCheckedChange={onAutoWeightsChange} className="scale-75" />
    </div>
    
    {/* Auto-Weights Settings Accordion */}
    {autoWeights && (
      <div className="space-y-1">
        <button onClick={() => setShowAutoWeightsSettings(!showAutoWeightsSettings)} className="...">
          <Gauge className="h-3 w-3" /> Auto-Weights Settings
        </button>
        {showAutoWeightsSettings && (
          <div className="space-y-2 rounded-lg border border-slate-100 bg-white/60 p-2">
            {/* Settings UI */}
          </div>
        )}
      </div>
    )}
  </div>
</div>
```



**Evidence Ranking Section Updates**:

- When `autoWeights` is enabled, disable manual sliders (set to read-only)

- Show selected weights as badges: "Semantic: 80% | Frequency: 20% (Auto)"

- When disabled, show manual controls as before

---

**File**: `components/controls/AnalysisControlsAccordion.tsx`

- Add props: `autoUnit`, `onAutoUnitChange`, `autoWeights`, `onAutoWeightsChange`

- Pass through to `AnalysisControls`

---

### 8. Logging Integration

**File**: `lib/graph/graph-builder.ts`

All logging uses existing `log()` function with type "analysis":

- Auto-Unit: Initial evaluation start, progress per mode, metrics per mode, final selection

- Auto-Weights: Initial evaluation start, progress per weight combo, metrics per combo, final selection

Logs automatically flow to:

- Console (backend)

- `onLog` callback → API response → `addLog()` in `page.tsx` → InspectorConsole (bottom panel)

---

### 9. AnalysisReport Display

**File**: `components/inspector/AnalysisReport.tsx`

**Auto-Unit Section** (after Auto-K section, before Auto-Seed):

```typescript
{analysis && analysis.unitSearchMetrics && analysis.unitSearchMetrics.length > 0 && (
  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
          Auto-Unit Selection
        </Badge>
        <span className="text-sm font-semibold text-slate-600">
          Tested {analysis.unitSearchMetrics.length} modes
        </span>
      </div>
      {analysis.recommendedUnitMode && (
        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 px-2 py-0 text-[11px] font-black text-indigo-700">
          Selected: {analysis.recommendedUnitMode.label}
        </Badge>
      )}
    </div>
    <div className="px-5 py-4 space-y-3">
      {analysis.autoUnitReasoning && (
        <p className="text-[12px] text-slate-600">
          Reasoning: {analysis.autoUnitReasoning}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100 text-[12px]">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Mode</th>
              <th className="px-3 py-2 text-left font-semibold">Score</th>
              <th className="px-3 py-2 text-left font-semibold">Coherence</th>
              <th className="px-3 py-2 text-left font-semibold">Separation</th>
              <th className="px-3 py-2 text-left font-semibold">Dominance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {analysis.unitSearchMetrics.map((m) => {
              const isSelected = analysis.recommendedUnitMode?.windowSize === m.mode.windowSize;
              return (
                <tr key={`unit-${m.mode.windowSize}`} className={isSelected ? "bg-indigo-50/50" : ""}>
                  <td className="px-3 py-2 font-semibold text-slate-800">{m.mode.label}</td>
                  <td className="px-3 py-2 text-slate-700">{m.score.toFixed(3)}</td>
                  <td className="px-3 py-2 text-slate-700">{(m.coherence ?? 0).toFixed(3)}</td>
                  <td className="px-3 py-2 text-slate-700">{(m.separation ?? 0).toFixed(3)}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {m.dominance !== undefined ? `${(m.dominance * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
```



**Auto-Weights Section** (after Auto-Unit, before Auto-Seed):

```typescript
{analysis && analysis.weightSearchMetrics && analysis.weightSearchMetrics.length > 0 && (
  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    {/* Similar structure to Auto-Unit table */}
    {/* Columns: Weights (sem/freq) | Score | Evidence Coherence | Evidence Separation | Dominance */}
  </div>
)}
```



**Export Formatting**: Update `formatParameters()` function to include:

```typescript
autoUnit: ${p.autoUnit} | recommendedUnitMode: ${p.recommendedUnitMode?.label ?? "-"}
autoWeights: ${p.autoWeights} | recommendedWeights: sem=${p.recommendedWeights?.semanticWeight ?? "-"}, freq=${p.recommendedWeights?.frequencyWeight ?? "-"}
```



---

### 10. 3D Preview

**No changes needed** - Graph renders from final `AnalysisResult`. Auto-tuning affects analysis that produces it.---

## Implementation Order

1. **Backend Types**: Update `types/analysis.ts` and `types/api.ts`

2. **Backend Evaluation**: Implement `evaluateUnitMode()` in `cluster-eval.ts`

3. **Backend Evaluation**: Implement `evaluateWeightRange()` in `cluster-eval.ts`

4. **Backend Integration**: Integrate Auto-Unit into `buildAnalysis()` (Step 1)

5. **Backend Integration**: Integrate Auto-Weights into `buildAnalysis()` (Step 4)

6. **API Layer**: Update `app/api/analyze/route.ts`

7. **Frontend State**: Add state to `app/page.tsx`

8. **Frontend UI**: Add "Model Tuning" section to `AnalysisControls.tsx`

9. **Frontend Props**: Update `AnalysisControlsAccordion.tsx`

10. **Frontend Report**: Add tables to `AnalysisReport.tsx`

11. **Testing & Refinement**: Verify logging, UI updates, export formatting

---

## Key Implementation Notes

- **Caching**: Cache embeddings per unit mode in `evaluateUnitMode()` to avoid re-embedding

- **Logging Pattern**: Follow Auto-K pattern exactly (progress logs, per-option metrics, final selection)

- **UI Consistency**: Match Auto-K/Auto-Seed UI patterns (toggle, settings accordion, badges)

- **Error Handling**: Handle edge cases (empty corpus, invalid modes, etc.)