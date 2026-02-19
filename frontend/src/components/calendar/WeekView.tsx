"use client";

import React, { useMemo } from "react";
import { startOfWeek, addDays, format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { toColombianDateString, toColombiaMinutes } from "@/lib/dateUtils";
import { TrainingSession, Client } from "@/types";
import { EventItem } from "./EventItem";

interface WeekViewProps {
  currentDate: Date;
  sessions: TrainingSession[];
  clients: Client[];
  clientId?: number;
  onSessionClick: (session: TrainingSession) => void;
  onSlotClick: (date: Date) => void;
  onSessionUpdate: (session: TrainingSession, newStart: Date) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  sessions,
  clients,
  clientId,
  onSessionClick,
  onSlotClick,
  onSessionUpdate,
}) => {
  // Generate the 7 days of the week ensuring Monday start (weekStartsOn: 1)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Generate hours 0-23
  const hours = Array.from({ length: 24 }).map((_, i) => i);

  // Helper to get sessions for a specific day
  const getSessionsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");

    return sessions.filter((session) => {
      const colStr = toColombianDateString(session.scheduled_at);
      return colStr === dayStr && session.status !== "cancelled";
    });
  };

  const handleDayClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top; // minutes from start of day

    // Logic:
    // 12:45-13:15 -> 13:00 (780m)
    // 13:15-13:45 -> 13:30 (810m)
    // Round to nearest 30 minutes
    const roundedMinutes = Math.round(y / 30) * 30;

    const date = new Date(day);
    date.setHours(0, 0, 0, 0);
    date.setMinutes(roundedMinutes);

    onSlotClick(date);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      const { sessionId, offsetMinutes } = data;

      // Find session object
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;

      // Calculate new start time
      // We want the top of the event (y - offset) to snap to grid
      const targetY = y - (offsetMinutes || 0);

      // Snap to 15 minutes
      const snappedMinutes = Math.round(targetY / 15) * 15;

      // Create new date
      const newStart = new Date(day);
      newStart.setHours(0, 0, 0, 0);
      newStart.setMinutes(snappedMinutes);

      // Trigger update
      onSessionUpdate(session, newStart);
    } catch (err) {
      console.error("Invalid drag data", err);
    }
  };

  // Current time indicator: use Colombia timezone so it's correct on any machine
  const now = new Date();
  const currentMinutes = toColombiaMinutes(now);

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: "min-content" }}>
      {/* Header */}
      <div className="week-header">
        <div className="day-header-cell">{/* Time zone or empty corner */}</div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`day-header-cell ${isToday(day) ? "is-today" : ""}`}
          >
            <span className="day-name">{format(day, "EEE", { locale: es })}</span>
            <span className="day-number">{format(day, "d")}</span>
          </div>
        ))}
      </div>

      {/* Time Grid body */}
      <div className="time-grid-container">
        {/* Time Axis */}
        <div className="time-column">
          {hours.map((hour) => (
            <div key={hour} className="time-slot-label">
              {format(new Date().setHours(hour, 0, 0, 0), "HH:mm")}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        {weekDays.map((day) => {
          const daySessions = getSessionsForDay(day);
          const isTodayColumn = isSameDay(day, now);

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

          return (
            <div
              key={day.toISOString()}
              className="day-column"
              onClick={(e) => handleDayClick(e, day)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Render grid slots (background) */}
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
              {processedSessions.map(({ session, label }) => (
                <EventItem
                  key={session.id}
                  session={session}
                  client={clients.find((c) => c.id === session.client_id)}
                  label={label}
                  onClick={onSessionClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
