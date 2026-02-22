"use client";

import React, { useState, useEffect } from "react";
import { TrainingSession, Client, Location } from "@/types";
import { SESSION_STATUS_LABELS } from "@/lib/labels";
import {
  formatDate,
  toColombianDateString,
  toColombianTimeString,
  formatColombianTime,
} from "@/lib/dateUtils";

interface SessionModalProps {
  mode: "create" | "view" | "edit";
  session?: TrainingSession;
  groupSessions?: TrainingSession[];
  initialDate?: Date;
  clients: Client[];
  locations: Location[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onStatusChange: (sessionId: number, status: string) => Promise<void>;
  onDelete: (session: TrainingSession) => Promise<void>;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  mode: initialMode,
  session,
  groupSessions,
  initialDate,
  clients,
  locations = [],
  onClose,
  onSave,
  onStatusChange,
  onDelete,
}) => {
  const [mode, setMode] = useState<"create" | "view" | "edit">(initialMode);
  const [formData, setFormData] = useState({
    client_ids: [] as number[],
    location_id: "",
    date: "",
    time: "09:00",
    duration_minutes: 60,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    if (mode === "create" && initialDate) {
      setFormData((prev) => ({
        ...prev,
        date: toColombianDateString(initialDate),
        time: toColombianTimeString(initialDate),
      }));
    } else if ((mode === "edit" || mode === "view") && session) {
      const date = new Date(session.scheduled_at);

      // Determine all client IDs involved
      let clientIds: number[] = [session.client_id];
      if (groupSessions && groupSessions.length > 0) {
        clientIds = groupSessions.map((s) => s.client_id);
      }

      setFormData({
        client_ids: clientIds,
        location_id: session.location_id != null ? String(session.location_id) : "",
        date: toColombianDateString(date),
        time: toColombianTimeString(date),
        duration_minutes: session.duration_minutes,
        notes: session.notes || "",
      });
    }
  }, [mode, session, initialDate, groupSessions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await onSave({
        ...formData,
        id: session?.id, // Includes ID if editing
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusAction = async (newStatus: string) => {
    if (!session) return;
    try {
      await onStatusChange(session.id, newStatus);
      onClose();
    } catch (err) {
      setError("Error al actualizar estado");
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    if (!window.confirm("¿Eliminar esta sesión? Esta acción no se puede deshacer.")) return;
    try {
      await onDelete(session);
      onClose();
    } catch (err) {
      setError("Error al eliminar la sesión");
    }
  };

  const handleClientToggle = (clientId: number) => {
    setFormData((prev) => ({
      ...prev,
      client_ids: prev.client_ids.includes(clientId)
        ? prev.client_ids.filter((id) => id !== clientId)
        : [...prev.client_ids, clientId],
    }));
  };

  const selectedClientsText =
    formData.client_ids.length === 0
      ? "Selecciona uno o más clientes"
      : formData.client_ids.length === 1
        ? clients.find((c) => c.id === formData.client_ids[0])?.name || "Cliente"
        : `${formData.client_ids.length} clientes seleccionados`;

  if (mode === "view" && session) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Detalles de la Sesión</h3>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div
            className="modal-body"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label className="form-label" style={{ fontSize: "0.75rem" }}>
                {formData.client_ids.length > 1 ? "Clientes" : "Cliente"}
              </label>
              {formData.client_ids.length > 0 ? (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  {formData.client_ids.map((id) => (
                    <li key={id}>{clients.find((c) => c.id === id)?.name || "Desconocido"}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>Desconocido</p>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>
                  Fecha
                </label>
                <p>{formatDate(session.scheduled_at)}</p>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>
                  Hora
                </label>
                <p>{formatColombianTime(session.scheduled_at)}</p>
              </div>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.75rem" }}>
                Duración
              </label>
              <p>{session.duration_minutes} minutos</p>
            </div>
            {session.location_id && (
              <div>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>
                  Ubicación
                </label>
                <p>
                  📍{" "}
                  {locations.find((l) => l.id === session.location_id)?.name ||
                    "Ubicación eliminada"}
                </p>
              </div>
            )}
            <div>
              <label className="form-label" style={{ fontSize: "0.75rem" }}>
                Notas
              </label>
              <p
                style={{
                  background: "var(--background-muted)",
                  padding: "0.5rem",
                  borderRadius: "4px",
                }}
              >
                {session.notes || "Sin notas"}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              {session.status === "scheduled" ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setMode("create")}>
                    Editar
                  </button>
                  <button
                    className="btn"
                    style={{ backgroundColor: "#dc3545", color: "white", borderColor: "#dc3545" }}
                    onClick={() => handleStatusAction("cancelled")}
                  >
                    Cancelar Sesión
                  </button>
                </>
              ) : (
                <div
                  style={{
                    color: session.status === "completed" ? "#28a745" : "#dc3545",
                    fontWeight: 600,
                  }}
                >
                  Sesión {SESSION_STATUS_LABELS[session.status] || session.status}
                </div>
              )}
              <button
                className="btn"
                style={{
                  backgroundColor: "transparent",
                  color: "#dc3545",
                  borderColor: "#dc3545",
                  marginLeft: "auto",
                }}
                onClick={handleDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit/Create Mode
  const isEditing = !!session?.id && mode !== "create"; // Simple check

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEditing ? "Editar Sesión" : "Programar Sesión"}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="sessionClient">
              Cliente *
            </label>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="form-select"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onClick={() => setShowClientDropdown(!showClientDropdown)}
              >
                <span>{selectedClientsText}</span>
                <span>{showClientDropdown ? "▲" : "▼"}</span>
              </button>

              {showClientDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    marginTop: "4px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                      onClick={() => handleClientToggle(client.id)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "var(--background-muted)")
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <input
                        type="checkbox"
                        checked={formData.client_ids.includes(client.id)}
                        onChange={() => {}} // Handled by parent div onClick
                        style={{ marginRight: "8px", pointerEvents: "none" }}
                      />
                      <span>{client.name}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      padding: "8px 12px",
                      borderTop: "2px solid var(--border-color)",
                      backgroundColor: "var(--background-muted)",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowClientDropdown(false);
                      }}
                      style={{ width: "100%" }}
                    >
                      Listo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sessionDate">
                Fecha *
              </label>
              <input
                id="sessionDate"
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sessionTime">
                Hora *
              </label>
              <input
                id="sessionTime"
                type="time"
                className="form-input"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sessionDuration">
              Duración (minutos)
            </label>
            <select
              id="sessionDuration"
              className="form-select"
              value={formData.duration_minutes}
              onChange={(e) =>
                setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })
              }
            >
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1.5 horas</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sessionLocation">
              Ubicación (opcional)
            </label>
            <select
              id="sessionLocation"
              className="form-select"
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
            >
              <option value="">Sin ubicación</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sessionNotes">
              Notas
            </label>
            <textarea
              id="sessionNotes"
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas de la sesión o áreas de enfoque"
            />
          </div>

          {error && <p style={{ color: "#dc3545", marginBottom: "1rem" }}>{error}</p>}

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || formData.client_ids.length === 0 || !formData.date}
              style={{ flex: 1 }}
            >
              {submitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
