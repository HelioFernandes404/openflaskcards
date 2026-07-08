.PHONY: help test test-watch test-seed lint typecheck check-api

# Variables
API_URL := http://localhost:3030
API_HEALTH := $(API_URL)/health
SHELL := /bin/bash

help: ## Show this help message
	@echo -e "\033[0;32mAvailable targets:\033[0m"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[0;33m%-20s\033[0m %s\n", $$1, $$2}'

check-api: ## Check if API is running
	@echo -e "\033[0;33mChecking API...\033[0m"
	@curl -s -o /dev/null -w "%{http_code}" $(API_HEALTH) 2>/dev/null | grep -q 200 && echo -e "\033[0;32mAPI is running!\033[0m" || echo -e "\033[0;31mAPI not running on port 3030!\033[0m"

test-seed: ## Seed test database
	@echo -e "\033[0;32mSeeding test database...\033[0m"
	npm run test:seed

test: ## Run unit tests (Vitest)
	npm run test:unit

test-watch: ## Run unit tests in watch mode
	npx vitest

lint: ## Lint with biome
	npm run lint

typecheck: ## TypeScript build check
	npm run typecheck
