'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Location, LocationType } from '@/types';

interface LocationPickerProps {
    mode: 'select' | 'create';
    locations?: Location[];
    selectedLocationId?: string | null;
    onLocationSelect: (locationId: string | null) => void;
    onLocationCreate?: (locationData: {
        name: string;
        latitude: number;
        longitude: number;
        google_place_id?: string;
        address_line1?: string;
        city?: string;
        region?: string;
        country?: string;
    }) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    mode,
    locations = [],
    selectedLocationId,
    onLocationSelect,
    onLocationCreate,
}) => {
    const { isLoaded, loadError } = useGoogleMaps();
    const [searchValue, setSearchValue] = useState('');
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);

    // Initialize autocomplete
    useEffect(() => {
        if (!isLoaded || mode !== 'create' || !inputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'co' }, // Colombia
            fields: ['place_id', 'geometry', 'name', 'formatted_address', 'address_components'],
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                setSelectedPlace(place);
                updateMap(place);
            }
        });

        autocompleteRef.current = autocomplete;

        return () => {
            if (autocompleteRef.current) {
                google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    }, [isLoaded, mode]);

    // Initialize map
    useEffect(() => {
        if (!isLoaded || mode !== 'create' || !mapRef.current || mapInstanceRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
            center: { lat: 6.2476, lng: -75.5658 }, // Medellín, Colombia
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
        });

        mapInstanceRef.current = map;

        // Add click listener for map
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: e.latLng }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        setSelectedPlace(results[0]);
                        updateMap(results[0]);
                        setSearchValue(results[0].formatted_address || '');
                    }
                });
            }
        });

        return () => {
            if (markerRef.current) {
                markerRef.current.setMap(null);
            }
        };
    }, [isLoaded, mode]);

    const updateMap = useCallback((place: google.maps.places.PlaceResult) => {
        if (!mapInstanceRef.current || !place.geometry?.location) return;

        const location = place.geometry.location;
        mapInstanceRef.current.setCenter(location);
        mapInstanceRef.current.setZoom(15);

        // Update or create marker
        if (markerRef.current) {
            markerRef.current.setPosition(location);
        } else {
            markerRef.current = new google.maps.Marker({
                position: location,
                map: mapInstanceRef.current,
                title: place.name,
            });
        }
    }, []);

    const handleConfirmLocation = useCallback(() => {
        if (!selectedPlace || !onLocationCreate) return;

        const location = selectedPlace.geometry?.location;
        if (!location) return;

        // Extract address components
        const addressComponents = selectedPlace.address_components || [];
        let city = '';
        let region = '';
        let country = '';

        addressComponents.forEach((component) => {
            if (component.types.includes('locality')) {
                city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
                region = component.long_name;
            }
            if (component.types.includes('country')) {
                country = component.long_name;
            }
        });

        onLocationCreate({
            name: selectedPlace.name || selectedPlace.formatted_address || 'Ubicación',
            latitude: location.lat(),
            longitude: location.lng(),
            google_place_id: selectedPlace.place_id,
            address_line1: selectedPlace.formatted_address,
            city,
            region,
            country,
        });
    }, [selectedPlace, onLocationCreate]);

    if (mode === 'select') {
        return (
            <div className="location-picker">
                <select
                    className="form-select"
                    value={selectedLocationId || ''}
                    onChange={(e) => onLocationSelect(e.target.value || null)}
                >
                    <option value="">Sin ubicación</option>
                    {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                            {location.name} - {location.type}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    // Create mode
    if (loadError) {
        return (
            <div style={{ padding: '1rem', background: '#fee', borderRadius: '4px', color: '#c00' }}>
                Error: {loadError.message}
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-secondary)' }}>
                Cargando mapa...
            </div>
        );
    }

    return (
        <div className="location-picker-create">
            <div className="form-group">
                <label className="form-label" htmlFor="locationSearch">
                    Buscar ubicación
                </label>
                <input
                    ref={inputRef}
                    id="locationSearch"
                    type="text"
                    className="form-input"
                    placeholder="Escribe una dirección o nombre del lugar..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                />
            </div>

            <div
                ref={mapRef}
                style={{
                    width: '100%',
                    height: '300px',
                    borderRadius: '4px',
                    marginBottom: '1rem',
                    border: '1px solid var(--border-color)',
                }}
            />

            {selectedPlace && (
                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>
                        Ubicación seleccionada:
                    </p>
                    <p style={{ fontWeight: 600 }}>
                        {selectedPlace.name || selectedPlace.formatted_address}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-secondary)' }}>
                        {selectedPlace.formatted_address}
                    </p>
                </div>
            )}

            <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmLocation}
                disabled={!selectedPlace}
                style={{ width: '100%' }}
            >
                Confirmar Ubicación
            </button>
        </div>
    );
};
