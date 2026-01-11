# SemiChan Pipeline Documentation: From Input to Output

This document provides a comprehensive overview of how raw input (text or PDF) is transformed into the final graph visualization in SemiChan.

## Pipeline Overview

The following diagram shows how different data streams branch and converge to produce the final graph visualization:

```mermaid
graph TD
    Input[Raw Input: PDF/Text] --> Ingestion[1. Ingestion & Normalization]
    Ingestion --> Segmentation[2. Juror Segmentation]
    Segmentation --> Splitting[3. Sentence Splitting]
    Segmentation --> JurorBlocks[2.1 Juror Blocks<br/>Source Identifiers]
    
    Splitting --> StancePath[4. Stance Classification<br/>Praise/Critique/Suggestion]
    Splitting --> NgramPath[5. N-gram Extraction<br/>Word Pairs & Triplets]
    Splitting --> EmbedPath[6. Semantic Embeddings<br/>Meaning Vectors]
    
    NgramPath --> BM25[7.1 BM25 Frequency Vectors<br/>Cross-Juror Word Frequencies]
    EmbedPath --> SemanticVecs[6.1 384-dim Semantic Vectors<br/>Meaning Representation]
    BM25 --> Hybrid[7. Hybrid Vector Construction<br/>Combined Representation]
    SemanticVecs --> Hybrid
    
    Hybrid --> Clustering[8. Clustering<br/>Hierarchical (default) or K-Means]
    Clustering --> Centroids[8.1 Cluster Centroids<br/>Theme Centers]
    Clustering --> Assignments[8.2 Sentence Assignments<br/>Which Concept Each Sentence Belongs To]
    
    Centroids --> Labeling[9. Concept Labeling<br/>Extract Top N-grams from Centroids]
    Labeling --> ConceptNodes[9.1 Concept Nodes<br/>Large Nodes with Labels]
    
    Centroids --> ConceptSim[12.4 Concept Similarity Calculation<br/>Cosine Similarity]
    ConceptSim --> ConceptConceptLinks[12.5 Concept-Concept Links<br/>Purple Color<br/>Related Themes]
    
    Assignments --> JurorMapping[11. Juror-Concept Mapping<br/>Aggregate Sentence Weights<br/>Normalize per Juror<br/>Supports Soft Membership]
    StancePath --> JurorMapping
    JurorBlocks --> JurorMapping
    
    JurorMapping --> JurorConceptLinks[12.1 Juror-Concept Links<br/>Weight = Normalized Count<br/>Color = Dominant Stance<br/>Green: Praise, Red: Critique<br/>Orange: Suggestion, Gray: Neutral]
    
    Centroids --> Positioning3D[13. 3D Position Calculation<br/>Concepts: PCA Projection<br/>Jurors: Weighted Average of Concept Positions]
    
    Positioning3D --> ConceptPos[13.1 Concept 3D Positions]
    Positioning3D --> JurorPos[13.2 Juror 3D Positions]
    ConceptPos --> ConceptNodes
    JurorPos --> JurorNodes[11.1 Juror Nodes<br/>Small Nodes with Top Terms]
    
    Centroids --> JurorHighDim[11.5 High-Dimensional Vectors and Top Terms<br/>Weighted Average of Centroids<br/>Extract Top Terms from Vectors]
    JurorMapping --> JurorHighDim
    JurorHighDim --> JurorNodes
    
    JurorMapping --> JurorSim[12.2 Juror Similarity Calculation<br/>Cosine Similarity]
    JurorSim --> JurorJurorLinks[12.3 Juror-Juror Links<br/>Indigo Color<br/>Similar Interests]
    
    ConceptNodes --> Assembly[14. Graph Assembly<br/>Combine All Elements]
    JurorNodes --> Assembly
    JurorConceptLinks --> Assembly
    JurorJurorLinks --> Assembly
    ConceptConceptLinks --> Assembly
    
    Assembly --> Output[Final Graph Visualization<br/>Large Nodes = Concepts<br/>Small Nodes = Jurors<br/>Colored Links = Relationships]
    
    style ConceptNodes fill:#e0f2fe,stroke:#0284c7,stroke-width:3px
    style JurorNodes fill:#f1f5f9,stroke:#475569,stroke-width:2px
    style JurorConceptLinks fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style JurorJurorLinks fill:#e0e7ff,stroke:#6366f1,stroke-width:2px
    style ConceptConceptLinks fill:#f3e8ff,stroke:#8b5cf6,stroke-width:2px
    style Output fill:#fef3c7,stroke:#f59e0b,stroke-width:4px
```

## Simulation Setup: Example Sentences
To demonstrate the pipeline, we will track two specific sentences from the corpus through every transformation:

