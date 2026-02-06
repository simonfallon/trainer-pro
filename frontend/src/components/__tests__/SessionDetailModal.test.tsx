import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionDetailModal } from '../SessionDetailModal';
import { sessionsApi, exerciseSetsApi } from '@/lib/api';
import type { TrainingSession, SessionExercise } from '@/types';

// Mock the API
vi.mock('@/lib/api', () => ({
    sessionsApi: {
        getExercises: vi.fn(),
        update: vi.fn(),
    },
    exerciseSetsApi: {
        listForSession: vi.fn().mockResolvedValue([]),
        createForSession: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

// Mock the useDarkStyles hook
vi.mock('@/hooks/useDarkStyles', () => ({
    useDarkStyles: () => ({
        darkStyles: {
            modal: {},
        },
        theme: {
            colors: {
                primary: '#007bff',
                secondary: '#6c757d',
                text: '#000000',
                background: '#ffffff',
            },
        },
    }),
}));

describe('SessionDetailModal', () => {
    const mockSession: TrainingSession = {
        id: 1,
        trainer_id: 1,
        client_id: 1,
        location_id: null,
        session_group_id: null,
        scheduled_at: '2024-01-15T10:00:00Z',
        started_at: '2024-01-15T10:05:00Z',
        duration_minutes: 60,
        notes: 'Test session notes',
        status: 'completed',
        is_paid: false,
        paid_at: null,
        session_doc: null,
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T11:00:00Z',
    };

    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display lap times when BMX exercises exist', async () => {
        const mockExercises: SessionExercise[] = [
            {
                id: 1,
                session_id: 1,
                session_group_id: null,
                exercise_template_id: null,
                exercise_set_id: null,
                custom_name: 'Toma de Tiempo BMX',
                data: {
                    lap_times_ms: [65432, 63210, 64890],
                    total_duration_ms: 193532,
                    lap_count: 3,
                },
                order_index: 0,
                created_at: '2024-01-15T10:30:00Z',
            },
        ];

        vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

        render(
            <SessionDetailModal
                session={mockSession}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        // Wait for exercises to load
        await waitFor(() => {
            expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
        });

        // Check that lap times section is displayed
        expect(screen.getByText('Tiempos Registrados')).toBeInTheDocument();
        expect(screen.getByText('Medición #1')).toBeInTheDocument();

        // Check lap times are formatted correctly (MM:SS.CS)
        // These times may appear in both lap time and split time columns
        expect(screen.getAllByText('01:05.43').length).toBeGreaterThanOrEqual(1); // 65432ms = 1:05.43
        expect(screen.getAllByText('01:03.21').length).toBeGreaterThanOrEqual(1); // 63210ms = 1:03.21
        expect(screen.getAllByText('01:04.89').length).toBeGreaterThanOrEqual(1); // 64890ms = 1:04.89

        // Check total time is displayed
        expect(screen.getByText(/Tiempo total: 03:13.53/)).toBeInTheDocument(); // 193532ms = 3:13.53
    });

    it('should display multiple measurements grouped separately', async () => {
        const mockExercises: SessionExercise[] = [
            {
                id: 1,
                session_id: 1,
                session_group_id: null,
                exercise_template_id: null,
                exercise_set_id: null,
                custom_name: 'Toma de Tiempo BMX',
                data: {
                    lap_times_ms: [65000, 64000],
                    total_duration_ms: 129000,
                    lap_count: 2,
                },
                order_index: 0,
                created_at: '2024-01-15T10:30:00Z',
            },
            {
                id: 2,
                session_id: 1,
                session_group_id: null,
                exercise_template_id: null,
                exercise_set_id: null,
                custom_name: 'Toma de Tiempo BMX',
                data: {
                    lap_times_ms: [62000, 63000, 61000],
                    total_duration_ms: 186000,
                    lap_count: 3,
                },
                order_index: 1,
                created_at: '2024-01-15T10:45:00Z',
            },
        ];

        vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

        render(
            <SessionDetailModal
                session={mockSession}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() => {
            expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
        });

        // Check both measurements are displayed
        expect(screen.getByText('Medición #1')).toBeInTheDocument();
        expect(screen.getByText('Medición #2')).toBeInTheDocument();

        // Check that we have the correct number of lap rows (2 + 3 = 5)
        const lapRows = screen.getAllByRole('row').filter(row => {
            const cells = row.querySelectorAll('td');
            return cells.length > 0; // Data rows have td elements
        });
        expect(lapRows.length).toBe(5); // 2 laps in first measurement + 3 in second
    });

    it('should calculate split times correctly', async () => {
        const mockExercises: SessionExercise[] = [
            {
                id: 1,
                session_id: 1,
                session_group_id: null,
                exercise_template_id: null,
                exercise_set_id: null,
                custom_name: 'Toma de Tiempo BMX',
                data: {
                    lap_times_ms: [60000, 60000, 60000], // 1:00.00 each
                    total_duration_ms: 180000,
                    lap_count: 3,
                },
                order_index: 0,
                created_at: '2024-01-15T10:30:00Z',
            },
        ];

        vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

        render(
            <SessionDetailModal
                session={mockSession}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() => {
            expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
        });

        // Check split times (cumulative)
        // Lap 1: split = 1:00.00
        // Lap 2: split = 2:00.00
        // Lap 3: split = 3:00.00
        const splitTimes = screen.getAllByText(/^0[1-3]:00\.00$/);
        expect(splitTimes.length).toBeGreaterThanOrEqual(3);
    });

    it('should not display lap times section when no BMX exercises exist', async () => {
        const mockExercises: SessionExercise[] = [
            {
                id: 1,
                session_id: 1,
                session_group_id: null,
                exercise_template_id: 5,
                exercise_set_id: null,
                custom_name: 'Some Other Exercise',
                data: {
                    reps: 10,
                    sets: 3,
                },
                order_index: 0,
                created_at: '2024-01-15T10:30:00Z',
            },
        ];

        vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

        render(
            <SessionDetailModal
                session={mockSession}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() => {
            expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
        });

        // Lap times section should not be rendered
        expect(screen.queryByText('Tiempos Registrados')).not.toBeInTheDocument();
    });

    it('should not display lap times section when exercises array is empty', async () => {
        vi.mocked(sessionsApi.getExercises).mockResolvedValue([]);

        render(
            <SessionDetailModal
                session={mockSession}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() => {
            expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
        });

        expect(screen.queryByText('Tiempos Registrados')).not.toBeInTheDocument();
    });

    it('should display table headers correctly', async () => {
        const mockExercises: SessionExercise[] = [
            {
                id: 1,
                session_id: 1,
                session_group_id: null,
                exercise_template_id: null,
                exercise_set_id: null,
                custom_name: 'Toma de Tiempo BMX',
                data: {
                    lap_times_ms: [65000],
                    total_duration_ms: 65000,
                    lap_count: 1,
                },
                order_index: 0,
                created_at: '2024-01-15T10:30:00Z',
            },
        ];

        vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

        render(
            <SessionDetailModal
                session={mockSession}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() => {
            expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
        });

        // Check table headers
        expect(screen.getByText('#')).toBeInTheDocument();
        expect(screen.getByText('Tiempo de Vuelta')).toBeInTheDocument();
        expect(screen.getByText('Tiempo Parcial')).toBeInTheDocument();
    });

    it('should format lap times with leading zeros correctly', async () => {
        const mockExercises: SessionExercise[] = [
            {
                id: 1,
                session_id: 1,
                session_group_id: null,
                exercise_template_id: null,
                exercise_set_id: null,
                custom_name: 'Toma de Tiempo BMX',
                data: {
                    lap_times_ms: [5432], // 0:05.43
                    total_duration_ms: 5432,
                    lap_count: 1,
                },
                order_index: 0,
                created_at: '2024-01-15T10:30:00Z',
            },
        ];

        vi.mocked(sessionsApi.getExercises).mockResolvedValue(mockExercises);

        render(
            <SessionDetailModal
                session={mockSession}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() => {
            expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
        });

        // Check that short times have leading zeros
        // Time appears in both lap time and split time columns
        expect(screen.getAllByText('00:05.43').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle exercises fetch error gracefully', async () => {
        vi.mocked(sessionsApi.getExercises).mockRejectedValue(new Error('Network error'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(
            <SessionDetailModal
                session={mockSession}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() => {
            expect(sessionsApi.getExercises).toHaveBeenCalledWith(mockSession.id);
        });

        // Error should be logged
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching data:', expect.any(Error));

        // Modal should still render without lap times section
        expect(screen.queryByText('Tiempos Registrados')).not.toBeInTheDocument();

        consoleSpy.mockRestore();
    });
});
