"use client";

import { useState } from "react";
import useSWR from "swr";
import { clientsApi } from "@/lib/api";
import { useDarkStyles } from "@/hooks/useDarkStyles";
import { formatLapTime, formatDate } from "@/lib/dateUtils";
import type { LocationLapTimes } from "@/types";

interface ClientLapTimesCardProps {
  clientId: number;
}

interface ClientLapTimesModalProps {
  locationData: LocationLapTimes;
  isOpen: boolean;
  onClose: () => void;
}

function ClientLapTimesModal({ locationData, isOpen, onClose }: ClientLapTimesModalProps) {
  const { darkStyles, theme } = useDarkStyles();
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const toggleSession = (sessionId: number) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #e1e5e9",
          borderRadius: "12px",
          padding: "1.5rem",
          maxWidth: "800px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          margin: "1rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ color: "#1a1a1a", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            {locationData.location_name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.25rem",
            }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Overall Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#f9fafb",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e1e5e9",
            }}
          >
            <div style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              Total Vueltas
            </div>
            <div style={{ color: "#1a1a1a", fontSize: "1.5rem", fontWeight: 700 }}>
              {locationData.total_laps}
            </div>
          </div>
          <div
            style={{
              backgroundColor: "#f9fafb",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e1e5e9",
            }}
          >
            <div style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              Mejor Tiempo
            </div>
            <div style={{ color: "#1a1a1a", fontSize: "1.5rem", fontWeight: 700 }}>
              {formatLapTime(locationData.best_time_ms)}
            </div>
          </div>
          <div
            style={{
              backgroundColor: "#f9fafb",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e1e5e9",
            }}
          >
            <div style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              Tiempo Promedio
            </div>
            <div style={{ color: "#1a1a1a", fontSize: "1.5rem", fontWeight: 700 }}>
              {formatLapTime(locationData.average_time_ms)}
            </div>
          </div>
        </div>

        {/* Session Groups */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {locationData.sessions.map((session) => {
            const isExpanded = expandedSessions.has(session.session_id);
            return (
              <div
                key={session.session_id}
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e1e5e9",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {/* Session Header - Clickable */}
                <div
                  onClick={() => toggleSession(session.session_id)}
                  style={{
                    padding: "1rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: "0.5rem" }}>
                      {formatDate(session.recorded_at)}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Vueltas</div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1a1a1a" }}>
                          {session.total_laps}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Mejor</div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1a1a1a" }}>
                          {formatLapTime(session.best_time_ms)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Promedio</div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1a1a1a" }}>
                          {formatLapTime(session.average_time_ms)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginLeft: "1rem", color: "#6b7280", fontSize: "1.25rem" }}>
                    {isExpanded ? "▼" : "▶"}
                  </div>
                </div>

                {/* Expanded Lap Times Table */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #e1e5e9", backgroundColor: "white" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e1e5e9" }}>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "0.75rem",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "#6b7280",
                            }}
                          >
                            #
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "0.75rem",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "#6b7280",
                            }}
                          >
                            Tiempo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.lap_times_ms.map((lapTime, index) => (
                          <tr key={index} style={{ borderBottom: "1px solid #e1e5e9" }}>
                            <td
                              style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#1a1a1a" }}
                            >
                              {index + 1}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                fontSize: "0.875rem",
                                fontFamily: "monospace",
                                color: "#1a1a1a",
                              }}
                            >
                              {formatLapTime(lapTime)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ClientLapTimesCard({ clientId }: ClientLapTimesCardProps) {
  const { darkStyles, theme } = useDarkStyles();
  const [selectedLocation, setSelectedLocation] = useState<LocationLapTimes | null>(null);

  const { data: locations, isLoading } = useSWR<LocationLapTimes[]>(
    `/clients/${clientId}/lap-times-by-location`,
    () => clientsApi.getLapTimesByLocation(clientId)
  );

  if (isLoading) {
    return (
      <div className="card" style={darkStyles.card}>
        <h3
          style={{
            color: theme.colors.text,
            marginBottom: "1rem",
            fontSize: "1.125rem",
            fontWeight: 600,
          }}
        >
          Tiempos de Vuelta por Pista
        </h3>
        <div style={{ color: theme.colors.secondary }}>Cargando...</div>
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="card" style={darkStyles.card}>
        <h3
          style={{
            color: theme.colors.text,
            marginBottom: "1rem",
            fontSize: "1.125rem",
            fontWeight: 600,
          }}
        >
          Tiempos de Vuelta por Pista
        </h3>
        <div style={{ color: theme.colors.secondary }}>No hay tiempos de vuelta registrados.</div>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={darkStyles.card}>
        <h3
          style={{
            color: theme.colors.text,
            marginBottom: "1rem",
            fontSize: "1.125rem",
            fontWeight: 600,
          }}
        >
          Tiempos de Vuelta por Pista
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {locations.map((location) => (
            <div
              key={location.location_id || "no-location"}
              style={{
                ...darkStyles.card,
                padding: "1rem",
                borderRadius: "8px",
                cursor: "pointer",
                border: `1px solid ${darkStyles.divider}`,
              }}
              onClick={() => setSelectedLocation(location)}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: theme.colors.text }}>
                {location.location_name}
              </div>
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: theme.colors.secondary }}>Vueltas</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: theme.colors.text }}>
                    {location.total_laps}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: theme.colors.secondary }}>Mejor</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: theme.colors.text }}>
                    {formatLapTime(location.best_time_ms)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: theme.colors.secondary }}>Promedio</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: theme.colors.text }}>
                    {formatLapTime(location.average_time_ms)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedLocation && (
        <ClientLapTimesModal
          locationData={selectedLocation}
          isOpen={!!selectedLocation}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </>
  );
}
