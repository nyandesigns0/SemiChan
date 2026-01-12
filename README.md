# Jury Concept Graph - Next.js Full-Stack Application

A refactored Next.js application for analyzing jury comments and building interactive concept graphs.

## Project Structure

```
jury-concept-graph/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                 # Main page component
│   ├── globals.css              # Global styles
│   └── api/
│       ├── segment/route.ts     # Juror segmentation API
│       └── analyze/route.ts     # Analysis API (TF-IDF + k-means)
├── components/
│   ├── ingest/                  # Text input and file upload
│   ├── controls/                 # Analysis controls and filters
│   ├── graph/                   # Graph visualization
│   ├── inspector/               # Node/link inspection panels
│   ├── schema/                  # Schema explanation
│   └── ui/                      # shadcn-style UI components
├── lib/
│   ├── analysis/                # TF-IDF, k-means, concept labeling
│   ├── nlp/                     # NLP utilities (tokenizer, stance, etc.)
│   ├── segmentation/            # Juror text segmentation
│   ├── graph/                   # Graph building and force simulation
│   ├── pdf/                     # PDF parsing
│   └── utils/                   # General utilities
├── types/                       # TypeScript type definitions
└── constants/                   # NLP constants (stopwords, markers, etc.)
```

## Features

- **Text Ingestion**: Paste text or upload PDF/TXT files
- **Juror Segmentation**: Automatic detection and segmentation of juror comments
- **Semantic Analysis**: Uses sentence embeddings with BM25 frequency signals for rich concept discovery
- **Advanced Clustering**: Hierarchical clustering (default) or K-Means with automatic K recommendation and soft membership support
- **Interactive 3D Graph**: WebGL-powered 3D visualization with PCA-based dimensionality reduction
- **Explainability**: Every edge links to supporting evidence excerpts with stance classification (praise, critique, suggestion, neutral)
- **Export**: Download analysis results as JSON or PDF reports

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

The application follows a clean separation of concerns:

- **Frontend**: React components organized by feature
- **Backend**: Next.js API routes handling computation-heavy analysis
- **Shared**: Types, utilities, and constants used across the stack

### API Routes

- `POST /api/segment` - Segments raw text into juror blocks
- `POST /api/analyze` - Performs semantic-frequency analysis and clustering
- `POST /api/analyze/axis-labels` - Generates AI-enhanced axis labels for 3D visualization
- `POST /api/synthesize` - Synthesizes concept summaries using AI
- `POST /api/export-pdf` - Exports analysis results as PDF

### Key Components

- `IngestPanel` - Handles text input and file uploads
- `AnalysisControls` - Sliders for analysis parameters
- `GraphCanvas` - Interactive force-directed graph visualization
- `InspectorPanel` - Shows details for selected nodes/links

## Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Three Fiber** - 3D graph visualization
- **@xenova/transformers** - Semantic embeddings (all-MiniLM-L6-v2)
- **wink-bm25-text-search** - BM25 frequency analysis for labeling/evidence
- **Recharts** - Data visualization
- **pdfjs-dist** - PDF parsing

## Development

The codebase is organized for maintainability:

- **Types** are centralized in `types/`
- **Business logic** is in `lib/` organized by domain
- **UI components** are in `components/` organized by feature
- **API routes** handle server-side computation

## License

MIT
