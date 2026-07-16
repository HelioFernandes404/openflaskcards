# Repository Guidelines

## Project Structure & Module Organization
This app lives in `apps/web` and uses a feature-based React structure. Main source code is under `src/`, with domain modules in `src/features/*` such as `auth`, `decks`, `cards`, `study`, and `dashboard`. Shared UI, hooks, config, services, and types live in `src/shared/*`. App entry points are `src/main.tsx` and `src/App.tsx`. Vitest setup and test helpers live in `tests/support`. Keep assets and global styles close to usage, for example `src/assets/` and `src/index.css`.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Use `npm run dev` to start the Vite dev server and `npm run build` to run the TypeScript build plus production bundle. Run `npm run preview` to inspect the production build locally. Lint with `npm run lint`. Unit tests use `npm run test:unit`; seed test data first with `npm run test:seed` when needed. The local `Makefile` also provides shortcuts such as `make test`, `make lint`, and `make typecheck`.

## Coding Style & Naming Conventions
Use TypeScript and React with 2-space indentation and keep code compatible with the Biome config in `biome.json`. Prefer `PascalCase` for components and pages, `camelCase` for hooks and utilities, and keep feature-specific code inside its feature folder. Shared primitives belong in `src/shared/components`. Follow existing filenames such as `ProfilePage.tsx`, `useAuth.tsx`, and `apiClient.ts`.

## Testing Guidelines
Unit tests run with Vitest and usually sit near the code as `*.test.ts` or `*.test.tsx`, for example `src/shared/config/api.test.ts`. API calls in tests are mocked with MSW (`src/mocks/handlers.ts`). Prefer the narrowest test scope before opening a PR: run the affected unit tests for the feature you changed.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits, for example `fix(deploy): ...`, `perf(docker): ...`, and `chore: ...`. Keep commits focused and use a scope when it clarifies the affected area, such as `feat(auth): ...`. PRs should include a short summary, linked issue or context, validation commands run, and screenshots or recordings for visible UI changes.

## Security & Configuration Tips
Do not commit secrets or local `.env` files. Browser-exposed variables must use the `VITE_` prefix. API runtime config is resolved from `/runtime-config.js` first, then `VITE_*` values, then local defaults in `src/shared/config/*`; preserve that order when changing configuration behavior.

## Deep Modules (frontend architecture)

The web app favors **deep modules**: small, stable interfaces with most complexity hidden inside the implementation. Prefer one seam callers can test over logic spread across hooks and pages.

### Global state (providers)

Wrap the app in `main.tsx` in this order: `AuthProvider` → `NotificationProvider` → `StudyDataProvider` → `StudyPlanProvider` → `App`.

| Module | Hook / entry | Responsibility |
|--------|----------------|----------------|
| `NotificationProvider` | `useNotification()` | Global toast (`showToast`); render once via internal `ToastHost` |
| `StudyDataProvider` | `useStudyData()` | Decks, card mutations, study ops; single shared instance |
| `StudyPlanProvider` | `useStudyPlanApplication()` | Study plan catalog + session progress |
| `AuthProvider` | `useAuth()` | Session and user identity (existing pattern) |

Do **not** call `useStudyData()` in a way that creates isolated state per page. `useStudyDashboard` is a deprecated alias for `useStudyData()` — migrate new code to `useStudyData` + `useNotification`.

`StudyDataProvider` accepts an optional `service?: IStudyService` for tests. It loads decks on auth; it does **not** N+1-fetch all deck cards — use `loadDeckCards(deckId)` or browse endpoints when needed.

`StudyPlanProvider` accepts optional `deps` or `application` for tests. Hooks use `useStudyPlanApplication()` — never route plan HTTP through `IStudyService`. Pages must not call adapters directly.

### Data seam (`IStudyService`)

HTTP access for study/decks/cards/browse/import goes through **`IStudyService`**, implemented by:

- `ApiStudyService` — production
- `FakeStudyService` — unit/integration tests

Do not add standalone API files like the old `browseApi.ts` or `importExportApi.ts`. Extend the interface and both adapters.

### Study plans (domain module)

Self-contained under `features/study-plans/` — template for extracting other features from `IStudyService`:

| Layer | Location | Role |
|-------|----------|------|
| Domain (pure) | `domain/studyPlan.ts`, `studyPlanProgress.ts`, `studyPlanApiDto.ts` | Types, XP/streak rules, DTO → domain mapping |
| Ports | `ports/StudyPlanCatalogPort.ts`, `StudyPlanSessionProgressPort.ts` | Persistence contracts (plan definitions vs session progress) |
| Adapters | `adapters/api/HttpStudyPlan*Adapter`, `adapters/in-memory/InMemoryStudyPlan*Adapter` | HTTP (production) and in-memory (tests) |
| Application | `application/studyPlanApplication.ts` | `catalog` + `sessionProgress` use cases (no React, no toast) |
| Provider | `providers/StudyPlanProvider.tsx` | Injects application; `useStudyPlanApplication()` |
| Server state | `application/studyPlanQueryKeys.ts` + TanStack Query in hooks | Cache list/detail/progress; avoid duplicate fetches |
| Orchestration | `hooks/useStudyPlans.ts`, `useStudyPlan.ts`, `useStudyPlanProgress.ts` | React + Query + toast on error |

Naming conventions:

- **Catalog** = plan definition (title, steps, metadata)
- **Session progress** = daily completions, XP, streaks
- **Application** = composed use cases (`createStudyPlanApplication`)
- Adapter prefix **`Http`** (production, `adapters/api/`) / **`InMemory`** (tests, `adapters/in-memory/`) — never `Fake` or folder `fake/`

Progress is persisted on the backend — never `localStorage`.

Barrel exports: `src/services/index.ts`.

### Browse

| Layer | Location | Role |
|-------|----------|------|
| Domain (pure) | `features/cards/domain/browseCatalog.ts` | Filter, sort, selection, editor payloads — unit-tested, no React |
| Orchestration | `features/cards/hooks/useBrowseCardsViewModel.ts` | Wire provider + service + domain; debounced save stays here |
| Types | `features/cards/types/browse.ts` | Filter/editor types — never import types from hooks |
| Prefetch | `features/cards/services/browsePrefetch.ts` | Warm browse API from `AppShell`; consumed on browse mount |

`BrowseCards` is **eager-imported** in `App.tsx` (primary nav). Avoid lazy load + heavy entrance animations on browse — use skeletons in child components instead.

Browse route (`/cards/browse`) renders **outside** `AppShell` (full-screen three-pane layout).

### Study session

| Layer | Location | Role |
|-------|----------|------|
| Controller | `features/study/hooks/useStudySession.ts` | Phase, flip, rate, timer — testable without UI |
| Page | `features/study/pages/StudySession.tsx` | Composition only |

### Types

- `User`, `GlobalStats`, legacy preview types → `shared/types/api.ts`
- `Deck` → `features/decks/types/deck.ts`
- `Card` → `features/cards/types/card.ts`
- Do not reintroduce `Deck`/`Card` in `shared/types/api.ts`

### Reference implementation

`features/study-plans/` is the template for a self-contained domain module: pure domain utils + dedicated service seam + provider + thin hooks. For features still inside `IStudyService`, follow `features/cards/importExport/` (pure utils + hook + service method).

### Tests

- Unit: domain modules and providers (`*.test.ts` / `*.test.tsx` next to code)
- API mocking: MSW handlers in `src/mocks/handlers.ts`; per-test overrides with `server.use(...)`

When adding a feature, ask: *does this earn a module (deletion test), or is it a pass-through?* If complexity would reappear across N callers after deletion, deepen the module instead of copying logic.
