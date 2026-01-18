# SemiChan Implementation Architecture

This document provides a comprehensive overview of the SemiChan system architecture, technology stack, and implementation details.

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Data Flow](#data-flow)
7. [Design Patterns](#design-patterns)
8. [Build Configuration](#build-configuration)

---

## System Overview

SemiChan is a full-stack Next.js application that analyzes architectural jury feedback through semantic clustering with frequency-based labeling, generating interactive 3D visualizations of conceptual relationships.

### Core Principles

- **Separation of Concerns**: Clear boundaries between UI, business logic, and data processing
- **Type Safety**: Comprehensive TypeScript coverage across the entire codebase
- **Deterministic Processing**: Reproducible results through seeded algorithms and constant initialization
- **Client-Server Split**: Heavy computation on the server, interactive visualization on the client
- **Modular Design**: Domain-organized libraries with clear interfaces

---

## Technology Stack

### Runtime & Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | JavaScript runtime environment |
| **Next.js** | 14.0+ | React framework with App Router |
| **React** | 18.2+ | UI library for component-based architecture |
| **TypeScript** | 5.0+ | Static type checking and enhanced developer experience |

### Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **React Three Fiber** | 8.15+ | React renderer for Three.js (3D graph visualization) |
| **@react-three/drei** | 9.88+ | Helper components for R3F (Billboard, Text, Line, etc.) |
| **Three.js** | 0.160+ | WebGL-based 3D graphics library |
| **Tailwind CSS** | 3.3+ | Utility-first CSS framework |
| **lucide-react** | 0.300+ | Icon library |
| **Recharts** | 2.10+ | Charting library for data visualization |
| **d3-force** | 3.0+ | Force-directed graph simulation (legacy 2D mode) |
| **class-variance-authority** | 0.7+ | Component variant management |
| **tailwind-merge** | 2.0+ | Utility for merging Tailwind classes |

### Backend & Analysis Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **@xenova/transformers** | 2.17+ | Transformer.js for semantic embeddings (all-MiniLM-L6-v2 model) |
| **wink-bm25-text-search** | 3.1+ | BM25 algorithm for frequency-based text analysis |
| **pdfjs-dist** | 3.11+ | PDF parsing and text extraction |
| **puppeteer-core** | 24.34+ | Headless Chrome for PDF generation |
| **@sparticuz/chromium** | 143.0+ | Chromium binary for serverless PDF export |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 8.0+ | Code linting with Next.js config |
| **PostCSS** | 8.4+ | CSS processing |
| **Autoprefixer** | 10.4+ | CSS vendor prefixing |

---

## Architecture Layers

The application is organized into distinct layers with clear responsibilities:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (React Components - UI, Controls, Visualization)       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Application Layer                      │
│  (Next.js Pages, API Routes, State Management)          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Domain Layer                          │
│  (Business Logic - Analysis, NLP, Graph Building)       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Infrastructure Layer                  │
│  (Utilities, Types, Constants, Configuration)           │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

1. **Presentation Layer** (`components/`)
   - UI components and visualizations
   - User interaction handling
   - Styling and layout

2. **Application Layer** (`app/`)
   - Page components and routing
   - API route handlers
   - State management and orchestration

3. **Domain Layer** (`lib/`)
   - Core business logic
   - Algorithm implementations
   - Data processing pipelines

4. **Infrastructure Layer** (`types/`, `constants/`, `utils/`)
   - Type definitions
   - Configuration constants
   - Shared utilities

---

## Frontend Architecture

### Component Structure

The frontend follows a feature-based organization:

```
components/
├── controls/          # Analysis parameter controls
│   ├── AnalysisControls.tsx
│   ├── AIControls.tsx
│   ├── GraphFiltersAccordion.tsx
│   └── ...
├── graph/             # 3D graph visualization
│   ├── GraphCanvas3D.tsx      # Main 3D scene
│   ├── Node3D.tsx             # Individual node rendering
│   ├── Link3D.tsx             # Link/edge rendering
│   ├── Graph3DControls.tsx    # Camera/interaction controls
│   └── GraphLegend.tsx        # Legend component
├── ingest/            # Data input handling
│   ├── IngestPanel.tsx
│   ├── FileUploader.tsx
│   └── TextInput.tsx
├── inspector/         # Details and inspection panels
│   ├── InspectorPanel.tsx
│   ├── NodeInspector.tsx
│   ├── AnalysisReport.tsx
│   └── ...
├── schema/            # Schema documentation
└── ui/                # Reusable UI primitives (shadcn-style)
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    └── ...
```

### State Management

The application uses React's built-in state management with hooks:

- **Local State**: `useState` for component-level state
- **Derived State**: `useMemo` for computed values
- **Effects**: `useEffect` for side effects and synchronization
- **Custom Hooks**: Domain-specific logic extraction
  - `useConceptSummarizer` - AI-powered concept summarization
  - `useAxisLabelEnhancer` - Axis label enhancement

### Key Frontend Patterns

1. **Component Composition**: Complex UIs built from smaller, reusable components
2. **Controlled Components**: Form inputs and controls use controlled state
3. **Event-Driven Updates**: User interactions trigger state updates that flow through the system
4. **Memoization**: Expensive computations cached with `useMemo` and `useCallback`
5. **Conditional Rendering**: Components render based on application state

### 3D Visualization Stack

The 3D graph visualization uses:

- **React Three Fiber (R3F)**: React bindings for Three.js
- **Three.js**: Low-level WebGL abstraction
- **Custom Shaders**: GLSL shaders for visual effects (node halos, etc.)
- **Procedural Rendering**: Programmatically generated root systems for concept nodes
- **Camera Controls**: Orbit controls for interactive navigation

**Link Rendering (Link3D)**
- Width encodes weight per link type (jurorConcept, jurorJuror, conceptConcept, jurorDesignerConcept) using a power curve into a 2–8 px band.
- Opacity encodes evidence via percentile of cached `evidenceCount`, with a faint baseline for zero evidence.
- Color stays stance-first for jurorConcept links, otherwise kind-based, with saturation boosted by normalized weight.
- Bridge links (computed server-side via cluster-aware structural analysis) get a zoom-gated pulse glow; non-bridges render as single strokes.
- Constants live in `lib/utils/link-visualization-constants.ts`; normalization helpers in `lib/utils/link-normalization.ts`; structural roles assigned in `lib/graph/structural-analysis.ts` and consumed in `components/graph/Link3D.tsx`.

---

## Backend Architecture

### API Routes Structure

The backend is built using Next.js API Routes (App Router):

```
app/api/
├── segment/
│   └── route.ts              # POST - Juror text segmentation
├── analyze/
│   ├── route.ts              # POST - Main analysis pipeline
│   ├── axis-synthesis/
│   │   └── route.ts          # POST - AI-enhanced axis labeling
│   ├── concept-synthesis/
│   │   └── route.ts          # POST - Concept summary generation
│   └── progress/
│       └── route.ts          # GET/POST - Analysis progress tracking
├── analyze-designer/
│   └── route.ts              # POST - Designer-specific analysis
└── export-pdf/
    └── route.ts              # POST - PDF report generation
```

### API Route Responsibilities

1. **`/api/segment`** - Text Processing
   - Parses raw text into juror blocks
   - Lightweight, synchronous operation
   - Returns structured `JurorBlock[]`

2. **`/api/analyze`** - Core Analysis Pipeline
   - Orchestrates the entire analysis pipeline
   - Handles heavy computation (embeddings, clustering)
   - Returns complete `AnalysisResult` object
   - Supports extensive configuration options

3. **`/api/analyze/axis-synthesis`** - AI Enhancement
   - Generates human-readable axis labels using OpenAI API
   - Optional enhancement to PCA axes
   - Requires API key configuration

4. **`/api/analyze/concept-synthesis`** - Concept Summarization
   - Generates AI summaries for concepts
   - Uses OpenAI API for natural language generation
   - Caches results to minimize API calls

5. **`/api/analyze/progress`** - Analysis Progress
   - Provides real-time progress updates for long-running analysis tasks
   - Uses a server-side progress store

6. **`/api/analyze-designer`** - Designer Analysis
   - Specialized pipeline for analyzing designer feedback and portfolios
   - Supports image embeddings and multimodal concept discovery

7. **`/api/export-pdf`** - Document Generation
   - Generates PDF reports using Puppeteer
   - Serverless-compatible with Chromium binary
   - Renders React components to PDF

### Business Logic Organization

The domain logic is organized by functional area:

```
lib/
├── analysis/              # Core analysis algorithms
│   ├── bm25.ts                    # BM25 frequency vectors
│   ├── sentence-embeddings.ts     # Semantic embeddings
│   ├── kmeans.ts                  # K-Means clustering
│   ├── hierarchical-clustering.ts # Hierarchical clustering
│   ├── cluster-eval.ts            # K evaluation metrics
│   ├── soft-membership.ts         # Soft assignment logic
│   ├── concept-centroids.ts       # Centroid computation
│   ├── concept-labeler.ts         # Contrastive concept labeling with centroid-nearest fallback
│   └── evidence-ranker.ts         # Evidence ranking logic
├── graph/                # Graph construction
│   ├── graph-builder.ts           # Main graph assembly
│   ├── projections.ts             # Similarity link building
│   ├── dimensionality-reduction.ts # PCA and 3D projection
│   ├── axis-labeler.ts            # Axis label generation
│   └── force-simulation.ts        # 2D force simulation (legacy)
├── nlp/                  # Natural Language Processing
│   ├── tokenizer.ts               # Text tokenization
│   ├── sentence-splitter.ts       # Sentence segmentation
│   ├── ngram-extractor.ts         # N-gram extraction
│   ├── keyphrase-extractor.ts     # Keyphrase extraction
│   ├── stance-classifier.ts       # Sentiment/stance classification
│   └── summarizer.ts              # Text summarization
├── segmentation/         # Text segmentation
│   └── juror-segmenter.ts         # Juror block identification
├── pdf/                  # PDF processing
│   └── pdf-parser.ts              # PDF text extraction
└── utils/                # Shared utilities
    ├── api-utils.ts               # API helpers
    ├── array-utils.ts             # Array operations
    ├── text-utils.ts              # Text manipulation
    ├── graph-color-utils.ts       # Color generation
    ├── stance-utils.ts            # Stance helpers
    └── download.ts                # File download utilities
```

### Processing Pipeline

The analysis pipeline follows a staged approach:

1. **Input Processing** → Text normalization and segmentation
2. **Feature Extraction** → Semantic embeddings + BM25 vectors
3. **Clustering** → Semantic concept discovery (hierarchical or K-Means)
4. **Graph Construction** → Node and link generation
5. **Dimensionality Reduction** → 3D position calculation (PCA)
6. **Labeling & Ranking** → Contrastive labeling with centroid-nearest fallback + evidence ranking
7. **Assembly** → Final graph structure assembly

Each stage is modular and can be configured independently.

---

## Data Flow

### Analysis Request Flow

```
User Input (Text/PDF)
    ↓
[Frontend] IngestPanel
    ↓
[API] POST /api/segment
    ↓
[Lib] segmentByJuror()
    ↓
[Frontend] Analysis Controls Configuration
    ↓
[API] POST /api/analyze
    ↓
[Lib] buildAnalysis()
    ├── Sentence Splitting
    ├── Stance Classification
    ├── N-gram Extraction
    ├── Semantic Embeddings (@xenova/transformers)
    ├── BM25 Frequency Vectors
    ├── Clustering (Hierarchical/K-Means on Semantic Vectors)
    ├── Contrastive Concept Labeling (BM25 + centroid-nearest fallback)
    ├── Evidence Ranking (Semantic + BM25)
    ├── Juror-Concept Mapping
    ├── 3D Position Calculation (PCA on Semantic Centroids)
    └── Graph Assembly
    ↓
[Frontend] AnalysisResult
    ↓
[Frontend] GraphCanvas3D (React Three Fiber)
    ↓
3D Visualization
```

Contrastive concept labeling now receives the top three centroid-nearest sentences (computed in `graph-builder.ts`) so `contrastiveLabelCluster` can backfill keyphrases for tiny or heavily deduped clusters instead of falling back to the generic `"Concept"` label.

### State Synchronization

The application maintains several state layers:

1. **UI State**: Component-level state (selected nodes, filters, etc.)
2. **Analysis State**: Complete analysis result cached in memory
3. **Configuration State**: Analysis parameters (weights, thresholds, etc.)
4. **API State**: Loading states and error handling

State updates flow unidirectionally:
- User interactions → State updates → Re-render
- API responses → State updates → UI updates

### Data Structures

Key data structures flow through the system:

- **`JurorBlock`**: Raw juror text blocks
- **`SentenceRecord`**: Individual sentences with metadata
- **`AnalysisResult`**: Complete analysis output
- **`GraphNode`**: Nodes in the visualization
- **`GraphLink`**: Edges/connections in the graph

All structures are strongly typed with TypeScript interfaces in `types/`.

---

## Design Patterns

### 1. Pipeline Pattern

The analysis pipeline is implemented as a series of transformations:

```typescript
JurorBlock[] 
  → SentenceRecord[] 
  → Float64Array[] (vectors) 
  → AnalysisResult
```

Each transformation is a pure function that takes input and produces output.

### 2. Strategy Pattern

Clustering algorithms are interchangeable strategies:

- `kmeansCosine()` - K-Means clustering
- `buildDendrogram()` + `cutDendrogramByCount()` - Hierarchical clustering

The same interface allows switching between algorithms.

### 3. Factory Pattern

Graph elements are constructed through factory functions:

- `buildAnalysis()` - Constructs complete analysis
- `buildHybridVectors()` - Constructs hybrid vectors
- `computeNode3DPositions()` - Constructs 3D coordinates

### 4. Observer Pattern

React's state management follows observer pattern:
- Components subscribe to state changes
- State updates trigger re-renders
- Effects observe dependencies

### 5. Composition Pattern

Complex components are composed from simpler ones:

```typescript
<InspectorPanel>
  <NodeInspector />
  <AnalysisReport />
  <InspectorConsole />
</InspectorPanel>
```

### 6. Deterministic Processing

Critical algorithms use seeded random number generators:

- K-Means initialization uses `createPRNG(seed)`
- PCA initialization uses constant vectors
- No artificial jitter in positioning

This ensures reproducibility for the same inputs.

---

## Build Configuration

### Next.js Configuration

The `next.config.js` includes several important configurations:

1. **Webpack Customization**
   - Canvas fallback disabled (not needed)
   - Native addon handling (`.node` files)
   - ONNX runtime externalization for server-side

2. **Serverless Compatibility**
   - Chromium binary for PDF export
   - External packages for serverless deployment

3. **React Strict Mode**
   - Enabled for development warnings

### TypeScript Configuration

The `tsconfig.json` uses:

- **Strict Mode**: Full type checking enabled
- **Path Aliases**: `@/*` maps to project root
- **Module Resolution**: Bundler mode for Next.js
- **Target**: ES2020 for modern JavaScript features

### Environment Variables

Required environment variables:

- `OPENAI_API_KEY` - For AI-enhanced features (axis labels, summaries)
- Optional: Additional API keys for other services

### Build Process

1. **Development**: `npm run dev`
   - Fast refresh enabled
   - Type checking on save
   - Hot module replacement

2. **Production Build**: `npm run build`
   - TypeScript compilation
   - Next.js optimization
   - Static page generation where possible
   - API route bundling

3. **Production Start**: `npm start`
   - Optimized server
   - Production-ready performance

---

## Key Architectural Decisions

### 1. Next.js App Router

**Decision**: Use Next.js 14 App Router instead of Pages Router

**Rationale**: 
- Modern React patterns (Server Components, Streaming)
- Better API route organization
- Improved developer experience

### 2. Server-Side Processing

**Decision**: Heavy computation on the server via API routes

**Rationale**:
- Transformers.js model runs more efficiently on Node.js
- Avoids large client-side bundles
- Better performance for complex algorithms
- Server resources for CPU-intensive tasks

### 3. Semantic-First Geometry

**Decision**: Separate semantic embeddings (for geometry/clustering) from frequency-based labeling.

**Rationale**: 
- Semantic embeddings provide a stable universal coordinate system.
- BM25 is excellent for labeling but can distort geometry with "mega-concepts".
- Interpretability improves when geometry remains stable while overlays change.
- Native support for multimodal (image) discovery via CLIP embeddings.

### 4. Multimodal Analysis (Designer Pipeline)

**Decision**: Use CLIP (Contrastive Language-Image Pre-training) for image embeddings and Designer-specific clustering.

**Rationale**:
- Allows architectural images (renderings, diagrams) to be mapped into the same semantic space as text.
- Designers can be linked to concepts not just through their words, but through their visual portfolio.
- Threshold-based image-concept attachment ensures relevance.

### 5. Anchor Axis Projection

**Decision**: Allow user-defined "Anchor Axes" for custom semantic projection.

**Rationale**:
- PCA is excellent for variance but hard to interpret.
- Anchor axes (e.g., "Traditional" vs "Modern") provide immediate human-readable context.
- Concepts and jurors can be projected onto these axes for comparative analysis.

### 6. Local-First Report Persistence

**Decision**: Use LZ-compressed LocalStorage with payload minimization.

**Rationale**:
- Privacy-conscious (data stays on client).
- "Minimization" stores only raw text, assignments, and parameters, reconstructing the full graph in-memory.
- LZ-compression and metadata caching enable fast listing of dozens of reports within browser storage limits.

### 7. Hierarchical Clustering as Default

**Decision**: Use K-Means clustering as the default method

**Rationale**:
- More intuitive for exploring data at different granularities
- Supports granularity-based cutting
- Better for discovering natural concept boundaries
- Deterministic results

### 5. WebGL for 3D Visualization

**Decision**: Use React Three Fiber instead of 2D canvas

**Rationale**:
- Better performance for complex 3D scenes
- More interactive (camera controls, rotation)
- Professional visual quality
- Better spatial understanding of relationships

### 6. TypeScript Throughout

**Decision**: Full TypeScript coverage

**Rationale**:
- Type safety catches errors early
- Better IDE support and autocomplete
- Self-documenting code
- Easier refactoring

### 7. Modular Library Organization

**Decision**: Organize `lib/` by domain rather than by layer

**Rationale**:
- Easier to find related code
- Clear separation of concerns
- Better testability
- Scalable structure

---

## Performance Considerations

### Frontend Optimization

- **Code Splitting**: Next.js automatic code splitting
- **Memoization**: Expensive computations cached
- **Lazy Loading**: Components loaded on demand
- **Virtual Scrolling**: Large lists handled efficiently

### Backend Optimization

- **Async Processing**: Non-blocking API handlers
- **Efficient Algorithms**: Optimized clustering and vector operations
- **Caching**: AI responses cached to minimize API calls
- **Streaming**: Potential for streaming large responses

### 3D Rendering Optimization

- **Instanced Rendering**: Multiple nodes rendered efficiently
- **Level of Detail**: Complexity based on zoom level
- **Frustum Culling**: Only visible objects rendered
- **Geometry Reuse**: Shared geometries for similar nodes

---

## Security Considerations

1. **API Key Management**: Environment variables for sensitive keys
2. **Input Validation**: All API inputs validated and sanitized
3. **Error Handling**: No sensitive information in error messages
4. **CORS**: Next.js handles CORS for API routes
5. **XSS Prevention**: React's built-in XSS protection

---

## Extensibility

The architecture supports extension through:

1. **Plugin Architecture**: New analysis algorithms can be added to `lib/analysis/`
2. **Component System**: New UI components follow established patterns
3. **API Routes**: New endpoints can be added to `app/api/`
4. **Type System**: TypeScript interfaces can be extended
5. **Configuration**: Analysis parameters are configurable

---

## Conclusion

SemiChan's architecture balances flexibility, performance, and maintainability. The clear separation of concerns, strong typing, and modular design make it easy to understand, extend, and modify. The hybrid analysis approach and 3D visualization provide powerful tools for understanding complex textual relationships.
