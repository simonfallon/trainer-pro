'use client';

import React, { useState } from 'react';
import { Location, LocationType, LocationCreateInput } from '@/types';
import { LocationPicker } from '../LocationPicker';

interface LocationFormProps {
    location?: Location;
    trainerId: string;
    onClose: () => void;
    onSave: (data: LocationCreateInput | (Partial<Location> & { id: string })) => Promise<void>;
}

export const LocationForm: React.FC<LocationFormProps> = ({
    location,
    trainerId,
    onClose,
    onSave,
}) => {
    const [formData, setFormData] = useState({
        name: location?.name || '',
        type: location?.type || 'other' as LocationType,
        address_line1: location?.address_line1 || '',
        city: location?.city || '',
        region: location?.region || '',
        country: location?.country || '',
        latitude: location?.latitude || undefined,
        longitude: location?.longitude || undefined,
        google_place_id: location?.google_place_id || '',
    });
    const [useGoogleMaps, setUseGoogleMaps] = useState(!location);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleLocationCreate = (locationData: {
        name: string;
        latitude: number;
        longitude: number;
        google_place_id?: string;
        address_line1?: string;
        city?: string;
        region?: string;
        country?: string;
    }) => {
        setFormData({
            ...formData,
            name: locationData.name,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            google_place_id: locationData.google_place_id || '',
            address_line1: locationData.address_line1 || '',
            city: locationData.city || '',
            region: locationData.region || '',
            country: locationData.country || '',
        });
        setUseGoogleMaps(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            if (location) {
                // Update existing location
                await onSave({
                    id: location.id,
                    ...formData,
                });
            } else {
                // Create new location
                await onSave({
                    trainer_id: trainerId,
                    ...formData,
                } as LocationCreateInput);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {location ? 'Editar Ubicación' : 'Nueva Ubicación'}
                    </h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {!location && useGoogleMaps ? (
                        <div style={{ marginBottom: '1rem' }}>
                            <LocationPicker
                                mode="create"
                                onLocationSelect={() => { }}
                                onLocationCreate={handleLocationCreate}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setUseGoogleMaps(false)}
                                style={{ width: '100%', marginTop: '0.5rem' }}
                            >
                                Ingresar manualmente
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label" htmlFor="locationName">
                                    Nombre *
                                </label>
                                <input
                                    id="locationName"
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ej: Parque Lleras, Gimnasio Central"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="locationType">
                                    Tipo
                                </label>
                                <select
                                    id="locationType"
                                    className="form-select"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as LocationType })}
                                >
                                    <option value="gym">Gimnasio</option>
                                    <option value="track">Pista/Cancha</option>
                                    <option value="trainer_base">Base del Entrenador</option>
                                    <option value="client_home">Casa del Cliente</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="locationAddress">
                                    Dirección
                                </label>
                                <input
                                    id="locationAddress"
                                    type="text"
                                    className="form-input"
                                    value={formData.address_line1}
                                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                    placeholder="Calle 10 # 43A-30"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="locationCity">
                                        Ciudad
                                    </label>
                                    <input
                                        id="locationCity"
                                        type="text"
                                        className="form-input"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Medellín"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="locationRegion">
                                        Departamento
                                    </label>
                                    <input
                                        id="locationRegion"
                                        type="text"
                                        className="form-input"
                                        value={formData.region}
                                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                        placeholder="Antioquia"
                                    />
                                </div>
                            </div>

                            {!location && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setUseGoogleMaps(true)}
                                    style={{ width: '100%', marginTop: '0.5rem' }}
                                >
                                    Usar Google Maps
                                </button>
                            )}

                            {error && (
                                <p style={{ color: '#dc3545', marginTop: '1rem' }}>{error}</p>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
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
                                    disabled={submitting || !formData.name}
                                    style={{ flex: 1 }}
                                >
                                    {submitting ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};
