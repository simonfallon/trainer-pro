import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotesModal } from '../NotesModal';
import { sessionsApi } from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
    sessionsApi: {
        saveClientNotes: vi.fn(),
    },
}));

describe('NotesModal', () => {
    const mockClient = {
        id: 1,
        trainer_id: 1,
        name: 'Test Client',
        phone: '555-0000',
        email: null,
        notes: null,
        default_location_id: null,
        google_id: null,
        photo_url: null,
        birth_date: null,
        gender: null,
        height_cm: null,
        weight_kg: null,
        age: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
    };

    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render with client name in title', () => {
        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText(`Notas para ${mockClient.name}`)).toBeInTheDocument();
    });

    it('should display initial notes when provided', () => {
        const initialNotes = 'Cliente mejoró resistencia en esta sesión';

        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                initialNotes={initialNotes}
                onClose={mockOnClose}
            />
        );

        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).toBe(initialNotes);
    });

    it('should display empty textarea when no initial notes provided', () => {
        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
            />
        );

        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).toBe('');
    });

    it('should update notes when user types', () => {
        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
            />
        );

        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        const newNotes = 'Nuevas notas del entrenador';

        fireEvent.change(textarea, { target: { value: newNotes } });

        expect(textarea.value).toBe(newNotes);
    });

    it('should call saveClientNotes API when saving', async () => {
        const mockSaveClientNotes = vi.mocked(sessionsApi.saveClientNotes);
        mockSaveClientNotes.mockResolvedValue({} as any);

        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const textarea = screen.getByRole('textbox');
        const saveButton = screen.getByText('Guardar');
        const newNotes = 'Cliente mostró mejora significativa';

        fireEvent.change(textarea, { target: { value: newNotes } });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockSaveClientNotes).toHaveBeenCalledWith(1, mockClient.id, newNotes);
        });
    });

    it('should call onSave callback after successful save', async () => {
        const mockSaveClientNotes = vi.mocked(sessionsApi.saveClientNotes);
        mockSaveClientNotes.mockResolvedValue({} as any);

        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const textarea = screen.getByRole('textbox');
        const saveButton = screen.getByText('Guardar');

        fireEvent.change(textarea, { target: { value: 'Test notes' } });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
        });
    });

    it('should close modal after successful save', async () => {
        const mockSaveClientNotes = vi.mocked(sessionsApi.saveClientNotes);
        mockSaveClientNotes.mockResolvedValue({} as any);

        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const textarea = screen.getByRole('textbox');
        const saveButton = screen.getByText('Guardar');

        fireEvent.change(textarea, { target: { value: 'Test notes' } });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('should display error message when save fails', async () => {
        const mockSaveClientNotes = vi.mocked(sessionsApi.saveClientNotes);
        const errorMessage = 'Error al guardar las notas';
        mockSaveClientNotes.mockRejectedValue(new Error(errorMessage));

        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
            />
        );

        const textarea = screen.getByRole('textbox');
        const saveButton = screen.getByText('Guardar');

        fireEvent.change(textarea, { target: { value: 'Test notes' } });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });

    it('should not close modal when save fails', async () => {
        const mockSaveClientNotes = vi.mocked(sessionsApi.saveClientNotes);
        const errorMessage = 'Save failed';
        mockSaveClientNotes.mockRejectedValue(new Error(errorMessage));

        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
            />
        );

        const textarea = screen.getByRole('textbox');
        const saveButton = screen.getByText('Guardar');

        fireEvent.change(textarea, { target: { value: 'Test notes' } });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });

        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', () => {
        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
            />
        );

        const cancelButton = screen.getByText('Cancelar');
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when clicking outside (on overlay)', () => {
        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
            />
        );

        const overlay = screen.getByText(`Notas para ${mockClient.name}`).closest('.modal-overlay');
        if (overlay) {
            fireEvent.click(overlay);
            expect(mockOnClose).toHaveBeenCalled();
        }
    });

    it('should persist existing notes after reopening', async () => {
        const existingNotes = 'Notas guardadas previamente';

        // First render with existing notes
        const { rerender } = render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                initialNotes={existingNotes}
                onClose={mockOnClose}
            />
        );

        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).toBe(existingNotes);

        // Close the modal
        const cancelButton = screen.getByText('Cancelar');
        fireEvent.click(cancelButton);

        // Reopen with the same existing notes (simulating persistence)
        rerender(
            <NotesModal
                sessionId={1}
                client={mockClient}
                initialNotes={existingNotes}
                onClose={mockOnClose}
            />
        );

        const textareaReopened = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textareaReopened.value).toBe(existingNotes);
    });

    it('should update notes and save successfully', async () => {
        const mockSaveClientNotes = vi.mocked(sessionsApi.saveClientNotes);
        mockSaveClientNotes.mockResolvedValue({} as any);

        const initialNotes = 'Notas iniciales';
        const updatedNotes = 'Notas iniciales con cambios adicionales';

        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                initialNotes={initialNotes}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).toBe(initialNotes);

        // Update the notes
        fireEvent.change(textarea, { target: { value: updatedNotes } });
        expect(textarea.value).toBe(updatedNotes);

        // Save the updated notes
        const saveButton = screen.getByText('Guardar');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockSaveClientNotes).toHaveBeenCalledWith(1, mockClient.id, updatedNotes);
            expect(mockOnSave).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('should disable save button while saving', async () => {
        const mockSaveClientNotes = vi.mocked(sessionsApi.saveClientNotes);
        // Create a promise that we can control
        let resolveSave: () => void;
        const savePromise = new Promise<any>((resolve) => {
            resolveSave = () => resolve({});
        });
        mockSaveClientNotes.mockReturnValue(savePromise);

        render(
            <NotesModal
                sessionId={1}
                client={mockClient}
                onClose={mockOnClose}
            />
        );

        const textarea = screen.getByRole('textbox');
        const saveButton = screen.getByText('Guardar') as HTMLButtonElement;

        fireEvent.change(textarea, { target: { value: 'Test notes' } });
        fireEvent.click(saveButton);

        // Button should be disabled and show "Guardando..."
        await waitFor(() => {
            expect(saveButton).toBeDisabled();
            expect(saveButton.textContent).toBe('Guardando...');
        });

        // Resolve the save
        resolveSave!();

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
