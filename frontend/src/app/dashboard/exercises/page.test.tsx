import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExercisesPage from './page';
import { mutate } from 'swr';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/navigation
vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/exercises',
    useSearchParams: () => new URLSearchParams('app_id=1'),
}));

// Mock app and trainer
const mockApp = {
    id: 1,
    trainer_id: 1,
    name: 'BMX Pro',
    theme_id: 'bmx',
    theme_config: {
        colors: {
            primary: '#3b82f6',
            secondary: '#6b7280',
            background: '#ffffff',
            text: '#111827',
        },
        fonts: {
            heading: 'Inter',
            body: 'Inter',
        },
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const mockTrainer = {
    id: 1,
    name: 'Juan Pérez',
    phone: '+57 300 123 4567',
    email: 'juan@example.com',
    google_id: null,
    logo_url: null,
    discipline_type: 'BMX',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

vi.mock('@/hooks/useDashboardApp', () => ({
    useDashboardApp: () => ({ app: mockApp, trainer: mockTrainer }),
}));

// API — only the mutation methods need mocking; reads go through useSWR
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api', () => ({
    exerciseTemplatesApi: {
        list: vi.fn(),
        create: (...args: any[]) => mockCreate(...args),
        update: (...args: any[]) => mockUpdate(...args),
        delete: (...args: any[]) => mockDelete(...args),
    },
}));

// SWR
vi.mock('swr', async () => {
    const actual = await vi.importActual('swr');
    return {
        ...actual,
        default: () => ({
            data: [
                {
                    id: 1,
                    trainer_app_id: 1,
                    name: 'Sentadillas',
                    discipline_type: 'Fisioterapia',
                    field_schema: {
                        repeticiones: { type: 'number', label: 'Repeticiones', required: true },
                        series: { type: 'number', label: 'Series', required: true },
                    },
                    usage_count: 5,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                },
                {
                    id: 2,
                    trainer_app_id: 1,
                    name: 'Saltos de Caja',
                    discipline_type: 'BMX',
                    field_schema: {
                        runs: { type: 'number', label: 'Runs', required: true },
                    },
                    usage_count: 3,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                },
            ],
            isLoading: false,
        }),
        mutate: vi.fn(),
    };
});

