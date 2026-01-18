# AI Axis Label Auto-Run Issue

Documenting the investigation into AI axis label enhancement not triggering on initial load, plus related concept label observations. Use this as a reference for future refactors and debugging.

## Context & Goal
- The AI axis label toggle (`enableAxisLabelAI`) should automatically call `/api/analyze/axis-synthesis` after an analysis completes, without manual toggling.
- Concept node labels should be meaningful (from `analysis.concepts.label` or synthesized short labels), independent of axis label synthesis.

## Current Behavior (Observed)
- First load: the axis AI toggle shows “on” but no API call is fired; “Redo API Call” does nothing.
- After manual off→on toggle: the call fires and axis labels update.
- Concept node labels remain unchanged by axis label synthesis (expected, but reported as confusing because axes update while nodes do not).

## Expected Behavior
- When `enableAxisLabelAI` is true and `analysis.axisLabels` exists, the hook should call `/api/analyze/axis-synthesis` automatically once per analysis (or when refreshed).
- “Redo API Call” should always force a re-run, even if the same analysis key is present.
- Axis AI output should not automatically rename concept nodes (separate concern), but this mismatch should be documented to avoid confusion.

## Key Code Paths
- Hook: `hooks/useAxisLabelEnhancer.ts`
  - Inputs: `analysis`, `enabled`, `selectedModel`, `onAddLog`
  - State/refs: `enhancedLabels`, `isLoading`, `refreshTrigger`, `fetchedForAnalysisKeyRef`, `lastAnalysisRef`, `lastAnalysisKeyRef`, `lastRefreshAppliedRef`
  - Effect deps (current): `[analysis, enabled, selectedModel, refreshTrigger, onAddLog]`
  - Analysis fingerprint: JSON of sorted axis entries + stats (sentences/concepts) to detect new analyses.
  - Skip conditions: disabled toggle; missing `analysis` or `analysis.axisLabels`; empty axis set.
  - Early return (no fetch): already fetched for this fingerprint and no refresh requested.
  - Synthesized fast-path: if all `axis.synthesized*` exist in `analysis.axisLabels`, set `enhancedLabels` without API call.
  - Fetch: POST `/api/analyze/axis-synthesis` with axis labels + contexts; guards against stale responses.
- Consumer: `app/page.tsx`
  - State: `enableAxisLabelAI` defaults true.
  - Hook usage: `useAxisLabelEnhancer(analysis, enableAxisLabelAI, selectedModel, addLog)`.
  - Display merge: `displayAxisLabels` merges `enhancedLabels` into `analysis.axisLabels` when AI is enabled.
  - UI: `GraphCanvas3D` and `Graph3DControls` receive `axisLabels`, AI toggle handlers, refresh handler, and loading state.
- Visualization: `components/graph/GraphCanvas3D.tsx`
  - Axis end labels (`MultiAxisLabels`): show synthesized negative/positive/name when AI is enabled.
  - Concept node labels (`Node3D`): **not** driven by axis labels; use `resolveConceptLabel(shortLabel, node.label)` from `useConceptSummarizer` + graph node data.
- API route: `app/api/analyze/axis-synthesis/route.ts`
  - Uses OpenAI with prompts to synthesize labels; returns `axisLabels` with `synthesizedNegative/Positive/Name`.

## Root Causes (Initial)
1. **Two-effect race/reset**: Separate reset and fetch effects led to `fetchedForAnalysisKeyRef` being nulled before fetch logic observed stable dependencies.
2. **Unstable/too-simple key**: `analysisKey = Object.keys(analysis.axisLabels).sort().join(",")` missed cases where axis labels existed but the key was falsy or unchanged across analyses; also ignored label content and stats.
3. **Missing guard for refresh intent**: Refresh trigger was treated as “>0” instead of “changed since last fetch,” so redo could be ignored if the key matched.

## Changes Implemented
- Consolidated logic into a single effect keyed on `analysis` (not just the prior `analysisKey` string).
- Introduced a richer fingerprint (axis ids + label fields + stats) to detect analysis changes.
- Stored last applied refresh and analysis refs to honor manual “Redo API Call” even when the key is unchanged.
- Reset enhanced state and refs on analysis change; guard async response application by fingerprint.

## Remaining Gaps / Notes
- Concept node labels: axis synthesis does **not** update node labels. Nodes rely on `analysis.concepts` labels or heuristic short labels from `useConceptSummarizer`. If a unified naming is desired, additional mapping logic is needed (e.g., apply axis pole labels to their referenced concept ids or run concept-level synthesis).
- If the axis AI call still fails to fire on first load, instrument logging in `useAxisLabelEnhancer` around skip paths (enabled/analysis/axisLabels/fingerprint/hasFetched/refreshRequested) to see which guard returns early.
- OpenAI dependency: `/api/analyze/axis-synthesis` requires `OPENAI_API_KEY`; missing keys should produce an api_error log.

## Quick Debug Checklist
- Verify `enableAxisLabelAI` is true at analysis completion time.
- Confirm `analysis.axisLabels` is populated (API `/api/analyze` response) before the hook runs; log when empty.
- Check `fetchedForAnalysisKeyRef` vs `analysisKey` and `refreshTrigger`—ensure refresh increments.
- Watch network tab for `/api/analyze/axis-synthesis`; confirm request body includes all axes.
- Ensure `onAddLog` receives `api_request` and `api_response` entries for the axis call.

## Potential Follow-Ups
1. **Concept label alignment**: Decide whether axis AI output should rename concept nodes (likely via mapping pole concept ids to node labels) or keep separation; document whichever is chosen.
2. **Telemetry**: Add lightweight debug logs or dev-only toasts when the axis enhancer skips due to guards (disabled, no axis labels, already fetched, missing API key).
3. **Tests**: Add a small hook test (React Testing Library) to assert fetch runs on analysis change + refresh trigger behavior, using a mocked fetch and fake analysis payload.
4. **UI clarity**: Indicate in the AI button tooltip/panel that concept node labels are independent of axis AI to reduce confusion.
