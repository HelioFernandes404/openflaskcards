# Repository Guidelines

## Project Structure & Module Organization
The API lives in `apps/api` and is a Go service. Source layout is feature-based under `internal/`:

```
apps/api/
├── cmd/api/main.go          # entrypoint — wires all features and starts Gin
├── internal/
│   ├── auth/                # authentication & JWT
│   ├── cards/               # flashcard CRUD, review, bulk ops, TTS content
│   ├── decks/               # deck management and stats
│   ├── users/               # user profile
│   └── shared/              # cross-cutting concerns (never import a feature from here)
│       ├── apperror/        # typed domain errors
│       ├── cache/           # Redis client
│       ├── config/          # envconfig-based config struct
│       ├── db/              # pgxpool + db/sqlc/ (generated — never edit by hand)
│       ├── fsrs/            # go-fsrs/v4 wrapper
│       ├── logger/          # zap-based logger
│       └── tts/             # Google TTS + Redis cache
├── queries/*.sql            # sqlc source of truth
└── migrations/              # Atlas versioned SQL (*.sql + atlas.sum)
```

### Feature package pattern
Each feature package owns exactly three layers, always named the same way:

| File | Responsibility |
|---|---|
| `handler.go` | HTTP binding only — parse request, call service, write response. No business logic. |
| `service.go` | Business logic. Calls repository and shared packages. Returns domain types. |
| `repository.go` | Database access only. Wraps sqlc queries and maps `db.*` types to domain types. |

When a file grows past ~150 lines, split by operation group — not by layer. Examples from the codebase:

- `handler_review.go`, `handler_bulk.go`, `handler_content.go`, `handler_write.go` (cards)
- `service_review.go`, `service_tokens.go` (cards, auth)
- `handler_stats.go` (decks)

Domain types shared within a feature go in `types.go`. Do not create a `models/` or `dto/` package.

### Dependency rules
- Features import `internal/shared/*` freely.
- Features **never** import each other — cross-feature calls go through a shared interface or are restructured.
- `internal/shared/db/sqlc/` types (`db.*`) must not cross package boundaries. Repositories map them to local domain types before returning.
- `cmd/api/main.go` is the only place allowed to wire features together (dependency injection root).

`internal/shared/db/sqlc/` is generated — never edit by hand. Re-run `make sqlc-gen` after editing `queries/`.

## Build, Test, and Development Commands
Install Go 1.23+ and Docker. Then:

- `make run` — start the API on port `3030`.
- `make build` — produce `bin/api`.
- `make test` — run unit tests (`go test ./... -short`).
- `make test-cov` — tests with coverage.
- `make sqlc-gen` — regenerate Go code from `queries/*.sql`.
- `make migrate-up` / `make migrate-up-local` — apply migrations locally (not used on VPS deploy; see root `AGENTS.md` → **Database migrations**).
- `make migrate-hash` — regenerate `migrations/atlas.sum` after adding a migration.
- `make lint-check` / `make type-check` — static analysis (`go vet`, `go build`).

For the full stack locally, use `docker compose up` from this directory.

## Coding Style & Naming Conventions
- Target Go `1.23+`; format with `gofmt` and `goimports`; lint with `golangci-lint`.
- `PascalCase` for exported identifiers, `camelCase` for unexported, `snake_case` for file names (`deck_service.go`, `card_repository.go`).
- Package names are lowercase single words, no underscores.
- One responsibility per file; keep handlers thin and push logic to services.
- Repositories return domain types from the feature package — never leak `db.*` (sqlc) types across feature boundaries.
- Errors: return `*apperror.AppError` for known domain failures; wrap unexpected errors with `fmt.Errorf("ctx: %w", err)`.
- Keep files to 120–180 lines; split by operation group when a file exceeds that limit (e.g. `handler_review.go`, `service_tokens.go`).

## Database & Migrations
- All schema changes flow through Atlas (versioned mode, plain SQL — no HCL, no Atlas Cloud).
- Author new SQL in `migrations/` or use `make migrate-diff NAME=xxx`.
- Run `make migrate-lint` before merging changes that alter live tables.
- Update `queries/*.sql` for any new repository method, then `make sqlc-gen`.
- **Production/VPS:** migrations apply automatically via the Compose `migrate` service on deploy — never instruct manual `migrate` on the VPS (see root `AGENTS.md` → **Database migrations**).

## Testing Guidelines

### Placement and scope
- Test files live next to the code: `service_test.go` alongside `service.go`, same package.
- Use `package auth` (not `package auth_test`) — tests access unexported helpers freely.
- Integration tests carry `//go:build integration` at the top and need `TEST_DATABASE_URL`.

### Faking dependencies (no mocking libraries)
Repositories are interfaces. Unit tests implement them in-memory — no `gomock`, no `testify/mock`.

