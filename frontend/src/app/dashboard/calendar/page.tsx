'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sessionsApi, clientsApi, appsApi, locationsApi } from '@/lib/api';
import type { TrainingSession, Client, TrainerApp, Location } from '@/types';
import { CalendarView } from '@/components/calendar/CalendarView';
import { SessionModal } from '@/components/calendar/SessionModal';


function CalendarPageContent() {
    const searchParams = useSearchParams();
    const appId = searchParams.get('app_id');
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [app, setApp] = useState<TrainerApp | null>(null);
    const [loading, setLoading] = useState(true);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'view';
        session?: TrainingSession;
        initialDate?: Date;
    }>({ isOpen: false, mode: 'create' });

    const fetchSessions = async (trainerId: string, date: Date) => {
        // Fetch sessions for the whole month surrounding the date to be safe, 
        // or specifically for the week. Let's fetch the month.
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        // Extended range to handle week overlap across months
        startOfMonth.setDate(startOfMonth.getDate() - 7);
        endOfMonth.setDate(endOfMonth.getDate() + 7);

        const data = await sessionsApi.list(trainerId, startOfMonth.toISOString(), endOfMonth.toISOString());
        setSessions(data);
    };

    useEffect(() => {
        if (!appId) return;

        const loadData = async () => {
            try {
                const appData = await appsApi.get(appId);
                setApp(appData);

                const [clientsData, locationsData] = await Promise.all([
                    clientsApi.list(appData.trainer_id),
                    locationsApi.list(appData.trainer_id),
                    fetchSessions(appData.trainer_id, currentDate),
                ]);
                setClients(clientsData);
                setLocations(locationsData);
            } catch (err) {
                console.error('Failed to load calendar:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [appId]); // Remove currentDate from dependency to avoid refetch loops if handled separately, 
    // but we need to refetch when month changes. 
    // actually, let's keep it simple: refetch when currentDate changes significantly (month).
    // Implementation detail: We watch currentDate in a separate effect.

    useEffect(() => {
        if (app) {
            fetchSessions(app.trainer_id, currentDate);
        }
    }, [currentDate, app]);

    const handleSaveSession = async (data: any) => {
        if (!app) return;

        const scheduledAt = new Date(`${data.date}T${data.time}`);

        if (data.id) {
            // Update
            // Note: The API might expect specific fields. 
            // We need to support updating scheduled_at, duration, notes, etc.
            // Assuming update endpoint supports these.
            // If the current API only supports status updates, we might need to modify backend?
            // Checking GEMINI.md or context: "sessionsApi.update(sessionId, { status: newStatus })"
            // Assuming it supports partial updates.
            await sessionsApi.update(data.id, {
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: data.duration_minutes,
                notes: data.notes,
                client_id: data.client_id,
                location_id: data.location_id || undefined,
            });
        } else {
            // Create
            await sessionsApi.create({
                trainer_id: app.trainer_id,
                client_id: data.client_id,
                location_id: data.location_id || undefined,
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: data.duration_minutes,
                notes: data.notes.trim() || undefined,
            });
        }

        await fetchSessions(app.trainer_id, currentDate);
    };

    const handleStatusChange = async (sessionId: string, newStatus: string) => {
        await sessionsApi.update(sessionId, { status: newStatus });
        if (app) {
            await fetchSessions(app.trainer_id, currentDate);
        }
    };

    const handleSessionUpdate = async (session: TrainingSession, newStart: Date) => {
        if (!app) return;
        try {
            await sessionsApi.update(session.id, {
                scheduled_at: newStart.toISOString(),
            });
            await fetchSessions(app.trainer_id, currentDate);
        } catch (error) {
            console.error('Failed to update session time:', error);
        }
    };

    const handleSlotClick = (date: Date) => {
        setModalConfig({
            isOpen: true,
            mode: 'create',
            initialDate: date,
        });
    };

    const handleSessionClick = (session: TrainingSession) => {
        setModalConfig({
            isOpen: true,
            mode: 'view',
            session: session,
        });
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando calendario...</div>;
    }

    return (
        <div className="fade-in" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <CalendarView
                sessions={sessions}
                clients={clients}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onSessionClick={handleSessionClick}
                onSlotClick={handleSlotClick}
                onSessionUpdate={handleSessionUpdate}
            />

            {modalConfig.isOpen && (
                <SessionModal
                    mode={modalConfig.mode}
                    session={modalConfig.session}
                    initialDate={modalConfig.initialDate}
                    clients={clients}
                    locations={locations}
                    onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                    onSave={handleSaveSession}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}

export default function CalendarPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem' }}>Cargando...</div>}>
            <CalendarPageContent />
        </Suspense>
    );
}
