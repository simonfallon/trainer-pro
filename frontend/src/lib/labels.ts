/**
 * Shared label maps (Colombian Spanish).
 * Single source of truth — do not duplicate these strings elsewhere.
 */

// ---------------------------------------------------------------------------
// Location types
// ---------------------------------------------------------------------------

export const LOCATION_TYPE_LABELS: Record<string, string> = {
    gym:          'Gimnasio',
    track:        'Pista/Cancha',
    trainer_base: 'Base del Entrenador',
    client_home:  'Casa del Cliente',
    other:        'Otro',
};

export function getLocationTypeLabel(type: string): string {
    return LOCATION_TYPE_LABELS[type] || type;
}

// ---------------------------------------------------------------------------
// Session statuses
// ---------------------------------------------------------------------------

export const SESSION_STATUS_LABELS: Record<string, string> = {
    completed: 'Completada',
    scheduled: 'Programada',
    cancelled: 'Cancelada',
};
