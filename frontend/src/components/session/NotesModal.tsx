"use client";

import React, { useState, useEffect, useRef } from "react";
import { Client } from "@/types";
import { sessionsApi } from "@/lib/api";

interface NotesModalProps {
  sessionId: number;
  client: Client;
  initialNotes?: string;
  onClose: () => void;
  onSave?: () => void;
}

export const NotesModal: React.FC<NotesModalProps> = ({
  sessionId,
  client,
  initialNotes = "",
  onClose,
  onSave,
}) => {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set cursor at the end of the text when component mounts
  useEffect(() => {
    if (textareaRef.current && initialNotes) {
      const length = initialNotes.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [initialNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await sessionsApi.saveClientNotes(sessionId, client.id, notes);
      onSave?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar las notas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Notas para {client.name}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="clientNotes">
              Notas del entrenamiento
            </label>
            <textarea
              ref={textareaRef}
              id="clientNotes"
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe tus observaciones sobre el desempeño del cliente..."
              rows={8}
              autoFocus
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
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
