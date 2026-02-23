"use client";

import React, { useState, useEffect, useRef } from "react";
import { format, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import "./calendar.css";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { toColombiaMinutes } from "@/lib/dateUtils";
import type { TrainingSession, Client } from "@/types";

interface CalendarViewProps {
  sessions: TrainingSession[];
  clients: Client[];
  currentDate: Date;
  selectedClientIds?: number[];
  onSelectedClientIdsChange?: (ids: number[]) => void;
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
  selectedClientIds = [],
  onSelectedClientIdsChange = () => {},
  onDateChange,
  onSessionClick,
  onSlotClick,
  onSessionUpdate,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showClientDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest(".client-filter-dropdown")) {
          setShowClientDropdown(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showClientDropdown]);

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
      const currentMinutes = toColombiaMinutes(new Date());

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

  const filteredSessions =
    selectedClientIds.length > 0
      ? sessions.filter((s) => selectedClientIds.includes(s.client_id))
      : sessions;

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

          {/* Client Filter Dropdown */}
          <div
            className="client-filter-dropdown"
            style={{ position: "relative", marginLeft: "1rem" }}
          >
            <button
              className="form-select"
              style={{
                width: "220px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "white",
                margin: 0,
              }}
              onClick={() => setShowClientDropdown(!showClientDropdown)}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedClientIds.length === 0
                  ? "Todos los clientes"
                  : selectedClientIds.length === 1
                    ? clients.find((c) => c.id === selectedClientIds[0])?.name || "1 cliente"
                    : `${selectedClientIds.length} clientes`}
              </span>
              <span>{showClientDropdown ? "▲" : "▼"}</span>
            </button>

            {showClientDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "250px",
                  backgroundColor: "var(--background-card, white)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  marginTop: "4px",
                  maxHeight: "350px",
                  overflowY: "auto",
                  zIndex: 1000,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    style={{ width: "100%", padding: "4px" }}
                    onClick={() => {
                      onSelectedClientIdsChange([]);
                      setShowClientDropdown(false);
                    }}
                  >
                    Limpiar selección (Todos)
                  </button>
                </div>
                {[...clients]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((client) => (
                    <div
                      key={client.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                      onClick={() => {
                        if (selectedClientIds.includes(client.id)) {
                          onSelectedClientIdsChange(
                            selectedClientIds.filter((id) => id !== client.id)
                          );
                        } else {
                          onSelectedClientIdsChange([...selectedClientIds, client.id]);
                        }
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "var(--background-muted, #f8f9fa)")
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClientIds.includes(client.id)}
                        readOnly
                        style={{ marginRight: "10px", pointerEvents: "none" }}
                      />
                      <span>{client.name}</span>
                    </div>
                  ))}
              </div>
            )}
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
            sessions={filteredSessions}
            clients={clients}
            isFilteringClients={selectedClientIds.length > 0}
            onSessionClick={onSessionClick}
            onSlotClick={onSlotClick}
            onSessionUpdate={onSessionUpdate}
          />
        ) : (
          <DayView
            currentDate={currentDate}
            sessions={filteredSessions}
            clients={clients}
            isFilteringClients={selectedClientIds.length > 0}
            onSessionClick={onSessionClick}
            onSlotClick={onSlotClick}
            onSessionUpdate={onSessionUpdate}
          />
        )}
      </div>
    </div>
  );
};
