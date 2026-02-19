"use client";

import { useState, useEffect, useRef } from "react";
import { useDarkStyles } from "@/hooks/useDarkStyles";
import { useDashboardApp } from "@/hooks/useDashboardApp";
import { exerciseTemplatesApi } from "@/lib/api";
import type { ExerciseSet, ExerciseInSetInput, ExerciseTemplate } from "@/types";

interface ExerciseSetFormProps {
  sessionId: number;
  existingSet?: ExerciseSet;
  onSave: (data: {
    name: string;
    series: number;
    exercises: ExerciseInSetInput[];
  }) => Promise<void>;
  onCancel: () => void;
}

export function ExerciseSetForm({
  sessionId,
  existingSet,
  onSave,
  onCancel,
}: ExerciseSetFormProps) {
  const { theme, darkStyles } = useDarkStyles();
  const { app } = useDashboardApp();
  const [name, setName] = useState(existingSet?.name || "");
  const [series, setSeries] = useState(existingSet?.series || 3);
  const [exercises, setExercises] = useState<ExerciseInSetInput[]>(
    existingSet?.exercises.map((ex) => ({
      exercise_template_id: ex.exercise_template_id ?? undefined,
      custom_name: ex.custom_name ?? undefined,
      data: ex.data,
      order_index: ex.order_index,
    })) || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Autocomplete state
  const [searchQuery, setSearchQuery] = useState<{ [key: number]: string }>({});
  const [suggestions, setSuggestions] = useState<{ [key: number]: ExerciseTemplate[] }>({});
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [selectedIndex, setSelectedIndex] = useState<{ [key: number]: number }>({});
  const [selectedTemplates, setSelectedTemplates] = useState<{
    [key: number]: ExerciseTemplate | undefined;
  }>({});
  const searchTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({});

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        custom_name: "",
        data: {},
        order_index: exercises.length,
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof ExerciseInSetInput, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  // Autocomplete search with debounce
  const handleExerciseNameChange = async (index: number, value: string) => {
    // Update the exercise name
    updateExercise(index, "custom_name", value);

    // Update search query
    setSearchQuery((prev) => ({ ...prev, [index]: value }));

    // Clear previous timeout
    if (searchTimeoutRef.current[index]) {
      clearTimeout(searchTimeoutRef.current[index]);
    }

    // Debounce search
    searchTimeoutRef.current[index] = setTimeout(async () => {
      try {
        // Fetch 1000 results to show essentially all exercises
        const results = await exerciseTemplatesApi.autocomplete(app.id, value, 1000);
        setSuggestions((prev) => ({ ...prev, [index]: results }));
        setShowSuggestions((prev) => ({ ...prev, [index]: true }));
      } catch (err) {
        console.error("Error fetching autocomplete suggestions:", err);
      }
    }, 300);
  };

  const selectTemplate = (index: number, template: ExerciseTemplate) => {
    updateExercise(index, "exercise_template_id", template.id);
    updateExercise(index, "custom_name", template.name);
    setSelectedTemplates((prev) => ({ ...prev, [index]: template }));
    setShowSuggestions((prev) => ({ ...prev, [index]: false }));
    setSuggestions((prev) => ({ ...prev, [index]: [] }));
  };

  const updateExerciseData = (exerciseIndex: number, fieldName: string, value: any) => {
    const updated = [...exercises];
    updated[exerciseIndex] = {
      ...updated[exerciseIndex],
      data: {
        ...updated[exerciseIndex].data,
        [fieldName]: value,
      },
    };
    setExercises(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("El nombre del circuito es requerido");
      return;
    }

    if (series < 1) {
      setError("El número de series debe ser al menos 1");
      return;
    }

    if (exercises.length === 0) {
      setError("Debes agregar al menos un ejercicio");
      return;
    }

    // Validate exercises
    for (let i = 0; i < exercises.length; i++) {
      if (!exercises[i].custom_name?.trim()) {
        setError(`El ejercicio #${i + 1} necesita un nombre`);
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      await onSave({
        name: name.trim(),
        series,
        exercises: exercises.map((ex, idx) => ({
          ...ex,
          order_index: idx,
        })),
      });
    } catch (err) {
      console.error("Error saving exercise set:", err);
      setError("Error al guardar el circuito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ ...darkStyles.modal, maxWidth: "700px", maxHeight: "90vh", overflow: "auto" }}
      >
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: theme.colors.text }}>
            {existingSet ? "Editar Circuito" : "Crear Circuito"}
          </h3>
          <button className="modal-close" onClick={onCancel}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Set Name */}
          <div className="form-group">
            <label className="form-label">Nombre del Circuito</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Circuito de Piernas"
              required
            />
          </div>

          {/* Series Count */}
          <div className="form-group">
            <label className="form-label">Número de Series</label>
            <input
              type="number"
              className="form-input"
              value={series}
              onChange={(e) => setSeries(parseInt(e.target.value) || 1)}
              min="1"
              required
            />
          </div>

          {/* Exercises */}
          <div className="form-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                Ejercicios
              </label>
              <button
                type="button"
                onClick={addExercise}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: theme.colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                + Agregar Ejercicio
              </button>
            </div>

            {exercises.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: theme.colors.secondary,
                  fontStyle: "italic",
                  border: `1px dashed ${theme.colors.secondary}40`,
                  borderRadius: "4px",
                }}
              >
                No hay ejercicios. Haz clic en "Agregar Ejercicio" para comenzar.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {exercises.map((exercise, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "1rem",
                      border: `1px solid ${theme.colors.secondary}30`,
                      borderRadius: "4px",
                      backgroundColor: `${theme.colors.primary}05`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: theme.colors.text,
                          fontSize: "0.875rem",
                        }}
                      >
                        Ejercicio #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExercise(index)}
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>

                    {/* Autocomplete Input */}
                    <div
                      style={{
                        position: "relative",
                        marginBottom:
                          showSuggestions[index] && suggestions[index]?.length > 0 ? "240px" : "0",
                        transition: "margin-bottom 0.2s ease-out",
                      }}
                    >
                      <input
                        type="text"
                        className="form-input"
                        value={exercise.custom_name || ""}
                        onChange={(e) => handleExerciseNameChange(index, e.target.value)}
                        onBlur={() => {
                          // Delay hiding to allow click on suggestion
                          setTimeout(() => {
                            setShowSuggestions((prev) => ({ ...prev, [index]: false }));
                          }, 200);
                        }}
                        placeholder="Nombre del ejercicio (empieza a escribir para buscar)"
                        style={{ fontSize: "0.875rem" }}
                        required
                        onFocus={() => {
                          // Trigger search on focus with current value (even if empty)
                          handleExerciseNameChange(index, exercise.custom_name || "");
                        }}
                      />

                      {/* Autocomplete Dropdown */}
                      {showSuggestions[index] && suggestions[index]?.length > 0 && (
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
                            maxHeight: "240px",
                            overflowY: "auto",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                          }}
                        >
                          {suggestions[index].map((template) => (
                            <div
                              key={template.id}
                              onClick={() => selectTemplate(index, template)}
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

                    {/* Dynamic Fields based on Template Schema */}
                    {selectedTemplates[index] && selectedTemplates[index]!.field_schema && (
                      <div style={{ marginTop: "1rem" }}>
                        {Object.entries(selectedTemplates[index]!.field_schema)
                          .filter(([fieldName]) => fieldName !== "series")
                          .map(([fieldName, fieldDef]) => (
                            <div key={fieldName} style={{ marginBottom: "0.75rem" }}>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: theme.colors.text,
                                  marginBottom: "0.25rem",
                                }}
                              >
                                {fieldDef.label}
                                {fieldDef.required && <span style={{ color: "#dc3545" }}> *</span>}
                              </label>
                              {fieldDef.type === "text" ? (
                                <textarea
                                  className="form-input"
                                  value={exercise.data[fieldName] || ""}
                                  onChange={(e) =>
                                    updateExerciseData(index, fieldName, e.target.value)
                                  }
                                  placeholder={`Ingresa ${fieldDef.label.toLowerCase()}`}
                                  rows={2}
                                  style={{ fontSize: "0.875rem" }}
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
                                  value={exercise.data[fieldName] || ""}
                                  onChange={(e) => {
                                    const value =
                                      fieldDef.type === "integer" ||
                                      fieldDef.type === "float" ||
                                      fieldDef.type === "number"
                                        ? e.target.value
                                          ? parseFloat(e.target.value)
                                          : ""
                                        : e.target.value;
                                    updateExerciseData(index, fieldName, value);
                                  }}
                                  placeholder={`Ingresa ${fieldDef.label.toLowerCase()}`}
                                  step={
                                    fieldDef.type === "float" || fieldDef.type === "number"
                                      ? "0.1"
                                      : "1"
                                  }
                                  style={{ fontSize: "0.875rem" }}
                                  required={fieldDef.required}
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    )}

                    {!selectedTemplates[index] && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.75rem",
                          color: theme.colors.secondary,
                          fontStyle: "italic",
                        }}
                      >
                        Selecciona un ejercicio de la lista o ingresa un nombre personalizado
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
              {loading ? "Guardando..." : existingSet ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
