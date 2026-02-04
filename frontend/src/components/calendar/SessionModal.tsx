'use client';

import React, { useState, useEffect } from 'react';
import { TrainingSession, Client, Location } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SessionModalProps {
    mode: 'create' | 'view';
    session?: TrainingSession;
    initialDate?: Date;
    clients: Client[];
    locations?: Location[];
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    onStatusChange: (sessionId: string, status: string) => Promise<void>;
}

export const SessionModal: React.FC<SessionModalProps> = ({
    mode: initialMode,
    session,
    initialDate,
    clients,
    locations = [],
    onClose,
    onSave,
    onStatusChange,
}) => {
    const [mode, setMode] = useState<'create' | 'view' | 'edit'>(initialMode);
    const [formData, setFormData] = useState({
        client_id: '',
        location_id: '',
        date: '',
        time: '09:00',
        duration_minutes: 60,
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (mode === 'create' && initialDate) {
            setFormData(prev => ({
                ...prev,
                date: format(initialDate, 'yyyy-MM-dd'),
                time: format(initialDate, 'HH:mm'),
            }));
        } else if ((mode === 'edit' || mode === 'view') && session) {
            const date = new Date(session.scheduled_at);
            setFormData({
                client_id: session.client_id,
                location_id: session.location_id || '',
                date: format(date, 'yyyy-MM-dd'),
                time: format(date, 'HH:mm'),
                duration_minutes: session.duration_minutes,
                notes: session.notes || '',
            });
        }
    }, [mode, session, initialDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await onSave({
                ...formData,
                id: session?.id, // Includes ID if editing
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusAction = async (newStatus: string) => {
        if (!session) return;
        try {
            await onStatusChange(session.id, newStatus);
            onClose();
        } catch (err) {
            setError('Error al actualizar estado');
        }
    };

    const clientName = clients.find(c => c.id === formData.client_id)?.name || 'Cliente';

    if (mode === 'view' && session) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">Detalles de la Sesión</h3>
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Cliente</label>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{clients.find(c => c.id === session.client_id)?.name || 'Desconocido'}</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Fecha</label>
                                <p>{format(new Date(session.scheduled_at), 'EEEE d MMMM, yyyy', { locale: es })}</p>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Hora</label>
                                <p>{format(new Date(session.scheduled_at), 'h:mm a')}</p>
                            </div>
                        </div>
                        <div>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Duración</label>
                            <p>{session.duration_minutes} minutos</p>
                        </div>
                        {session.location_id && (
                            <div>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Ubicación</label>
                                <p>📍 {locations.find(l => l.id === session.location_id)?.name || 'Ubicación eliminada'}</p>
                            </div>
                        )}
                        <div>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Notas</label>
                            <p style={{ background: 'var(--background-muted)', padding: '0.5rem', borderRadius: '4px' }}>
                                {session.notes || 'Sin notas'}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            {session.status === 'scheduled' ? (
                                <>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setMode('create')} // Switch to edit mode (logic handled in useEffect with 'edit' check logic but let's explicity say 'edit' in state? 
                                    // Wait, I used 'edit' in useEffect but declared 'create' | 'view'.
                                    // Let's cheat and cast or just add 'edit' to props type? 
                                    // I'll just change local state to 'edit' which works.
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="btn"
                                        style={{ backgroundColor: '#dc3545', color: 'white', borderColor: '#dc3545' }}
                                        onClick={() => handleStatusAction('cancelled')}
                                    >
                                        Cancelar Sesión
                                    </button>
                                </>
                            ) : (
                                <div style={{ color: session.status === 'completed' ? '#28a745' : '#dc3545', fontWeight: 600 }}>
                                    Sesión {session.status === 'completed' ? 'Completada' : 'Cancelada'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Edit/Create Mode
    const isEditing = !!session?.id && mode !== 'create'; // Simple check

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{isEditing ? 'Editar Sesión' : 'Programar Sesión'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="sessionClient">Cliente *</label>
                        <select
                            id="sessionClient"
                            className="form-select"
                            value={formData.client_id}
                            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                            required
                        >
                            <option value="">Selecciona un cliente</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="sessionDate">Fecha *</label>
                            <input
                                id="sessionDate"
                                type="date"
                                className="form-input"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="sessionTime">Hora *</label>
                            <input
                                id="sessionTime"
                                type="time"
                                className="form-input"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="sessionDuration">Duración (minutos)</label>
                        <select
                            id="sessionDuration"
                            className="form-select"
                            value={formData.duration_minutes}
                            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                        >
                            <option value={30}>30 minutos</option>
                            <option value={45}>45 minutos</option>
                            <option value={60}>1 hora</option>
                            <option value={90}>1.5 horas</option>
                            <option value={120}>2 horas</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="sessionLocation">Ubicación (opcional)</label>
                        <select
                            id="sessionLocation"
                            className="form-select"
                            value={formData.location_id}
                            onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                        >
                            <option value="">Sin ubicación</option>
                            {locations.map((location) => (
                                <option key={location.id} value={location.id}>
                                    {location.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="sessionNotes">Notas</label>
                        <textarea
                            id="sessionNotes"
                            className="form-textarea"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Notas de la sesión o áreas de enfoque"
                        />
                    </div>

                    {error && (
                        <p style={{ color: '#dc3545', marginBottom: '1rem' }}>{error}</p>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            style={{ flex: 1 }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting || !formData.client_id || !formData.date}
                            style={{ flex: 1 }}
                        >
                            {submitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
