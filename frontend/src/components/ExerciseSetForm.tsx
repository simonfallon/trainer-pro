"use client";

import { useState, useEffect, useRef } from "react";
import { useDarkStyles } from "@/hooks/useDarkStyles";
import { useDashboardApp } from "@/hooks/useDashboardApp";
import { exerciseTemplatesApi } from "@/lib/api";
import { formatFieldName } from "@/lib/stringUtils";
import { ExerciseAutocomplete } from "@/components/ExerciseAutocomplete";
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
  const [series, setSeries] = useState<number | "">(
    existingSet?.series ??
      (app?.theme_config?.default_exercise_schema?.["series"]?.default_value !== undefined
        ? Number(app.theme_config.default_exercise_schema["series"].default_value)
        : 3)
  );
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
  const [selectedTemplates, setSelectedTemplates] = useState<{
    [key: number]: ExerciseTemplate | undefined;
  }>({});

  // Hydrate selectedTemplates for existing sets
  useEffect(() => {
    if (existingSet?.exercises && existingSet.exercises.length > 0 && app?.id) {
      const fetchTemplates = async () => {
        try {
          // Fetch all templates for the current app
          const templates = await exerciseTemplatesApi.list(app.id);
          const templateMap = templates.reduce(
            (acc, t) => {
              acc[t.id] = t;
              return acc;
            },
            {} as Record<number, ExerciseTemplate>
          );

          const newSelectedTemplates: Record<number, ExerciseTemplate> = {};
          existingSet.exercises.forEach((ex, index) => {
            if (ex.exercise_template_id && templateMap[ex.exercise_template_id]) {
              newSelectedTemplates[index] = templateMap[ex.exercise_template_id];
            }
          });

          setSelectedTemplates((prev) => ({ ...prev, ...newSelectedTemplates }));
        } catch (err) {
          console.error("Error fetching templates for existing set:", err);
        }
      };

      fetchTemplates();
    }
  }, [existingSet, app?.id]);

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

  const selectTemplate = (index: number, template: ExerciseTemplate) => {
    const globalDefaults = app.theme_config?.default_exercise_schema || {};
    const effectiveSchema: Record<string, any> = template.field_schema || {};

    const newExerciseData = { ...exercises[index].data };

    Object.entries(effectiveSchema).forEach(([fieldName, fieldDef]: [string, any]) => {
      const tDefault = fieldDef?.default_value;
      const gDefault = globalDefaults[fieldName]?.default_value;
      const val = tDefault !== undefined ? tDefault : gDefault;
      if (val !== undefined) {
        newExerciseData[fieldName] = val;
      }
    });

    if (index === 0) {
      const templateSeriesDef = template.field_schema?.["series"]?.default_value;
      const globalSeriesDef = globalDefaults["series"]?.default_value;
      const seriesDefault = templateSeriesDef !== undefined ? templateSeriesDef : globalSeriesDef;
      if (seriesDefault !== undefined) {
        setSeries(Number(seriesDefault));
      }
    }

    const updated = [...exercises];
    updated[index] = {
      ...updated[index],
      exercise_template_id: template.id,
      custom_name: template.name,
      data: newExerciseData,
    };
    setExercises(updated);
    setSelectedTemplates((prev) => ({ ...prev, [index]: template }));
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

    if (typeof series !== "number" || series < 1) {
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
            <label className="form-label" htmlFor="series-input">
              Número de Series
            </label>
            <input
              id="series-input"
              type="number"
              className="form-input"
              value={series}
              onChange={(e) =>
                setSeries(e.target.value === "" ? "" : parseInt(e.target.value) || 1)
              }
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
                    <ExerciseAutocomplete
                      appId={app.id}
                      value={exercise.custom_name || ""}
                      onChange={(value) => updateExercise(index, "custom_name", value)}
                      onSelect={(template) => selectTemplate(index, template)}
                      placeholder="Nombre del ejercicio (empieza a escribir para buscar)"
                      required
                    />

                    {/* Dynamic Fields based on Template Schema */}
                    {(() => {
                      const templateSchema = selectedTemplates[index]?.field_schema;
                      if (!templateSchema) return null;

                      const effectiveSchema: Record<string, any> = templateSchema;

                      return (
                        Object.keys(effectiveSchema).length > 0 && (
                          <div style={{ marginTop: "1rem" }}>
                            {Object.entries(effectiveSchema)
                              .filter(([fieldName]) => fieldName !== "series")
                              .map(([fieldName, fieldDef]: [string, any]) => (
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
                                    {formatFieldName(fieldName, fieldDef.label)}
                                    {fieldDef.required && (
                                      <span style={{ color: "#dc3545" }}> *</span>
                                    )}
                                  </label>
                                  {fieldDef.type === "text" ? (
                                    <textarea
                                      className="form-input"
                                      value={exercise.data[fieldName] ?? ""}
                                      onChange={(e) =>
                                        updateExerciseData(index, fieldName, e.target.value)
                                      }
                                      placeholder={`Ingresa ${formatFieldName(
                                        fieldName,
                                        fieldDef.label
                                      ).toLowerCase()}`}
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
                                      value={exercise.data[fieldName] ?? ""}
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
                                      placeholder={`Ingresa ${formatFieldName(
                                        fieldName,
                                        fieldDef.label
                                      ).toLowerCase()}`}
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
                        )
                      );
                    })()}

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
