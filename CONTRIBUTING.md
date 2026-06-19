# Contributing to MR PDF

Thanks for your interest in improving MR PDF! This guide explains how to get set up and the conventions we follow.

## Getting started

1. Fork and clone the repository.
2. Install dependencies: `pnpm install` (Node 20+, pnpm 9+).
3. Start the frontend: `pnpm dev:web`. For server tools, also run `pnpm dev:api` (requires Redis and the CLI tools — the simplest path is `docker compose up`).

## Project layout

- `apps/web` — Next.js frontend and tool UI.
- `apps/api` — Fastify backend, job queue, and CLI runners.
- `packages/pdf-core` — Shared client PDF engine (pdf-lib + pdf.js) and the Web Worker.
- `packages/ui` — Shared UI utilities.

## Adding a tool

1. **Client-side tool**: add a `ToolDefinition` with a `run` function in the relevant file under `apps/web/lib/tools/`. If it needs heavy logic, add a worker op in `packages/pdf-core` and expose it via the worker protocol.
2. **Server-side tool**: add a runner in `apps/api/src/tools/`, register it in `apps/api/src/tools/index.ts`, and add a `serverTool(...)` definition in the frontend registry.
3. **Interactive tool**: build a component under `apps/web/components/custom/` and map it in `ToolView`.

## Conventions

- TypeScript everywhere; keep code modular and readable (DRY/KISS).
- 2-space indentation, single quotes, trailing commas (enforced by Prettier).
- Run `pnpm format` and `pnpm lint` before opening a PR.
- Run `pnpm typecheck` and `pnpm build` to make sure everything compiles.

## Commit & PR

- Write clear commit messages explaining the "why".
- Keep PRs focused. Include a short description and testing notes.
- By contributing you agree your work is licensed under the MIT License.
