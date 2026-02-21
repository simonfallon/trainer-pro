---
description: Run frontend unit tests using the agent-friendly configuration
---

# Frontend Testing Workflow

This workflow provides guidance on running, writing, and maintaining frontend tests for the Next.js application using Vitest and React Testing Library.

## Overview

- **Vitest**: Fast unit test runner with excellent TypeScript support
- **@testing-library/react**: User-centric testing utilities
- **@testing-library/jest-dom**: Custom matchers for DOM assertions
- **jsdom**: Browser environment simulation

**Philosophy**: Test **user behavior**, not implementation details. Focus on what users see and interact with, not internal component state or methods.

---

## Prerequisites

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Test Configuration

The test environment is configured in `vitest.config.ts`:
- Environment: `jsdom` (simulates browser DOM)
- Globals: `true` (enables global test functions)
- Path alias: `@` → `./src`

---

## Running Tests

### Run All Tests

```bash
// turbo
make test-frontend
```

Or, if you're already inside the `frontend/` directory:

```bash
// turbo
npm run test:agent
```

Both use a custom temp directory to avoid system permission issues.

### Other Commands

```bash
npm run test                                                     # Watch mode (development)
npx vitest run src/components/calendar/CalendarView.test.tsx    # Specific file
npx vitest run --coverage                                        # With coverage
npx vitest run --reporter=verbose                                # Verbose output
```

---

## Test File Structure

```
frontend/src/
├── components/
│   └── calendar/
│       ├── CalendarView.tsx
│       └── CalendarView.test.tsx    # Component tests
├── lib/
│   ├── __tests__/
│   │   └── locationUtils.test.ts    # Utility tests
│   └── locationUtils.ts
└── app/
    └── (pages and layouts)
```

**Naming Conventions:**
- Component tests: `ComponentName.test.tsx` (same directory as component)
- Utility tests: `utilityName.test.ts` (in `__tests__/` subdirectory)
- Use `describe()` to group related tests, `it()` or `test()` for individual tests

---

## Writing Tests

### Utility Function

```typescript
import { describe, it, expect } from 'vitest';
import { getGoogleMapsUrl } from '../locationUtils';
import type { Location } from '@/types';

describe('locationUtils', () => {
  describe('getGoogleMapsUrl', () => {
    it('should prioritize Google Place ID over coordinates', () => {
      const location: Location = {
        google_place_id: 'ChIJ3S-JXmaeRpYRfJRRIGhx1zA',
        latitude: 6.243704,
        longitude: -75.4371669,
        // ... other fields
      };
      expect(getGoogleMapsUrl(location)).toBe(
        'https://www.google.com/maps/place/?q=place_id:ChIJ3S-JXmaeRpYRfJRRIGhx1zA'
      );
    });
  });
});
```

### React Component

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarView } from './CalendarView';

describe('CalendarView', () => {
  const defaultProps = {
    sessions: [],
    clients: [],
    currentDate: new Date(),
    onDateChange: vi.fn(),
    onSessionClick: vi.fn(),
  };

  it('renders the current date in header', () => {
    render(<CalendarView {...defaultProps} currentDate={new Date('2026-02-03T12:00:00')} />);
    expect(screen.getByText(/Febrero 2026/i)).toBeInTheDocument();
  });

  it('switches between Week and Day views', () => {
    render(<CalendarView {...defaultProps} />);
    const dayBtn = screen.getByText('Día');
    fireEvent.click(dayBtn);
    expect(dayBtn).toHaveClass('active');
  });
});
```

---

## Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// ✅ Good - Test what users see and do
it('shows error message when form is invalid', () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
  expect(screen.getByText(/email es requerido/i)).toBeInTheDocument();
});
```

### 2. Use Testing Library Queries in Priority Order

1. `getByRole` — buttons, inputs, labels (accessibility-friendly)
2. `getByLabelText` — forms and inputs
3. `getByPlaceholderText` — inputs with placeholders
4. `getByText` — non-interactive content
5. `getByTestId` — last resort only

### 3. Mock Only External Dependencies

```typescript
// ✅ Mock external APIs, not your own utilities
vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: mockData, error: null, isLoading: false })),
}));

// ✅ Mock CSS imports (they break tests)
vi.mock('./calendar.css', () => ({}));
```

### 4. Test Edge Cases and Error States

```typescript
describe('PaymentForm', () => {
  it('handles successful payment registration', () => { /* Happy path */ });
  it('shows error when amount is negative', () => { /* Edge case */ });
  it('disables submit button while submitting', () => { /* Loading state */ });
  it('displays API error message when request fails', () => { /* Error state */ });
});
```

### 5. Use `vi.fn()` for Function Props

