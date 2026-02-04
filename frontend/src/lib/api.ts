/**
 * API client for trainer-pro backend
 * Uses SWR for data fetching with automatic caching and revalidation
 */

const API_BASE = '/api';

async function fetchAPI<T>(
    endpoint: string,
    options?: RequestInit,
): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        let errorDetail = 'Error desconocido';
        try {
            const error = await response.json();
            errorDetail = error.detail || `Error de API: ${response.status}`;
        } catch (e) {
            errorDetail = `Error de API: ${response.status} ${response.statusText}`;
        }
        console.error(`API Error [${endpoint}]:`, errorDetail);
        throw new Error(errorDetail);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

// Generic fetcher for SWR
export const fetcher = <T>(url: string): Promise<T> => fetchAPI<T>(url);

// Trainers API
export const trainersApi = {
    get: (id: string) => fetchAPI<import('@/types').Trainer>(`/trainers/${id}`),
    create: (data: import('@/types').TrainerCreateInput) =>
        fetchAPI<import('@/types').Trainer>('/trainers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<import('@/types').TrainerCreateInput>) =>
        fetchAPI<import('@/types').Trainer>(`/trainers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};

// Apps API
export const appsApi = {
    list: (trainerId: string) =>
        fetchAPI<import('@/types').TrainerApp[]>(`/apps?trainer_id=${trainerId}`),
    get: (id: string) => fetchAPI<import('@/types').TrainerApp>(`/apps/${id}`),
    create: (data: import('@/types').AppCreateInput) =>
        fetchAPI<import('@/types').TrainerApp>('/apps', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// Locations API
export const locationsApi = {
    list: (trainerId: string) =>
        fetchAPI<import('@/types').Location[]>(`/locations?trainer_id=${trainerId}`),
    get: (id: string) => fetchAPI<import('@/types').Location>(`/locations/${id}`),
    create: (data: Omit<import('@/types').Location, 'id' | 'created_at' | 'updated_at'>) =>
        fetchAPI<import('@/types').Location>('/locations', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<import('@/types').Location>) =>
        fetchAPI<import('@/types').Location>(`/locations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        fetchAPI<void>(`/locations/${id}`, { method: 'DELETE' }),
};

// Clients API
export const clientsApi = {
    list: (trainerId: string, includeDeleted = false) =>
        fetchAPI<import('@/types').Client[]>(
            `/clients?trainer_id=${trainerId}&include_deleted=${includeDeleted}`
        ),
    get: (id: string) => fetchAPI<import('@/types').Client>(`/clients/${id}`),
    create: (data: import('@/types').ClientCreateInput) =>
        fetchAPI<import('@/types').Client>('/clients', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<import('@/types').ClientCreateInput>) =>
        fetchAPI<import('@/types').Client>(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        fetchAPI<void>(`/clients/${id}`, { method: 'DELETE' }),
    // New endpoints for client detail page
    getSessions: (clientId: string) =>
        fetchAPI<import('@/types').TrainingSession[]>(`/clients/${clientId}/sessions`),
    getPaymentBalance: (clientId: string) =>
        fetchAPI<import('@/types').PaymentBalance>(`/clients/${clientId}/payment-balance`),
    registerPayment: (clientId: string, data: { sessions_paid: number; amount_cop: number; notes?: string }) =>
        fetchAPI<import('@/types').Payment>(`/clients/${clientId}/payments`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// Sessions API
export const sessionsApi = {
    list: (trainerId: string, startDate?: string, endDate?: string) => {
        let url = `/sessions?trainer_id=${trainerId}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        return fetchAPI<import('@/types').TrainingSession[]>(url);
    },
    get: (id: string) => fetchAPI<import('@/types').TrainingSession>(`/sessions/${id}`),
    getStats: (trainerId: string, startDate?: string, endDate?: string) => {
        let url = `/sessions/stats?trainer_id=${trainerId}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        return fetchAPI<import('@/types').SessionStats>(url);
    },
    create: (data: import('@/types').SessionCreateInput) =>
        fetchAPI<import('@/types').TrainingSession>('/sessions', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<import('@/types').SessionCreateInput & { status: string; session_doc?: string }>) =>
        fetchAPI<import('@/types').TrainingSession>(`/sessions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        fetchAPI<void>(`/sessions/${id}`, { method: 'DELETE' }),
    // Toggle payment status
    togglePayment: (id: string) =>
        fetchAPI<import('@/types').TrainingSession>(`/sessions/${id}/payment`, {
            method: 'PATCH',
        }),
};

// Uploads API
export const uploadsApi = {
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/uploads/image`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail || 'Upload failed');
        }

        return response.json() as Promise<{ url: string }>;
    }
};

// Auth API
export const authApi = {
    getGoogleAuthUrl: () => fetchAPI<{ url: string; state: string }>('/auth/google/url'),
    exchangeGoogleCode: (code: string) =>
        fetchAPI<{
            trainer_id: string;
            email: string;
            name: string;
            is_new_user: boolean;
            has_app: boolean;
            app_id?: string;
            app_name?: string;
        }>('/auth/google/exchange', {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),
};

// Dev Auth API (only for development)
export const devAuthApi = {
    login: () =>
        fetchAPI<{
            trainer_id: string;
            email: string;
            name: string;
            is_new_user: boolean;
            has_app: boolean;
            app_id?: string;
            app_name?: string;
        }>('/dev/login', {
            method: 'POST',
        }),
};
