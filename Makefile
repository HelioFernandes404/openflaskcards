.PHONY: dev up down test lint

# Run the stack for local development. The API and web dev servers must run
# in two separate terminals (Vite's dev server and `go run` both hold the
# foreground), so this target just prints the commands instead of trying to
# background either one.
dev:
	@echo "Run these in two terminals:"
	@echo "  1) make -C apps/api run"
	@echo "  2) cd apps/web && npm install && npm run dev"

up: ## Start the full stack with Docker Compose
	docker compose up -d

down: ## Stop the Docker Compose stack
	docker compose down

test: ## Run API and web unit tests
	$(MAKE) -C apps/api test
	cd apps/web && npm run test:unit

lint: ## Lint API (go vet) and web (Biome)
	$(MAKE) -C apps/api lint-check
	cd apps/web && npm run lint
