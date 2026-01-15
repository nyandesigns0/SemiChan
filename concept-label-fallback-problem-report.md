# Concept Label Fallback Problem Report

## Problem Summary

Concept nodes in the 3D visualization are displaying "Concept" as their label even when semantic fallback mechanisms should be providing meaningful labels. The fallback system was implemented to handle cases where frequency-based term extraction (BM25) yields sparse or empty results, but it is not functioning as expected.

## Current Behavior

1. **Visualization**: Concept nodes show "Concept" as their label in the 3D graph
2. **Inspector Panel**: The concept details panel shows "TITLE: Concept" even when there is visible text content associated with the concept
3. **Evidence Available**: The system has access to sentences and text content (visible in the TEXT tab of the inspector), but frequency terms are missing or sparse
4. **Fallback Not Triggering**: Despite having text content available, the semantic fallback mechanism is not producing alternative labels

## Expected Behavior

When the primary labeling method (BM25 frequency terms + keyphrase extraction) fails to produce sufficient candidates (< 4 terms), the system should:

1. **Compute nearest sentences**: Find the top 3 most semantically similar sentences to the concept centroid from the entire corpus (not just cluster sentences)
2. **Extract fallback keyphrases**: Run keyphrase extraction on these nearest sentences
3. **Use sentence snippets**: If keyphrase extraction still fails, extract meaningful word snippets from the nearest sentences (skipping stop words)
4. **Produce meaningful label**: Return a label composed of these fallback terms joined with " · " instead of the placeholder "Concept"

## Root Cause Analysis

### Potential Issues Identified

1. **Fallback Condition Too Restrictive**
   - Current condition: `deduped.length < topNCount && nearestSentences && nearestSentences.length > 0`
   - Issue: May not trigger when `deduped.length` is exactly 0 but `nearestSentences` computation fails silently

2. **Nearest Sentences Computation**
   - Location: `lib/graph/graph-builder.ts` - `computeNearestSentences` function
   - Current implementation searches all sentences, but may return empty array if:
     - `sentenceVectors` is missing entries
     - Cosine similarity computation fails
     - All sentences are filtered out

3. **Snippet Fallback Only Triggers on Zero**
   - Current condition: `if (deduped.length === 0)`
   - Issue: If we have 1-2 candidates but need more, snippet fallback doesn't help

4. **Deduplication Too Aggressive**
   - The `addCandidate` function filters out candidates based on:
     - Stem matching
     - Substring duplicates
   - May be filtering out valid fallback candidates

5. **Label Source Selection Logic**
   - Line 110: `const labelSource = deduped.length > 0 ? deduped : (fallbackKeyphrases.length > 0 ? fallbackKeyphrases : []);`
   - Issue: If `deduped` has 0 items but `fallbackKeyphrases` also has 0 items (both failed), it falls back to empty array, resulting in "Concept"

## Code Locations

### Primary Files
- **Label Generation**: `lib/analysis/concept-labeler.ts`
  - Function: `contrastiveLabelCluster` (lines 22-114)
  - Fallback logic: lines 73-107
  - Label assembly: lines 109-111

- **Nearest Sentences Computation**: `lib/graph/graph-builder.ts`
  - Function: `computeNearestSentences` (lines 926-955)
  - Called at: line 1009 (primary concepts), line 1044 (detail concepts)

- **Node Creation**: `lib/graph/graph-builder.ts`
  - Primary concepts: lines 1005-1028
  - Detail concepts: lines 1040-1074
  - Node label assignment: `label: c.label` (lines 1327, 1364)

## Diagnostic Questions

1. Are `nearestSentences` being computed correctly? (Check if array is non-empty)
2. Is `extractClusterKeyphrases` returning results when called with `nearestSentences`?
3. Are the sentence snippets being generated but filtered out by `addCandidate`?
4. Is the fallback condition being evaluated correctly?
5. Are there edge cases where `sentenceVectors` or `docs` arrays are incomplete?

## Testing Scenarios

1. **Empty Frequency Terms**: Cluster with sentences but no BM25 terms
2. **Sparse Keyphrases**: Cluster with 1-2 keyphrases but needs 4
3. **Empty Cluster Sentences**: Cluster with no sentences (should use all corpus)
4. **All Deduplication Filtered**: Valid candidates filtered out by deduplication logic
5. **Nearest Sentences Same as Cluster**: Nearest sentences are identical to cluster sentences

---

# Fix Implementation Prompt

## Task: Fix Concept Label Semantic Fallback Mechanism

### Problem Statement

The semantic fallback mechanism for concept labeling is not working correctly. Concepts that should receive meaningful labels from semantic similarity are instead displaying the placeholder "Concept". The fallback system exists but fails to produce labels even when text content is available.

### Requirements

1. **Ensure Fallback Always Attempts**
   - The fallback should trigger whenever `deduped.length < topNCount` (currently 4)
   - Even if `nearestSentences` is empty or computation fails, attempt alternative strategies
   - Never return "Concept" without exhausting all possible labeling strategies

