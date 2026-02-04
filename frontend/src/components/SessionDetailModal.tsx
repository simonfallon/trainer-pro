'use client';

import { useState } from 'react';
import { sessionsApi } from '@/lib/api';
import { useDarkStyles } from '@/hooks/useDarkStyles';
import { formatDate } from '@/lib/dateUtils';
import { SESSION_STATUS_LABELS } from '@/lib/labels';
import type { TrainingSession } from '@/types';

export function SessionDetailModal({
    session,
    onClose,
    onUpdate,
}: {
    session: TrainingSession;
    onClose: () => void;
    onUpdate: () => void;
}) {
    const { darkStyles, theme } = useDarkStyles();
    const [sessionDoc, setSessionDoc] = useState(session.session_doc || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setLoading(true);
        setError('');
        try {
            await sessionsApi.update(session.id, { session_doc: sessionDoc });
            onUpdate();
            onClose();
        } catch (err) {
            console.error('Error updating session:', err);
            setError('Error al actualizar la sesión');
        } finally {
            setLoading(false);
        }
    };

    const detailRows = [
        { label: 'Fecha', value: formatDate(session.scheduled_at) },
        { label: 'Duración', value: `${session.duration_minutes} minutos` },
        { label: 'Estado', value: SESSION_STATUS_LABELS[session.status] || session.status },
        { label: 'Pagado', value: session.is_paid ? 'Sí' : 'No' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ ...darkStyles.modal, maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3 className="modal-title" style={{ color: theme.colors.text }}>
                        Detalles de la Sesión
                    </h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                {/* Detail rows */}
                <div style={{ marginBottom: '1.5rem' }}>
                    {detailRows.map((row) => (
                        <div key={row.label} style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0' }}>
                            <span style={{ color: theme.colors.secondary, minWidth: '80px' }}>{row.label}:</span>
                            <span style={{ fontWeight: 600, color: theme.colors.text }}>{row.value}</span>
                        </div>
                    ))}
                    {session.notes && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <span style={{ color: theme.colors.secondary }}>Notas:</span>
                            <p style={{ fontSize: '0.875rem', color: theme.colors.text, marginTop: '0.25rem', marginBottom: 0 }}>
                                {session.notes}
                            </p>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Documentación de la Sesión</label>
                    <textarea
                        className="form-textarea"
                        value={sessionDoc}
                        onChange={(e) => setSessionDoc(e.target.value)}
                        rows={6}
                        placeholder="Ej: Ejercicios realizados, observaciones, progreso..."
                    />
                </div>

                {error && (
                    <p style={{ color: '#dc3545', marginBottom: '0.5rem' }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                        Cerrar
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={loading}
                        style={{ flex: 1, opacity: loading ? 0.5 : 1 }}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