```go
type fakeRepo struct {
    users map[string]User
}

func (f *fakeRepo) GetUserByEmail(_ context.Context, email string) (User, error) {
    u, ok := f.users[email]
    if !ok {
        return User{}, apperror.ErrUserNotFound
    }
    return u, nil
}
```

Keep fake structs in the `_test.go` file where they are used.

### Service tests
Wire the service with a `fakeRepo` and a real helper (e.g. `JWTManager`) — never mock the unit under test itself.

```go
func newTestService() *Service {
    jwt := NewJWTManager([]byte("test-secret-32-chars-long-secret"), 15*time.Minute)
    return NewService(newFakeRepo(), jwt, 30)
}
```

### Handler tests
Use `net/http/httptest` with a real Gin router wired to the real service and fake repo. No mocking at the HTTP layer.

```go
func setupTestRouter() *gin.Engine {
    gin.SetMode(gin.TestMode)
    svc := NewService(newFakeRepo(), newJWT(), 30)
    h := NewHandler(svc)
    r := gin.New()
    h.RegisterRoutes(r.Group("/api/v1/auth"))
    return r
}
```

Assert on HTTP status codes and response body fields, not on internal state.

### Naming and assertions
- Test names: `TestVerbNoun` — e.g. `TestRegisterCreatesUser`, `TestLoginRejectsBadPassword`.
- Use plain `t.Fatalf` / `t.Errorf` — no assertion libraries.
- `t.Fatalf` when the test cannot continue; `t.Errorf` when it can accumulate failures.
- Use `t.Helper()` in shared setup/assertion helpers so failure lines point to the caller.

### Table-driven tests
Use subtests for multiple input cases:

```go
for _, tc := range []struct{ name, input, want string }{
    {"valid", "foo@bar.com", "foo@bar.com"},
    {"invalid", "notanemail", ""},
}{
    t.Run(tc.name, func(t *testing.T) {
        // ...
    })
}
```

### What not to test
- Do not test `internal/shared/db/sqlc/` — it is generated code.
- Do not assert on log output or internal struct fields; assert on returned values and errors.
- Do not write unit tests for pure DB behaviour — that belongs in integration tests.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat(api): ...`, `fix(api): ...`, `chore(api): ...`). Keep commits scoped to one concern. PRs should include a short summary, linked issue or context, the commands you ran to validate, and any API contract or migration impact.

## FSRS Algorithm
Use `github.com/open-spaced-repetition/go-fsrs/v4` via `internal/shared/fsrs`. Do not reimplement the algorithm. Key entry points: `fsrs.New()`, `scheduler.NewCard()`, `scheduler.Next(card, now, rating)`, `scheduler.Retrievability(card, now)`. Persist the full FSRS card state in `cards.fsrs_card_json`.

## Security & Configuration Tips
- Do not commit secrets or local `.env` files.
- All config flows through `internal/shared/config` (envconfig). Add new env vars there with a sensible default.
- Google TTS credentials must come from env vars only; never check in JSON keys.
- Always review Atlas migrations carefully before applying them in any shared environment.

## Go Best Practices

### Naming
- Interfaces named after behaviour with `-er` suffix: `Reader`, `Writer`, `Stringer`.
- Acronyms in all-caps: `HTTPServer`, `userID`, `parseURL`.
- Avoid `Get` prefix on getters — prefer `obj.Name()` over `obj.GetName()`.
- Single-concept names beat long descriptive ones; let the package name provide context (`auth.Service` not `auth.AuthService`).

### Errors
- Errors are values — always check, never ignore with `_`.
- Wrap with context: `fmt.Errorf("deck service: %w", err)`. Messages lowercase, no trailing period.
- Use `errors.Is` / `errors.As` to inspect wrapped errors.
- Return `*apperror.AppError` for domain failures; reserve raw errors for truly unexpected cases.

### Functions and structs
- Return `error` as the last return value.
- Pointer receivers when the method mutates state or the struct is large; value receivers otherwise.
- Prefer early return over nested `else` blocks.
- Keep functions short and focused — if it needs a comment to explain what it does, split it.

### Concurrency
- Do not share memory; communicate via channels.
- Use `sync.Mutex` when channels would add unnecessary complexity.
- Always run `go test -race` before opening a PR.
- Never start a goroutine without a clear ownership and shutdown path.

### Comments
- Comment the *why*, not the *what*. Well-named identifiers document themselves.
- Public APIs get a doc comment starting with the identifier name.
- Avoid multi-line comment blocks; one short line is almost always enough.

### Packages and dependencies
- Avoid `init()` — it makes code harder to test and reason about.
- Prefer standard library over third-party when the gap is small.
- Never import a package only for its side effects without a comment explaining why.

### References
- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)

## Legacy
The Python/FastAPI implementation was removed on 2026-05-29 after the Go API reached parity. See `docs/superpowers/specs/2026-05-29-go-api-migration-design.md` for the migration spec and `docs/superpowers/plans/2026-05-29-go-api-migration.md` for the implementation plan. Historical Python code lives in earlier git history (commits prior to the cleanup).
