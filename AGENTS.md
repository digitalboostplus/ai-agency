# Repository Guidelines

This guide aligns AI Agency contributors on expectations before you open a pull request.

## Project Structure & Module Organization
- `src/app` hosts route segments; `components` holds shared UI, `sections` composes landing views, and `ghl-research` powers the Go High Level lookup experience.
- `src/lib/ghl.ts` houses pure normalization utilities for Go High Level API payloads; extend them with exhaustive guards.
- `public/` stores static assets, while `src/app/globals.css` wires Tailwind and shared base styles.
- Root configs (`next.config.ts`, `tailwind.config.js`, `eslint.config.mjs`, `tsconfig.json`) shape the workspace; coordinate changes that affect the toolchain.

## Build, Test, and Development Commands
- `npm install` - sync dependencies before your first run or when the lockfile changes.
- `npm run dev` - start the Turbopack dev server at `http://localhost:3000`.
- `npm run build` - produce the production bundle and surface type/bundler errors.
- `npm run start` - serve the compiled app locally for smoke tests.
- `npm run lint` - enforce the Next.js ESLint preset; fix all warnings prior to review.

## Coding Style & Naming Conventions
Rely on TypeScript strictness and ESLint autofixes; do not bypass lint rules without agreement. Use two-space indentation, PascalCase for components and route directories, camelCase for helpers, and UPPER_SNAKE_CASE for constants. Add the `'use client';` directive only when a file needs browser APIs, and keep Tailwind class lists deliberate by grouping layout, spacing, color, then state modifiers.

## Testing Guidelines
Automated tests are not yet wired up, so treat `npm run lint` and `npm run build` as required gates. Perform manual QA against the homepage flows, animation triggers, and Go High Level research lookup before submitting changes. When you introduce complex logic, leave a TODO describing expected automated coverage or open an issue so the backlog captures it.

## Commit & Pull Request Guidelines
Recent history uses concise, imperative subjects (for example, `Add Go High Level research hub`). Follow that voice, expand with a short body when the change spans multiple areas, and avoid bundling unrelated work. Pull requests should link issues or tasks, call out config/env updates, list verification steps, and attach before/after screenshots for UI-facing work.

## Data & Integration Notes
Secrets belong in environment variables-never hardcode API keys or domains. The Go High Level helpers sanitize host URLs via `sanitiseBaseUrl` and build headers defensively; maintain that posture and document any new consumers or edge cases inside your PR.

- Provision the private integration OAuth credentials via environment variables: `GHL_PRIVATE_CLIENT_ID`, `GHL_PRIVATE_CLIENT_SECRET`, and either `GHL_PRIVATE_REFRESH_TOKEN` (preferred) or `GHL_PRIVATE_AUTH_CODE` for fallback. Optional overrides include `GHL_PRIVATE_USER_TYPE` and `GHL_PRIVATE_TOKEN_ENDPOINT` if you target a non-default tenant.
