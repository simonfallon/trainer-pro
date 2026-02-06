'use client';

import { useState, useEffect } from 'react';
import { sessionsApi, exerciseSetsApi } from '@/lib/api';
import { useDarkStyles } from '@/hooks/useDarkStyles';
import { formatDate } from '@/lib/dateUtils';
import { SESSION_STATUS_LABELS } from '@/lib/labels';
import type { TrainingSession, SessionExercise, ExerciseSet } from '@/types';
import { ExerciseSetDisplay } from './ExerciseSetDisplay';
import { ExerciseSetForm } from './ExerciseSetForm';

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
    const [exercises, setExercises] = useState<SessionExercise[]>([]);
    const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
    const [activeTab, setActiveTab] = useState<'exercises' | 'sets'>('exercises');
    const [showSetForm, setShowSetForm] = useState(false);
    const [editingSet, setEditingSet] = useState<ExerciseSet | undefined>(undefined);

    // Fetch exercises and exercise sets when modal opens
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [exercisesData, setsData] = await Promise.all([
                    sessionsApi.getExercises(session.id),
                    exerciseSetsApi.listForSession(session.id)
                ]);
                setExercises(exercisesData);
                setExerciseSets(setsData);
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };
        fetchData();
    }, [session.id]);

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

    // Format milliseconds to MM:SS.CS (centiseconds)
    const formatLapTime = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    // Filter exercises to get lap time measurements
    const lapTimeMeasurements = exercises.filter(
        (ex) => ex.custom_name === 'Toma de Tiempo BMX'
    );

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

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: `2px solid ${theme.colors.secondary}30`,
                    marginBottom: '1.5rem'
                }}>
                    <button
                        onClick={() => setActiveTab('exercises')}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: activeTab === 'exercises' ? theme.colors.primary : theme.colors.secondary,
                            borderBottom: activeTab === 'exercises' ? `3px solid ${theme.colors.primary}` : 'none',
                            fontWeight: activeTab === 'exercises' ? 600 : 400,
                            cursor: 'pointer',
                            fontSize: '1rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        Ejercicios
                    </button>
                    <button
                        onClick={() => setActiveTab('sets')}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: activeTab === 'sets' ? theme.colors.primary : theme.colors.secondary,
                            borderBottom: activeTab === 'sets' ? `3px solid ${theme.colors.primary}` : 'none',
                            fontWeight: activeTab === 'sets' ? 600 : 400,
                            cursor: 'pointer',
                            fontSize: '1rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        Circuitos
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'exercises' && (
                    <>
                        {/* Lap Times Section */}
                        {lapTimeMeasurements.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ color: theme.colors.text, fontSize: '1rem', marginBottom: '1rem' }}>
                                    Tiempos Registrados
                                </h4>
                                {lapTimeMeasurements.map((measurement, idx) => (
                                    <div key={measurement.id} style={{ marginBottom: idx < lapTimeMeasurements.length - 1 ? '1.5rem' : 0 }}>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            color: theme.colors.secondary,
                                            marginBottom: '0.5rem',
                                            fontWeight: 600
                                        }}>
                                            Medición #{idx + 1}
                                            {measurement.data.total_duration_ms && (
                                                <span style={{ marginLeft: '0.5rem' }}>
                                                    - Tiempo total: {formatLapTime(measurement.data.total_duration_ms)}
                                                </span>
                                            )}
                                        </div>
                                        {measurement.data.lap_times_ms && measurement.data.lap_times_ms.length > 0 ? (
                                            <table style={{
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                fontSize: '0.875rem'
                                            }}>
                                                <thead>
                                                    <tr style={{ borderBottom: `1px solid ${theme.colors.secondary}30` }}>
                                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: theme.colors.secondary }}>#</th>
                                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: theme.colors.secondary }}>Tiempo de Vuelta</th>
                                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: theme.colors.secondary }}>Tiempo Parcial</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {measurement.data.lap_times_ms.map((lapTime: number, lapIdx: number) => {
                                                        const splitTime = measurement.data.lap_times_ms
                                                            .slice(0, lapIdx + 1)
                                                            .reduce((sum: number, time: number) => sum + time, 0);
                                                        return (
                                                            <tr key={lapIdx} style={{ borderBottom: `1px solid ${theme.colors.secondary}20` }}>
                                                                <td style={{ padding: '0.5rem', color: theme.colors.text }}>{lapIdx + 1}</td>
                                                                <td style={{ padding: '0.5rem', color: theme.colors.text, fontWeight: 600 }}>
                                                                    {formatLapTime(lapTime)}
                                                                </td>
                                                                <td style={{ padding: '0.5rem', color: theme.colors.secondary }}>
                                                                    {formatLapTime(splitTime)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p style={{ fontSize: '0.875rem', color: theme.colors.secondary, fontStyle: 'italic' }}>
                                                No hay tiempos registrados
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'sets' && (
                    <>
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setEditingSet(undefined);
                                    setShowSetForm(true);
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: theme.colors.primary,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 500
                                }}
                            >
                                + Crear Circuito
                            </button>
                        </div>
                        <ExerciseSetDisplay
                            sets={exerciseSets}
                            onEdit={(set) => {
                                setEditingSet(set);
                                setShowSetForm(true);
                            }}
                            onDelete={async (setId) => {
                                try {
                                    await exerciseSetsApi.delete(setId);
                                    // Refresh sets
                                    const setsData = await exerciseSetsApi.listForSession(session.id);
                                    setExerciseSets(setsData);
                                } catch (err) {
                                    console.error('Error deleting set:', err);
                                    alert('Error al eliminar el circuito');
                                }
                            }}
                        />
                    </>
                )}

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
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

            {/* Exercise Set Form Modal */}
            {showSetForm && (
                <ExerciseSetForm
                    sessionId={session.id}
                    existingSet={editingSet}
                    onSave={async (data) => {
                        try {
                            if (editingSet) {
                                // Update existing set
                                await exerciseSetsApi.update(editingSet.id, {
                                    name: data.name,
                                    series: data.series
                                });
                            } else {
                                // Create new set
                                await exerciseSetsApi.createForSession(session.id, data);
                            }

                            // Refresh sets
                            const setsData = await exerciseSetsApi.listForSession(session.id);
                            setExerciseSets(setsData);
                            setShowSetForm(false);
                            setEditingSet(undefined);
                        } catch (err) {
                            console.error('Error saving exercise set:', err);
                            throw err; // Re-throw to let form handle the error
                        }
                    }}
                    onCancel={() => {
                        setShowSetForm(false);
                        setEditingSet(undefined);
                    }}
                />
            )}
        </div>
    );
}
