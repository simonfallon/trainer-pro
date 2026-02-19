"use client";

import React from "react";
import { format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { toColombianDateString, toColombiaMinutes } from "@/lib/dateUtils";
import { TrainingSession, Client } from "@/types";
import { EventItem } from "./EventItem";

interface DayViewProps {
  currentDate: Date;
  sessions: TrainingSession[];
  clients: Client[];
  clientId?: number;
  onSessionClick: (session: TrainingSession) => void;
  onSlotClick: (date: Date) => void;
  onSessionUpdate: (session: TrainingSession, newStart: Date) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  sessions,
  clients,
  clientId,
  onSessionClick,
  onSlotClick,
  onSessionUpdate,
}) => {
  // Generate hours 0-23
  const hours = Array.from({ length: 24 }).map((_, i) => i);

  // Filter sessions
  const dayStr = format(currentDate, "yyyy-MM-dd");

  const daySessions = sessions.filter((session) => {
    const colStr = toColombianDateString(session.scheduled_at);
    return colStr === dayStr && session.status !== "cancelled";
  });

  const handleDayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top; // minutes from start of day

    const roundedMinutes = Math.round(y / 30) * 30;

    const date = new Date(currentDate);
    date.setHours(0, 0, 0, 0);
    date.setMinutes(roundedMinutes);

    onSlotClick(date);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      const { sessionId, offsetMinutes } = data;

      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const targetY = y - (offsetMinutes || 0);
      const snappedMinutes = Math.round(targetY / 15) * 15;

      const newStart = new Date(currentDate);
      newStart.setHours(0, 0, 0, 0);
      newStart.setMinutes(snappedMinutes);

      onSessionUpdate(session, newStart);
    } catch (err) {
      console.error("Invalid drag data", err);
    }
  };

  // Current time indicator: use Colombia timezone so it's correct on any machine
  const now = new Date();
  const isTodayColumn = isSameDay(currentDate, now);
  const currentMinutes = toColombiaMinutes(now);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div className="week-header" style={{ gridTemplateColumns: "60px 1fr" }}>
        <div className="day-header-cell"></div>
        <div className={`day-header-cell ${isToday(currentDate) ? "is-today" : ""}`}>
          <span className="day-name">{format(currentDate, "EEEE", { locale: es })}</span>
          <span className="day-number">{format(currentDate, "d")}</span>
        </div>
      </div>

      {/* Time Grid body */}
      <div className="time-grid-container" style={{ gridTemplateColumns: "60px 1fr" }}>
        {/* Time Axis */}
        <div className="time-column">
          {hours.map((hour) => (
            <div key={hour} className="time-slot-label">
              {format(new Date().setHours(hour, 0, 0, 0), "HH:mm")}
            </div>
          ))}
        </div>

        {/* Day Column */}
        <div
          className="day-column"
          onClick={handleDayClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Render grid slots */}
          {hours.map((hour) => (
            <div key={hour} className="time-slot"></div>
          ))}

          {/* Current Time Indicator */}
          {isTodayColumn && (
            <div className="current-time-line" style={{ top: `${currentMinutes}px` }}>
              <div className="current-time-circle"></div>
            </div>
          )}

          {/* Events */}
          {(() => {
            // Group sessions for display
            const processedSessions: { session: TrainingSession; label?: string }[] = [];
            const processedGroups = new Set<number>();

            daySessions.forEach((session) => {
              if (session.session_group_id && !clientId) {
                // Group sessions logic (only when NOT filtering by a single client)
                if (processedGroups.has(session.session_group_id)) return;

                processedGroups.add(session.session_group_id);
                const groupCount = daySessions.filter(
                  (s) => s.session_group_id === session.session_group_id
                ).length;
                processedSessions.push({
                  session,
                  label: `${groupCount} clientes`,
                });
              } else {
                // Single session (or group session when filtering by client)
                processedSessions.push({ session });
              }
            });

            return processedSessions.map(({ session, label }) => (
              <EventItem
                key={session.id}
                session={session}
                client={clients.find((c) => c.id === session.client_id)}
                label={label}
                onClick={onSessionClick}
              />
            ));
          })()}
        </div>
      </div>
    </div>
  );
};
