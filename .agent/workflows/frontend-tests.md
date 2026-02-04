---
description: Run frontend unit tests using the agent-friendly configuration
---

# Frontend Testing Workflow

This workflow provides comprehensive guidance on running, writing, and maintaining frontend tests for the Next.js application using Vitest and React Testing Library.

## Overview

Our frontend tests use:
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
cd frontend
// turbo
npm run test:agent
```

This uses a custom temp directory to avoid system permission issues.

### Run Tests in Watch Mode (Development)

```bash
npm run test
```

### Run Specific Test File

```bash
npx vitest run src/components/calendar/CalendarView.test.tsx
```

### Run with Coverage

```bash
npx vitest run --coverage
```

### Run with Verbose Output

```bash
npx vitest run --reporter=verbose
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

### Naming Conventions

- **Component tests**: `ComponentName.test.tsx` (same directory as component)
- **Utility tests**: `utilityName.test.ts` (in `__tests__/` subdirectory)
- **Test suites**: Use `describe()` to group related tests
- **Test cases**: Use `it()` or `test()` for individual tests

---

## Writing Tests

### Basic Test Structure (Utility Function)

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

      const url = getGoogleMapsUrl(location);
      
      expect(url).toBe('https://www.google.com/maps/place/?q=place_id:ChIJ3S-JXmaeRpYRfJRRIGhx1zA');
    });
  });
});
```

### Basic Test Structure (React Component)

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
    const fixedDate = new Date('2026-02-03T12:00:00');
    render(<CalendarView {...defaultProps} currentDate={fixedDate} />);

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

### 1. **Test User Behavior, Not Implementation**

✅ **Good**: Test what users see and do
```typescript
it('shows error message when form is invalid', () => {
  render(<LoginForm />);
  
  const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
  fireEvent.click(submitButton);
  
  expect(screen.getByText(/email es requerido/i)).toBeInTheDocument();
});
```

❌ **Bad**: Test internal state or methods
```typescript
// Don't access component internals
it('sets error state', () => {
  const wrapper = shallow(<LoginForm />);
  wrapper.instance().handleSubmit();
  expect(wrapper.state('error')).toBe('Email required');
});
```

### 2. **Use Testing Library Queries in Order of Priority**

Prefer queries that reflect how users interact with the page:

**Priority Order:**
1. `getByRole` - Best for buttons, inputs, labels (accessibility-friendly)
2. `getByLabelText` - Forms and inputs
3. `getByPlaceholderText` - Inputs with placeholders
4. `getByText` - Non-interactive content
5. `getByTestId` - Last resort only

```typescript
// ✅ Best - Accessible and user-centric
const button = screen.getByRole('button', { name: /guardar/i });

// ✅ Good - Semantic and clear
const emailInput = screen.getByLabelText(/correo electrónico/i);

// ⚠️ Acceptable - Less semantic but clear intent
const nameInput = screen.getByPlaceholderText(/nombre completo/i);

// ❌ Avoid - Not user-centric (use only when necessary)
const element = screen.getByTestId('submit-button');
```

### 3. **Mock Only External Dependencies**

Mock network requests, timers, and external modules - but avoid mocking components or utils you control:

```typescript
// ✅ Good - Mock external APIs
vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: mockData,
    error: null,
    isLoading: false,
  })),
}));

// ✅ Good - Mock CSS imports (they break tests)
vi.mock('./calendar.css', () => ({}));

// ❌ Bad - Don't mock your own utilities (test them instead)
vi.mock('@/lib/formatDate');
```

### 4. **Test Edge Cases and Error States**

Don't just test the happy path:

```typescript
describe('PaymentForm', () => {
  it('handles successful payment registration', () => {
    // Happy path
  });

  it('shows error when amount is negative', () => {
    // Edge case
  });

  it('disables submit button while submitting', () => {
    // Loading state
  });

  it('displays API error message when request fails', () => {
    // Error state
  });
});
```

### 5. **Use `vi.fn()` for Function Props**

Always mock callback props with `vi.fn()` to verify they're called correctly:

```typescript
const mockOnSubmit = vi.fn();

render(<PaymentForm onSubmit={mockOnSubmit} />);

fireEvent.click(screen.getByRole('button', { name: /registrar/i }));

