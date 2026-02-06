#!/bin/bash

# Pre-commit hook to run backend and frontend tests based on changes

EXIT_CODE=0

# Check if there are staged changes in backend
if git diff --cached --name-only | grep -q "^backend/"; then
    echo "Running backend tests..."
    (cd backend && poetry run pytest)
    if [ $? -ne 0 ]; then
        echo "Backend tests failed!"
        EXIT_CODE=1
    else
        echo "Backend tests passed."
    fi
else
    echo "No backend changes detected, skipping backend tests."
fi

# Check if there are staged changes in frontend
if git diff --cached --name-only | grep -q "^frontend/"; then
    echo "Running frontend tests..."
    (cd frontend && npm test)
    if [ $? -ne 0 ]; then
        echo "Frontend tests failed!"
        EXIT_CODE=1
    else
        echo "Frontend tests passed."
    fi
else
    echo "No frontend changes detected, skipping frontend tests."
fi

# Return the exit code
exit $EXIT_CODE
