# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds the Next.js App Router entry points, including `layout.tsx`, `page.tsx`, and API routes under `app/api/`.
- `components/` contains feature UI (ingest, controls, graph, inspector) plus shared UI in `components/ui/`.
- `lib/` hosts domain logic (analysis, NLP, segmentation, graph, PDF utilities) used by both UI and API routes.
- `hooks/`, `types/`, and `constants/` centralize reusable hooks, TypeScript types, and NLP constants.
- `docs/` captures deeper architecture and pipeline notes; keep updates in sync with feature changes.
- Layer responsibilities: presentation in `components/`, application routing + API in `app/`, domain logic in `lib/`, infrastructure types/constants/utils in `types/`, `constants/`, `lib/utils/`.
- Feature UI folders map to `controls/`, `graph/`, `ingest/`, `inspector/`, plus reusable primitives in `components/ui/`.
- API routes live under `app/api/` (segment, analyze, analyze/axis-synthesis, analyze/concept-synthesis, analyze-designer, export-pdf).

## Build, Test, and Development Commands
- `npm run dev`: start the local dev server at `http://localhost:3000`.
- `npm run build`: create a production build with Next.js.
- `npm run start`: run the production server after a build.
- `npm run lint`: run Next.js ESLint checks.

## Architecture & Data Flow
- Core principles: separation of concerns, strict typing, deterministic processing, server-heavy analysis with client-side visualization.
- Analysis request flow: ingest input -> `/api/segment` -> configure analysis -> `/api/analyze` -> render result in `GraphCanvas3D`.
- State layers: UI state (selection/filters), analysis result cache, configuration state, API loading/errors.

## Analysis Pipeline (Server)
- Stages: text normalization + segmentation -> semantic & image embeddings + BM25 vectors -> clustering -> graph assembly -> PCA or Anchor Axis projection -> labeling + evidence ranking.
- Determinism: seeded PRNG for K-Means, stable PCA init, no jitter for positions.
- Strategy pattern: switch clustering between K-Means and hierarchical via shared interfaces in `lib/analysis/`.

## Coding Style & Naming Conventions
- TypeScript strict mode is enabled; keep types explicit for analysis payloads and API routes.
- Use 2-space indentation, semicolons, and double quotes for strings (match existing files).
- Component files use `PascalCase` (e.g., `GraphCanvas3D.tsx`), hooks start with `use` (e.g., `useAxisLabelEnhancer.ts`).
- Use the `@/` path alias for absolute imports; avoid deep relative paths.
- Tailwind is the primary styling method; keep class lists readable and grouped by purpose.
- Prefer modular domain functions in `lib/` and keep API routes orchestration-only.

## Testing Guidelines
- No dedicated test framework or test directory is present today.
- When adding tests, document the chosen framework and add a corresponding npm script.

## Commit & Pull Request Guidelines
- Commit messages are sentence-style and imperative (e.g., "Refactor analysis components...", "Update Next.js configuration...").
- Keep commits focused by feature or concern; avoid bundling unrelated formatting with logic changes.
- PRs should include: a clear summary, linked issues (if any), and screenshots/GIFs for UI changes.
- Note any new environment variables or configuration changes in the PR description.

## Security & Configuration Tips
- Environment values live in `.env` or `.env.local`; do not commit secrets.
- AI features rely on `OPENAI_API_KEY` (axis labels, summaries); guard optional flows when unset.
- PDF export uses Chromium/Puppeteer; if export fails locally, verify system Chrome availability and `app/api/export-pdf` settings.