expect(mockOnSubmit).toHaveBeenCalledTimes(1);
expect(mockOnSubmit).toHaveBeenCalledWith({
  amount: 50000,
  sessions: 3,
});
```

### 6. **Avoid Testing Styles**

Don't test CSS values - test visual behavior instead:

```typescript
// ❌ Bad - Testing CSS is brittle
expect(element).toHaveStyle({ color: '#FF0000' });

// ✅ Good - Test that element has the right class
expect(element).toHaveClass('error-message');

// ✅ Better - Test visibility/presence
expect(screen.getByText(/error/i)).toBeInTheDocument();
```

### 7. **Use Descriptive Test Names**

Test names should clearly describe the behavior being tested:

✅ **Good**:
```typescript
it('displays validation error when email is missing');
it('redirects to dashboard after successful login');
it('disables submit button while form is invalid');
```

❌ **Bad**:
```typescript
it('works');
it('test validation');
it('renders correctly');
```

### 8. **Test Accessibility**

Ensure components are accessible:

```typescript
it('has proper ARIA labels', () => {
  render(<DatePicker />);
  
  const dateInput = screen.getByRole('textbox', { name: /fecha/i });
  expect(dateInput).toHaveAttribute('aria-label', 'Seleccionar fecha');
});

it('shows error with appropriate ARIA attributes', () => {
  render(<Form />);
  
  // Submit invalid form
  fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
  
  const errorMessage = screen.getByRole('alert');
  expect(errorMessage).toBeInTheDocument();
});
```

### 9. **Keep Tests Isolated**

Each test should be independent and not rely on others:

```typescript
// ✅ Good - Each test has its own setup
describe('ClientList', () => {
  it('displays clients', () => {
    const clients = [/* mock data */];
    render(<ClientList clients={clients} />);
    // assertions
  });

  it('shows empty state when no clients', () => {
    render(<ClientList clients={[]} />);
    // assertions
  });
});

// ❌ Bad - Shared state between tests
let sharedClients;
beforeAll(() => {
  sharedClients = [/* data */]; // Don't do this
});
```

### 10. **Async Testing**

Use `waitFor` and `findBy` queries for async operations:

```typescript
import { waitFor } from '@testing-library/react';

it('loads and displays client data', async () => {
  render(<ClientDetail id="123" />);

  // Wait for loading to finish
  expect(screen.getByText(/cargando/i)).toBeInTheDocument();

  // Wait for data to appear
  const clientName = await screen.findByText(/Ana García/i);
  expect(clientName).toBeInTheDocument();
});

// Alternative with waitFor
it('updates on data change', async () => {
  render(<Component />);

  fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

  await waitFor(() => {
    expect(screen.getByText(/actualizado/i)).toBeInTheDocument();
  });
});
```

---

## React Best Practices (Performance)

When writing components that will be tested, follow these patterns from Vercel React Best Practices:

### Bundle Size

```typescript
// ✅ Use dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <div>Cargando gráfico...</div>,
});

// ✅ Import directly, avoid barrel files
import { Button } from '@/components/Button';  // Good
import { Button } from '@/components';          // Bad - loads entire index
```

### Re-render Optimization

```typescript
// ✅ Use memo for expensive components
import { memo } from 'react';

export const ExpensiveList = memo(({ items }) => {
  return items.map(item => <ExpensiveItem key={item.id} {...item} />);
});

// ✅ Derive state during render, not in effects
function ClientProfile({ client }) {
  // Good - computed during render
  const age = calculateAge(client.birth_date);
  
  return <div>Edad: {age}</div>;
}

// ❌ Bad - Don't use effect for derived state
function ClientProfile({ client }) {
  const [age, setAge] = useState(0);
  
  useEffect(() => {
    setAge(calculateAge(client.birth_date)); // Unnecessary
  }, [client.birth_date]);
}

// ✅ Use functional setState for stable callbacks
const handleIncrement = useCallback(() => {
  setCount(c => c + 1);  // Stable - doesn't need count in deps
}, []); // Empty deps!
```

### Server/Client Components

```typescript
// ✅ Mark client components explicitly
'use client';

import { useState } from 'react';

