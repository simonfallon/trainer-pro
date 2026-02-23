"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { clientsApi, exerciseSetsApi } from "@/lib/api";
import { useDarkStyles } from "@/hooks/useDarkStyles";
import { formatDate } from "@/lib/dateUtils";
import { ExerciseSetDisplay } from "./ExerciseSetDisplay";
import type { ExerciseHistoryResponse, ExerciseSet } from "@/types";

interface ClientExerciseHistoryCardProps {
  clientId: number;
}

interface ClientExerciseSetsModalProps {
  clientId: number;
  isOpen: boolean;
  onClose: () => void;
}

function ClientExerciseSetsModal({ clientId, isOpen, onClose }: ClientExerciseSetsModalProps) {
  const { darkStyles, theme } = useDarkStyles();

  // Get all sessions with exercise sets for this client
  const { data: sessions } = useSWR(isOpen ? `/clients/${clientId}/sessions` : null, () =>
    clientsApi.getSessions(clientId)
  );

  // Fetch exercise sets for each session
  const sessionIds = sessions?.map((s) => s.id) || [];
  const { data: allSets } = useSWR(
    isOpen && sessionIds.length > 0 ? `/exercise-sets/bulk/${clientId}` : null,
    async () => {
      const allSetsPromises = sessionIds.map((sessionId) =>
        exerciseSetsApi.listForSession(sessionId)
      );
      const results = await Promise.all(allSetsPromises);
      return results.flat().filter((set) => set.exercises.length > 0);
    }
  );

  const sortedSets = useMemo(() => {
    if (!allSets || !sessions) return [];

    const sessionsMap = new Map(sessions.map((s) => [s.id, s]));

    return [...allSets].sort((a, b) => {
      const sessionA = a.session_id ? sessionsMap.get(a.session_id) : null;
      const sessionB = b.session_id ? sessionsMap.get(b.session_id) : null;

      const dateA = sessionA
        ? new Date(sessionA.scheduled_at).getTime()
        : new Date(a.created_at).getTime();
      const dateB = sessionB
        ? new Date(sessionB.scheduled_at).getTime()
        : new Date(b.created_at).getTime();

      return dateB - dateA;
    });
  }, [allSets, sessions]);

  if (!isOpen) return null;

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
          maxWidth: "1000px",
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
            Circuitos Históricos
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

        {!sortedSets || sortedSets.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No hay circuitos registrados para este cliente.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {sortedSets.map((exerciseSet, index) => {
              const session = exerciseSet.session_id
                ? sessions?.find((s) => s.id === exerciseSet.session_id)
                : null;
              const dateStr = session
                ? formatDate(session.scheduled_at)
                : formatDate(exerciseSet.created_at);

              let showDateHeader = false;
              if (index === 0) {
                showDateHeader = true;
              } else {
                const prevSet = sortedSets[index - 1];
                const prevSession = prevSet.session_id
                  ? sessions?.find((s) => s.id === prevSet.session_id)
                  : null;
                const prevDateStr = prevSession
                  ? formatDate(prevSession.scheduled_at)
                  : formatDate(prevSet.created_at);
                if (dateStr !== prevDateStr) {
                  showDateHeader = true;
                }
              }

              return (
                <div
                  key={exerciseSet.id}
                  style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                >
                  {showDateHeader && (
                    <div style={{ marginTop: index === 0 ? 0 : "1rem" }}>
                      <hr
                        style={{
                          border: "0",
                          borderTop: "1px solid #e1e5e9",
                          margin: "0 0 1rem 0",
                        }}
                      />
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 600,
                          color: "#4b5563",
                          margin: "0",
                        }}
                      >
                        {dateStr}
                      </h3>
                    </div>
                  )}
                  <ExerciseSetDisplay
                    sets={[exerciseSet]}
                    onEdit={() => {}} // Read-only in history view
                    onDelete={() => {}} // Read-only in history view
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientExerciseHistoryCard({ clientId }: ClientExerciseHistoryCardProps) {
  const { darkStyles, theme } = useDarkStyles();
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [showSetsModal, setShowSetsModal] = useState(false);

  // Fetch all exercises done by the client
  const { data: exerciseData, isLoading } = useSWR<ExerciseHistoryResponse>(
    `/clients/${clientId}/exercise-history`,
    () => clientsApi.getExerciseHistory(clientId)
  );

  // Fetch filtered exercise history when an exercise is selected
  const { data: filteredData } = useSWR<ExerciseHistoryResponse>(
    selectedExercise ? `/clients/${clientId}/exercise-history?exercise=${selectedExercise}` : null,
    () => clientsApi.getExerciseHistory(clientId, selectedExercise)
  );

  const historyToDisplay = selectedExercise && filteredData ? filteredData.history : [];

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
          Historial de Ejercicios
        </h3>
        <div style={{ color: theme.colors.secondary }}>Cargando...</div>
      </div>
    );
  }

  if (!exerciseData || exerciseData.exercises.length === 0) {
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
          Historial de Ejercicios
        </h3>
        <div style={{ color: theme.colors.secondary }}>
          No hay ejercicios registrados para este cliente.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={darkStyles.card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <h3
            style={{ color: theme.colors.text, fontSize: "1.125rem", fontWeight: 600, margin: 0 }}
          >
            Historial de Ejercicios
          </h3>
          <button
            onClick={() => setShowSetsModal(true)}
            className="btn btn-primary"
            style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
          >
            Ver Circuitos
          </button>
        </div>

        {/* Exercise Selector */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              color: theme.colors.secondary,
            }}
          >
            Seleccionar Ejercicio
          </label>
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="input"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              border: `1px solid ${darkStyles.divider}`,
              backgroundColor: darkStyles.card.backgroundColor,
              color: theme.colors.text,
            }}
          >
            <option value="">-- Seleccionar ejercicio --</option>
            {exerciseData.exercises.map((exerciseName) => (
              <option key={exerciseName} value={exerciseName}>
                {exerciseName}
              </option>
            ))}
          </select>
        </div>

        {/* Exercise History Table */}
        {selectedExercise && historyToDisplay.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...darkStyles.tableText }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${darkStyles.divider}` }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem 0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: theme.colors.secondary,
                    }}
                  >
                    Fecha
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem 0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: theme.colors.secondary,
                    }}
                  >
                    Detalles
                  </th>
                </tr>
              </thead>
              <tbody>
                {historyToDisplay.map((entry, index) => (
                  <tr
                    key={`${entry.session_id}-${index}`}
                    style={{ borderBottom: `1px solid ${darkStyles.divider}` }}
                  >
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "0.875rem",
                        color: theme.colors.secondary,
                      }}
                    >
                      {formatDate(entry.date)}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "0.875rem",
                        color: theme.colors.text,
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        {Object.entries(entry.data).map(([key, value]) => (
                          <div key={key} style={{ display: "flex", gap: "0.5rem" }}>
                            <span style={{ color: theme.colors.secondary }}>{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedExercise && historyToDisplay.length === 0 && (
          <div style={{ color: theme.colors.secondary }}>
            No hay datos históricos para este ejercicio.
          </div>
        )}
      </div>

      <ClientExerciseSetsModal
        clientId={clientId}
        isOpen={showSetsModal}
        onClose={() => setShowSetsModal(false)}
      />
    </>
  );
}
