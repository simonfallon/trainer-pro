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
        mode: 'create' | 'view' | 'edit';
        session?: TrainingSession;
        groupSessions?: TrainingSession[];
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
            // Editing existing session - only single client supported for now
            await sessionsApi.update(data.id, {
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: data.duration_minutes,
                notes: data.notes,
                client_id: data.client_ids[0],  // Take first client for editing
                location_id: data.location_id || undefined,
            });
        } else {
            // Creating new session
            if (data.client_ids.length > 1) {
                // Multi-client session - create a session group
                await sessionsApi.createGroup({
                    trainer_id: app.trainer_id,
                    client_ids: data.client_ids,
                    location_id: data.location_id || undefined,
                    scheduled_at: scheduledAt.toISOString(),
                    duration_minutes: data.duration_minutes,
                    notes: data.notes.trim() || undefined,
                });
            } else {
                // Single client session - use existing endpoint
                await sessionsApi.create({
                    trainer_id: app.trainer_id,
                    client_id: data.client_ids[0],
                    location_id: data.location_id || undefined,
                    scheduled_at: scheduledAt.toISOString(),
                    duration_minutes: data.duration_minutes,
                    notes: data.notes.trim() || undefined,
                });
            }
        }

        mutate(sessionsKey);
    };

    const handleStatusChange = async (sessionId: number, newStatus: string) => {
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
        let groupSessions: TrainingSession[] = [];
        if (session.session_group_id) {
            groupSessions = sessions.filter(s => s.session_group_id === session.session_group_id);
        }

        setModalConfig({
            isOpen: true,
            mode: 'view',
            session: session,
            groupSessions: groupSessions,
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
                    groupSessions={modalConfig.groupSessions}
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
