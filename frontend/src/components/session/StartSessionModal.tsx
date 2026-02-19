"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Client, Location } from "@/types";
import { sessionsApi } from "@/lib/api";

interface StartSessionModalProps {
  trainerId: number;
  appId: number;
  clients: Client[];
  locations: Location[];
  onClose: () => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({
  trainerId,
  appId,
  clients,
  locations = [],
  onClose,
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    client_ids: [] as number[],
    location_id: "",
    duration_minutes: 60,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.client_ids.length === 0) {
      setError("Debes seleccionar al menos un cliente");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await sessionsApi.startActive({
        client_ids: formData.client_ids,
        duration_minutes: formData.duration_minutes,
        location_id: formData.location_id ? parseInt(formData.location_id) : undefined,
        notes: formData.notes || undefined,
      });

      // Navigate to active session page
      router.push(`/dashboard/session/active?app_id=${appId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar la sesión");
      setSubmitting(false);
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
      ? "Seleccionar clientes"
      : formData.client_ids.length === 1
        ? clients.find((c) => c.id === formData.client_ids[0])?.name || "Cliente"
        : `${formData.client_ids.length} clientes seleccionados`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Iniciar Sesión Ad-Hoc</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="sessionClient">
              Seleccionar Clientes *
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

          <div className="form-group">
            <label className="form-label" htmlFor="sessionDuration">
              Duración
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
              Ubicación
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
              placeholder="Notas para la sesión (opcional)"
              rows={3}
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
              disabled={submitting || formData.client_ids.length === 0}
              style={{ flex: 1 }}
            >
              {submitting ? "Iniciando..." : "Iniciar Sesión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