export function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// ✅ Server components for data fetching (no 'use client')
export async function ClientList() {
  const clients = await fetchClients();
  return <div>{/* ... */}</div>;
}
```

---

## Common Testing Patterns

### Testing Forms

```typescript
it('validates email format', () => {
  render(<LoginForm />);
  
  const emailInput = screen.getByLabelText(/correo/i);
  const submitButton = screen.getByRole('button', { name: /enviar/i });
  
  fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
  fireEvent.click(submitButton);
  
  expect(screen.getByText(/formato de correo inválido/i)).toBeInTheDocument();
});
```

### Testing Lists

```typescript
it('displays all clients in the list', () => {
  const clients = [
    { id: '1', name: 'Ana García' },
    { id: '2', name: 'Carlos Rodríguez' },
  ];
  
  render(<ClientList clients={clients} />);
  
  expect(screen.getByText('Ana García')).toBeInTheDocument();
  expect(screen.getByText('Carlos Rodríguez')).toBeInTheDocument();
});
```

### Testing Modals

```typescript
it('opens and closes modal', () => {
  render(<PaymentModal />);
  
  // Initially closed
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  
  // Open modal
  fireEvent.click(screen.getByRole('button', { name: /registrar pago/i }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  
  // Close modal
  fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

### Testing SWR Data Fetching

```typescript
import useSWR from 'swr';

vi.mock('swr');

it('displays loading state while fetching', () => {
  (useSWR as any).mockReturnValue({
    data: undefined,
    error: null,
    isLoading: true,
  });
  
  render(<ClientDetail id="123" />);
  
  expect(screen.getByText(/cargando/i)).toBeInTheDocument();
});

it('displays data when loaded', () => {
  (useSWR as any).mockReturnValue({
    data: { name: 'Ana García', email: 'ana@example.com' },
    error: null,
    isLoading: false,
  });
  
  render(<ClientDetail id="123" />);
  
  expect(screen.getByText('Ana García')).toBeInTheDocument();
});
```

---

## Troubleshooting

### "Cannot find module" errors

**Solution**: Check path aliases in `vitest.config.ts`:
```typescript
alias: {
  '@': path.resolve(__dirname, './src'),
}
```

### "process is not defined" in browser environment

**Solution**: Mock Node.js globals or use environment variables properly:
```typescript
// In test file
globalThis.process = { env: { NODE_ENV: 'test' } } as any;
```

### CSS import errors

**Solution**: Mock CSS imports in your test:
```typescript
vi.mock('./styles.css', () => ({}));
```

### "ReferenceError: document is not defined"

**Solution**: Ensure `environment: 'jsdom'` is set in `vitest.config.ts`.

### Permission denied (EPERM) errors

**Solution**: Use the `test:agent` script which uses a local temp directory:
```bash
npm run test:agent
```

---

## Quick Reference

```bash
# Run all tests (agent-friendly)
// turbo
npm run test:agent

# Run tests in watch mode
npm run test

# Run specific file
npx vitest run src/components/MyComponent.test.tsx

# Run with coverage
npx vitest run --coverage

# Debug tests (verbose output)
npx vitest run --reporter=verbose

# Run tests matching pattern
npx vitest run -t "should display"
```

---

## Checklist for Adding New Tests

- [ ] Create test file: `ComponentName.test.tsx` or `utilName.test.ts`
- [ ] Import necessary testing utilities (`describe`, `it`, `expect`, `vi`)
- [ ] Import `render`, `screen`, `fireEvent` from `@testing-library/react`
- [ ] Mock external dependencies (CSS, third-party modules)
- [ ] Use `vi.fn()` for callback props
- [ ] Write descriptive test names in Spanish if user-facing
- [ ] Test happy path (expected behavior)
- [ ] Test edge cases (empty states, errors, validation)
- [ ] Test user interactions (clicks, form inputs, keyboard events)
- [ ] Use accessible queries (`getByRole`, `getByLabelText`)
- [ ] Run tests: `npm run test:agent`
- [ ] Verify all tests pass and are isolated

---

## Summary

Frontend tests should:
- ✅ Test **user behavior** from the user's perspective
- ✅ Use **accessible queries** that reflect how users interact
- ✅ **Mock external dependencies** but test your own code
- ✅ Test **edge cases, errors, and loading states**
- ✅ Remain **isolated and repeatable**
- ✅ Follow **React performance best practices** in components
- ✅ Use **descriptive test names** that explain behavior

**Golden Rule**: If you wouldn't manually test it by clicking/typing in the browser, you probably shouldn't unit test it either. Test what users experience, not implementation details.
