'use client';

import { useState } from 'react';
import { clientsApi } from '@/lib/api';
import { useDarkStyles } from '@/hooks/useDarkStyles';

export function PaymentModal({
    clientId,
    clientName,
    onClose,
    onSuccess,
}: {
    clientId: string;
    clientName: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { darkStyles, theme } = useDarkStyles();
    const [sessionsPaid, setSessionsPaid] = useState(1);
    const [amountPerSession, setAmountPerSession] = useState(50000);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const totalAmount = sessionsPaid * amountPerSession;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await clientsApi.registerPayment(clientId, {
                sessions_paid: sessionsPaid,
                amount_cop: totalAmount,
                notes: notes || undefined,
            });
            onSuccess();
        } catch (err) {
            console.error('Error registering payment:', err);
            setError('Error al registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={darkStyles.modal}>
                <div className="modal-header">
                    <h3 className="modal-title" style={{ color: theme.colors.text }}>
                        Registrar Pago — {clientName}
                    </h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Número de sesiones</label>
                        <input
                            type="number"
                            className="form-input"
                            min="1"
                            value={sessionsPaid}
                            onChange={(e) => setSessionsPaid(parseInt(e.target.value) || 1)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Valor por sesión (COP)</label>
                        <input
                            type="number"
                            className="form-input"
                            min="0"
                            step="1000"
                            value={amountPerSession}
                            onChange={(e) => setAmountPerSession(parseInt(e.target.value) || 0)}
                            required
                        />
                    </div>

                    {/* Total summary */}
                    <div style={{
                        background: darkStyles.totalTint,
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        marginBottom: '1.25rem',
                    }}>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700, color: theme.colors.text, margin: 0 }}>
                            Total: ${totalAmount.toLocaleString('es-CO')} COP
                        </p>
                    </div>

                    {error && (
                        <p style={{ color: '#dc3545', marginBottom: '0.5rem' }}>{error}</p>
                    )}

                    <div className="form-group">
                        <label className="form-label">Notas (opcional)</label>
                        <textarea
                            className="form-textarea"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ flex: 1, opacity: loading ? 0.5 : 1 }}
                        >
                            {loading ? 'Guardando...' : 'Registrar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
