import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientDetailPage from './page';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/navigation
const mockRouterBack = vi.fn();
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
    useParams: () => ({ id: '1' }),
    useRouter: () => ({ back: mockRouterBack, push: mockRouterPush }),
    useSearchParams: () => new URLSearchParams('app_id=1'),
}));

// Theme
vi.mock('@/components/ThemeProvider', () => ({
    useTheme: () => ({
        theme: {
            colors: {
                primary: '#3b82f6',
                secondary: '#6b7280',
                background: '#ffffff',
                text: '#111827',
            },
        },
    }),
}));

// API — only the mutation methods need mocking; reads go through useSWR
const mockTogglePayment = vi.fn().mockResolvedValue({});
const mockRegisterPayment = vi.fn().mockResolvedValue({});
const mockUpdateSession = vi.fn().mockResolvedValue({});
vi.mock('@/lib/api', () => ({
    clientsApi: {
        registerPayment: (...args: unknown[]) => mockRegisterPayment(...args),
    },
    sessionsApi: {
        togglePayment: (...args: unknown[]) => mockTogglePayment(...args),
        update: (...args: unknown[]) => mockUpdateSession(...args),
    },
}));

// SWR — route by key; each test can override via mockSWRResponses
const mockMutate = vi.fn();
let mockSWRResponses: Record<string, { data?: unknown; error?: unknown; isLoading?: boolean }> = {};

vi.mock('swr', () => ({
    __esModule: true,
    default: (key: string) => ({
        data: mockSWRResponses[key]?.data,
        error: mockSWRResponses[key]?.error ?? null,
        isLoading: mockSWRResponses[key]?.isLoading ?? false,
    }),
    mutate: (...args: unknown[]) => mockMutate(...args),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockClient = {
    id: 1,
    trainer_id: 1,
    name: 'María García',
    phone: '+57 300 123 4567',
    email: 'maria@example.com',
    notes: 'Necesita calentamiento extra',
    default_location_id: null,
    google_id: null,
    photo_url: null,
    birth_date: '1990-05-15',
    gender: 'Femenino',
    height_cm: 165,
    weight_kg: 58,
    age: 35,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const mockSessions = [
    {
        id: 1,
        trainer_id: 1,
        client_id: 1,
        location_id: null,
        scheduled_at: '2026-01-20T10:00:00Z',
        duration_minutes: 60,
        notes: null,
        status: 'completed' as const,
        is_paid: true,
        paid_at: '2026-01-21T00:00:00Z',
        session_doc: null,
        created_at: '2026-01-19T00:00:00Z',
        updated_at: '2026-01-20T11:00:00Z',
    },
    {
        id: 2,
        trainer_id: 1,
        client_id: 1,
        location_id: null,
        scheduled_at: '2026-02-03T14:00:00Z',
        duration_minutes: 45,
        notes: 'Sesión de seguimiento',
        status: 'scheduled' as const,
        is_paid: false,
        paid_at: null,
        session_doc: null,
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
    },
];

const mockBalance = {
    total_sessions: 2,
    paid_sessions: 1,
    unpaid_sessions: 1,
    prepaid_sessions: 0,
    has_positive_balance: false,
};

// Helper: set all three SWR keys to the happy-path defaults
function setHappyPath() {
    mockSWRResponses = {
        '/clients/1': { data: mockClient },
        '/clients/1/sessions': { data: mockSessions },
        '/clients/1/payment-balance': { data: mockBalance },
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClientDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setHappyPath();
    });

    // 1. Renders client name in hero
    it('muestra el nombre del cliente en el banner hero', () => {
        render(<ClientDetailPage />);
        expect(screen.getByText('María García')).toBeInTheDocument();
    });

    // 2. Metric cards show correct values
    it('muestra las tarjetas de métricas con valores correctos', () => {
        render(<ClientDetailPage />);

        // Card 1: "Sesiones Pagadas" → paid / total = "1 / 2"
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
        expect(screen.getByText('Sesiones Pagadas')).toBeInTheDocument();

        // Card 2: "Balance de Pagos" → completed-paid / completed-unpaid
        expect(screen.getByText('1 pagadas')).toBeInTheDocument();
        expect(screen.getByText('0 pendientes')).toBeInTheDocument();
        expect(screen.getByText('Balance de Pagos')).toBeInTheDocument();
    });

    // 3. Personal info fields render
    it('muestra los campos de información personal', () => {
        render(<ClientDetailPage />);

        expect(screen.getByText('Edad')).toBeInTheDocument();
        expect(screen.getByText('35 años')).toBeInTheDocument();
        expect(screen.getByText('Género')).toBeInTheDocument();
        expect(screen.getByText('Femenino')).toBeInTheDocument();
        expect(screen.getByText('Altura')).toBeInTheDocument();
        expect(screen.getByText('165 cm')).toBeInTheDocument();
        expect(screen.getByText('Peso')).toBeInTheDocument();
        expect(screen.getByText('58 kg')).toBeInTheDocument();
        // Notes block
        expect(screen.getByText('Necesita calentamiento extra')).toBeInTheDocument();
    });

    // 4. Sessions table shows Spanish status labels and "Más Info" buttons
    it('muestra las etiquetas de estado en español y los botones "Más Info"', () => {
        render(<ClientDetailPage />);

        expect(screen.getByText('Completada')).toBeInTheDocument();
        expect(screen.getByText('Programada')).toBeInTheDocument();

        const moreInfoButtons = screen.getAllByText('Más Info');
        expect(moreInfoButtons).toHaveLength(2);
    });

    // 5. Clicking the unpaid toggle calls togglePayment and mutates both keys
    it('al hacer clic en el toggle de pago no pagado llama a togglePayment y ejecuta mutate', async () => {
        render(<ClientDetailPage />);

        // session-2 is unpaid → aria-label = "Marcar como pagado"
        const toggle = screen.getByLabelText('Marcar como pagado');
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(mockTogglePayment).toHaveBeenCalledWith(2);
        });

        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith('/clients/1/sessions');
            expect(mockMutate).toHaveBeenCalledWith('/clients/1/payment-balance');
        });
    });

    // 6. PaymentModal opens and closes
    it('el modal de pagos se abre al hacer clic en "Registrar Pagos" y se cierra con ×', () => {
        render(<ClientDetailPage />);

        // Open
        fireEvent.click(screen.getByText('Registrar Pagos'));
        expect(screen.getByText(/Registrar Pago — María García/)).toBeInTheDocument();

        // Close via × button inside the modal
        const closeBtn = screen.getByRole('button', { name: /×/ });
        fireEvent.click(closeBtn);
        expect(screen.queryByText(/Registrar Pago — María García/)).not.toBeInTheDocument();
    });

    // 7. Loading state
    it('muestra "Cargando…" cuando el cliente está siendo cargado', () => {
        mockSWRResponses['/clients/1'] = { isLoading: true };
        render(<ClientDetailPage />);

        expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    // 8. Error state
    it('muestra mensaje de error cuando la carga del cliente falla', () => {
        mockSWRResponses['/clients/1'] = { error: new Error('Network error') };
        render(<ClientDetailPage />);

        expect(screen.getByText('Error al cargar el cliente')).toBeInTheDocument();
    });
});
