"use client";

import { useDarkStyles } from "@/hooks/useDarkStyles";
import type { ExerciseSet, SessionExercise } from "@/types";

interface ExerciseSetDisplayProps {
  sets: ExerciseSet[];
  onEdit?: (set: ExerciseSet) => void;
  onDelete?: (setId: number) => void;
}

export function ExerciseSetDisplay({ sets, onEdit, onDelete }: ExerciseSetDisplayProps) {
  const { theme } = useDarkStyles();

  if (sets.length === 0) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: theme.colors.secondary,
          fontStyle: "italic",
        }}
      >
        No hay circuitos creados para esta sesión
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {sets.map((set) => (
        <div
          key={set.id}
          style={{
            border: `2px solid ${theme.colors.primary}40`,
            borderRadius: "8px",
            padding: "1rem",
            backgroundColor: `${theme.colors.primary}08`,
          }}
        >
          {/* Set Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: `1px solid ${theme.colors.primary}30`,
            }}
          >
            <div>
              <h4
                style={{
                  margin: 0,
                  color: theme.colors.text,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                }}
              >
                {set.name}
              </h4>
              <div
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.875rem",
                  color: theme.colors.secondary,
                }}
              >
                {set.series} {set.series === 1 ? "serie" : "series"}
              </div>
            </div>

            {(onEdit || onDelete) && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {onEdit && (
                  <button
                    onClick={() => onEdit(set)}
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
                    Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `¿Eliminar el circuito "${set.name}"? Esto también eliminará todos los ejercicios del circuito.`
                        )
                      ) {
                        onDelete(set.id);
                      }
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Exercises in Set */}
          <div style={{ paddingLeft: "1rem" }}>
            {set.exercises.length === 0 ? (
              <div
                style={{
                  color: theme.colors.secondary,
                  fontStyle: "italic",
                  fontSize: "0.875rem",
                }}
              >
                No hay ejercicios en este circuito
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {set.exercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      backgroundColor: theme.colors.background,
                      borderRadius: "4px",
                      border: `1px solid ${theme.colors.secondary}20`,
                    }}
                  >
                    {/* Exercise Number */}
                    <div
                      style={{
                        minWidth: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: theme.colors.primary,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Exercise Details */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: theme.colors.text,
                          marginBottom: "0.25rem",
                        }}
                      >
                        {exercise.custom_name || "Ejercicio"}
                      </div>

                      {/* Exercise Data */}
                      {Object.keys(exercise.data).length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                            fontSize: "0.875rem",
                            color: theme.colors.secondary,
                          }}
                        >
                          {Object.entries(exercise.data).map(([key, value]) => (
                            <span key={key}>
                              <strong>{key}:</strong> {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
