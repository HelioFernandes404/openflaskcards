# Contributing to OpenFlashcards

Thanks for considering a contribution. This guide covers the basics.

## Prerequisites

- Go 1.26+
- Node.js 22+
- Docker + Docker Compose

## Getting Started

```bash
git clone https://github.com/HelioFernandes404/openflashcards.git
cd openflashcards
cp .env.example .env   # set JWT_SECRET and POSTGRES_PASSWORD
make up                # start Postgres, Redis, API, web via Docker Compose
```

For local (non-Docker) development, run the API and web dev servers in two
terminals:

```bash
make -C apps/api run
cd apps/web && npm install && npm run dev
```

Frontend-only work (mocked API via MSW, no backend needed):

```bash
cd apps/web && npm install && VITE_MSW=true npm run dev
```

## Project Layout

```
apps/api   Go + Gin API, PostgreSQL, Redis (TTS queue), sqlc + Atlas migrations
apps/web   React 19 + Vite frontend, TanStack Query, Biome
```

Each app has its own `Makefile`/`package.json` with more granular targets —
run `make help` inside `apps/api` to list them.

## Running Tests

```bash
make test
```

This runs Go unit tests (`apps/api`, short mode — no external services
required) and web unit tests (`apps/web`, Vitest). You can also run each
independently:

```bash
make -C apps/api test
cd apps/web && npm run test:unit
```

## Code Style

- **apps/api**: standard `gofmt` formatting; `make -C apps/api lint-check`
  runs `go vet`.
- **apps/web**: [Biome](https://biomejs.dev/) for linting and formatting —
  `npm run lint` to check, `npm run lint:fix` to auto-fix, `npm run format`
  to format.

Run `make lint` from the repo root to check both.

## Commit Convention

This repo follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add pronunciation hint field to card model
fix: correct FSRS interval rounding
refactor: extract TTS provider interface
docs: update README quick start
chore: bump dependencies
```

## Pull Request Process

1. Fork the repo and create a branch from `main`.
2. Make your changes, keeping commits focused and following the convention
   above.
3. Make sure `make test` and `make lint` pass locally.
4. Open a PR against `main` using the PR template. Link any related issue.
5. CI (`.github/workflows/ci.yml`) must pass before merge.

## Questions

Open a [GitHub Discussion](https://github.com/HelioFernandes404/openflashcards/discussions)
or an [issue](https://github.com/HelioFernandes404/openflashcards/issues) if
something's unclear.