**Juror 1: Sarah Broadstock**
*Full Comment:* "I appreciated the careful attention to daylight and the sun path. The proposal is strong in its narrative, but the site response could be clearer. The plan feels tight and circulation could be improved."
*Tracking Sentence A:* **"I appreciated the careful attention to daylight and the sun path."**

**Juror 2: Sandra Baggerman**
*Full Comment:* "The geometry creates unique light conditions; indirect lighting and shadows form a serene atmosphere. The sustainability strategy would benefit from clearer explanation."
*Tracking Sentence B:* **"The geometry creates unique light conditions; indirect lighting and shadows form a serene atmosphere."**

---

## Step 1: Input Ingestion
**Plain Language:** The system accepts text or PDF files and prepares them for analysis by cleaning up the formatting.

**Technical Detail:** For PDF uploads, the system uses the PDF.js library to parse the document, iterating through each page to extract raw text content via the `getTextContent` method. Once extracted, the text (or direct paste input) is processed by a `normalizeWhitespace` utility that uses regular expressions to collapse multiple spaces, replace carriage returns with standard newlines, and trim extraneous leading or trailing whitespace.

**Location:** `lib/pdf/pdf-parser.ts` (`parsePdf`), `lib/utils/text-utils.ts` (`normalizeWhitespace`)

### Explanation
The ingestion phase handles different input types. For PDFs, it iterates through pages, extracts text items, and joins them. All text then passes through `normalizeWhitespace` which replaces carriage returns, collapses multiple spaces, and trims the result.

### Example Tracking
*   **Sentence A (Raw Input):** "I appreciated the careful attention to daylight and the sun path."
*   **A* (Explanation):** Captured from the raw text stream and normalized to remove carriage returns and double spaces.
*   **Sentence B (Raw Input):** "The geometry creates unique light conditions; indirect lighting and shadows form a serene atmosphere."
*   **B* (Explanation):** Captured from the raw text stream and normalized to remove carriage returns and double spaces.
*   **State (Normalized Text):** A single contiguous string containing the full text of all jurors, with consistent `\n` line endings and no double spaces. (e.g., `"Sarah Broadstock\nI appreciated the careful attention to daylight and the sun path."`).

---

## Step 2: Juror Segmentation
**Plain Language:** The system identifies who said what by looking for juror names as headers.

**Technical Detail:** The system employs a heuristic `looksLikeName` function that analyzes lines for specific metadata patterns: it checks for a word count between 2 and 5, proper capitalization of each word, absence of trailing punctuation (like periods or colons), and a total length between 6 and 60 characters. A look-ahead mechanism confirms a line is a header if the subsequent non-empty line does *not* look like another name, allowing for robust segmentation of different juror comments into discrete `JurorBlock` objects.

**Location:** `lib/segmentation/juror-segmenter.ts` (`segmentByJuror`, `looksLikeName`)

### Explanation
The segmenter splits the text by lines and uses `looksLikeName` to find potential headers (checking for capitalization patterns and length). It flushes a buffer whenever a new name is found, assigning the collected text to the previous name. Small stray blocks are merged into an "Unattributed" category.

### Example Tracking
*   **Thought A:** "I appreciated the careful attention to daylight and the sun path. The proposal is strong in its narrative, but the site response could be clearer. The plan feels tight and circulation could be improved."
*   **A* (Explanation):** Grouped into Sarah Broadstock's block after identifying her name as a header using the `looksLikeName` heuristic.
*   **Thought B:** "The geometry creates unique light conditions; indirect lighting and shadows form a serene atmosphere. The sustainability strategy would benefit from clearer explanation."
*   **B* (Explanation):** Grouped into Sandra Baggerman's block after identifying her name as a header using the `looksLikeName` heuristic.
*   **State (Full Juror Blocks):**
```json
[
  { 
    "juror": "Sarah Broadstock", 
    "text": "I appreciated the careful attention to daylight and the sun path. The proposal is strong in its narrative, but the site response could be clearer. The plan feels tight and circulation could be improved." 
  },
  { 
    "juror": "Sandra Baggerman", 
    "text": "The geometry creates unique light conditions; indirect lighting and shadows form a serene atmosphere. The sustainability strategy would benefit from clearer explanation." 
  }
]
```

---

## Step 3: Sentence Splitting
**Plain Language:** Large blocks of juror text are broken down into individual sentences.

**Technical Detail:** The segmentation process uses a sophisticated regex-based splitting strategy: `(?<=[.!?])\s+(?=[A-Z(""'])`. This regex looks for punctuation (period, exclamation, or question mark) followed by whitespace, but only triggers a split if the next character is a capital letter or an opening quote, which prevents splitting on abbreviations like "St." or "Init.". Additionally, the system performs a secondary split on semicolons (`;`) to isolate individual architectural critiques that are often joined in complex sentences.

**Location:** `lib/nlp/sentence-splitter.ts` (`sentenceSplit`)

