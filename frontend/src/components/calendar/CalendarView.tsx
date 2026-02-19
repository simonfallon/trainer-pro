"use client";

import React, { useState, useEffect, useRef } from "react";
import { format, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import "./calendar.css";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import type { TrainingSession, Client } from "@/types";

interface CalendarViewProps {
  sessions: TrainingSession[];
  clients: Client[];
  currentDate: Date;
  clientId?: number;
  onDateChange: (date: Date) => void;
  onSessionClick: (session: TrainingSession) => void;
  onSlotClick: (date: Date) => void;
  onSessionUpdate: (session: TrainingSession, newStart: Date) => void;
}

type ViewMode = "week" | "day";

export const CalendarView: React.FC<CalendarViewProps> = ({
  sessions,
  clients,
  currentDate,
  clientId,
  onDateChange,
  onSessionClick,
  onSlotClick,
  onSessionUpdate,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const gridRef = useRef<HTMLDivElement>(null);

  const handlePrevious = () => {
    if (viewMode === "week") {
      onDateChange(subWeeks(currentDate, 1));
    } else {
      onDateChange(subDays(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "week") {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Auto-scroll to current time when component mounts or view changes
  useEffect(() => {
    if (gridRef.current) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Each minute is 1px, so scroll to current time minus half viewport height
      // to center the current time in the view
      const scrollPosition = currentMinutes - gridRef.current.clientHeight / 2;

      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        gridRef.current?.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: "smooth",
        });
      }, 100);
    }
  }, [viewMode]); // Re-run when view mode changes

  // Capitalize first letter of month/day
  const formatTitle = (date: Date) => {
    const str = format(date, "MMMM yyyy", { locale: es });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="calendar-container">
      <header className="calendar-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <h2 className="calendar-title">{formatTitle(currentDate)}</h2>
          <div className="calendar-nav-group">
            <button onClick={handlePrevious} className="calendar-nav-btn" aria-label="Anterior">
              ←
            </button>
            <button
              onClick={handleToday}
              className="calendar-nav-btn"
              style={{ fontSize: "0.875rem", fontWeight: 500, width: "auto", padding: "0 0.75rem" }}
            >
              Hoy
            </button>
            <button onClick={handleNext} className="calendar-nav-btn" aria-label="Siguiente">
              →
            </button>
          </div>
        </div>

        <div className="calendar-view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === "week" ? "active" : ""}`}
            onClick={() => setViewMode("week")}
          >
            Semana
          </button>
          <button
            className={`view-toggle-btn ${viewMode === "day" ? "active" : ""}`}
            onClick={() => setViewMode("day")}
          >
            Día
          </button>
        </div>
      </header>

      <div className="calendar-grid" ref={gridRef}>
        {viewMode === "week" ? (
          <WeekView
            currentDate={currentDate}
            sessions={sessions}
            clients={clients}
            clientId={clientId}
            onSessionClick={onSessionClick}
            onSlotClick={onSlotClick}
            onSessionUpdate={onSessionUpdate}
          />
        ) : (
          <DayView
            currentDate={currentDate}
            sessions={sessions}
            clients={clients}
            clientId={clientId}
            onSessionClick={onSessionClick}
            onSlotClick={onSlotClick}
            onSessionUpdate={onSessionUpdate}
          />
        )}
      </div>
    </div>
  );
};
