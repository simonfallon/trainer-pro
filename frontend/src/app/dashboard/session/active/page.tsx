'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sessionsApi, clientsApi } from '@/lib/api';
import { useDashboardApp } from '@/hooks/useDashboardApp';
import { NotesModal } from '@/components/session/NotesModal';
import { StopwatchModal } from '@/components/session/StopwatchModal';
import type { TrainingSession, SessionGroup, Client } from '@/types';

export default function ActiveSessionPage() {
    const { app } = useDashboardApp();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeSession, setActiveSession] = useState<TrainingSession | SessionGroup | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [stopwatchClient, setStopwatchClient] = useState<Client | null>(null);

    useEffect(() => {
        loadActiveSession();
    }, [app.trainer_id]);

    const loadActiveSession = async () => {
        try {
            const session = await sessionsApi.getActive(app.trainer_id);
            if (!session) {
                // No active session, redirect to dashboard
                router.push(`/dashboard?app_id=${app.id}`);
                return;
            }

            setActiveSession(session);

            // Load client details
            const clientIds = isSessionGroup(session)
                ? session.sessions.map(s => s.client_id)
                : [session.client_id];

            const allClients = await clientsApi.list(app.trainer_id);
            const sessionClients = allClients.filter(c => clientIds.includes(c.id));
            setClients(sessionClients);
        } catch (error) {
            console.error('Error loading active session:', error);
            alert('Error al cargar la sesión activa');
        } finally {
            setLoading(false);
        }
    };

    const handleEndSession = async () => {
        if (!activeSession) return;

        const confirmed = window.confirm('¿Estás seguro de que quieres finalizar esta sesión?');
        if (!confirmed) return;

        try {
            if (isSessionGroup(activeSession)) {
                // Update all sessions in the group
                for (const session of activeSession.sessions) {
                    await sessionsApi.update(session.id, { status: 'completed' });
                }
            } else {
                await sessionsApi.update(activeSession.id, { status: 'completed' });
            }

            // Navigate back to dashboard
            router.push(`/dashboard?app_id=${app.id}`);
        } catch (error) {
            console.error('Error ending session:', error);
            alert('Error al finalizar la sesión');
        }
    };

    const getClientInitials = (name: string): string => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return parts[0][0] + parts[1][0];
        }
        return name.substring(0, 2);
    };

    const getClientNotes = (clientId: number): string => {
        if (!activeSession) return '';

        // Get the session that contains the notes
        let sessionDoc: string | null = null;
        if (isSessionGroup(activeSession)) {
            // For group sessions, find the session for this client
            const clientSession = activeSession.sessions.find(s => s.client_id === clientId);
            sessionDoc = clientSession?.session_doc || null;
        } else {
            sessionDoc = activeSession.session_doc;
        }

        if (!sessionDoc) return '';

        try {
            const doc = JSON.parse(sessionDoc);
            return doc?.client_notes?.[clientId.toString()] || '';
        } catch (e) {
            console.error('Error parsing session_doc:', e);
            return '';
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <p>Cargando sesión...</p>
            </div>
        );
    }

    if (!activeSession) {
        return null;
    }

    const duration = activeSession.duration_minutes;

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Session Info */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Información de la Sesión</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-secondary)' }}>Duración</div>
                        <div style={{ fontWeight: 600 }}>{duration} minutos</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-secondary)' }}>Total de Clientes</div>
                        <div style={{ fontWeight: 600 }}>{clients.length}</div>
                    </div>
                    {activeSession.notes && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-secondary)' }}>Notas</div>
                            <div style={{
                                backgroundColor: 'var(--background-muted)',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                marginTop: '0.25rem'
                            }}>
                                {activeSession.notes}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Client List */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Clientes en la Sesión</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '2rem'
                }}>
                    {clients.map((client) => (
                        <div key={client.id} style={{ textAlign: 'center' }}>
                            {/* Avatar */}
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                margin: '0 auto 1rem',
                                overflow: 'hidden',
                                border: '3px solid var(--color-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: client.photo_url ? 'transparent' : 'var(--background-muted)',
                                fontSize: '2.5rem',
                                fontWeight: 600,
                                color: 'var(--color-secondary)'
                            }}>
                                {client.photo_url ? (
                                    <img
                                        src={client.photo_url}
                                        alt={client.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    getClientInitials(client.name)
                                )}
                            </div>

                            {/* Client Name */}
                            <div style={{ fontWeight: 600, marginBottom: '1rem' }}>
                                {client.name}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ width: '100%', fontSize: '0.875rem' }}
                                    onClick={() => setSelectedClient(client)}
                                >
                                    Notas
                                </button>
                                {app.name.toLowerCase().includes('bmx') && (
                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', fontSize: '0.875rem' }}
                                        onClick={() => setStopwatchClient(client)}
                                    >
                                        Tomar Tiempo
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* End Session Button */}
            <div style={{ textAlign: 'center' }}>
                <button
                    className="btn"
                    style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        borderColor: '#dc3545',
                        minWidth: '300px',
                        fontSize: '1.125rem',
                        padding: '1rem 2rem'
                    }}
                    onClick={handleEndSession}
                >
                    Finalizar Sesión
                </button>
            </div>

            {/* Notes Modal */}
            {selectedClient && activeSession && (
                <NotesModal
                    sessionId={
                        isSessionGroup(activeSession)
                            ? activeSession.sessions.find(s => s.client_id === selectedClient.id)?.id || activeSession.sessions[0].id
                            : activeSession.id
                    }
                    client={selectedClient}
                    initialNotes={getClientNotes(selectedClient.id)}
                    onClose={() => setSelectedClient(null)}
                    onSave={() => {
                        // Reload session to get updated notes
                        loadActiveSession();
                    }}
                />
            )}

            {/* Stopwatch Modal */}
            {stopwatchClient && activeSession && (
                <StopwatchModal
                    sessionId={isSessionGroup(activeSession) ? activeSession.sessions[0].id : activeSession.id}
                    client={stopwatchClient}
                    onClose={() => setStopwatchClient(null)}
                    onSave={() => {
                        // Optionally reload session after saving lap times
                        loadActiveSession();
                    }}
                />
            )}
        </div>
    );
}

// Type guard to check if session is a SessionGroup
function isSessionGroup(session: TrainingSession | SessionGroup): session is SessionGroup {
    return 'sessions' in session;
}