### Explanation
The splitter identifies sentence boundaries while preserving fragments. It specifically looks for punctuation followed by spaces and a capital letter. It also treats semicolons as secondary split points to handle complex architectural critiques. Very short boilerplate fragments are pruned.

### Example Tracking
*   **Thought A:** "I appreciated the careful attention to daylight and the sun path."
*   **A* (Explanation):** Isolated as the first sentence (`Sarah Broadstock::0`) of Sarah's block.
*   **Thought B (Segment 1):** "The geometry creates unique light conditions"
*   **B1* (Explanation):** Isolated as the first segment (`Sandra Baggerman::0`) of Sandra's sentence, split at the semicolon.
*   **Thought B (Segment 2):** "indirect lighting and shadows form a serene atmosphere."
*   **B2* (Explanation):** Isolated as the second segment (`Sandra Baggerman::1`) of Sandra's sentence.
*   **State (Sentence Records):**
```json
[
  { "id": "Sarah Broadstock::0", "juror": "Sarah Broadstock", "sentence": "I appreciated the careful attention to daylight and the sun path." },
  { "id": "Sandra Baggerman::0", "juror": "Sandra Baggerman", "sentence": "The geometry creates unique light conditions" },
  { "id": "Sandra Baggerman::1", "juror": "Sandra Baggerman", "sentence": "indirect lighting and shadows form a serene atmosphere." }
]
```

---

## Step 4: Stance Classification
**Plain Language:** Each sentence is tagged as praise, critique, a suggestion, or neutral.

**Technical Detail:** The classification engine uses a rule-based priority system that matches sentence content against three distinct keyword sets: `PRAISE_MARKERS`, `CRITIQUE_MARKERS`, and `SUGGESTION_PATTERNS` (regex). A sentence is categorized by checking for explicit critique markers first, then suggestion patterns (using modals like "could" or "should"), and finally praise markers; this hierarchical approach ensures that even if a sentence contains praise, any actionable critique or suggestion is surfaced as the primary stance.

**Location:** `lib/nlp/stance-classifier.ts` (`stanceOfSentence`), `constants/nlp-constants.ts`

### Explanation
The classifier searches for markers defined in constants. Critiques take priority over praise, and suggestions (identified by modals like "could" or "should") often override simple critiques.
*   **Formula:** `Priority: Critique > Suggestion > Praise > Neutral`

### Example Tracking
*   **Sentence A:** "I appreciated the careful attention to daylight and the sun path."
*   **A* (Explanation):** Classified as **praise** due to the presence of the marker "appreciated" from the `PRAISE_MARKERS` list.
*   **Sentence B1:** "The geometry creates unique light conditions"
*   **B1* (Explanation):** Classified as **praise** due to the presence of the marker "unique" from the `PRAISE_MARKERS` list.
*   **Sentence B2:** "indirect lighting and shadows form a serene atmosphere."
*   **B2* (Explanation):** Classified as **praise** due to the presence of the marker "serene" from the `PRAISE_MARKERS` list.
*   **State (Annotated Records):**
```json
[
  { 
    "id": "Sarah Broadstock::0", 
    "sentence": "I appreciated the careful attention to daylight and the sun path.", 
    "stance": "praise" 
  },
  { 
    "id": "Sandra Baggerman::0", 
    "sentence": "The geometry creates unique light conditions", 
    "stance": "praise" 
  },
  { 
    "id": "Sandra Baggerman::1", 
    "sentence": "indirect lighting and shadows form a serene atmosphere.", 
    "stance": "praise" 
  }
]
```

---

## Step 5: N-gram Extraction
**Plain Language:** The system finds important pairs or triplets of words that represent key themes.

**Technical Detail:** The extraction process works in three stages: First, the sentence is tokenized into individual words (lowercased, special characters removed, minimum length 2 characters). These tokens include stopwords like "the" and "and". Second, the system generates all possible bigrams (2-word sequences) and trigrams (3-word sequences) using a sliding window. Third, n-grams are filtered to remove those that consist entirely of stopwords or that start/end with a stopword (e.g., "the daylight" is rejected because it starts with "the", while "sun path" is accepted). This three-stage process ensures that only high-value semantic phrases are retained for analysis.

**Location:** `lib/nlp/ngram-extractor.ts` (`extractNgrams`), `lib/analysis/bm25.ts` (`buildBM25`)

### Explanation
The process first tokenizes (keeping all words including stopwords), then generates all n-grams, then filters out low-value n-grams. N-grams that consist entirely of stopwords or start/end with stopwords are discarded to keep only high-entropy phrases that capture specific architectural concepts.

