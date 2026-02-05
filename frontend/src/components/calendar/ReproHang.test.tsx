
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionModal } from './SessionModal';

// Mock CSS
vi.mock('./calendar.css', () => ({}));

describe('ReproHang', () => {
    it('renders without hanging', () => {
        const props = {
            mode: 'create' as const,
            clients: [],
            locations: [],
            onClose: vi.fn(),
            onSave: vi.fn(),
            onStatusChange: vi.fn(),
            initialDate: new Date(),
        };
        render(<SessionModal {...props} />);
        expect(screen.getByText('Programar Sesión')).toBeInTheDocument();
    });
});
