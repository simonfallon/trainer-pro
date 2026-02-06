'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { exerciseTemplatesApi } from '@/lib/api';
import { useDashboardApp } from '@/hooks/useDashboardApp';
import type { ExerciseTemplate, ExerciseTemplateCreateInput, ExerciseTemplateUpdateInput } from '@/types';

// Default field schemas by discipline
const DEFAULT_FIELDS = {
    physio: {
        repeticiones: { type: 'number' as const, label: 'Repeticiones', required: true },
        series: { type: 'number' as const, label: 'Series', required: true },
        peso: { type: 'number' as const, label: 'Peso (kg)', required: false },
    },
    bmx: {
        runs: { type: 'number' as const, label: 'Runs', required: true },
        duracion_total: { type: 'duration' as const, label: 'Duración Total', required: true },
    },
};

type FieldType = 'number' | 'array' | 'duration' | 'text';

interface FieldDefinition {
    type: FieldType;
    label: string;
    required: boolean;
}

export default function ExercisesPage() {
    const { app, trainer } = useDashboardApp();
    const swrKey = `/exercise-templates-${app.id}`;
    const { data: exercises = [], isLoading } = useSWR<ExerciseTemplate[]>(
        swrKey,
        () => exerciseTemplatesApi.list(app.id)
    );

    const [showForm, setShowForm] = useState(false);
    const [showSchemaModal, setShowSchemaModal] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<ExerciseTemplate | null>(null);
    const [editingExercise, setEditingExercise] = useState<ExerciseTemplate | null>(null);
    const [formData, setFormData] = useState({
        name: '',
    });
    const [fields, setFields] = useState<Record<string, FieldDefinition>>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const getDefaultFields = (): Record<string, FieldDefinition> => {
        const discipline = trainer?.discipline_type?.toLowerCase();
        if (discipline === 'physio' || discipline === 'fisioterapia') {
            return { ...DEFAULT_FIELDS.physio };
        } else if (discipline === 'bmx') {
            return { ...DEFAULT_FIELDS.bmx };
        }
        return {};
    };

    const handleOpenForm = (exercise?: ExerciseTemplate) => {
        if (exercise) {
            setEditingExercise(exercise);
            setFormData({ name: exercise.name });
            // Normalize old field types (integer/float) to 'number'
            const normalizedFields: Record<string, FieldDefinition> = {};
            Object.entries(exercise.field_schema || {}).forEach(([key, value]) => {
                normalizedFields[key] = {
                    ...value,
                    type: ['integer', 'float'].includes(value.type) ? 'number' : value.type as FieldType,
                };
            });
            setFields(normalizedFields);
        } else {
            setEditingExercise(null);
            setFormData({ name: '' });
            setFields(getDefaultFields());
        }
        setShowForm(true);
        setError('');
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingExercise(null);
        setFormData({ name: '' });
        setFields({});
        setError('');
    };

    const handleViewSchema = (exercise: ExerciseTemplate) => {
        setSelectedExercise(exercise);
        setShowSchemaModal(true);
    };

    const handleAddField = () => {
        const fieldKey = `campo_${Object.keys(fields).length + 1}`;
        setFields({
            ...fields,
            [fieldKey]: { type: 'number', label: '', required: false },
        });
    };

    const handleRemoveField = (fieldKey: string) => {
        const newFields = { ...fields };
        delete newFields[fieldKey];
        setFields(newFields);
    };

    const handleFieldChange = (fieldKey: string, property: keyof FieldDefinition, value: any) => {
        setFields({
            ...fields,
            [fieldKey]: {
                ...fields[fieldKey],
                [property]: value,
            },
        });
    };

    const handleFieldKeyChange = (oldKey: string, newKey: string) => {
        if (oldKey === newKey || !newKey.trim()) return;

        const newFields: Record<string, FieldDefinition> = {};
        Object.keys(fields).forEach(key => {
            if (key === oldKey) {
                newFields[newKey] = fields[key];
            } else {
                newFields[key] = fields[key];
            }
        });
        setFields(newFields);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSubmitting(true);
        setError('');

        try {
            // Filter out fields with empty labels
            const validFields: Record<string, FieldDefinition> = {};
            Object.entries(fields).forEach(([key, value]) => {
                if (value.label.trim()) {
                    validFields[key] = value;
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
                    discipline_type: trainer?.discipline_type || 'general',
                    field_schema: validFields,
                };
                await exerciseTemplatesApi.create(createData);
            }

            mutate(swrKey);
            handleCloseForm();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar el ejercicio');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (exerciseId: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este ejercicio?')) return;

        try {
            await exerciseTemplatesApi.delete(exerciseId);
            mutate(swrKey);
        } catch (err) {
            console.error('Failed to delete exercise:', err);
        }
    };

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando ejercicios...</div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h2 className="page-title">Ejercicios</h2>
                <button className="btn btn-primary" onClick={() => handleOpenForm()}>
                    + Agregar Ejercicio
                </button>
            </div>

            {/* Add/Edit Exercise Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={handleCloseForm}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingExercise ? 'Editar Ejercicio' : 'Agregar Nuevo Ejercicio'}
                            </h3>
                            <button className="modal-close" onClick={handleCloseForm}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="exerciseName">Nombre *</label>
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
                                <div style={{
                                    border: '1px solid #e1e5e9',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    backgroundColor: '#f9fafb'
                                }}>
                                    {Object.keys(fields).length === 0 ? (
                                        <p style={{ color: 'var(--color-secondary)', marginBottom: '1rem', textAlign: 'center' }}>
                                            No hay detalles definidos
                                        </p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {Object.entries(fields).map(([fieldKey, fieldDef]) => (
                                                <div key={fieldKey} style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr auto auto auto',
                                                    gap: '0.5rem',
                                                    alignItems: 'center',
                                                    padding: '0.75rem',
                                                    backgroundColor: 'white',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e1e5e9'
                                                }}>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={fieldKey}
                                                        onChange={(e) => handleFieldKeyChange(fieldKey, e.target.value)}
                                                        placeholder="nombre_campo"
                                                        style={{ fontSize: '0.875rem' }}
                                                    />
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={fieldDef.label}
                                                        onChange={(e) => handleFieldChange(fieldKey, 'label', e.target.value)}
                                                        placeholder="Etiqueta"
                                                        style={{ fontSize: '0.875rem' }}
                                                    />
                                                    <select
                                                        className="form-input"
                                                        value={fieldDef.type}
                                                        onChange={(e) => handleFieldChange(fieldKey, 'type', e.target.value as FieldType)}
                                                        style={{ fontSize: '0.875rem', width: '120px' }}
                                                    >
                                                        <option value="number">Número</option>
                                                        <option value="array">Números</option>
                                                        <option value="duration">Duración</option>
                                                        <option value="text">Texto</option>
                                                    </select>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={fieldDef.required}
                                                            onChange={(e) => handleFieldChange(fieldKey, 'required', e.target.checked)}
                                                        />
                                                        Requerido
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveField(fieldKey)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#dc3545',
                                                            cursor: 'pointer',
                                                            padding: '0.25rem',
                                                            fontSize: '1.25rem'
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
                                        style={{ marginTop: '1rem', width: '100%' }}
                                    >
                                        + Agregar Detalle
                                    </button>
                                </div>
                                <small style={{ color: 'var(--color-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                                    Los detalles sin etiqueta no se guardarán
                                </small>
                            </div>

                            {error && (
                                <p style={{ color: '#dc3545', marginBottom: '1rem' }}>{error}</p>
                            )}

                            <div style={{ display: 'flex', gap: '1rem' }}>
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
                                    {submitting ? 'Guardando...' : editingExercise ? 'Actualizar' : 'Agregar Ejercicio'}
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
                            <button className="modal-close" onClick={() => setShowSchemaModal(false)}>×</button>
                        </div>

                        <div style={{ padding: '1rem 0' }}>
                            {Object.keys(selectedExercise.field_schema || {}).length === 0 ? (
                                <p style={{ color: 'var(--color-secondary)', textAlign: 'center' }}>
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
                                                <td>{def.label}</td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        backgroundColor: '#f3f4f6',
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {['number', 'integer', 'float'].includes(def.type) ? 'Número' : def.type === 'array' ? 'Números' : def.type === 'duration' ? 'Duración' : 'Texto'}
                                                    </span>
                                                </td>
                                                <td>{def.required ? '✓' : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowSchemaModal(false)}
                            style={{ width: '100%' }}
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
                                                padding: '0.25rem 0.75rem',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            Ver Detalles ({Object.keys(exercise.field_schema || {}).length})
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleOpenForm(exercise)}
                                                className="btn"
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    fontSize: '0.85rem',
                                                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                                    color: '#2563eb',
                                                    border: '1px solid rgba(37, 99, 235, 0.2)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
                                                }}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(exercise.id)}
                                                className="btn"
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    fontSize: '0.85rem',
                                                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                                    color: '#dc3545',
                                                    border: '1px solid rgba(220, 53, 69, 0.2)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
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