### Example Tracking
*   **Sentence A:** "I appreciated the careful attention to daylight and the sun path."
*   **A (Tokens - All Words):** `["i", "appreciated", "the", "careful", "attention", "to", "daylight", "and", "the", "sun", "path"]`
*   **A (All Bigrams Generated):** `["i appreciated", "appreciated the", "the careful", "careful attention", "attention to", "to daylight", "daylight and", "and the", "the sun", "sun path"]`
*   **A (All Trigrams Generated):** `["i appreciated the", "appreciated the careful", "the careful attention", "careful attention to", "attention to daylight", "to daylight and", "daylight and the", "and the sun", "the sun path"]`
*   **A* (Explanation):** After filtering out n-grams that start/end with stopwords: Bigrams kept `["careful attention", "sun path"]` (10 total, 8 filtered). Trigrams kept `["appreciated the careful", "attention to daylight"]` (9 total, 7 filtered). Final result: `["careful attention", "sun path", "appreciated the careful", "attention to daylight"]`.

*   **Sentence B1:** "The geometry creates unique light conditions"
*   **B1 (Tokens - All Words):** `["the", "geometry", "creates", "unique", "light", "conditions"]`
*   **B1 (All Bigrams Generated):** `["the geometry", "geometry creates", "creates unique", "unique light", "light conditions"]`
*   **B1 (All Trigrams Generated):** `["the geometry creates", "geometry creates unique", "creates unique light", "unique light conditions"]`
*   **B1* (Explanation):** After filtering out n-grams that start/end with stopwords: Bigrams kept `["geometry creates", "unique light", "light conditions"]` (5 total, 2 filtered: "the geometry", "creates unique"). Trigrams kept `["geometry creates unique", "creates unique light", "unique light conditions"]` (4 total, 1 filtered: "the geometry creates"). Final result: `["geometry creates", "unique light", "light conditions", "geometry creates unique", "creates unique light", "unique light conditions"]`.

*   **Sentence B2:** "indirect lighting and shadows form a serene atmosphere."
*   **B2 (Tokens - All Words):** `["indirect", "lighting", "and", "shadows", "form", "a", "serene", "atmosphere"]`
*   **B2 (All Bigrams Generated):** `["indirect lighting", "lighting and", "and shadows", "shadows form", "form a", "a serene", "serene atmosphere"]`
*   **B2 (All Trigrams Generated):** `["indirect lighting and", "lighting and shadows", "and shadows form", "shadows form a", "form a serene", "a serene atmosphere"]`
*   **B2* (Explanation):** After filtering out n-grams that start/end with stopwords: Bigrams kept `["indirect lighting", "serene atmosphere"]` (7 total, 5 filtered: "lighting and", "and shadows", "shadows form", "form a", "a serene"). Trigrams kept `["lighting and shadows", "shadows form a", "form a serene"]` (6 total, 3 filtered: "indirect lighting and", "a serene atmosphere"). Final result: `["indirect lighting", "serene atmosphere", "lighting and shadows", "shadows form a", "form a serene"]`.

*   **State (N-gram Vocabulary):** A `Map<string, string[]>` where keys are sentence IDs and values are arrays of unique filtered bigrams and trigrams used for frequency analysis.

---

## Step 6: Semantic Embeddings
**Plain Language:** Sentences are converted into a list of numbers that represent their underlying meaning.

**Technical Detail:** The system leverages the `Xenova/all-MiniLM-L6-v2` transformer model via the Transformers.js library. This model maps each sentence into a 384-dimensional vector space where the spatial distance between vectors correlates with semantic similarity. Each raw vector produced by the model is subsequently processed through an L2 normalization function, ensuring that every embedding has a unit length of 1.0, which is a prerequisite for accurate cosine similarity calculations in the clustering stage.

**Location:** `lib/analysis/sentence-embeddings.ts` (`embedSentences`)

### Explanation
Using the Xenova/Transformers library, the model performs "feature extraction." Each sentence is mapped to a vector in high-dimensional space where "closer" vectors (by cosine similarity) represent similar meanings.
*   **Formula:** $V_{normalized} = \frac{V}{\|V\|}$

### Example Tracking
*   **Sentence A:** "I appreciated the careful attention to daylight and the sun path."
*   **A* (Explanation):** The transformer model generates a unit vector representing the architectural meaning of "daylight" and "sun path".
*   **Sentence B1:** "The geometry creates unique light conditions"
*   **B1* (Explanation):** The model encodes the concept of "unique light conditions" into high-dimensional space.
*   **Sentence B2:** "indirect lighting and shadows form a serene atmosphere."
*   **B2* (Explanation):** The model encodes "indirect lighting" and "serene atmosphere" into high-dimensional space.
*   **State (Semantic Vectors):** Each sentence record now has an associated 384-dimensional unit vector. Example for `Sarah Broadstock::0`: `[0.012, -0.045, 0.089, 0.023, -0.011, 0.056, -0.034, 0.019]` (truncated, total 384 values).

