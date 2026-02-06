'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@/types';
import { sessionsApi } from '@/lib/api';

interface LapTime {
    lap_number: number;
    lap_time_ms: number;
    split_time_ms: number;
}

interface StopwatchModalProps {
    sessionId: number;
    client: Client;
    onClose: () => void;
    onSave?: () => void;
}

export const StopwatchModal: React.FC<StopwatchModalProps> = ({
    sessionId,
    client,
    onClose,
    onSave,
}) => {
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [laps, setLaps] = useState<LapTime[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const startTimeRef = useRef<number>(0);
    const pausedDurationRef = useRef<number>(0);
    const lastPauseTimeRef = useRef<number>(0);
    const lapTableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTimeRef.current - pausedDurationRef.current;
            setElapsedMs(elapsed);
        }, 10); // Update every 10ms for smooth display

        return () => clearInterval(interval);
    }, [isRunning]);

    // Auto-scroll to latest lap
    useEffect(() => {
        if (lapTableRef.current && laps.length > 0) {
            lapTableRef.current.scrollTop = lapTableRef.current.scrollHeight;
        }
    }, [laps.length]);

    const handleStartPause = () => {
        if (isRunning) {
            // Pause
            lastPauseTimeRef.current = Date.now();
            setIsRunning(false);
        } else {
            // Start or Resume
            if (elapsedMs === 0) {
                // Starting fresh
                startTimeRef.current = Date.now();
                pausedDurationRef.current = 0;
            } else {
                // Resuming from pause
                pausedDurationRef.current += Date.now() - lastPauseTimeRef.current;
            }
            setIsRunning(true);
        }
    };

    const handleReset = () => {
        if (laps.length > 0) {
            const confirmed = window.confirm('¿Estás seguro de que quieres reiniciar el cronómetro? Se perderán todos los tiempos de vuelta.');
            if (!confirmed) return;
        }

        setIsRunning(false);
        setElapsedMs(0);
        setLaps([]);
        startTimeRef.current = 0;
        pausedDurationRef.current = 0;
        lastPauseTimeRef.current = 0;
    };

    const handleLap = () => {
        if (!isRunning) return;

        const lapNumber = laps.length + 1;
        const splitTime = elapsedMs;
        const lapTime = laps.length === 0
            ? elapsedMs
            : elapsedMs - laps[laps.length - 1].split_time_ms;

        const newLap: LapTime = {
            lap_number: lapNumber,
            lap_time_ms: lapTime,
            split_time_ms: splitTime,
        };

        setLaps(prev => [...prev, newLap]);
    };

    const handleSave = async () => {
        if (laps.length === 0) {
            setError('Debes registrar al menos una vuelta antes de guardar');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const lapTimesMs = laps.map(lap => lap.lap_time_ms);
            const totalDurationMs = laps[laps.length - 1].split_time_ms;

            await sessionsApi.saveLapTimes(sessionId, client.id, lapTimesMs, totalDurationMs);
            onSave?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar los tiempos');
        } finally {
            setSaving(false);
        }
    };

    const formatTime = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10); // Show centiseconds (2 digits)

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                alignItems: 'flex-start',
                paddingTop: '3rem'
            }}
        >
            <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '600px' }}
            >
                <div className="modal-header">
                    <h3 className="modal-title">Tomar Tiempo - {client.name}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {/* Digital Display */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '2rem',
                        padding: '2rem',
                        backgroundColor: isRunning ? '#f0f8f0' : 'var(--background-muted)',
                        borderRadius: '8px',
                        border: `2px solid ${isRunning ? '#28a745' : 'var(--border-color)'}`,
                    }}>
                        <div style={{
                            fontSize: '3.5rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: isRunning ? '#28a745' : 'var(--color-secondary)',
                            letterSpacing: '0.1em'
                        }}>
                            {formatTime(elapsedMs)}
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginBottom: '2rem',
                        justifyContent: 'center'
                    }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleStartPause}
                            style={{ minWidth: '120px' }}
                        >
                            {isRunning ? 'Pausar' : (elapsedMs === 0 ? 'Iniciar' : 'Continuar')}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleReset}
                            disabled={elapsedMs === 0 && laps.length === 0}
                            style={{ minWidth: '120px' }}
                        >
                            Reiniciar
                        </button>
                        <button
                            className="btn"
                            onClick={handleLap}
                            disabled={!isRunning}
                            style={{
                                minWidth: '120px',
                                backgroundColor: isRunning ? 'var(--color-primary)' : '#ccc',
                                color: 'white',
                                borderColor: isRunning ? 'var(--color-primary)' : '#ccc'
                            }}
                        >
                            Vuelta
                        </button>
                    </div>

                    {/* Lap Times Table */}
                    {laps.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem' }}>Tiempos de Vuelta</h4>
                            <div
                                ref={lapTableRef}
                                style={{
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px'
                                }}
                            >
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{
                                        position: 'sticky',
                                        top: 0,
                                        backgroundColor: 'var(--background-muted)',
                                        borderBottom: '2px solid var(--border-color)'
                                    }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>#</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Tiempo de Vuelta</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Tiempo Parcial</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {laps.map((lap, index) => (
                                            <tr
                                                key={lap.lap_number}
                                                style={{
                                                    backgroundColor: index === laps.length - 1
                                                        ? 'rgba(var(--color-primary-rgb, 0, 123, 255), 0.1)'
                                                        : 'transparent',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                            >
                                                <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                                                    {lap.lap_number}
                                                </td>
                                                <td style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'right',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 500
                                                }}>
                                                    {formatTime(lap.lap_time_ms)}
                                                </td>
                                                <td style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'right',
                                                    fontFamily: 'monospace',
                                                    color: 'var(--color-secondary)'
                                                }}>
                                                    {formatTime(lap.split_time_ms)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {error && (
                        <p style={{ color: '#dc3545', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>
                    )}

                    {/* Save Button */}
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving || laps.length === 0}
                        style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}
                    >
                        {saving ? 'Guardando...' : 'Guardar Tiempos'}
                    </button>
                </div>
            </div>
        </div>
    );
};