```typescript
const mockOnSubmit = vi.fn();
render(<PaymentForm onSubmit={mockOnSubmit} />);
fireEvent.click(screen.getByRole('button', { name: /registrar/i }));
expect(mockOnSubmit).toHaveBeenCalledTimes(1);
expect(mockOnSubmit).toHaveBeenCalledWith({ amount: 50000, sessions: 3 });
```

### 6. Avoid Testing Styles

```typescript
// ❌ Bad - brittle
expect(element).toHaveStyle({ color: '#FF0000' });
// ✅ Good - test class or presence
expect(element).toHaveClass('error-message');
```

### 7. Use Descriptive Test Names

```typescript
// ✅ Good
it('displays validation error when email is missing');
it('redirects to dashboard after successful login');

// ❌ Bad
it('works'); it('test validation'); it('renders correctly');
```

### 8. Keep Tests Isolated

Each test should have its own setup — avoid shared state between tests (`beforeAll` with shared variables).

### 9. Async Testing

```typescript
import { waitFor } from '@testing-library/react';

it('loads and displays client data', async () => {
  render(<ClientDetail id="123" />);
  expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  const clientName = await screen.findByText(/Ana García/i);
  expect(clientName).toBeInTheDocument();
});

it('updates on data change', async () => {
  render(<Component />);
  fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));
  await waitFor(() => {
    expect(screen.getByText(/actualizado/i)).toBeInTheDocument();
  });
});
```

---

## Common Testing Patterns

### Forms

```typescript
it('validates email format', () => {
  render(<LoginForm />);
  fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'invalid-email' } });
  fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
  expect(screen.getByText(/formato de correo inválido/i)).toBeInTheDocument();
});
```

### Lists

```typescript
it('displays all clients in the list', () => {
  const clients = [{ id: '1', name: 'Ana García' }, { id: '2', name: 'Carlos Rodríguez' }];
  render(<ClientList clients={clients} />);
  expect(screen.getByText('Ana García')).toBeInTheDocument();
  expect(screen.getByText('Carlos Rodríguez')).toBeInTheDocument();
});
```

### Modals

```typescript
it('opens and closes modal', () => {
  render(<PaymentModal />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /registrar pago/i }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

### SWR Data Fetching

```typescript
import useSWR from 'swr';
vi.mock('swr');

it('displays loading state while fetching', () => {
  (useSWR as any).mockReturnValue({ data: undefined, error: null, isLoading: true });
  render(<ClientDetail id="123" />);
  expect(screen.getByText(/cargando/i)).toBeInTheDocument();
});

it('displays data when loaded', () => {
  (useSWR as any).mockReturnValue({ data: { name: 'Ana García' }, error: null, isLoading: false });
  render(<ClientDetail id="123" />);
  expect(screen.getByText('Ana García')).toBeInTheDocument();
});
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Cannot find module" | Check path aliases in `vitest.config.ts`: `'@': path.resolve(__dirname, './src')` |
| "process is not defined" | Add `globalThis.process = { env: { NODE_ENV: 'test' } } as any;` to test file |
| CSS import errors | `vi.mock('./styles.css', () => ({}))` |
| "document is not defined" | Ensure `environment: 'jsdom'` is set in `vitest.config.ts` |
| Permission denied (EPERM) | Use `npm run test:agent` which sets a local temp directory |

---

## Quick Reference

> **IMPORTANT FOR AGENTS**: Always use `make test-frontend` from the project root. Do not call `vitest` or `npm test` directly.

```bash
# Run all tests — canonical command for agents (from project root)
// turbo
make test-frontend

# Alternative: run from inside frontend/ directory
// turbo
npm run test:agent

# Run tests in watch mode (local development only)
cd frontend && npm run test

# Run specific test file
cd frontend && npx vitest run src/components/MyComponent.test.tsx

# Run with coverage
cd frontend && npx vitest run --coverage

# Debug tests (verbose output)
cd frontend && npx vitest run --reporter=verbose

# Run tests matching pattern
cd frontend && npx vitest run -t "should display"
```

---

## Checklist for Adding New Tests

- [ ] Create test file: `ComponentName.test.tsx` or `utilName.test.ts`
- [ ] Import testing utilities (`describe`, `it`, `expect`, `vi`)
- [ ] Import `render`, `screen`, `fireEvent` from `@testing-library/react`
- [ ] Mock external dependencies (CSS, third-party modules)
- [ ] Use `vi.fn()` for callback props
- [ ] Write descriptive test names in Spanish if user-facing
- [ ] Test happy path, edge cases, and error states
- [ ] Use accessible queries (`getByRole`, `getByLabelText`)
// turbo
- [ ] Run `make test-frontend` to verify all tests pass