---

## Step 7: BM25 Frequency Vectors
**Plain Language:** Sentences are also represented by how many important words they share with other jurors.

**Technical Detail:** This step builds a document-frequency model where each "document" is a complete juror's block of text. The system calculates an Inverse Document Frequency (IDF) for every n-gram in the corpus, specifically using a modified scoring function ($log(1 + df/N) + 1$) that prioritizes phrases appearing across *different* jurors rather than just within a single comment. This produces a sparse frequency vector for each sentence that highlights unique architectural themes that are shared by multiple experts.

**Location:** `lib/analysis/bm25.ts` (`buildBM25`)

### Explanation
Unlike standard TF-IDF, this implementation prioritizes n-grams that appear across *multiple* jurors to surface "common values." It calculates an Inverse Document Frequency (IDF) where "Document" = "Juror Block."
*   **Formula:** $score(t, D) = IDF(t) \cdot \frac{f(t, D) \cdot (k_1 + 1)}{f(t, D) + k_1 \cdot (1 - b + b \cdot \frac{|D|}{avgdl})}$

### Example Tracking
*   **Sentence A:** "I appreciated the careful attention to daylight and the sun path."
*   **A* (Explanation):** The vector receives non-zero weights for "sun path" because other jurors also discussed solar orientation.
*   **Sentence B1:** "The geometry creates unique light conditions"
*   **B1* (Explanation):** The vector receives high weights for "light conditions", a frequent theme in the corpus.
*   **Sentence B2:** "indirect lighting and shadows form a serene atmosphere."
*   **B2* (Explanation):** The vector receives high weights for "serene atmosphere", reflecting shared values across juror blocks.
*   **State (Frequency Vectors):** A `Float64Array` for each sentence with a length equal to the size of the n-gram vocabulary (e.g., `[0.0, 0.45, 0.0, 0.12, 0.0, 0.0, 0.33]`).

---

## Step 8: Hybrid Vector Construction
**Plain Language:** The semantic meaning and the word frequencies are combined into one master "fingerprint."

**Technical Detail:** The system performs a weighted concatenation of the 384-dimensional semantic embedding and the variable-length BM25 frequency vector. Each component is multiplied by its respective user-defined weight (`semanticWeight` and `frequencyWeight`) to control the influence of "meaning" versus "exact wording." The resulting high-dimensional vector is then re-normalized to unit length using L2 normalization, creating a final "hybrid" representation that the clustering algorithm can use to find groups that are both semantically and lexically similar.

**Location:** `lib/analysis/hybrid-vectors.ts` (`buildHybridVectors`)

### Explanation
This step blends "what it means" (Semantic) with "what words it uses" (Frequency). The user can adjust the balance via `semanticWeight` and `frequencyWeight` parameters.
*   **Formula:** $V_{hybrid} = Normalize([w_{sem} \cdot V_{sem}, w_{freq} \cdot V_{freq}])$

### Example Tracking
*   **Sentence A:** "I appreciated the careful attention to daylight and the sun path."
*   **A* (Explanation):** Semantic and frequency vectors are concatenated using a 0.7/0.3 weighting scheme to prioritize underlying meaning over specific words.
*   **Sentence B1:** "The geometry creates unique light conditions"
*   **B1* (Explanation):** Combined into a single unit-length vector that captures both the architectural concept and the specific terminology.
*   **Sentence B2:** "indirect lighting and shadows form a serene atmosphere."
*   **B2* (Explanation):** Combined into a single unit-length vector that captures both the architectural concept and the specific terminology.
*   **State:** A final `Float64Array[]` containing one normalized hybrid vector for every sentence in the corpus. (Length: $384 + |Vocab|$).

---

## Step 9: Clustering
**Plain Language:** Similar sentences from all jurors are grouped together into "Concepts."

**Technical Detail:** The system supports multiple clustering algorithms, all governed by a **strict deterministic pipeline** to ensure reproducible results.

**Hierarchical Clustering (Default):** The system uses agglomerative hierarchical clustering as the default method, which builds a complete dendrogram tree of all possible cluster merges. This method is inherently deterministic as it relies on calculating distances between all pairs of vectors using cosine similarity.
- **Cut by Count:** The dendrogram is cut to produce exactly $K$ clusters (default mode).
- **Cut by Granularity:** The dendrogram is cut at a distance threshold determined by a granularity percentage (0-100%), allowing the number of concepts to emerge naturally.

**K-Means Clustering (Optional):** The system also supports K-Means clustering tailored for high-dimensional cosine similarity. It initializes $K$ centroids using a **seeded pseudo-random number generator (PRNG)** derived from the user's "Solution Seed". This ensures that for a given seed, the initial "picks" are always identical. The algorithm then iteratively performs two sub-steps: Assignment, where each sentence vector is assigned to the cluster with the highest cosine similarity to its centroid; and Update, where each centroid is re-calculated as the normalized average of all vectors assigned to it. This process continues for up to 25 iterations or until assignments stop changing.

