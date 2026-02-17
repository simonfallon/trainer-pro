#!/bin/bash

# Pre-commit hook: lint (with auto-fix) + tests for changed services

EXIT_CODE=0

# Check if there are staged changes in backend
if git diff --cached --name-only | grep -q "^backend/"; then
    echo "==> Backend: linting with ruff..."
    (cd backend && poetry run ruff check --fix . && poetry run ruff format .)
    # Re-stage any auto-fixed files
    git diff --cached --name-only | grep "^backend/" | xargs git add

    echo "==> Backend: running tests..."
    (cd backend && poetry run pytest -q)
    if [ $? -ne 0 ]; then
        echo "Backend tests failed!"
        EXIT_CODE=1
    else
        echo "Backend tests passed."
    fi
else
    echo "No backend changes, skipping."
fi

# Check if there are staged changes in frontend
if git diff --cached --name-only | grep -q "^frontend/"; then
    echo "==> Frontend: formatting with prettier..."
    (cd frontend && npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}" 2>/dev/null)
    # Re-stage any auto-fixed files
    git diff --cached --name-only | grep "^frontend/" | xargs git add

    echo "==> Frontend: running tests..."
    (cd frontend && npm test)
    if [ $? -ne 0 ]; then
        echo "Frontend tests failed!"
        EXIT_CODE=1
    else
        echo "Frontend tests passed."
    fi
else
    echo "No frontend changes, skipping."
fi

exit $EXIT_CODE
