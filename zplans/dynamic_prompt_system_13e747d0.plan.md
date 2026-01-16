---
name: Dynamic Prompt System
overview: Refactor axis and concept labeling prompts into a separate JSON file with variable placeholders, and create a utility system to dynamically process and replace variables when generating prompts.
todos:
  - id: create-prompts-file
    content: Create `lib/prompts/ai-prompts.json` with both axis and concept prompt templates using {{VARIABLE}} placeholders
    status: completed
  - id: create-processor
    content: Create `lib/prompts/prompt-processor.ts` with functions to load prompts and replace variables with fallback handling
    status: completed
    dependencies:
      - create-prompts-file
  - id: update-axis-api
    content: Update `app/api/analyze/axis-labels/route.ts` to use the new prompt system with variable mapping
    status: completed
    dependencies:
      - create-processor
  - id: update-synthesize-api
    content: Update `app/api/synthesize/route.ts` to use the new prompt system with variable mapping
    status: completed
    dependencies:
      - create-processor
  - id: cleanup-duplicate-prompts
    content: Remove DEFAULT_PROMPTS duplication from prompt-processor.ts to maintain single source of truth
    status: completed
---

# Dynamic Prompt System Implementation

## Overview
Move the hardcoded prompts for axis labeling and concept synthesis into a separate JSON file with clear variable placeholders (`{{VARIABLE_NAME}}`), and create a utility system to dynamically replace these variables when generating API prompts.

## Files to Create

### 1. `lib/prompts/ai-prompts.json`
A JSON file containing both prompt templates with clear variable markers:
- **Axis prompt**: System and user prompts for axis labeling with variables like `{{AXIS_ID}}`, `{{AXIS_VARIANCE_PCT}}`, `{{NEG_POLE_KEYWORDS}}`, `{{POS_POLE_KEYWORDS}}`, etc.
- **Concept prompt**: System and user prompts for concept synthesis with variables like `{{CONCEPT_ID}}`, `{{CENTROID_SEMANTIC_TERMS}}`, `{{EVIDENCE_SENTENCES}}`, etc.

Structure:
```json
{
  "axis": {
    "system": "You are SemiChan's \"Axis Interpreter.\"...",
    "user": "Axis {{AXIS_ID}} represents...\n\nNEGATIVE END POLE:\nKeywords: {{NEG_POLE_KEYWORDS}}\n..."
  },
  "concept": {
    "system": "You are SemiChan's \"Concept Synthesizer.\"...",
    "user": "Concept ID: {{CONCEPT_ID}}\nSemantic Terms: {{CENTROID_SEMANTIC_TERMS}}\n..."
  }
}
```

### 2. `lib/prompts/prompt-processor.ts`
Utility module to:
- Load prompts from the JSON file
- Replace variables using a mapping function
- Handle missing variables with fallback values
- Format lists/arrays appropriately (e.g., join keywords with commas)

Key functions:
- `loadPrompts()`: Load and parse the JSON file
- `processPrompt(template, variables)`: Replace `{{VAR}}` placeholders with actual values
- `formatVariable(value, type)`: Format variables based on type (list, number, string, etc.)

## Files to Modify

### 3. `app/api/analyze/axis-labels/route.ts`
- Remove hardcoded `systemPrompt` and `userPrompt` strings
- Import `loadPrompts` and `processPrompt` from the prompt processor
- Map incoming request data to the new variable names:
  - `axis_id` → axis index/key
  - `explained_variance_pct` → from `analysis.varianceStats` (if available)
  - `negative_pole_keywords` → from `negativeContext.keywords`
  - `positive_pole_keywords` → from `positiveContext.keywords`
  - `negative_pole_anchor_sentences` → from `negativeContext.sentences` (limited to 2-4)
  - `positive_pole_anchor_sentences` → from `positiveContext.sentences` (limited to 2-4)
  - `top_concepts_near_negative/positive` → extract from analysis if available
  - `corpus_domain` → default to "architecture jury comments"
  - `style_preset` → default to "jury-facing, rigorous, concise"
- Use fallback values for missing data (e.g., "N/A", empty arrays, defaults)