**Auto-K Recommendation (Default: Enabled):** When enabled, the system automatically evaluates a range of cluster counts ($K_{min}$ to $K_{max}$) and recommends an optimal value based on separation metrics. This helps users identify the most appropriate number of concepts for their data.

**Soft Membership (Default: Enabled):** By default, sentences can belong to multiple concepts with fractional weights (top-$N$ concepts, default $N=2$). This allows for more nuanced representation where sentences can be partially associated with multiple themes, reflecting the natural overlap in architectural discourse.

**Location:** `lib/analysis/kmeans.ts` (`kmeansCosine`), `lib/analysis/hierarchical-clustering.ts` (`buildDendrogram`, `cutDendrogramByCount`, `cutDendrogramByThreshold`), `lib/analysis/cluster-eval.ts` (`evaluateKRange`), `lib/analysis/soft-membership.ts` (`computeSoftMembership`)

### Explanation
**Hierarchical:** The algorithm builds a complete tree of all possible merges, then cuts it at a chosen level. This allows exploration of the data at different granularities—you can "zoom in" to see fine distinctions or "zoom out" to see broader themes. The granularity-based approach is particularly intuitive for exploring how concepts naturally emerge at different scales.

**K-Means:** The algorithm iteratively assigns sentences to the nearest cluster center (centroid) and recomputes the centers until they stabilize. This effectively discovers emergent themes like "Lighting" or "Circulation" without being told what they are.

**Soft Membership:** When enabled, sentences are assigned to their top-$N$ most similar concepts with normalized weights. This creates a more nuanced graph where jurors can have partial associations with multiple concepts, better reflecting the complexity of architectural feedback.

### Example Tracking
*   **Sentence A:** "I appreciated the careful attention to daylight and the sun path."
*   **A* (Explanation):** Clustered into **Concept 2** because its hybrid vector is closest to the centroid representing "Daylight" and "Sun path".
*   **Sentence B1:** "The geometry creates unique light conditions"
*   **B1* (Explanation):** Clustered into **Concept 2** because it shares the "Light conditions" theme with other sentences.
*   **Sentence B2:** "indirect lighting and shadows form a serene atmosphere."
*   **B2* (Explanation):** Clustered into **Concept 2** because it shares the "Atmosphere" and "Light" theme.
*   **State (Assignments):** `assignments: [2, 2, 2, 0, 5, 2, 1]` (array of cluster indices for all sentences in the corpus).

**Note:** When using hierarchical clustering with granularity-based cutting, the number of clusters ($K$) is determined dynamically based on the selected threshold, allowing the number of concepts to emerge naturally rather than being predetermined. When soft membership is enabled, sentence assignments include fractional weights across multiple concepts, which are then aggregated when computing juror-concept relationships.

---

## Step 10: Concept Labeling
**Plain Language:** The system gives each concept a name based on its most representative words.

**Technical Detail:** Once clusters are formed, the system analyzes the "Frequency" portion of each hybrid centroid to identify the n-grams with the highest collective weights. It extracts the top 2 to 4 n-grams and semantic terms, performs a deduplication check to ensure labels like "light" and "light conditions" don't both appear, and joins the remaining high-value terms using a bullet separator (" · "). This results in a human-readable label that summarizes the dominant architectural theme of that specific cluster.

**Location:** `lib/analysis/hybrid-concept-labeler.ts` (`hybridLabelCluster`), called from `lib/graph/graph-builder.ts` (around lines 179-184)

### Explanation
The labeler looks at the "Frequency" portion of the hybrid centroid to pick out the most important BM25 n-grams. It joins the top 2-4 terms with " · " to create a readable label.

### Example Tracking
*   **Concept 2 (Analysis):** The centroid is analyzed to find the terms with the highest collective weights: "daylight" (semantic) and "light conditions" (n-gram).
*   **Label Generation:** The system joins the top terms with a " · " separator to describe the discovered theme.
*   **Final Label:** "daylight · light conditions · sun path"
*   **State:** `conceptLabel: Map("concept:2" -> "daylight · light conditions · sun path")`

---

## Step 11: Juror-Concept Mapping
**Plain Language:** We calculate how much each juror cares about each concept.

**Technical Detail:** The system builds a weight matrix by aggregating sentence assignments from each juror to each concept. When soft membership is enabled, it sums the fractional weights from each sentence's concept memberships; otherwise, it counts the number of sentences assigned to each concept. These values are then normalized per juror: if a juror wrote 10 sentences and their total concept weights sum to 4.0 (either from 4 hard assignments or from fractional soft memberships), the normalized weight for that Juror→Concept edge is 0.4. This creates a relative influence score that accounts for the varying lengths of juror comments, ensuring that a juror who wrote a single long paragraph has a proportional impact compared to one who wrote several short notes.

