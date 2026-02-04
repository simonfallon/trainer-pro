'use client';

import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { sessionsApi, clientsApi, locationsApi } from '@/lib/api';
import { useDashboardApp } from '@/hooks/useDashboardApp';
import type { TrainingSession, Client, Location } from '@/types';
import { CalendarView } from '@/components/calendar/CalendarView';
import { SessionModal } from '@/components/calendar/SessionModal';

export default function CalendarPage() {
    const { app } = useDashboardApp();
    const [clients, setClients] = useState<Client[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'view';
        session?: TrainingSession;
        initialDate?: Date;
    }>({ isOpen: false, mode: 'create' });

    // Derive date range for sessions fetch
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    start.setDate(start.getDate() - 7);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    end.setDate(end.getDate() + 7);
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const sessionsKey = `/sessions-${app.trainer_id}-${startStr}-${endStr}`;
    const { data: sessions = [] } = useSWR<TrainingSession[]>(
        sessionsKey,
        () => sessionsApi.list(app.trainer_id, startStr, endStr)
    );

    useEffect(() => {
        Promise.all([
            clientsApi.list(app.trainer_id),
            locationsApi.list(app.trainer_id),
        ]).then(([c, l]) => { setClients(c); setLocations(l); });
    }, [app.trainer_id]);

    const handleSaveSession = async (data: any) => {
        const scheduledAt = new Date(`${data.date}T${data.time}`);

        if (data.id) {
            await sessionsApi.update(data.id, {
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: data.duration_minutes,
                notes: data.notes,
                client_id: data.client_id,
                location_id: data.location_id || undefined,
            });
        } else {
            await sessionsApi.create({
                trainer_id: app.trainer_id,
                client_id: data.client_id,
                location_id: data.location_id || undefined,
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: data.duration_minutes,
                notes: data.notes.trim() || undefined,
            });
        }

        mutate(sessionsKey);
    };

    const handleStatusChange = async (sessionId: string, newStatus: string) => {
        await sessionsApi.update(sessionId, { status: newStatus });
        mutate(sessionsKey);
    };

    const handleSessionUpdate = async (session: TrainingSession, newStart: Date) => {
        try {
            await sessionsApi.update(session.id, {
                scheduled_at: newStart.toISOString(),
            });
            mutate(sessionsKey);
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
