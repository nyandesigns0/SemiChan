# Juror Feedback Text Formatting Prompt

## Purpose
This prompt helps format raw juror feedback text into a structured format that can be processed by the SemiChan juror segmentation system. The formatted output will be ready for upload as a .txt file and automatic parsing into juror comments with tags.

## Input Format
Provide the raw juror feedback text that needs formatting. This can be:
- Unstructured meeting notes
- Raw transcript excerpts
- Mixed feedback from multiple jurors
- Any text containing juror names and their comments

## Expected Output Format
Format the text into the following structure:

```
JUROR NAME
Juror feedback text here. Can span multiple sentences and paragraphs.
Additional comments from the same juror.

NEXT JUROR NAME
Their feedback text. #optional #tags [bracketed-tags]
More feedback from this juror.

FINAL JUROR NAME
Last juror's comments with tags if applicable.
```

## Formatting Rules

### 1. Juror Name Headers
- **Capitalization**: Firstname Lastname (proper capitalization)
- **Position**: Each juror name on its own line
- **Separation**: Empty line before and after each name
- **No Punctuation**: Do NOT add colons, periods, or other punctuation after names

### 2. Comment Text
- **Natural Language**: Keep feedback in natural, readable sentences
- **Multiple Paragraphs**: Use empty lines between distinct comments from the same juror
- **Preserve Meaning**: Don't change the meaning or content of the feedback

### 3. Tag Integration
- **Hashtags**: Use #tagname for single-word tags (e.g., #urgent, #lighting, #spatial)
- **Bracketed Tags**: Use [tag name] for multi-word tags (e.g., [high priority], [design issue])
- **Placement**: Tags can appear anywhere in the comment text
- **Multiple Tags**: Use multiple tags as needed (e.g., #urgent #lighting [high priority])

### 4. Structure Guidelines
- **One Juror Per Section**: All comments under one name belong to that juror
- **Logical Grouping**: Group related comments from the same juror together
- **Clear Separation**: Use empty lines to separate different jurors and comment blocks

## Examples

### Input (Raw Text):
```
john smith said the lobby feels too small and needs more lighting. he also mentioned the entrance needs more glass. jane doe thought it looks good but navigation could be improved. bob johnson said the overall flow is nice but color adjustments needed.
```

### Output (Formatted):
```
John Smith
The lobby feels too small and needs more lighting. #spatial #lighting

The entrance needs more glass. [design improvement]

Jane Doe
It looks good but navigation could be improved. #navigation

Bob Johnson
The overall flow is nice but color adjustments needed. #color
```

## Processing Instructions

1. **Identify Jurors**: Scan the text for names (properly capitalized names, supports single-word names like "Buildner" or full names like "John Smith")
2. **Extract Comments**: Associate each piece of feedback with the correct juror
3. **Add Structure**: Format into the header-body pattern
4. **Apply Tags**: Add relevant tags based on content themes
5. **Clean Text**: Ensure natural, readable formatting

## Common Patterns to Watch For

### Attribution Phrases
- "John said..."
- "According to Jane..."
- "Bob mentioned..."
- "Sarah's feedback was..."

### Content Themes (Suggested Tags)
- **Spatial/Layout**: #spatial, #layout, #flow
- **Lighting**: #lighting, #bright, #dark
- **Materials**: #glass, #wood, #metal, #texture
- **Colors**: #color, #warm, #cool, #contrast
- **Navigation**: #navigation, #wayfinding, #accessible
- **Priority**: #urgent, #important, [high priority], [low priority]
- **Design Elements**: #design, #aesthetic, #modern, #traditional

## Quality Checks

Before finalizing the formatted text:

- [ ] Each juror name is properly capitalized
- [ ] Names appear on their own lines
- [ ] No punctuation after juror names
- [ ] Empty lines separate jurors and comment blocks
- [ ] Tags are relevant and properly formatted
- [ ] Text is natural and readable
- [ ] All original feedback is preserved
- [ ] Comments are logically grouped by juror

## Usage
Copy this prompt along with your raw juror feedback text and provide it to an AI assistant. The result will be a properly formatted .txt file ready for upload to SemiChan.