vi.mocked(mutate);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExercisesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue({ id: 3 });
        mockUpdate.mockResolvedValue({});
        mockDelete.mockResolvedValue({});
    });

    // 1. Renders page title and add button
    it('muestra el título "Ejercicios" y el botón "+ Agregar Ejercicio"', () => {
        render(<ExercisesPage />);
        expect(screen.getByText('Ejercicios')).toBeInTheDocument();
        expect(screen.getByText('+ Agregar Ejercicio')).toBeInTheDocument();
    });

    // 2. Renders table with correct columns
    it('muestra la tabla con las columnas correctas', () => {
        render(<ExercisesPage />);
        expect(screen.getByText('Nombre')).toBeInTheDocument();
        expect(screen.getByText('Detalles')).toBeInTheDocument();
        expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    // 3. Displays exercise data in table
    it('muestra los ejercicios en la tabla con valores correctos', () => {
        render(<ExercisesPage />);

        expect(screen.getByText('Sentadillas')).toBeInTheDocument();
        expect(screen.getByText('Ver Detalles (2)')).toBeInTheDocument();

        expect(screen.getByText('Saltos de Caja')).toBeInTheDocument();
        expect(screen.getByText('Ver Detalles (1)')).toBeInTheDocument();
    });

    // 4. Opens view schema modal
    it('abre el modal de ver campos al hacer clic en "Ver Detalles"', () => {
        render(<ExercisesPage />);

        const viewButtons = screen.getAllByText(/Ver Detalles/);
        fireEvent.click(viewButtons[0]);

        expect(screen.getByText('Detalles de "Sentadillas"')).toBeInTheDocument();
        expect(screen.getByText('Repeticiones')).toBeInTheDocument();
        expect(screen.getByText('Series')).toBeInTheDocument();
    });

    // 5. Closes schema modal
    it('cierra el modal de campos al hacer clic en Cerrar', () => {
        render(<ExercisesPage />);

        const viewButtons = screen.getAllByText(/Ver Detalles/);
        fireEvent.click(viewButtons[0]);

        expect(screen.getByText('Detalles de "Sentadillas"')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cerrar'));

        expect(screen.queryByText('Detalles de "Sentadillas"')).not.toBeInTheDocument();
    });

    // 6. Opens create modal with default fields
    it('abre el modal de crear con campos por defecto para BMX', () => {
        render(<ExercisesPage />);

        fireEvent.click(screen.getByText('+ Agregar Ejercicio'));

        expect(screen.getByText('Agregar Nuevo Ejercicio')).toBeInTheDocument();
        expect(screen.getByLabelText('Nombre *')).toBeInTheDocument();

        // Should have default BMX fields
        expect(screen.getByDisplayValue('runs')).toBeInTheDocument();
        expect(screen.getByDisplayValue('duracion_total')).toBeInTheDocument();
    });

    // 7. Can add a new field
    it('permite agregar un nuevo campo', () => {
        render(<ExercisesPage />);

        fireEvent.click(screen.getByText('+ Agregar Ejercicio'));

        const addFieldButton = screen.getByText('+ Agregar Detalle');
        fireEvent.click(addFieldButton);

        expect(screen.getByDisplayValue('campo_3')).toBeInTheDocument();
    });

    // 8. Can remove a field
    it('permite eliminar un campo', () => {
        render(<ExercisesPage />);

        fireEvent.click(screen.getByText('+ Agregar Ejercicio'));

        // Get all remove buttons (×)
        const removeButtons = screen.getAllByTitle('Eliminar campo');
        expect(removeButtons.length).toBeGreaterThan(0);

        fireEvent.click(removeButtons[0]);

        // Should have one less field
        expect(screen.getAllByTitle('Eliminar campo').length).toBe(removeButtons.length - 1);
    });

    // 9. Creates new exercise with fields
    it('crea un nuevo ejercicio con campos', async () => {
        render(<ExercisesPage />);

        fireEvent.click(screen.getByText('+ Agregar Ejercicio'));

        const nameInput = screen.getByLabelText('Nombre *');
        fireEvent.change(nameInput, { target: { value: 'Salto Largo' } });

        const submitButton = screen.getByText('Agregar Ejercicio');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockCreate).toHaveBeenCalledWith({
                trainer_app_id: 1,
                name: 'Salto Largo',
                discipline_type: 'BMX',
                field_schema: {
                    runs: { type: 'number', label: 'Runs', required: true },
                    duracion_total: { type: 'duration', label: 'Duración Total', required: true },
                },
            });
        });

        await waitFor(() => {
            expect(mutate).toHaveBeenCalledWith('/exercise-templates-1');
        });
    });

    // 10. Opens edit modal with pre-filled data
    it('abre el modal de editar con datos prellenados', () => {
        render(<ExercisesPage />);

        const editButtons = screen.getAllByText('Editar');
        fireEvent.click(editButtons[0]);

        expect(screen.getByText('Editar Ejercicio')).toBeInTheDocument();

        const nameInput = screen.getByLabelText('Nombre *') as HTMLInputElement;
        expect(nameInput.value).toBe('Sentadillas');

        expect(screen.getByDisplayValue('repeticiones')).toBeInTheDocument();
        expect(screen.getByDisplayValue('series')).toBeInTheDocument();
    });

    // 11. Updates exercise
    it('actualiza un ejercicio', async () => {
        render(<ExercisesPage />);

        const editButtons = screen.getAllByText('Editar');
        fireEvent.click(editButtons[0]);

        const nameInput = screen.getByLabelText('Nombre *');
        fireEvent.change(nameInput, { target: { value: 'Sentadillas Modificadas' } });

        const submitButton = screen.getByText('Actualizar');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith(1, {
                name: 'Sentadillas Modificadas',
                field_schema: {
                    repeticiones: { type: 'number', label: 'Repeticiones', required: true },
                    series: { type: 'number', label: 'Series', required: true },
                },
            });
        });

        await waitFor(() => {
            expect(mutate).toHaveBeenCalledWith('/exercise-templates-1');
        });
    });

    // 12. Deletes exercise after confirmation
    it('elimina un ejercicio después de confirmar', async () => {
        window.confirm = vi.fn(() => true);

        render(<ExercisesPage />);

        const deleteButtons = screen.getAllByText('Eliminar');
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(mockDelete).toHaveBeenCalledWith(1);
        });

        await waitFor(() => {
            expect(mutate).toHaveBeenCalledWith('/exercise-templates-1');
        });
    });

    // 13. Does not save fields with empty labels
    it('no guarda campos con etiquetas vacías', async () => {
        render(<ExercisesPage />);

        fireEvent.click(screen.getByText('+ Agregar Ejercicio'));

        // Add a new field
        fireEvent.click(screen.getByText('+ Agregar Detalle'));

        // Leave the label empty for the new field
        const nameInput = screen.getByLabelText('Nombre *');
        fireEvent.change(nameInput, { target: { value: 'Test Exercise' } });

        const submitButton = screen.getByText('Agregar Ejercicio');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockCreate).toHaveBeenCalledWith({
                trainer_app_id: 1,
                name: 'Test Exercise',
                discipline_type: 'BMX',
                field_schema: {
                    // Only the default fields with labels should be saved
                    runs: { type: 'number', label: 'Runs', required: true },
                    duracion_total: { type: 'duration', label: 'Duración Total', required: true },
                },
            });
        });
    });
});
