.PHONY: help run build test test-cov sqlc-gen migrate-up migrate-up-local migrate-hash lint-check type-check

# apps/api is intentionally excluded from the root go.work workspace, so all
# go commands here must run with the workspace disabled.
GO := GOWORK=off go

# Atlas migration directory and DB connection (override DATABASE_URL as needed).
MIGRATIONS_DIR := file://migrations
DATABASE_URL ?= postgres://postgres:postgres@localhost:5432/cogcs?sslmode=disable

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

run: ## Download deps and run the API on port 3030
	$(GO) mod download
	$(GO) run ./cmd/api

build: ## Build the API binary
	$(GO) build ./...

test: ## Run Go unit tests (short)
	$(GO) test ./... -short -count=1

test-cov: ## Run unit tests with coverage
	$(GO) test ./... -short -count=1 -coverprofile=coverage.out

lint-check: ## Run go vet static analysis
	$(GO) vet ./...

type-check: ## Verify API compiles (Go type check)
	$(GO) build ./...

sqlc-gen: ## Regenerate sqlc code from queries/ (requires sqlc on PATH)
	sqlc generate

migrate-up: ## Apply Atlas migrations (Docker Compose migrate service)
	cd ../.. && docker compose run --rm migrate

migrate-up-local: ## Apply Atlas migrations locally (requires atlas on PATH; set DATABASE_URL)
	atlas migrate apply --dir $(MIGRATIONS_DIR) --url "$(DATABASE_URL)"

migrate-hash: ## Recompute migrations atlas.sum (requires atlas on PATH)
	atlas migrate hash --dir $(MIGRATIONS_DIR)
