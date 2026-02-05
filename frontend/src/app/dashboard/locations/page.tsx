'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { locationsApi } from '@/lib/api';
import { getGoogleMapsUrl } from '@/lib/locationUtils';
import { Location, LocationCreateInput } from '@/types';
import { LocationForm } from '@/components/locations/LocationForm';
import { getLocationTypeLabel } from '@/lib/labels';
import { useDashboardApp } from '@/hooks/useDashboardApp';

export default function LocationsPage() {
    const { app } = useDashboardApp();
    const trainerId = app.trainer_id;

    const [showForm, setShowForm] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | undefined>();

    const { data: locations, error, isLoading } = useSWR<Location[]>(
        trainerId ? `/locations-${trainerId}` : null,
        () => locationsApi.list(trainerId)
    );

    const handleSave = async (data: LocationCreateInput | (Partial<Location> & { id: number })) => {
        if ('id' in data) {
            const { id, ...updateData } = data;
            await locationsApi.update(id, updateData);
        } else {
            await locationsApi.create({
                ...data,
                address_line1: data.address_line1 ?? null,
                address_line2: data.address_line2 ?? null,
                city: data.city ?? null,
                region: data.region ?? null,
                postal_code: data.postal_code ?? null,
                country: data.country ?? null,
                latitude: data.latitude ?? null,
                longitude: data.longitude ?? null,
                google_place_id: data.google_place_id ?? null,
            } as Omit<Location, 'id' | 'created_at' | 'updated_at'>);
        }
        mutate(`/locations-${trainerId}`);
    };

    const handleDeleteLocation = async (locationId: number) => {
        if (!confirm('¿Estás seguro de eliminar esta ubicación?')) return;

        await locationsApi.delete(locationId);
        mutate(`/locations-${trainerId}`);
    };

    const openCreateForm = () => {
        setEditingLocation(undefined);
        setShowForm(true);
    };

    const openEditForm = (location: Location) => {
        setEditingLocation(location);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingLocation(undefined);
    };

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p>Cargando ubicaciones...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#dc3545' }}>Error al cargar ubicaciones</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Ubicaciones</h2>
                <button className="btn btn-primary" onClick={openCreateForm}>
                    + Nueva Ubicación
                </button>
            </div>

            {!locations || locations.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>No hay ubicaciones</h3>
                    <p style={{ color: 'var(--color-secondary)', marginBottom: '1.5rem' }}>
                        Crea tu primera ubicación para usarla en las sesiones de entrenamiento
                    </p>
                    <button className="btn btn-primary" onClick={openCreateForm}>
                        + Nueva Ubicación
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {locations.map((location) => (
                        <div key={location.id} className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                    {location.name}
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-secondary)' }}>
                                    {getLocationTypeLabel(location.type)}
                                </p>
                            </div>

                            {location.address_line1 && (
                                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                    📍 {location.address_line1}
                                </p>
                            )}

                            {location.city && (
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-secondary)' }}>
                                    {location.city}{location.region && `, ${location.region}`}
                                </p>
                            )}

                            {getGoogleMapsUrl(location) && (
                                <a
                                    href={getGoogleMapsUrl(location)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        marginTop: '0.75rem',
                                        fontSize: '0.875rem',
                                        textDecoration: 'none',
                                    }}
                                >
                                    🗺️ Ver en Mapa
                                </a>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => openEditForm(location)}
                                    style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
                                >
                                    Editar
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDeleteLocation(location.id)}
                                    style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <LocationForm
                    location={editingLocation}
                    trainerId={trainerId}
                    onClose={closeForm}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
