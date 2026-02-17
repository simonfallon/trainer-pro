"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sessionsApi, clientsApi, exerciseSetsApi } from "@/lib/api";
import { useDashboardApp } from "@/hooks/useDashboardApp";
import { NotesModal } from "@/components/session/NotesModal";
import { StopwatchModal } from "@/components/session/StopwatchModal";
import { ExerciseSetDisplay } from "@/components/ExerciseSetDisplay";
import { ExerciseSetForm } from "@/components/ExerciseSetForm";
import { SingleExerciseForm } from "@/components/SingleExerciseForm";
import type { TrainingSession, SessionGroup, Client, ExerciseSet, SessionExercise } from "@/types";

// Helper to format time (MM:SS.CS)
const formatLapTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
};

export default function ActiveSessionPage() {
  const { app, trainer } = useDashboardApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSession, setActiveSession] = useState<TrainingSession | SessionGroup | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [stopwatchClient, setStopwatchClient] = useState<Client | null>(null);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [showSetForm, setShowSetForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [editingSet, setEditingSet] = useState<ExerciseSet | undefined>(undefined);

  // Determine if this is a BMX trainer
  const isBMX = trainer?.discipline_type?.toLowerCase() === "bmx";

  useEffect(() => {
    loadActiveSession();
  }, [app.trainer_id]);

  const loadActiveSession = async () => {
    try {
      const session = await sessionsApi.getActive(app.trainer_id);
      if (!session) {
        // No active session, redirect to dashboard
        router.push(`/dashboard?app_id=${app.id}`);
        return;
      }

      setActiveSession(session);

      // Load client details
      const clientIds = isSessionGroup(session)
        ? session.sessions.map((s) => s.client_id)
        : [session.client_id];

      const allClients = await clientsApi.list(app.trainer_id);
      const sessionClients = allClients.filter((c) => clientIds.includes(c.id));
      setClients(sessionClients);

      // Load exercises or exercise sets based on discipline
      const sessionId = isSessionGroup(session) ? session.sessions[0].id : session.id;
      if (isBMX) {
        // For BMX, load individual exercises
        const exs = await sessionsApi.getExercises(sessionId);
        setExercises(exs);
      } else {
        // For physio, load exercise sets (circuits)
        const sets = await exerciseSetsApi.listForSession(sessionId);
        setExerciseSets(sets);
      }
    } catch (error) {
      console.error("Error loading active session:", error);
      alert("Error al cargar la sesión activa");
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    const confirmed = window.confirm("¿Estás seguro de que quieres finalizar esta sesión?");
    if (!confirmed) return;

    try {
      if (isSessionGroup(activeSession)) {
        // Update all sessions in the group
        for (const session of activeSession.sessions) {
          await sessionsApi.update(session.id, { status: "completed" });
        }
      } else {
        await sessionsApi.update(activeSession.id, { status: "completed" });
      }

      // Navigate back to dashboard
      router.push(`/dashboard?app_id=${app.id}`);
    } catch (error) {
      console.error("Error ending session:", error);
      alert("Error al finalizar la sesión");
    }
  };

  const getClientInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  const getClientNotes = (clientId: number): string => {
    if (!activeSession) return "";

    // Get the session that contains the notes
    let sessionDoc: string | null = null;
    if (isSessionGroup(activeSession)) {
      // For group sessions, find the session for this client
      const clientSession = activeSession.sessions.find((s) => s.client_id === clientId);
      sessionDoc = clientSession?.session_doc || null;
    } else {
      sessionDoc = activeSession.session_doc;
    }

    if (!sessionDoc) return "";

    try {
      const doc = JSON.parse(sessionDoc);
      return doc?.client_notes?.[clientId.toString()] || "";
    } catch (e) {
      console.error("Error parsing session_doc:", e);
      return "";
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (!activeSession) {
    return null;
  }

  const duration = activeSession.duration_minutes;

  return (
    <div className="fade-in" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Session Info */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Información de la Sesión</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.875rem", color: "var(--color-secondary)" }}>Duración</div>
            <div style={{ fontWeight: 600 }}>{duration} minutos</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "var(--color-secondary)" }}>
              Total de Clientes
            </div>
            <div style={{ fontWeight: 600 }}>{clients.length}</div>
          </div>
          {activeSession.notes && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "0.875rem", color: "var(--color-secondary)" }}>Notas</div>
              <div
                style={{
                  backgroundColor: "var(--background-muted)",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  marginTop: "0.25rem",
                }}
              >
                {activeSession.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client List */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1.5rem" }}>Clientes en la Sesión</h3>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "2rem",
          }}
        >
          {clients.map((client) => (
            <div key={client.id} style={{ textAlign: "center", width: "250px" }}>
              {/* Avatar */}
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  margin: "0 auto 1rem",
                  overflow: "hidden",
                  border: "3px solid var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: client.photo_url ? "transparent" : "var(--background-muted)",
                  fontSize: "2.5rem",
                  fontWeight: 600,
                  color: "var(--color-secondary)",
                }}
              >
                {client.photo_url ? (
                  <img
                    src={client.photo_url}
                    alt={client.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  getClientInitials(client.name)
                )}
              </div>

              {/* Client Name */}
              <div style={{ fontWeight: 600, marginBottom: "1rem" }}>{client.name}</div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", fontSize: "0.875rem" }}
                  onClick={() => setSelectedClient(client)}
                >
                  Notas
                </button>
                {app.name.toLowerCase().includes("bmx") && (
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", fontSize: "0.875rem" }}
                    onClick={() => setStopwatchClient(client)}
                  >
                    Tomar Tiempo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exercises Section - Conditional based on discipline */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ margin: 0 }}>{isBMX ? "Ejercicios" : "Circuitos de Ejercicios"}</h3>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (isBMX) {
                setShowExerciseForm(true);
              } else {
                setEditingSet(undefined);
                setShowSetForm(true);
              }
            }}
            style={{ fontSize: "0.875rem" }}
          >
            {isBMX ? "+ Agregar Ejercicio" : "+ Crear Circuito"}
          </button>
        </div>

        {isBMX ? (
          /* BMX: Show individual exercises */
          exercises.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--color-secondary)",
                fontStyle: "italic",
              }}
            >
              No hay ejercicios. Haz clic en "Agregar Ejercicio" para comenzar.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {exercises.map((exercise, index) => {
                if (exercise.custom_name === "Toma de Tiempo BMX") {
                  const rawLapTimes = exercise.data.lap_times_ms;
                  const lapTimes = Array.isArray(rawLapTimes) ? (rawLapTimes as number[]) : [];
                  const avgTime =
                    lapTimes.length > 0
                      ? lapTimes.reduce((sum, time) => sum + time, 0) / lapTimes.length
                      : 0;
                  const bestTime = lapTimes.length > 0 ? Math.min(...lapTimes) : 0;
                  const clientId = exercise.data.client_id;
                  const client = clientId ? clients.find((c) => c.id === Number(clientId)) : null;
                  // If specific client found, use their name. If not, and only one client in session, use that one.
                  const clientName = client
                    ? client.name
                    : clients.length === 1
                      ? clients[0].name
                      : "Desconocido";

                  return (
                    <div
                      key={exercise.id}
                      style={{
                        padding: "1rem",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                        backgroundColor: "var(--background-muted)",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                        Toma de tiempo {clientName}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--color-secondary)" }}>
                        <div>
                          <strong>vueltas:</strong> {lapTimes.length}
                        </div>
                        <div>
                          <strong>Mejor tiempo:</strong> {formatLapTime(bestTime)}
                        </div>
                        <div>
                          <strong>Tiempo promedio:</strong> {formatLapTime(avgTime)}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={exercise.id}
                    style={{
                      padding: "1rem",
                      border: "1px solid var(--border-color)",
                      borderRadius: "4px",
                      backgroundColor: "var(--background-muted)",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                      {exercise.custom_name}
                    </div>
                    {Object.keys(exercise.data).length > 0 && (
                      <div style={{ fontSize: "0.875rem", color: "var(--color-secondary)" }}>
                        {Object.entries(exercise.data).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Physio: Show exercise sets (circuits) */
          <ExerciseSetDisplay
            sets={exerciseSets}
            onEdit={(set) => {
              setEditingSet(set);
              setShowSetForm(true);
            }}
            onDelete={async (setId) => {
              try {
                await exerciseSetsApi.delete(setId);
                // Refresh sets
                const sessionId = isSessionGroup(activeSession!)
                  ? activeSession!.sessions[0].id
                  : activeSession!.id;
                const sets = await exerciseSetsApi.listForSession(sessionId);
                setExerciseSets(sets);
              } catch (err) {
                console.error("Error deleting set:", err);
                alert("Error al eliminar el circuito");
              }
            }}
          />
        )}
      </div>

      {/* End Session Button */}
      <div style={{ textAlign: "center" }}>
        <button
          className="btn"
          style={{
            backgroundColor: "#dc3545",
            color: "white",
            borderColor: "#dc3545",
            minWidth: "300px",
            fontSize: "1.125rem",
            padding: "1rem 2rem",
          }}
          onClick={handleEndSession}
        >
          Finalizar Sesión
        </button>
      </div>

      {/* Notes Modal */}
      {selectedClient && activeSession && (
        <NotesModal
          sessionId={
            isSessionGroup(activeSession)
              ? activeSession.sessions.find((s) => s.client_id === selectedClient.id)?.id ||
                activeSession.sessions[0].id
              : activeSession.id
          }
          client={selectedClient}
          initialNotes={getClientNotes(selectedClient.id)}
          onClose={() => setSelectedClient(null)}
          onSave={() => {
            // Reload session to get updated notes
            loadActiveSession();
          }}
        />
      )}

      {/* Stopwatch Modal */}
      {stopwatchClient && activeSession && (
        <StopwatchModal
          sessionId={
            isSessionGroup(activeSession) ? activeSession.sessions[0].id : activeSession.id
          }
          client={stopwatchClient}
          onClose={() => setStopwatchClient(null)}
          onSave={() => {
            // Optionally reload session after saving lap times
            loadActiveSession();
          }}
        />
      )}

      {/* Exercise Set Form Modal (Physio only) */}
      {showSetForm && activeSession && !isBMX && (
        <ExerciseSetForm
          sessionId={
            isSessionGroup(activeSession) ? activeSession.sessions[0].id : activeSession.id
          }
          existingSet={editingSet}
          onSave={async (data) => {
            try {
              const sessionId = isSessionGroup(activeSession)
                ? activeSession.sessions[0].id
                : activeSession.id;

              if (editingSet) {
                // Update existing set
                await exerciseSetsApi.update(editingSet.id, {
                  name: data.name,
                  series: data.series,
                });
              } else {
                // Create new set
                await exerciseSetsApi.createForSession(sessionId, data);
              }

              // Refresh sets
              const sets = await exerciseSetsApi.listForSession(sessionId);
              setExerciseSets(sets);
              setShowSetForm(false);
              setEditingSet(undefined);
            } catch (err) {
              console.error("Error saving exercise set:", err);
              throw err; // Re-throw to let form handle the error
            }
          }}
          onCancel={() => {
            setShowSetForm(false);
            setEditingSet(undefined);
          }}
        />
      )}

      {/* Single Exercise Form Modal (BMX only) */}
      {showExerciseForm && activeSession && isBMX && (
        <SingleExerciseForm
          sessionId={
            isSessionGroup(activeSession) ? activeSession.sessions[0].id : activeSession.id
          }
          onSave={async () => {
            // Refresh exercises
            const sessionId = isSessionGroup(activeSession)
              ? activeSession.sessions[0].id
              : activeSession.id;
            const exs = await sessionsApi.getExercises(sessionId);
            setExercises(exs);
            setShowExerciseForm(false);
          }}
          onCancel={() => {
            setShowExerciseForm(false);
          }}
        />
      )}
    </div>
  );
}

// Type guard to check if session is a SessionGroup
function isSessionGroup(session: TrainingSession | SessionGroup): session is SessionGroup {
  return "sessions" in session;
}
