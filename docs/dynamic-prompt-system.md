# Dynamic Prompt System

## Overview

The Dynamic Prompt System centralizes all AI prompts used for axis labeling and concept synthesis into a single JSON configuration file (`lib/prompts/ai-prompts.json`). This system uses variable placeholders (`{{VARIABLE_NAME}}`) that are dynamically replaced at runtime, making prompt management and updates easier without requiring code changes.

## Implementation Date

Completed: 2024 (implementation and cleanup)

## Architecture

### Core Components

1. **`lib/prompts/ai-prompts.json`**
   - Single source of truth for all AI prompts
   - Contains both axis and concept prompt templates
   - Uses `{{VARIABLE_NAME}}` syntax for dynamic variables

2. **`lib/prompts/prompt-processor.ts`**
   - Loads and caches prompts from JSON file
   - Processes templates with variable replacement
   - Handles formatting for different data types (lists, percentages, JSON, etc.)
   - Provides fallback values for missing variables

3. **API Routes**
   - `app/api/analyze/axis-labels/route.ts` - Uses axis prompts
   - `app/api/synthesize/route.ts` - Uses concept prompts

## Variable System

### Variable Syntax

Variables in prompts use double curly braces: `{{VARIABLE_NAME}}`

### Variable Formatting

The system supports multiple formatting options:

- **`list`**: Arrays are joined with commas (e.g., "term1, term2, term3")
- **`lines`**: Arrays are formatted as bulleted lines (e.g., "- item1\n- item2")
- **`percentage`**: Numbers are formatted as percentages (e.g., "45.2%")
- **`number`**: Numbers are formatted as strings
- **`json`**: Objects are stringified as JSON
- **`string`**: Default string conversion

### Variable Configuration

Variables can be provided in two ways:

1. **Simple value**: `{ VARIABLE_NAME: "value" }`
2. **Configured value**: `{ VARIABLE_NAME: { value: "value", format: "list", fallback: "None" } }`

## Axis Labeling Variables

Used in `app/api/analyze/axis-labels/route.ts`:

- `{{AXIS_ID}}` - Axis index/key identifier
- `{{AXIS_VARIANCE_PCT}}` - Explained variance percentage for the axis
- `{{NEG_POLE_TITLE}}` - Title of the negative pole concept
- `{{POS_POLE_TITLE}}` - Title of the positive pole concept
- `{{NEG_POLE_KEYWORDS}}` - Keywords from negative pole context
- `{{POS_POLE_KEYWORDS}}` - Keywords from positive pole context
- `{{NEG_POLE_ANCHOR_SENTENCES}}` - Representative sentences from negative pole (formatted as lines)
- `{{POS_POLE_ANCHOR_SENTENCES}}` - Representative sentences from positive pole (formatted as lines)
- `{{NEG_TOP_CONCEPTS}}` - Top concepts near negative pole (currently unused, defaults to empty)
- `{{POS_TOP_CONCEPTS}}` - Top concepts near positive pole (currently unused, defaults to empty)
- `{{CORPUS_DOMAIN}}` - Domain description (default: "architecture jury comments")
- `{{STYLE_PRESET}}` - Style description (default: "jury-facing, rigorous, concise")

## Concept Synthesis Variables

Used in `app/api/synthesize/route.ts`:

- `{{CONCEPT_ID}}` - Concept identifier
- `{{CONCEPT_SEED}}` - Original label seed for the concept
- `{{CONCEPT_SIZE_SENTENCES}}` - Number of sentences in the concept
- `{{CONCEPT_SHARE_PCT}}` - Percentage of total corpus represented by this concept
- `{{CENTROID_SEMANTIC_TERMS}}` - Semantic terms from the concept centroid
- `{{TOP_NGRAMS}}` - Top n-grams for the concept
- `{{REPRESENTATIVE_SENTENCES}}` - Representative evidence sentences (formatted as lines, limited to 8)
- `{{JUROR_CONTRIBUTION}}` - Distribution of contributions by juror (JSON or string)
- `{{STANCE_MIX}}` - Stance distribution (praise, critique, suggestion, neutral percentages)
- `{{RELATED_AXES_SCORES}}` - Scores on related axes (JSON or string)
- `{{CONSTRAINTS}}` - Synthesis constraints (formatted as lines)

## Usage Example

```typescript
import { loadPrompts, processPrompt } from "@/lib/prompts/prompt-processor";

// Load prompts (cached after first load)
const prompts = await loadPrompts();
const axisPrompts = prompts.axis;

// Prepare variables
const variables = {
  AXIS_ID: "0",
  AXIS_VARIANCE_PCT: { value: 0.452, format: "percentage", fallback: "N/A" },
  NEG_POLE_KEYWORDS: { value: ["formal", "rigid"], format: "list", fallback: "None" },
  NEG_POLE_ANCHOR_SENTENCES: { value: ["Sentence 1", "Sentence 2"], format: "lines" },
  // ... other variables
};

// Process prompts
const systemPrompt = processPrompt(axisPrompts.system, variables);
const userPrompt = processPrompt(axisPrompts.user, variables);
```

## Error Handling

- **Missing JSON file**: The system throws an error with a clear message indicating the file path and requirement
- **Invalid JSON structure**: Validation ensures required keys (`axis.system`, `axis.user`, `concept.system`, `concept.user`) exist
- **Missing variables**: Missing variables are replaced with fallback values (default: "N/A" for strings, "None" for lists/lines)
- **Variable warnings**: Console warnings are logged when variables are missing

## Caching

Prompts are loaded once and cached in memory for performance. The cache is stored in the `cachedPrompts` variable and persists for the lifetime of the server process.

## Maintenance

### Updating Prompts

1. Edit `lib/prompts/ai-prompts.json` directly
2. No code changes required
3. Server restart may be needed to clear cache (or cache will refresh on next request in development)

### Adding New Variables

1. Add the variable placeholder to the prompt template in JSON: `{{NEW_VARIABLE}}`
2. Map the variable in the API route when calling `processPrompt()`
3. Provide appropriate formatting and fallback values

### Best Practices

- Keep variable names in UPPER_SNAKE_CASE
- Use descriptive variable names that indicate their purpose
- Always provide fallback values for optional variables
- Use appropriate formatting types for better prompt readability
- Document new variables in this file

## Cleanup Completed

- ✅ Removed duplicate `DEFAULT_PROMPTS` constant from `prompt-processor.ts`
- ✅ Made JSON file required (throws error if missing instead of silent fallback)
- ✅ Single source of truth: all prompts now live in `ai-prompts.json`
- ✅ Improved error messages for debugging

## Files Modified

- `lib/prompts/ai-prompts.json` - Created (prompt templates)
- `lib/prompts/prompt-processor.ts` - Created (processor utilities)
- `app/api/analyze/axis-labels/route.ts` - Updated (uses new system)
- `app/api/synthesize/route.ts` - Updated (uses new system)

## Related Documentation

- See `zplans/dynamic_prompt_system_13e747d0.plan.md` for original implementation plan


