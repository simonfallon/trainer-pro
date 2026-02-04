/**
 * Formats an ISO date string for display in Colombian Spanish.
 */
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