### 4. `app/api/synthesize/route.ts`
- Remove hardcoded `systemPrompt` and `userPrompt` strings
- Import prompt processing utilities
- Map incoming request data to the new variable names:
  - `concept_id` → from request `id`
  - `concept_size_sentences` → calculate from `evidence_sentences.length`
  - `concept_share_pct` → calculate from concept size vs total sentences (if analysis available)
  - `centroid_semantic_terms` → from `top_ngrams`
  - `top_ngrams` → from request `top_ngrams`
  - `representative_sentences` → from `evidence_sentences` (limited to 4-8)
  - `juror_contribution` → calculate from analysis if available (juror distribution)
  - `stance_mix` → from request `stance_mix`
  - `related_axes_scores` → extract from analysis if available
  - `constraints` → build from defaults (max words, banned phrases)
- Use fallback values for missing data

## Implementation Details

### Variable Replacement Strategy
- Use regex to find all `{{VARIABLE_NAME}}` patterns
- Replace with actual values, formatted appropriately:
  - Arrays → joined strings (e.g., keywords: "term1, term2, term3")
  - Numbers → formatted strings (e.g., percentages: "45.2%")
  - Objects → JSON strings or formatted text
- Missing variables → use fallback values:
  - Strings: "N/A" or empty string
  - Arrays: "None" or empty array representation
  - Numbers: "0" or "N/A"

### Data Mapping
Some variables in the user's example prompts may not be directly available. We'll:
1. Use available data where possible
2. Calculate derived values (e.g., concept share percentage)
3. Use sensible defaults/fallbacks for missing data
4. Document which variables are optional vs required

### Error Handling
- If prompt file is missing or malformed, fall back to current hardcoded prompts
- Log warnings when variables are missing
- Validate prompt structure on load

## Testing Considerations
- Verify prompts load correctly on server startup
- Test variable replacement with various data combinations
- Ensure fallback values work when data is missing
- Verify JSON structure is valid and parseable

---

## Implementation Status: ✅ COMPLETED

### Implementation Summary

All planned tasks have been completed and the system is fully operational:

1. ✅ **Prompt JSON File Created**: `lib/prompts/ai-prompts.json` contains both axis and concept prompt templates with variable placeholders
2. ✅ **Processor Module Created**: `lib/prompts/prompt-processor.ts` provides `loadPrompts()` and `processPrompt()` functions with variable formatting and fallback handling
3. ✅ **Axis Labels API Updated**: `app/api/analyze/axis-labels/route.ts` now uses the dynamic prompt system
4. ✅ **Synthesize API Updated**: `app/api/synthesize/route.ts` now uses the dynamic prompt system
5. ✅ **Cleanup Completed**: Removed duplicate `DEFAULT_PROMPTS` constant to maintain single source of truth

### Cleanup Performed

- **Removed Duplicate Prompts**: The `DEFAULT_PROMPTS` constant (78 lines) was removed from `prompt-processor.ts` to eliminate code duplication
- **Improved Error Handling**: Changed from silent fallback to explicit error throwing when JSON file is missing, ensuring the single source of truth is enforced
- **Better Error Messages**: Error messages now include the file path and clear instructions

### Documentation

- **Implementation Documentation**: Created `docs/dynamic-prompt-system.md` with comprehensive documentation including:
  - Architecture overview
  - Variable system details
  - Usage examples
  - Maintenance guidelines
  - All variable mappings for both axis and concept prompts

### Files Created/Modified

**Created:**
- `lib/prompts/ai-prompts.json` - Prompt templates
- `lib/prompts/prompt-processor.ts` - Processor utilities
- `docs/dynamic-prompt-system.md` - Implementation documentation

**Modified:**
- `app/api/analyze/axis-labels/route.ts` - Migrated to dynamic prompts
- `app/api/synthesize/route.ts` - Migrated to dynamic prompts
- `lib/prompts/prompt-processor.ts` - Cleaned up (removed duplicates)

### Verification

- ✅ No hardcoded prompts remain in API routes
- ✅ All prompts load from JSON file
- ✅ Variable replacement works correctly
- ✅ Fallback values function as expected
- ✅ Error handling is robust
- ✅ Single source of truth maintained