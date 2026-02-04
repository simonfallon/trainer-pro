/**
 * @jest-environment jsdom
 */

import { getGoogleMapsUrl } from '../locationUtils';
import type { Location } from '@/types';

describe('locationUtils', () => {
    describe('getGoogleMapsUrl', () => {
        const baseLocation: Partial<Location> = {
            id: '123',
            trainer_id: '456',
            name: 'Test Location',
            type: 'gym',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        };

        it('should prioritize Google Place ID over coordinates', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: 'ChIJ3S-JXmaeRpYRfJRRIGhx1zA',
                latitude: 6.243704,
                longitude: -75.4371669,
                address_line1: 'Calle 10 #43A-30',
                city: 'Medellín',
                region: 'Antioquia',
                country: 'Colombia',
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            expect(url).toBe('https://www.google.com/maps/place/?q=place_id:ChIJ3S-JXmaeRpYRfJRRIGhx1zA');
        });

        it('should use coordinates when Place ID is not available', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: null,
                latitude: 6.243704,
                longitude: -75.4371669,
                address_line1: 'Calle 10 #43A-30',
                city: 'Medellín',
                region: 'Antioquia',
                country: 'Colombia',
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=6.243704,-75.4371669');
        });

        it('should use address search when only address is available', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: null,
                latitude: null,
                longitude: null,
                address_line1: 'Calle 10 #43A-30',
                city: 'Medellín',
                region: 'Antioquia',
                country: 'Colombia',
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Calle%2010%20%2343A-30%2C%20Medell%C3%ADn%2C%20Antioquia');
        });

        it('should handle missing city and region in address search', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: null,
                latitude: null,
                longitude: null,
                address_line1: 'Calle 10 #43A-30',
                city: null,
                region: null,
                country: 'Colombia',
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Calle%2010%20%2343A-30%2C%20%2C');
        });

        it('should return null when no location data is available', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: null,
                latitude: null,
                longitude: null,
                address_line1: null,
                city: null,
                region: null,
                country: null,
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            expect(url).toBeNull();
        });

        it('should handle partial coordinates (missing longitude)', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: null,
                latitude: 6.243704,
                longitude: null,
                address_line1: 'Calle 10 #43A-30',
                city: 'Medellín',
                region: 'Antioquia',
                country: 'Colombia',
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            // Should fall back to address since coordinates are incomplete
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Calle%2010%20%2343A-30%2C%20Medell%C3%ADn%2C%20Antioquia');
        });

        it('should handle partial coordinates (missing latitude)', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: null,
                latitude: null,
                longitude: -75.4371669,
                address_line1: 'Calle 10 #43A-30',
                city: 'Medellín',
                region: 'Antioquia',
                country: 'Colombia',
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            // Should fall back to address since coordinates are incomplete
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Calle%2010%20%2343A-30%2C%20Medell%C3%ADn%2C%20Antioquia');
        });

        it('should properly URL encode special characters in address', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: null,
                latitude: null,
                longitude: null,
                address_line1: 'Calle 10 #43A-30 Apto 5',
                city: 'Medellín',
                region: 'Antioquia',
                country: 'Colombia',
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            // Verify that # and other special characters are encoded
            expect(url).toContain('%23'); // # should be encoded as %23
            expect(url).toContain('Calle%2010%20%2343A-30%20Apto%205');
        });

        it('should handle empty string google_place_id as if it were null', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: '',
                latitude: 6.243704,
                longitude: -75.4371669,
                address_line1: null,
                city: null,
                region: null,
                country: null,
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            // Empty string is falsy, so should use coordinates
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=6.243704,-75.4371669');
        });

        it('should handle coordinates with many decimal places', () => {
            const location: Location = {
                ...baseLocation,
                google_place_id: null,
                latitude: 6.24370123456789,
                longitude: -75.43716698765432,
                address_line1: null,
                city: null,
                region: null,
                country: null,
                address_line2: null,
                postal_code: null,
            } as Location;

            const url = getGoogleMapsUrl(location);
            expect(url).toBe('https://www.google.com/maps/search/?api=1&query=6.24370123456789,-75.43716698765432');
        });
    });
});