2. **Robust Nearest Sentences Computation**
   - Ensure `computeNearestSentences` always returns at least some sentences when available
   - Handle edge cases: missing vectors, empty arrays, invalid indices
   - Add logging/debugging to track when and why nearest sentences computation fails
   - Consider using cluster sentences as fallback if corpus-wide search fails

3. **Multi-Tier Fallback Strategy**
   Implement a cascading fallback system:
   - **Tier 1**: Primary method (keyphrases + BM25 terms from cluster sentences)
   - **Tier 2**: Keyphrase extraction from nearest sentences (corpus-wide)
   - **Tier 3**: Sentence snippet extraction from nearest sentences (skip stop words)
   - **Tier 4**: Use first few meaningful words from cluster sentences directly
   - **Tier 5**: Use concept ID or stable ID as last resort (never "Concept")

4. **Improve Snippet Extraction**
   - Current snippet extraction only runs when `deduped.length === 0`
   - Should also run when `deduped.length < topNCount` to fill remaining slots
   - Improve stop word filtering (expand list, handle punctuation)
   - Extract longer phrases (up to 6-8 words) not just 4 words
   - Consider extracting noun phrases or meaningful multi-word units

5. **Relax Deduplication for Fallback**
   - When using fallback candidates, be less aggressive with deduplication
   - Allow similar but not identical terms if primary method failed
   - Consider allowing substring matches if they add semantic value

6. **Better Label Assembly**
   - If we have partial results (1-3 candidates), use them even if below threshold
   - Combine primary candidates with fallback candidates more intelligently
   - Ensure label is never empty string or "Concept" if any text is available

### Implementation Guidelines

#### File: `lib/analysis/concept-labeler.ts`

**Function: `contrastiveLabelCluster`**

1. **Restructure fallback logic**:
   - Make fallback trigger more reliably
   - Add multiple fallback tiers as described above
   - Ensure each tier is attempted before giving up

2. **Improve snippet extraction**:
   - Extract snippets even when we have some candidates (to fill to `topNCount`)
   - Use better NLP heuristics (noun phrase detection, meaningful word sequences)
   - Handle edge cases (very short sentences, punctuation-heavy text)

3. **Add defensive checks**:
   - Validate inputs (non-empty arrays, valid sentences)
   - Handle cases where `nearestSentences` is undefined or empty
   - Provide meaningful defaults at each step

#### File: `lib/graph/graph-builder.ts`

**Function: `computeNearestSentences`**

1. **Ensure reliability**:
   - Always return at least one sentence if corpus has any sentences
   - Handle missing `sentenceVectors` entries gracefully
   - Add fallback to cluster sentences if corpus-wide search fails
   - Validate that returned sentences are non-empty and meaningful

2. **Improve similarity computation**:
   - Handle edge cases (zero vectors, NaN scores)
   - Ensure cosine similarity is computed correctly
   - Consider alternative similarity metrics if cosine fails

**Call Sites (lines 1009, 1044)**

1. **Add validation**:
   - Check that `nearestSentences` is non-empty before passing to `contrastiveLabelCluster`
   - Log warnings when nearest sentences computation yields empty results
   - Consider passing cluster sentences as additional fallback parameter

### Success Criteria

1. **No "Concept" Labels**: Concepts should never display "Concept" when text content is available
2. **Meaningful Labels**: Labels should be semantically relevant to the concept's content
3. **Graceful Degradation**: System should work even with sparse or missing data
4. **Consistent Behavior**: Same concept should get same label across runs (deterministic)

### Testing Checklist

- [ ] Test with cluster that has 0 frequency terms
- [ ] Test with cluster that has 1-2 frequency terms (below threshold)
- [ ] Test with cluster that has 0 keyphrases
- [ ] Test with cluster that has sentences but all filtered by deduplication
- [ ] Test with empty `nearestSentences` array
- [ ] Test with `nearestSentences` containing same sentences as cluster
- [ ] Test with very short sentences (< 5 words)
- [ ] Test with punctuation-heavy or special character sentences
- [ ] Verify labels are deterministic (same input = same label)
- [ ] Verify no "Concept" labels appear in visualization

### Debugging Recommendations

1. **Add logging**:
   - Log when fallback triggers and why
   - Log `nearestSentences` content and count
   - Log keyphrase extraction results at each tier
   - Log final label assembly decision

2. **Add validation**:
   - Assert that labels are never "Concept" when sentences exist
   - Validate `nearestSentences` is non-empty when corpus has sentences
   - Check that deduplication isn't too aggressive

3. **Test incrementally**:
   - Test each fallback tier independently
   - Verify each tier produces results before moving to next
   - Isolate which tier is failing

### Notes

- The current implementation has the right structure but may have edge case failures
- Focus on making the system more defensive and ensuring fallback always attempts alternative strategies
- Consider that "Concept" should be the absolute last resort, only when no text content exists at all
- The user reported seeing text in the inspector but "Concept" in the label, suggesting the data exists but extraction/assembly is failing

