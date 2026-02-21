.PHONY: help install hooks db-up db-down db-reset migrate seed backend frontend test-backend test-frontend lint

# Ensure Poetry always uses the project venv, not a stale $VIRTUAL_ENV
unexport VIRTUAL_ENV

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# --- Setup ---

install: ## Install all dependencies + git hooks
	cd backend && poetry install
	cd frontend && npm install
	$(MAKE) hooks

hooks: ## Install git pre-commit hook
	ln -sf ../../scripts/pre-commit.sh .git/hooks/pre-commit
	chmod +x scripts/pre-commit.sh

# --- Database ---

db-up: ## Start PostgreSQL container
	docker-compose up -d postgres

db-down: ## Stop all Docker services
	docker-compose down

db-reset: db-down ## Reset database (destroy data, recreate)
	docker volume rm trainer-pro_postgres_data || true
	$(MAKE) db-up
	@sleep 3
	$(MAKE) migrate

migrate: ## Run database migrations
	cd backend && poetry run alembic upgrade head

seed: ## Seed database with test data
	cd backend && poetry run python scripts/seed_data.py

# --- Development ---

backend: ## Start backend dev server
	cd backend && poetry run uvicorn app.main:app --reload --port 8000

frontend: ## Start frontend dev server
	cd frontend && npm run dev

# --- Testing ---

test-backend: ## Run backend tests
	cd backend && poetry run pytest -v --ignore=.env

test-frontend: ## Run frontend tests
	cd frontend && npm run test:agent

# --- Code Quality ---

lint: ## Lint + format all code (backend + frontend)
	cd backend && poetry run ruff format .
	cd backend && poetry run ruff check --fix .
	cd frontend && npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}"