**Location:** `lib/graph/graph-builder.ts` (around lines 210-237)

### Explanation
If Sarah Broadstock has 10 sentences and 3 are in the "Lighting" concept, her weight for that concept is 0.3. These weights become the "edges" in the graph.

### Example Tracking
*   **Sarah Broadstock:** Directed to `concept:2` because 33.3% of her feedback was about daylight and the sun path.
*   **Sandra Baggerman:** Directed to `concept:2` because 66.6% of her feedback focused on lighting conditions and atmosphere.
*   **State (Normalized Weights per Juror):**
```json
{
  "Sarah Broadstock": { "concept:2": 0.3333333333333333 },
  "Sandra Baggerman": { "concept:2": 0.6666666666666666 }
}
```

---

## Step 11.5: High-Dimensional Juror Vectors and Top Terms Extraction
**Plain Language:** For each juror, we compute a high-dimensional vector representing their thematic focus and extract the most important terms that describe what they care about.

**Technical Detail:** This combined step performs two related operations in a single loop for efficiency. First, for each juror, the system calculates a weighted average of all concept centroids using the normalized juror-concept weights from Step 11, then L2-normalizes the result to create a high-dimensional vector: $V_{juror} = Normalize(\Sigma_{c \in concepts} weight_{juror}[c] \times centroid[c])$. This vector represents the juror's position in the same semantic space as the concept centroids. Second, using the same `getClusterTopTerms()` function applied to concept centroids (Step 10), the system extracts the top 12 terms from each juror's high-dimensional vector by analyzing both the semantic portion (384 dimensions) and the frequency portion (n-gram vocabulary). These terms provide a human-readable summary of each juror's thematic interests, displayed in the inspector panel when a juror node is selected.

**Location:** `lib/graph/graph-builder.ts` (around lines 239-274), `lib/analysis/hybrid-concept-labeler.ts` (`getClusterTopTerms`)

### Explanation
This step makes explicit the high-dimensional representation of each juror by combining their concept interests into a single vector, then extracts meaningful terms from that vector. The weighted average combines semantic and frequency information from all concepts a juror discussed, creating a comprehensive representation of their interests. The term extraction uses the same methodology as concept labeling (Step 10), ensuring consistency in how themes are identified.

**Formula:** $V_{juror} = Normalize(\Sigma_{c \in concepts} weight_{juror}[c] \times centroid[c])$

### Example Tracking
*   **Sarah Broadstock:** Her high-dimensional vector is computed as $0.333 \times centroid[concept:2] + 0.667 \times centroid[concept:0]$ (assuming she also discussed another concept), then top terms like `["daylight", "sun path", "careful attention", "site response", "circulation"]` are extracted from this vector.
*   **Sandra Baggerman:** Her high-dimensional vector is computed as $0.666 \times centroid[concept:2] + 0.334 \times centroid[concept:5]$ (assuming another concept), then top terms like `["light conditions", "serene atmosphere", "indirect lighting", "geometry", "shadows"]` are extracted.
*   **State (Juror High-Dimensional Vectors and Top Terms):** Each juror now has an associated high-dimensional hybrid vector (same dimensionality as concept centroids, typically 384 + n-gram vocabulary size) and a `Record<string, string[]>` mapping juror names to arrays of top terms, stored in `AnalysisResult.jurorTopTerms`.

---

## Step 11.1: Juror Node Construction
**Plain Language:** The final juror "nodes" are created, combining their name, their position, and their thematic summary.

**Technical Detail:** This step synthesizes the outputs of the juror flow to create the final `GraphNode` objects. Each node contains:
- **Identifier:** The juror's name (Step 2.1)
- **Position:** The (x, y, z) coordinates calculated in Step 13.2
- **Thematic Summary:** The top terms extracted from their high-dimensional vector in Step 11.5
- **Metadata:** Sizing information based on their total sentence count

**Location:** `lib/graph/graph-builder.ts` (around lines 309-323)

---

## Step 12: Link Construction
**Plain Language:** The system creates the lines connecting jurors to concepts and to each other.

**Technical Detail:** The system generates three types of graph links: `jurorConcept` links represent direct mentions and are assigned a dominant "stance" (praise, critique, etc.) based on the majority stance of the supporting sentences; `jurorJuror` links are created if the cosine similarity between two jurors' concept vectors exceeds a user-defined threshold; and `conceptConcept` links are similarly created based on the similarity between cluster centroids. Each link is assigned a `weight` and a set of `evidenceIds` that allow the UI to show the specific sentences justifying the connection.

**Location:** `lib/graph/projections.ts` (`buildJurorSimilarityLinks`, `buildConceptSimilarityLinks`), `lib/graph/graph-builder.ts` (around lines 340-380)

