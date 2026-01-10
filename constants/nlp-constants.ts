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

export const SUPPORTED_MODELS = [
  "GPT-5.1",
  "GPT-5",
  "GPT-4.1",
  "GPT-4.1 mini",
  "GPT-4.1-nano",
  "GPT-4o-mini",
];

export const DEFAULT_MODEL = "GPT-4.1 mini";

export const DEFAULT_SAMPLE = `
Sarah Broadstock
Starting with the concave roof, this team's design analysed the light levels to coincide room types with desirable light levels.
A great example of a strong initial concept being carried through to the final proposal, through a technical process of light analysis.
The designs reverence for the sun is clear and compelling, with the central space and rotating doors thoughtfully resolved in terms of light and circulation.
The absence of a clear location makes it difficult to assess the practicalities of the home.
A more balanced integration of technical resolution alongside the poetic narrative would have strengthened the proposal and elevated its overall impact.
This urban interpretation of the brief is well considered, addressing the complexities of a denser context.
The physical model is a strong addition; its impact could have been greater if used to demonstrate sun paths and daylight within internal spaces.
“Dancing Flow” showcases strong architectural expression through its free-form internal arrangement, and its external walls visually complemented the design, adding a pragmatic touch.
The beautifully rendered proposal demonstrates a genuine desire to create something outstanding.
I would love to live in this house and feel this would be a deserving winner.
This stood out for its incredibly strong architectural expression.
I was looking for proposals which allowed the quality and path of light to shape the inhabitants lifestyle.
Additionally, I looked for designs that offered flexibility without compromising architectural integrity.
This entry ticked all those boxes.
The quality and warmth of the internal living spaces could have been developed further to ensure that this would be an enjoyable home to live in.
The influence of Ryue Nishizawa was evident, and well adapted to the brief.

Sandra Baggerman
A beautiful design where geometry effortlessly facilitates optimal light conditions while embracing views, materials, climate, and programmatic function.
The result is a great atmosphere that feels both serene and dynamic.
The simplicity of the design is deceptive, as it is both powerful and deeply considered.
The thoughtful graphic presentation further enhances the clarity of the concept, making the project truly stand out.
A centered and well-organized layout establishes a clear sequence and hierarchy, enhanced by the use of light, indirect lighting, and shadows.
The design thoughtfully incorporates views, creating a serene and balanced atmosphere that feels both open and inviting.
The design exudes serenity and simplicity in a pure and powerful way.
Seemingly simple, the proposal showcases carefully proportioned and curated spaces in terms of scale, openness, and light conditions.
A clever and sophisticated approach to the roofs openness and varying transparency creates unique light conditions, allowing indirect light to enter and cast shadows.
This enchanting design emphasizes the simple beauty of material, light, and proportion, reflecting a strong commitment to sustainability.

Thongchai Chansamak
The project presents well the theme of darkness and lightness in relation to time and space.
It's good that the project has clear bright areas and dark areas.
If the author made more contrast, it would be perfect.

Ophélie Herranz
The project demonstrates a poetic design intent by emphasizing the dynamic interaction of light and shadow through architectural elements, particularly in Jinju, South Korea, where the consistent sunlight is well-utilized.
The innovative use of curved walls and the "lighting zone" concept showcases creativity and sustainability, optimizing natural light and energy efficiency.
While the narrative is engaging and the design functional, clearer explanations of sustainable features would enhance the project's impact, making it a strong yet improvable submission.
The project communicates a poetic design intent, emphasizing synchronization between the sun's path and the flow of life through concentric circles and a maze-like structure inspired by Mesopotamian architecture.
The design's aesthetics and innovation are noteworthy, with a unique blend of historical and modern principles creating a visually striking interplay of light and shadow.
While the project shows thoughtful consideration of form and context, clearer explanations of functionality, more site-specific details, and additional sustainable features would enhance its impact, making it a strong yet improvable submission.
The project excels across all criteria, demonstrating exceptional communication of design intent by clearly outlining the central role of light as an organizing principle.
The site selection showcases a profound understanding of complex terrains, where light and habitat coexist in a sophisticated and contextually responsive manner.
The design is aesthetically visually striking and innovative, with the use of light as a structural element creating a groundbreaking and pleasing form.
The project also shows a strong commitment to sustainability, addressing challenges of limited natural light and optimizing light distribution to reduce environmental impact.

Patcharada Inplang
The memory of light from different sources blends well with the architecture.
This project is especially connected to its local site, allowing a deep understanding of the context.
While the exterior features many elements of light, the interior is imagined as a space filled with atmospheric memories—created through intentional lighting design that shapes the feeling of each room.
A clever but simple layer design from a single-structure support with different filtered daylight across the whole day.
The plan is also rooted in the surrounding nature and knowhow.

Nikita Morell
I believe the house feels alive, responding to celestial rhythms in a way that makes everyday actions - such as waking, resting, gathering and feel connected to something bigger.
The circular form is very deeply calming, and reflects the cycles of day and night.
I really appreciate the story behind this project because I'm a copywriter, after all.
I love when a project goes beyond just designing spaces and actually tells a story.
The rotating doors are a brilliant touch: not just as a functional way to modulate privacy, but as a way to physically interact with light.
Shadows arent just cast; they move, evolve, and become part of the experience.
Beautiful lines and interplay of light and shadow.
I really like the name of the project and how it tells a story as well ie. contains the emotions of the day.
Great consideration of the positioning of the sun and it's emotional impact on the space.
I love the story behind this project.
It fits beautifully into the surrounding environment.

Blake T. Smith
This project thoughtfully incorporates courtyard to invite light into different spaces at appropriate times of the day.
The use of textured, neutral materials enhances the play of light and their robust nature contrasts with the lush greenery.
By sinking the home into the ground and creating lightwells at the periphery, light is further choreographed throughout the day.
From the outside, the home looks quite simple, but the openings in the roof suggest the intense richness of spaces found inside.
By allowing the timber framing to continue below the skylights, the play of light is dramatized and adds depth to all of the interior spaces.
The use of water and greenery to break up the interior spaces creates a meditative experience while the play of light dances around the rooms.
The construction method, passive strategies and thatched roof evoke a sense of place.
Partition height and proximity to enclosure are controlled to create a dynamic variety of light and darkness throughout the day.
The undulating walls, disconnected at times from the roof, give the home a feeling of living inside a functional sculpture.
The layout is very beautiful, and the logic is clear.
However, spaces such as the living room and kitchen are crammed in favor of overly generous circulation space.
A few simple radii adjustments would solve those concerns.
The singular spiral gesture is a beautiful and simple move that works in conjunction with the solar path to create a diversity of experience.
Light and shadow are invited into the home in poetic and thoughtful manners based on program and orientation, clearly illustrated by the diagrams.
The interior spaces as rendered are architecturally stunning.
However, the plan feels a bit tight and unresolved.
This home allows maximum light by wrapping the courtyard around the exterior and orienting the openings outward.
A perimeter wall frames the courtyard and creates privacy for all the open spaces.
Rotated walls spanning from inside to out are a clever device serving to divide the spaces and disrupt the radial grid of the home.
They are washed with light and shadow illuminating the interior while drawing one's eyes to the nature outside.
The interior spaces are generously and rationally laid out with custom enhancements such as a very large and luxurious pool, bath and sunken living room.
`.trim();

