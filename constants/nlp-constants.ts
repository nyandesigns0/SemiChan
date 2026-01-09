export const STOPWORDS = new Set(
  [
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "if",
    "then",
    "than",
    "so",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "as",
    "at",
    "by",
    "from",
    "into",
    "that",
    "this",
    "these",
    "those",
    "is",
    "are",
    "was",
    "were",
    "be",
    "being",
    "been",
    "it",
    "its",
    "they",
    "their",
    "them",
    "he",
    "she",
    "his",
    "her",
    "you",
    "your",
    "we",
    "our",
    "i",
    "me",
    "my",
    "not",
    "no",
    "yes",
    "very",
    "more",
    "most",
    "less",
    "least",
    "can",
    "could",
    "should",
    "would",
    "may",
    "might",
    "must",
    "also",
    "just",
    "really",
    "quite",
    "about",
    "over",
    "under",
    "between",
    "within",
    "without",
    "across",
    "through",
    "during",
    "before",
    "after",
    "while",
    "where",
    "when",
    "what",
    "which",
    "who",
    "whom",
    "because",
    "there",
    "here",
    "such",
    "some",
    "any",
    "each",
    "both",
    "either",
    "neither",
    "many",
    "much",
    "few",
    "one",
    "two",
    "three",
    "etc",
  ].map((s) => s.toLowerCase())
);

export const PRAISE_MARKERS = [
  "strong",
  "beautiful",
  "compelling",
  "excellent",
  "elegant",
  "poetic",
  "successful",
  "impressive",
  "thoughtful",
  "refined",
  "coherent",
  "clear",
  "innovative",
  "evocative",
  "powerful",
  "serene",
  "confident",
  "wonderful",
  "works well",
  "stands out",
];

export const CRITIQUE_MARKERS = [
  "unclear",
  "confusing",
  "weak",
  "lacking",
  "absence",
  "missing",
  "difficult",
  "problem",
  "issue",
  "fails",
  "does not",
  "doesn't",
  "too",
  "crammed",
  "overly",
  "inconsistent",
  "unresolved",
  "needs",
  "could be improved",
  "not enough",
];

export const SUGGESTION_PATTERNS = [
  /\bcould\b/i,
  /\bwould\b/i,
  /\bshould\b/i,
  /\bif\b/i,
  /\bit would be\b/i,
  /\bconsider\b/i,
  /\bneeds to\b/i,
  /\bneed to\b/i,
  /\bwould have\b/i,
];

export const DEFAULT_SAMPLE = `
Sarah Broadstock
I appreciated the careful attention to daylight and the sun path. The proposal is strong in its narrative, but the site response could be clearer. The plan feels tight and circulation could be improved.

Sandra Baggerman
The geometry creates unique light conditions; indirect lighting and shadows form a serene atmosphere. The sustainability strategy would benefit from clearer explanation.

Thongchai Chansamak
The contrast between darkness and lightness is compelling, but it should be stronger to heighten the spatial experience.

Ophélie Herranz
A poetic exploration of light and shadow with clear intent. Sustainable features are promising; however, functionality and site-specific details need more clarity.

Patcharada Inplang
Light as memory and atmosphere is a wonderful direction. The connection to the local site and filtered daylight throughout the day is effective.

Nikita Morell
The story-driven concept is powerful, mapping celestial rhythms into space. The interactive elements add depth, but some moments need clearer detail.

Blake T. Smith
Courtyards and lightwells create a layered experience of light. Strong materiality and passive strategies. The program is ambitious; the layout feels crammed and circulation is difficult.
`.trim();

