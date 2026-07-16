# OpenFlashcards Web

Frontend for spaced repetition system (flashcards) based on FSRS v6 algorithm. React application to manage decks, cards, and study sessions with optimized scheduling.

## Table of Contents

- [Overview](#overview)
- [Stack and Tools](#stack-and-tools)
- [Frontend Architecture](#frontend-architecture)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Scripts](#scripts)
- [API Configuration](#api-configuration)
- [Build and Release](#build-and-release)
- [Testing](#testing)
- [Quality](#quality)
- [Deploy](#deploy)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

### Core Features

- **Authentication**: Login, registration, and route protection
- **Deck Management**: Create, edit, and delete flashcard decks
- **Card Management**: Add, edit, delete, and import/export cards (CSV)
- **Card Browser**: Card visualization and advanced filtering
- **Study Sessions**: Card review with FSRS v6 algorithm
- **Dashboard**: Statistics and progress charts
- **FSRS Settings**: Algorithm parameter adjustment (presets and desired retention)
- **User Profile**: Account settings and timezone configuration
- **Dark Mode**: Persistent toggle in localStorage

## Stack and Tools

| Category | Technology |
|-----------|------------|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Language | TypeScript 5.9 (strict) |
| CSS | Tailwind CSS 4 |
| Routing | TanStack Router |
| Animations | Motion 12 (successor to framer-motion) |
| Charts | Recharts 3 |
| HTTP Client | Native fetch + TanStack Query |
| UI Components | Radix UI (checkbox, label, switch, slot) |
| Icons | Lucide React |
| E2E Tests | Cucumber.js + Playwright |
| Lint | Biome 2 |

## Frontend Architecture

The project follows a **feature-based** architecture:

```
src/
├── features/           # Domain modules
│   ├── algorithm-settings/   # FSRS settings
│   ├── auth/                 # Authentication
│   ├── cards/                # Card management
│   ├── dashboard/            # Dashboard and statistics
│   ├── decks/                # Deck management
│   ├── profile/              # User profile
│   └── study/                # Study sessions
├── shared/             # Shared code
│   ├── components/     # Reusable components (Button, Card, Input, etc.)
│   ├── config/         # Configuration (API)
│   ├── hooks/          # Custom hooks
│   ├── services/       # API client, error handling, retry logic
│   ├── types/          # Shared types
│   └── utils/          # Utilities (motion, skeleton)
├── services/           # Services index
├── layouts/            # Page layouts
├── App.tsx             # Main routes
├── main.tsx            # Entry point
└── index.css           # Global styles
```

### Feature Structure

```
feature/
├── __tests__/bdd/      # BDD tests (.feature)
├── components/         # Feature components
├── hooks/              # Feature-specific hooks
├── pages/              # Pages/views
├── services/           # API services
├── types/              # Feature types
└── README.md           # Documentation
```

### Routes

| Route | Component |
|------|------------|
| `/` | Dashboard |
| `/profile` | ProfilePage |
| `/decks/create` | CreateDeck |
| `/decks/:deckId/cards/add` | AddCards |
| `/decks/:deckId/cards/import` | ImportExportPage |
| `/cards/browse` | BrowseCards |
| `/decks/:deckId/study` | StudySession |
| `/settings/algorithm` | AlgorithmSettings |

This is a single-user app — there is no login/register flow and no auth gate on routes.

## Prerequisites

- **Node.js**: 20+ (recommended)
- **npm**: 10+ (lockfile: `package-lock.json`)
- **API**: Go (Gin) API running on `localhost:3030` (see `apps/api/`)

## Local Setup

### 1. Installation

```bash
# Clone repository (if not already done)
git clone <repo-url>
cd openflaskcards/apps/web

# Install dependencies
npm install
```

### 2. Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit if needed
```

The `VITE_*` variables below are used in local development and as fallback when runtime config doesn't exist.

| Variable | Required | Default | Description |
|----------|----------|---------|-----------|
| `VITE_API_URL` | No | `http://localhost:3030/api/v1` | API base URL |
| `VITE_API_TIMEOUT` | No | `10000` | Request timeout (ms) |
| `VITE_API_RETRY_ATTEMPTS` | No | `3` | Retry attempts |
| `VITE_API_RETRY_DELAY` | No | `1000` | Delay between retries (ms) |

> **Vite Note**: Variables exposed to the browser must have `VITE_` prefix.

### 2.1 Runtime config in container

In Docker images and Ansible deployments, the frontend prioritizes `/runtime-config.js`, generated on Nginx container startup.

| Variable | Default | Description |
|----------|---------|-----------|
| `OPENFLASKCARDS_API_URL` | `http://localhost:3030/api/v1` | API base URL in runtime environment |
| `OPENFLASKCARDS_API_TIMEOUT` | `10000` | Request timeout (ms) |
| `OPENFLASKCARDS_API_RETRY_ATTEMPTS` | `3` | Retry attempts |
| `OPENFLASKCARDS_API_RETRY_DELAY` | `1000` | Delay between retries (ms) |

### 3. Run in Development

```bash
npm run dev
```

Access: **<http://localhost:5173>**

### 4. Run with Docker

```bash
# Build and run
docker build -t openflaskcards-web .
docker run -p 80:80 openflaskcards-web
```

Access: **<http://localhost>**

## Scripts

| Script | Command | Description |
|--------|---------|-----------|
| `dev` | `npm run dev` | Start Vite development server |
| `build` | `npm run build` | TypeScript check + production build |
| `preview` | `npm run preview` | Preview production build |
| `lint` | `npm run lint` | Run ESLint |
| `test:unit` | `npm run test:unit` | Run unit tests with Vitest |
| `test:bdd` | `npm run test:bdd` | Run BDD tests (Cucumber + Playwright) |
| `test:bdd:watch` | `npm run test:bdd:watch` | BDD tests in watch mode |
| `test:bdd:feature` | `npm run test:bdd:feature "<name>"` | Run specific scenario |
| `test:seed` | `npm run test:seed` | Populate test database |

## API Configuration

### Base URL

Resolution order:

1. `window.__OPENFLASKCARDS_CONFIG__` loaded from `/runtime-config.js`
2. `import.meta.env.VITE_API_*`
3. Local fallback `http://localhost:3030/api/v1`

Configuration entry points are in `src/shared/config/api.ts` and `src/shared/config/runtimeConfig.ts`.

### Consumed Endpoints

The API (Go + Gin) exposes endpoints at `/api/v1`:

- `/auth/*` - Authentication
- `/users/*` - Profile
- `/decks/*` - Decks
- `/cards/*` - Cards
- `/reviews/*` - Reviews/Study
- `/stats/*` - Statistics

### Environments

| Environment | API URL |
|----------|---------|
| Local | `VITE_API_URL` or fallback `http://localhost:3030/api/v1` |
| Local Docker | `OPENFLASKCARDS_API_URL` rendered in `/runtime-config.js` |
| Production | `frontend_api_url` in Ansible inventory, injected as `OPENFLASKCARDS_API_URL` |

## Build and Release

```bash
# Production build
npm run build

# Output in: dist/
```

### Local preview of build

```bash
npm run preview
# Access: http://localhost:4173
```

## Testing

### BDD (Cucumber + Playwright)

End-to-end tests using Gherkin features.

```bash
# Initial setup (once)
make install-browsers
make test-seed

# Run all tests
make test

# Run specific feature
make test-feature FEATURE=login

# Run specific scenario
make test-scenario NAME="Login with valid credentials"

# Tests by module
make test-auth
make test-decks
make test-cards
make test-study
make test-dashboard
make test-profile
make test-settings

# Complete suite
make test-all

# View report
make test-report
```

**Prerequisite**: API running on `localhost:3030`.

## Quality

### Lint

```bash
npm run lint
```

Biome configured in `biome.json` (lint + format). Extra commands:

- `npm run lint:fix` — applies safe fixes
- `npm run format` — formats code

### TypeScript

```bash
# Implicit check in build
npm run build
```

Strict mode enabled. Zero `any` allowed.

### Pre-PR Checklist

- [ ] `npm run lint` without errors
- [ ] `npm run build` without TypeScript errors
- [ ] Tests passing (if applicable)

## Deploy

### Image Publishing

The workflow [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) publishes the `openflaskcards-web` image to Docker Hub when a semver tag is created.

**Required GitHub Secrets**:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

### Official Rollout

```bash
ansible-playbook -i infra/ansible/inventories/production/ \
  infra/ansible/playbooks/deploy.yml \
  -e app_image_tag=<version> --ask-vault-pass
```

Production and staging use Ansible as the only official deployment path. The `Deploy to VPS` workflow remains as disabled legacy.

### Manual Docker

```bash
docker build -t openflaskcards-web .
docker run --rm -p 8080:80 \
  -e OPENFLASKCARDS_API_URL=http://host.docker.internal:3030/api/v1 \
  openflaskcards-web
```

## Security

- **Never commit `.env`** - Only `.env.example` with placeholders
- **`VITE_` prefix** exposes variables to browser - don't put secrets
- **`runtime-config.js` is also public** - `OPENFLASKCARDS_API_*` should contain only non-sensitive frontend configuration
- **Tokens**: Managed via sessionStorage (see `shared/services/sessionStorage.ts`)
- **Dependencies**: Keep updated to avoid CVEs

## Troubleshooting

### Error: "ENOENT: no such file or directory"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 5173 occupied

```bash
# Find process
lsof -i :5173
# Kill process
kill -9 <PID>
```

### API not responding

```bash
# Check if it's running
make check-api

# If not, start API:
cd ../api
make run
```

### CORS error

Check if the effective API URL is correct in your environment:

- development: `VITE_API_URL`
- container/deploy: content of `/runtime-config.js`

Also confirm that the API allows origin `http://localhost:5173`.

### TypeScript errors in build

```bash
# Check specific errors
npx tsc --noEmit
```

## Contributing

1. Create branch from `main`:

   ```bash
   git checkout -b feature/my-feature
   ```

2. Follow commit conventions (Conventional Commits):

   ```
   feat(cards): add bulk import functionality
   fix(auth): handle token expiration
   chore(deps): update react to 19.2
   ```

3. Before opening PR:

   ```bash
   npm run lint
   npm run build
   ```

4. Open PR to `main` with clear description

## License

TODO: Define project license.

---

## Documentation TODOs

- [ ] Add license (LICENSE)
- [ ] Document cache/assets strategy in production
- [ ] Add screenshots/GIFs of app
- [ ] Document observability setup (Sentry/LogRocket if applicable)
- [ ] Add .nvmrc or engines in package.json for Node version
