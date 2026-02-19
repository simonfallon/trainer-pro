"use client";

import React from "react";
import { TrainingSession, Client } from "@/types";
import { toColombiaMinutes, toColombianTimeString } from "@/lib/dateUtils";

interface EventItemProps {
  session: TrainingSession;
  client?: Client;
  label?: string;
  onClick: (session: TrainingSession) => void;
}

export const EventItem: React.FC<EventItemProps> = ({ session, client, label, onClick }) => {
  // Determine visuals based on status
  const statusClass = `status-${session.status}`;

  // Calculate position and height.
  // Grid starts at 00:00; each minute is 1px.
  // toColombiaMinutes converts UTC → Colombia time correctly on any machine.
  const startMinutes = toColombiaMinutes(session.scheduled_at);
  const duration = session.duration_minutes;

  const top = startMinutes;
  const height = duration;

  const clientName = label || client?.name || "Cliente";
  const timeLabel = toColombianTimeString(session.scheduled_at);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        sessionId: session.id,
        duration: session.duration_minutes,
        offsetMinutes: e.nativeEvent.offsetY,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`calendar-event ${statusClass}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        cursor: "move",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(session);
      }}
      title={`${timeLabel} - ${clientName}`}
    >
      <span className="event-time">{timeLabel}</span>
      <span className="event-title">{clientName}</span>
    </div>
  );
};
