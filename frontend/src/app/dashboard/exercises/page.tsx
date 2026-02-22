"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { exerciseTemplatesApi, appsApi } from "@/lib/api";
import { useDashboardApp } from "@/hooks/useDashboardApp";
import { formatFieldName, toSnakeCase } from "@/lib/stringUtils";
import type {
  ExerciseTemplate,
  ExerciseTemplateCreateInput,
  ExerciseTemplateUpdateInput,
} from "@/types";

// Default field schemas by discipline
const DEFAULT_FIELDS = {
  physio: {
    repeticiones: { type: "number" as const, label: "Repeticiones", required: true },
    series: { type: "number" as const, label: "Series", required: true },
    peso: { type: "number" as const, label: "Peso", required: false },
  },
  bmx: {
    runs: { type: "number" as const, label: "Runs", required: true },
    duracion_total: { type: "duration" as const, label: "Duracion Total", required: true },
  },
};

type FieldType = "number" | "array" | "duration" | "text";

interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  default_value?: any;
}

export default function ExercisesPage() {
  const { app, trainer } = useDashboardApp();
  const swrKey = `/exercise-templates-${app.id}`;
  const { data: exercises = [], isLoading } = useSWR<ExerciseTemplate[]>(swrKey, () =>
    exerciseTemplatesApi.list(app.id)
  );

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configFields, setConfigFields] = useState<FieldDefinition[]>([]);
  const [configSubmitting, setConfigSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseTemplate | null>(null);
  const [editingExercise, setEditingExercise] = useState<ExerciseTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const getDefaultFields = (): FieldDefinition[] => {
    if (app.theme_config.default_exercise_schema) {
      return Object.entries(app.theme_config.default_exercise_schema).map(
        ([key, value]: [string, any]) => ({
          id: Math.random().toString(36).substring(7),
          name: value.label || key,
          type: value.type,
          required: value.required ?? false,
          default_value: value.default_value,
        })
      );
    }

    const discipline = trainer?.discipline_type?.toLowerCase();
    let fieldsMap = {};
    if (discipline === "physio" || discipline === "fisioterapia") {
      fieldsMap = DEFAULT_FIELDS.physio;
    } else if (discipline === "bmx") {
      fieldsMap = DEFAULT_FIELDS.bmx;
    }
    return Object.entries(fieldsMap).map(([key, value]: [string, any]) => ({
      id: Math.random().toString(36).substring(7),
      name: value.label || key,
      type: value.type,
      required: value.required ?? false,
    }));
  };

  const handleOpenForm = (exercise?: ExerciseTemplate) => {
    if (exercise) {
      setEditingExercise(exercise);
      setFormData({ name: exercise.name });
      const normalizedFields = Object.entries(exercise.field_schema || {}).map(([key, value]) => ({
        id: Math.random().toString(36).substring(7),
        name: value.label || key,
        type: ["integer", "float"].includes(value.type)
          ? ("number" as FieldType)
          : (value.type as FieldType),
        required: value.required ?? false,
      }));
      setFields(normalizedFields);
    } else {
      setEditingExercise(null);
      setFormData({ name: "" });
      setFields(getDefaultFields());
    }
    setShowForm(true);
    setError("");
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExercise(null);
    setFormData({ name: "" });
    setFields([]);
    setError("");
  };

  const handleViewSchema = (exercise: ExerciseTemplate) => {
    setSelectedExercise(exercise);
    setShowSchemaModal(true);
  };

  const handleAddField = () => {
    setFields([
      ...fields,
      { id: Math.random().toString(36).substring(7), name: "", type: "number", required: false },
    ]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleFieldChange = (id: string, property: keyof FieldDefinition, value: any) => {
    if (property === "name") {
      // Allow only lower and uppercase letters, and whitespaces
      if (!/^[A-Za-zÀ-ÿ\s]*$/.test(value)) return;
    }
    setFields(fields.map((f) => (f.id === id ? { ...f, [property]: value } : f)));
  };

  const handleOpenConfig = () => {
    setConfigFields(getDefaultFields());
    setShowConfigModal(true);
    setError("");
  };

  const handleCloseConfig = () => {
    setShowConfigModal(false);
    setConfigFields([]);
    setError("");
  };

  const handleAddConfigField = () => {
    setConfigFields([
      ...configFields,
      { id: Math.random().toString(36).substring(7), name: "", type: "number", required: false },
    ]);
  };

  const handleRemoveConfigField = (id: string) => {
    setConfigFields(configFields.filter((f) => f.id !== id));
  };

  const handleConfigFieldChange = (id: string, property: keyof FieldDefinition, value: any) => {
    if (property === "name") {
      if (!/^[A-Za-zÀ-ÿ\s]*$/.test(value)) return;
    }
    setConfigFields(configFields.map((f) => (f.id === id ? { ...f, [property]: value } : f)));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSubmitting(true);
    setError("");

    try {
      const validFields: Record<string, any> = {};
      configFields.forEach((field) => {
        if (field.name.trim()) {
          const internalKey = toSnakeCase(field.name);
          validFields[internalKey] = {
            type: field.type,
            label: field.name.trim(),
            required: field.required,
            default_value: field.default_value !== "" ? field.default_value : undefined,
          };
        }
      });

      const updatedThemeConfig = {
        ...app.theme_config,
        default_exercise_schema: validFields,
      };

      await appsApi.update(app.id, { theme_config: updatedThemeConfig });

      // Reload the page to reflect the new global schema gracefully
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar configuración");
    } finally {
      setConfigSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      // Filter out fields with empty labels and format internal keys
      const validFields: Record<string, any> = {};
      fields.forEach((field) => {
        if (field.name.trim()) {
          const internalKey = toSnakeCase(field.name);
          validFields[internalKey] = {
            type: field.type,
            label: field.name.trim(), // Keep original label so we still display it
            required: field.required,
          };
        }
      });

      if (editingExercise) {
        const updateData: ExerciseTemplateUpdateInput = {
          name: formData.name.trim(),
          field_schema: validFields,
        };
        await exerciseTemplatesApi.update(editingExercise.id, updateData);
      } else {
        const createData: ExerciseTemplateCreateInput = {
          trainer_app_id: app.id,
          name: formData.name.trim(),
          discipline_type: trainer?.discipline_type || "general",
          field_schema: validFields,
        };
        await exerciseTemplatesApi.create(createData);
      }

      mutate(swrKey);
      handleCloseForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el ejercicio");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exerciseId: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este ejercicio?")) return;

    try {
      await exerciseTemplatesApi.delete(exerciseId);
      mutate(swrKey);
    } catch (err) {
      console.error("Failed to delete exercise:", err);
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "3rem" }}>Cargando ejercicios...</div>;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">Ejercicios</h2>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="btn btn-secondary" onClick={handleOpenConfig}>
            Configurar Valores por Defecto
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenForm()}>
            + Agregar Ejercicio
          </button>
        </div>
      </div>

      {/* Config Defaults Modal */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={handleCloseConfig}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Valores por Defecto de Ejercicios</h3>
              <button className="modal-close" onClick={handleCloseConfig}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveConfig}>
              <div className="form-group">
                <p
                  style={{
                    color: "var(--color-secondary)",
                    marginBottom: "1rem",
                    fontSize: "0.875rem",
                  }}
                >
                  Aquí puedes configurar los detalles que tendrán por defecto todos tus nuevos
                  ejercicios y qué valores autocompletarán al armar circuitos.
                </p>
                <div
                  style={{
                    border: "1px solid #e1e5e9",
                    borderRadius: "8px",
                    padding: "1rem",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  {configFields.length === 0 ? (
                    <p
                      style={{
                        color: "var(--color-secondary)",
                        marginBottom: "1rem",
                        textAlign: "center",
                      }}
                    >
                      No hay detalles por defecto configurados
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {configFields.map((field) => (
                        <div
                          key={field.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr auto auto",
                            gap: "0.5rem",
                            alignItems: "center",
                            padding: "0.75rem",
                            backgroundColor: "white",
                            borderRadius: "6px",
                            border: "1px solid #e1e5e9",
                          }}
                        >
                          <input
                            type="text"
                            className="form-input"
                            value={field.name}
                            onChange={(e) =>
                              handleConfigFieldChange(field.id, "name", e.target.value)
                            }
                            placeholder="Nombre (ej. Serie)"
                            style={{ fontSize: "0.875rem" }}
                          />
                          <select
                            className="form-input"
                            value={field.type}
                            onChange={(e) =>
                              handleConfigFieldChange(field.id, "type", e.target.value as FieldType)
                            }
                            style={{ fontSize: "0.875rem" }}
                          >
                            <option value="number">Número</option>
                            <option value="array">Números</option>
                            <option value="duration">Duración</option>
                            <option value="text">Texto</option>
                          </select>
                          <input
                            type={
                              ["number", "integer", "float"].includes(field.type)
                                ? "number"
                                : "text"
                            }
                            className="form-input"
                            value={field.default_value ?? ""}
                            onChange={(e) => {
                              const val = ["number", "integer", "float"].includes(field.type)
                                ? e.target.value
                                  ? Number(e.target.value)
                                  : ""
                                : e.target.value;
                              handleConfigFieldChange(field.id, "default_value", val);
                            }}
                            placeholder="Valor Defecto"
                            style={{ fontSize: "0.875rem" }}
                          />
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.875rem",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                handleConfigFieldChange(field.id, "required", e.target.checked)
                              }
                            />
                            Req.
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveConfigField(field.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc3545",
                              cursor: "pointer",
                              padding: "0.25rem",
                              fontSize: "1.25rem",
                            }}
                            title="Eliminar campo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleAddConfigField}
                    className="btn btn-secondary"
                    style={{ marginTop: "1rem", width: "100%" }}
                  >
                    + Agregar Detalle
                  </button>
                </div>
              </div>

              {error && <p style={{ color: "#dc3545", marginBottom: "1rem" }}>{error}</p>}

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseConfig}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={configSubmitting}
                  style={{ flex: 1 }}
                >
                  {configSubmitting ? "Guardando..." : "Guardar Valores"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Exercise Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingExercise ? "Editar Ejercicio" : "Agregar Nuevo Ejercicio"}
              </h3>
              <button className="modal-close" onClick={handleCloseForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="exerciseName">
                  Nombre *
                </label>
                <input
                  id="exerciseName"
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del ejercicio"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Detalles del Ejercicio</label>
                <div
                  style={{
                    border: "1px solid #e1e5e9",
                    borderRadius: "8px",
                    padding: "1rem",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  {fields.length === 0 ? (
                    <p
                      style={{
                        color: "var(--color-secondary)",
                        marginBottom: "1rem",
                        textAlign: "center",
                      }}
                    >
                      No hay detalles definidos
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {fields.map((field) => (
                        <div
                          key={field.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr auto auto",
                            gap: "0.5rem",
                            alignItems: "center",
                            padding: "0.75rem",
                            backgroundColor: "white",
                            borderRadius: "6px",
                            border: "1px solid #e1e5e9",
                          }}
                        >
                          <input
                            type="text"
                            className="form-input"
                            value={field.name}
                            onChange={(e) => handleFieldChange(field.id, "name", e.target.value)}
                            placeholder="Nombre (ej. Peso)"
                            style={{ fontSize: "0.875rem" }}
                          />
                          <select
                            className="form-input"
                            value={field.type}
                            onChange={(e) =>
                              handleFieldChange(field.id, "type", e.target.value as FieldType)
                            }
                            style={{ fontSize: "0.875rem", width: "120px" }}
                          >
                            <option value="number">Número</option>
                            <option value="array">Números</option>
                            <option value="duration">Duración</option>
                            <option value="text">Texto</option>
                          </select>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.875rem",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                handleFieldChange(field.id, "required", e.target.checked)
                              }
                            />
                            Requerido
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(field.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc3545",
                              cursor: "pointer",
                              padding: "0.25rem",
                              fontSize: "1.25rem",
                            }}
                            title="Eliminar campo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="btn btn-secondary"
                    style={{ marginTop: "1rem", width: "100%" }}
                  >
                    + Agregar Detalle
                  </button>
                </div>
                <small
                  style={{
                    color: "var(--color-secondary)",
                    fontSize: "0.875rem",
                    marginTop: "0.5rem",
                    display: "block",
                  }}
                >
                  Los detalles sin etiqueta no se guardarán
                </small>
              </div>

              {error && <p style={{ color: "#dc3545", marginBottom: "1rem" }}>{error}</p>}

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseForm}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !formData.name.trim()}
                  style={{ flex: 1 }}
                >
                  {submitting
                    ? "Guardando..."
                    : editingExercise
                      ? "Actualizar"
                      : "Agregar Ejercicio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Schema Modal */}
      {showSchemaModal && selectedExercise && (
        <div className="modal-overlay" onClick={() => setShowSchemaModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detalles de "{selectedExercise.name}"</h3>
              <button className="modal-close" onClick={() => setShowSchemaModal(false)}>
                ×
              </button>
            </div>

            <div style={{ padding: "1rem 0" }}>
              {Object.keys(selectedExercise.field_schema || {}).length === 0 ? (
                <p style={{ color: "var(--color-secondary)", textAlign: "center" }}>
                  Este ejercicio no tiene detalles definidos
                </p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Requerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedExercise.field_schema).map(([key, def]) => (
                      <tr key={key}>
                        <td>{formatFieldName(key, def.label)}</td>
                        <td>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              backgroundColor: "#f3f4f6",
                              fontSize: "0.875rem",
                            }}
                          >
                            {["number", "integer", "float"].includes(def.type)
                              ? "Número"
                              : def.type === "array"
                                ? "Números"
                                : def.type === "duration"
                                  ? "Duración"
                                  : "Texto"}
                          </span>
                        </td>
                        <td>{def.required ? "✓" : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setShowSchemaModal(false)}
              style={{ width: "100%" }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Exercises List */}
      {exercises.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💪</div>
          <div className="empty-state-text">Aún no hay ejercicios</div>
          <button className="btn btn-primary" onClick={() => handleOpenForm()}>
            Agrega tu primer ejercicio
          </button>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Detalles</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((exercise) => (
                <tr key={exercise.id}>
                  <td style={{ fontWeight: 600 }}>{exercise.name}</td>
                  <td>
                    <button
                      onClick={() => handleViewSchema(exercise)}
                      className="btn btn-secondary"
                      style={{
                        padding: "0.25rem 0.75rem",
                        fontSize: "0.875rem",
                      }}
                    >
                      Ver Detalles ({Object.keys(exercise.field_schema || {}).length})
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleOpenForm(exercise)}
                        className="btn"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                          backgroundColor: "rgba(37, 99, 235, 0.1)",
                          color: "#2563eb",
                          border: "1px solid rgba(37, 99, 235, 0.2)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.2)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.1)";
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(exercise.id)}
                        className="btn"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                          backgroundColor: "rgba(220, 53, 69, 0.1)",
                          color: "#dc3545",
                          border: "1px solid rgba(220, 53, 69, 0.2)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(220, 53, 69, 0.2)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(220, 53, 69, 0.1)";
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
