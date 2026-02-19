"use client";

import React from "react";
import { TrainingSession, Client } from "@/types";
import { differenceInMinutes, format } from "date-fns";
import { COLOMBIA_TIMEZONE, toColombianDate } from "@/lib/dateUtils";

interface EventItemProps {
  session: TrainingSession;
  client?: Client;
  label?: string;
  onClick: (session: TrainingSession) => void;
}

export const EventItem: React.FC<EventItemProps> = ({ session, client, label, onClick }) => {
  // Determine visuals based on status
  const statusClass = `status-${session.status}`;

  // Calculate position and height
  // We assume the grid starts at 00:00 and each hour is 60px high (1px per minute)
  // Use Colombia time for positioning so it looks consistent regardless of user's browser timezone
  const startDate = toColombianDate(session.scheduled_at);
  const startMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
  const duration = session.duration_minutes;

  // Top position in pixels
  const top = startMinutes;
  // Height in pixels (1 min = 1 px)
  const height = duration;

  const clientName = label || client?.name || "Cliente";

  // Don't render cancelled sessions if requested (but here we just render what is passed)
  // The parent should filter if needed.

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Set drag data
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        sessionId: session.id,
        duration: session.duration_minutes,
        offsetMinutes: e.nativeEvent.offsetY,
      })
    );
    e.dataTransfer.effectAllowed = "move";

    // Optional: set drag image (ghost)
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`calendar-event ${statusClass}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        cursor: "move", // Add move cursor
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(session);
      }}
      title={`${format(startDate, "HH:mm")} - ${clientName}`}
    >
      <span className="event-time">{format(startDate, "HH:mm")}</span>
      <span className="event-title">{clientName}</span>
    </div>
  );
};
