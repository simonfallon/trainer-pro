---
description: Run E2E tests with dev auth bypass for agents
---

# E2E Testing Workflow

This workflow enables autonomous agent E2E testing by bypassing Google OAuth authentication.

## Prerequisites

1. **Dev auth must be enabled** in backend/.env:
   ```bash
   DEV_AUTH_BYPASS=true
   DEV_TRAINER_ID=00000000-0000-0000-0000-000000000001
   ```

2. **Frontend dev bypass enabled** in frontend/.env.local:
   ```bash
   NEXT_PUBLIC_DEV_AUTH_BYPASS=true
   ```

3. **Test data must be seeded**:
   // turbo
   ```bash
   cd backend && poetry run python scripts/seed_data.py
   ```

4. **Servers must be running**:
   - Backend: `cd backend && poetry run uvicorn app.main:app --reload --port 8000`
   - Frontend: `cd frontend && npm run dev`

## Testing Steps

### Step 1: Dev Login
// turbo
1. Navigate to http://localhost:3000
2. Click the "🔧 Dev Login (Testing)" button
3. Verify redirect to `/dashboard?app_id=00000000-0000-0000-0000-000000000002`

### Step 2: Test Clients List
// turbo
1. Navigate to http://localhost:3000/dashboard/clients?app_id=00000000-0000-0000-0000-000000000002
2. Verify 4 clients are displayed:
   - Ana García
   - Carlos Rodríguez
   - María López  
   - Juan Pérez
3. Verify client rows are clickable with hover effect

### Step 3: Test Client Detail Page
// turbo
1. Click on "Ana García" row
2. Verify redirect to `/dashboard/clients/00000000-0000-0000-0000-000000000021`
3. **Verify sections are present:**
   - Profile card with name, phone, email
   - Personal info card (age, gender, height, weight)
   - Payment balance card (should show status)
   - Sessions table with multiple sessions

### Step 4: Test Payment Balance
// turbo
1. On Ana García's detail page, check payment balance card
2. Should display either:
   - Green: "X sesiones prepagadas" (if positive balance)
   - Red: "X sesiones pendientes de pago" (if unpaid sessions)
   - Gray: "Todos los pagos al día" (if all paid)

### Step 5: Test Payment Toggle
// turbo
1. In the sessions table, find an unpaid session (✗ icon)
2. Click the ✗ icon
3. Verify it changes to ✓
4. Click again to toggle back

### Step 6: Test Session Detail Modal
// turbo
1. Click "Más Info" button on any session
2. Verify modal opens with:
   - Session date and duration
   - Payment status
   - Session notes (if any)
   - Session documentation textarea
3. Edit session_doc field
4. Click "Guardar"
5. Verify modal closes

### Step 7: Test Payment Registration Modal
// turbo
1. Click "Registrar Pagos" button
2. Verify modal opens
3. Enter:
   - Number of sessions: 3
   - Amount per session: 50000
4. Verify total displays: $150,000 COP
5. Click "Registrar Pago"
6. Verify:
   - Balance updates
   - Oldest unpaid sessions now marked as paid

### Step 8: Test Client Navigation
// turbo
1. Test different clients:
   - Carlos Rodríguez (ID: 00000000-0000-0000-0000-000000000022)
   - María López (ID: 00000000-0000-0000-0000-000000000023)
2. Verify each client's data loads correctly

## Expected Test Data

**Trainer:**
- ID: `00000000-0000-0000-0000-000000000001`
- Name: "Test Trainer"

**App:**
- ID: `00000000-0000-0000-0000-000000000002`
- Name: "Test Training App"

**Clients:**
- Ana García (full profile data)
- Carlos Rodríguez (partial profile)
- María López (minimal data)
- Juan Pérez (basic data)

**Sessions:**
- 9 total sessions across clients
- Mix of paid/unpaid
- Mix of completed/scheduled/cancelled
- Some with session_doc

## Troubleshooting

**"Application not found" error:**
- Run seed script: `cd backend && poetry run python scripts/seed_data.py`

**"Dev trainer not found":**
- Check DEV_AUTH_BYPASS=true in backend/.env
- Check DEV_TRAINER_ID matches seed data
- Restart backend server

**Dev login button not visible:**
- Check NEXT_PUBLIC_DEV_AUTH_BYPASS=true in frontend/.env.local  
- Restart frontend server

**API errors:**
- Check backend is running on port 8000
- Check browser console for specific error messages
- Verify database connection

## Security Notes

> [!CAUTION]
> **Production Safety**: Dev auth bypass is ONLY for local development/testing.
> - Must set `DEV_AUTH_BYPASS=false` in production
> - Endpoint returns 404 when disabled
> - Never deploy with dev auth enabled

## Re-seeding Data

If test data gets corrupted or you need fresh data:

```bash
# Re-seed (script is idempotent - safe to run multiple times)
cd backend && poetry run python scripts/seed_data.py
```

The script will skip existing data and only create missing records.