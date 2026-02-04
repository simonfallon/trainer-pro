/**
 * Location utilities for generating Google Maps URLs
 */

import type { Location } from '@/types';

/**
 * Generate a Google Maps URL for a location with the following priority:
 * 1. Google Place ID (preserves location name and metadata)
 * 2. GPS coordinates (shows precise location but only coordinates)
 * 3. Address search (less precise but shows address)
 * 
 * @param location - The location object
 * @returns Google Maps URL or null if no location data available
 */
export function getGoogleMapsUrl(location: Location): string | null {
    // Priority 1: Use Google Place ID for rich metadata (name, photos, reviews, etc.)
    if (location.google_place_id) {
        return `https://www.google.com/maps/place/?q=place_id:${location.google_place_id}`;
    }

    // Priority 2: Use coordinates for precise location (but shows coordinates, not name)
    if (location.latitude && location.longitude) {
        return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    }

    // Priority 3: Fallback to address search
    if (location.address_line1) {
        const address = `${location.address_line1}, ${location.city || ''}, ${location.region || ''}`.trim();
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }

    return null;
}