### Explanation
Links are created if the weight exceeds a threshold. "Juror-Juror" links are created if two jurors talk about the same concepts in similar proportions (computed via cosine similarity of their concept vectors).

### Example Tracking
*   **Link 1 (Sarah ↔ Concept 2):** A connection is drawn representing her praise for daylight, with a weight of 0.333.
*   **Link 2 (Sandra ↔ Concept 2):** A stronger connection is drawn representing her praise for light conditions, with a weight of 0.666.
*   **Link 3 (Sarah ↔ Sandra):** A similarity link is drawn between the two jurors because they both prioritized the "Daylight" concept in their critiques.
*   **State:** A flat array of `GraphLink` objects ready for the 3D force simulation engine.

---

## Step 13: 3D Position Calculation
**Plain Language:** All nodes (concepts and jurors) are placed in a 3D space so that similar items are close together.

**Technical Detail:** The `computeNode3DPositions()` function computes 3D coordinates for both concept and juror nodes in a single unified process. This process is **strictly faithful to the data**, with no artificially induced jitter or random offsets.

**Location:** `lib/graph/dimensionality-reduction.ts` (`computeNode3DPositions`), called from `lib/graph/graph-builder.ts`

### Step 13.1: Concept 3D Positions
Concept nodes are placed at the PCA-projected coordinates of their high-dimensional centroids. The system uses a custom Principal Component Analysis (PCA) implementation with the Power Iteration method. To ensure absolute visual stability, the iteration is initialized with a **constant unit vector** rather than a random one. This ensures that the graph orientation (which concepts are "left" vs "right") is perfectly stable across runs for the same data.

**Location:** `lib/graph/dimensionality-reduction.ts` (`reduceTo3D`)

### Step 13.2: Juror 3D Positions
Juror nodes are positioned using a **pure mathematical weighted average** of the concept 3D positions. For each juror, the system computes: $Position_{juror} = \frac{\Sigma(weight[concept] \times position[concept])}{\Sigma(weight[concept])}$. Any previous "jitter" used for visualization has been removed to ensure the coordinates are 100% data-driven. If two jurors share the exact same thematic profile, they will appear at the exact same coordinate.

### Explanation
The unified positioning approach ensures that both concept and juror nodes exist in the same coordinate system. Concepts serve as semantic anchors established through PCA projection, while jurors are positioned relative to those anchors based on their interest patterns. This creates a coherent spatial representation where jurors "float" near the themes they discussed most.

### Example Tracking
*   **Concept 2 (13.1 - PCA Projection):** The centroid `[0.012, -0.045, 0.089, ...]` (384+ dimensions) is projected onto the top 3 principal components, resulting in 3D coordinates like `{ x: 1.45, y: -2.12, z: 0.88 }`.
*   **Sarah Broadstock (13.2 - Weighted Average):** Her position is computed as a weighted average of concept positions, primarily influenced by Concept 2's position due to her 0.333 weight on that concept.
*   **Sandra Baggerman (13.2 - Weighted Average):** Her position is computed as a weighted average, with stronger influence from Concept 2 (0.666 weight) than other concepts.
*   **State:** Every `GraphNode` (both concept and juror) now has `x`, `y`, and `z` properties populated for the WebGL renderer.

---

## Step 14: Graph Assembly
**Plain Language:** All the parts are packaged into a final data structure for the 3D visualization.

**Technical Detail:** The final step involves aggregating all computed data into a single `AnalysisResult` object. This includes the array of `GraphNode` objects (each with 3D coordinates, labels, and metadata), the `GraphLink` objects (with weights and stance types), and the original `SentenceRecord` objects which act as evidence. The result also includes summary statistics (like total sentence and concept counts) and analysis checkpoints, which allow the frontend to render the interactive 3D force-directed graph with full traceability from node to raw text.

**Location:** `lib/graph/graph-builder.ts` (`buildAnalysis`)

### Explanation
The final object contains all jurors, concepts, sentence records, and graph elements. This is what the frontend receives to render the interactive 3D force-directed graph.

### Example Tracking
*   **Simulation Data:** All nodes (Jurors and Concepts) and links are bundled into a final data package.
*   **Final Output:** The `AnalysisResult` JSON is sent to the browser to render the 3D interaction.
*   **Interaction:** Clicking "Sarah Broadstock" in the UI now highlights the concept "daylight · light conditions" and reveals her specific sentence as evidence. The inspector panel displays her thematic focus summary (from Step 11.5) and her 3D proximity to themes (Step 13.2).
*   **State:** Final `AnalysisResult` JSON containing the complete mapped network of 7 jurors and 10 themes, including `jurorTopTerms` with high-dimensional vector-derived term summaries for each juror (Step 11.1).
