"use client";

import { useState, useRef } from "react";
import { useDarkStyles } from "@/hooks/useDarkStyles";
import { useDashboardApp } from "@/hooks/useDashboardApp";
import { exerciseTemplatesApi, sessionsApi } from "@/lib/api";
import type { ExerciseTemplate } from "@/types";

interface SingleExerciseFormProps {
  sessionId: number;
  onSave: () => void;
  onCancel: () => void;
}

export function SingleExerciseForm({ sessionId, onSave, onCancel }: SingleExerciseFormProps) {
  const { theme, darkStyles } = useDarkStyles();
  const { app } = useDashboardApp();
  const [customName, setCustomName] = useState("");
  const [exerciseData, setExerciseData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<ExerciseTemplate[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExerciseTemplate | undefined>();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleNameChange = async (value: string) => {
    setCustomName(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is too short
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await exerciseTemplatesApi.autocomplete(app.id, value, 5);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Error fetching autocomplete suggestions:", err);
      }
    }, 300);
  };

  const selectTemplate = (template: ExerciseTemplate) => {
    setCustomName(template.name);
    setSelectedTemplate(template);
    setShowSuggestions(false);
    setSuggestions([]);
    // Reset exercise data when template changes
    setExerciseData({});
  };

  const updateExerciseData = (fieldName: string, value: any) => {
    setExerciseData({
      ...exerciseData,
      [fieldName]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customName.trim()) {
      setError("El nombre del ejercicio es requerido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create the exercise directly via the sessions API
      await sessionsApi.addExercise(sessionId, {
        exercise_template_id: selectedTemplate?.id,
        custom_name: customName.trim(),
        data: exerciseData,
      });

      onSave();
    } catch (err) {
      console.error("Error saving exercise:", err);
      setError("Error al guardar el ejercicio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ ...darkStyles.modal, maxWidth: "600px", maxHeight: "90vh", overflow: "auto" }}
      >
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: theme.colors.text }}>
            Agregar Ejercicio
          </h3>
          <button className="modal-close" onClick={onCancel}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Exercise Name with Autocomplete */}
          <div className="form-group">
            <label className="form-label">Nombre del Ejercicio</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                value={customName}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => {
                  // Delay hiding to allow click on suggestion
                  setTimeout(() => {
                    setShowSuggestions(false);
                  }, 200);
                }}
                placeholder="Empieza a escribir para buscar ejercicios..."
                required
              />

              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${theme.colors.secondary}30`,
                    borderRadius: "4px",
                    marginTop: "0.25rem",
                    maxHeight: "200px",
                    overflowY: "auto",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                  }}
                >
                  {suggestions.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      style={{
                        padding: "0.75rem",
                        cursor: "pointer",
                        borderBottom: `1px solid ${theme.colors.secondary}20`,
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${theme.colors.primary}10`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: theme.colors.text,
                          fontSize: "0.875rem",
                        }}
                      >
                        {template.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!selectedTemplate && (
              <small
                style={{
                  display: "block",
                  marginTop: "0.5rem",
                  fontSize: "0.75rem",
                  color: theme.colors.secondary,
                  fontStyle: "italic",
                }}
              >
                Selecciona un ejercicio de la lista o ingresa un nombre personalizado
              </small>
            )}
          </div>

          {/* Dynamic Fields based on Template Schema */}
          {selectedTemplate && selectedTemplate.field_schema && (
            <div>
              {Object.entries(selectedTemplate.field_schema)
                .filter(([fieldName]) => fieldName !== "series")
                .map(([fieldName, fieldDef]) => (
                  <div key={fieldName} className="form-group">
                    <label className="form-label">
                      {fieldDef.label}
                      {fieldDef.required && <span style={{ color: "#dc3545" }}> *</span>}
                    </label>
                    {fieldDef.type === "text" ? (
                      <textarea
                        className="form-input"
                        value={exerciseData[fieldName] || ""}
                        onChange={(e) => updateExerciseData(fieldName, e.target.value)}
                        placeholder={`Ingresa ${fieldDef.label.toLowerCase()}`}
                        rows={2}
                        required={fieldDef.required}
                      />
                    ) : (
                      <input
                        type={
                          fieldDef.type === "integer" ||
                          fieldDef.type === "float" ||
                          fieldDef.type === "number"
                            ? "number"
                            : "text"
                        }
                        className="form-input"
                        value={exerciseData[fieldName] || ""}
                        onChange={(e) => {
                          const value =
                            fieldDef.type === "integer" ||
                            fieldDef.type === "float" ||
                            fieldDef.type === "number"
                              ? e.target.value
                                ? parseFloat(e.target.value)
                                : ""
                              : e.target.value;
                          updateExerciseData(fieldName, value);
                        }}
                        placeholder={`Ingresa ${fieldDef.label.toLowerCase()}`}
                        step={fieldDef.type === "float" || fieldDef.type === "number" ? "0.1" : "1"}
                        required={fieldDef.required}
                      />
                    )}
                  </div>
                ))}
            </div>
          )}

          {error && (
            <p style={{ color: "#dc3545", marginBottom: "1rem", fontSize: "0.875rem" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1, opacity: loading ? 0.5 : 1 }}
            >
              {loading ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
