/**
 * API client for trainer-pro backend
 * Uses SWR for data fetching with automatic caching and revalidation
 */

const API_BASE = "/api";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (response.status === 401) {
    // Session missing or expired — redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    throw new Error("No autenticado");
  }

  if (!response.ok) {
    let errorDetail = "Error desconocido";
    try {
      const error = await response.json();
      errorDetail = error.detail || `Error de API: ${response.status}`;
    } catch (e) {
      errorDetail = `Error de API: ${response.status} ${response.statusText}`;
    }
    if (response.status !== 403) {
      console.error(`API Error [${endpoint}]:`, errorDetail);
    }
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
  get: (id: number) => fetchAPI<import("@/types").Trainer>(`/trainers/${id}`),
  create: (data: import("@/types").TrainerCreateInput) =>
    fetchAPI<import("@/types").Trainer>("/trainers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<import("@/types").TrainerCreateInput>) =>
    fetchAPI<import("@/types").Trainer>(`/trainers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Apps API
export const appsApi = {
  list: (trainerId: number) =>
    fetchAPI<import("@/types").TrainerApp[]>(`/apps?trainer_id=${trainerId}`),
  get: (id: number) => fetchAPI<import("@/types").TrainerApp>(`/apps/${id}`),
  create: (data: import("@/types").AppCreateInput) =>
    fetchAPI<import("@/types").TrainerApp>("/apps", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Locations API
export const locationsApi = {
  list: (trainerId: number) =>
    fetchAPI<import("@/types").Location[]>(`/locations?trainer_id=${trainerId}`),
  get: (id: number) => fetchAPI<import("@/types").Location>(`/locations/${id}`),
  create: (data: Omit<import("@/types").Location, "id" | "created_at" | "updated_at">) =>
    fetchAPI<import("@/types").Location>("/locations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<import("@/types").Location>) =>
    fetchAPI<import("@/types").Location>(`/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => fetchAPI<void>(`/locations/${id}`, { method: "DELETE" }),
};

// Clients API
export const clientsApi = {
  list: (trainerId: number, includeDeleted = false) =>
    fetchAPI<import("@/types").Client[]>(
      `/clients?trainer_id=${trainerId}&include_deleted=${includeDeleted}`
    ),
  get: (id: number) => fetchAPI<import("@/types").Client>(`/clients/${id}`),
  create: (data: import("@/types").ClientCreateInput) =>
    fetchAPI<import("@/types").Client>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<import("@/types").ClientCreateInput>) =>
    fetchAPI<import("@/types").Client>(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => fetchAPI<void>(`/clients/${id}`, { method: "DELETE" }),
  // New endpoints for client detail page
  getSessions: (clientId: number) =>
    fetchAPI<import("@/types").TrainingSession[]>(`/clients/${clientId}/sessions`),
  getPaymentBalance: (clientId: number) =>
    fetchAPI<import("@/types").PaymentBalance>(`/clients/${clientId}/payment-balance`),
  registerPayment: (
    clientId: number,
    data: { sessions_paid: number; amount_cop: number; notes?: string }
  ) =>
    fetchAPI<import("@/types").Payment>(`/clients/${clientId}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getLapTimesByLocation: (clientId: number) =>
    fetchAPI<import("@/types").LocationLapTimes[]>(`/clients/${clientId}/lap-times-by-location`),
  getExerciseHistory: (clientId: number, exerciseName?: string) => {
    let url = `/clients/${clientId}/exercise-history`;
    if (exerciseName) {
      url += `?exercise_name=${encodeURIComponent(exerciseName)}`;
    }
    return fetchAPI<import("@/types").ExerciseHistoryResponse>(url);
  },
};

// Sessions API
export const sessionsApi = {
  list: (trainerId: number, startDate?: string, endDate?: string, clientId?: number) => {
    let url = `/sessions?trainer_id=${trainerId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    if (clientId) url += `&client_id=${clientId}`;
    return fetchAPI<import("@/types").TrainingSession[]>(url);
  },
  get: (id: number) => fetchAPI<import("@/types").TrainingSession>(`/sessions/${id}`),
  getStats: (trainerId: number, startDate?: string, endDate?: string) => {
    let url = `/sessions/stats?trainer_id=${trainerId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return fetchAPI<import("@/types").SessionStats>(url);
  },
  create: (data: import("@/types").SessionCreateInput) =>
    fetchAPI<import("@/types").TrainingSession>("/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: number,
    data: Partial<import("@/types").SessionCreateInput & { status: string; session_doc?: string }>
  ) =>
    fetchAPI<import("@/types").TrainingSession>(`/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => fetchAPI<void>(`/sessions/${id}`, { method: "DELETE" }),
  // Toggle payment status
  togglePayment: (id: number) =>
    fetchAPI<import("@/types").TrainingSession>(`/sessions/${id}/payment`, {
      method: "PATCH",
    }),
  // Session groups
  createGroup: (data: import("@/types").SessionGroupCreateInput) =>
    fetchAPI<import("@/types").SessionGroup>("/sessions/group", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listGroups: (trainerId: number, startDate?: string, endDate?: string) => {
    let url = `/sessions/groups?trainer_id=${trainerId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return fetchAPI<import("@/types").SessionGroup[]>(url);
  },
  // Active session methods
  getCurrent: (trainerId: number, toleranceMinutes: number = 15) =>
    fetchAPI<import("@/types").TrainingSession | null>(
      `/sessions/current?trainer_id=${trainerId}&tolerance_minutes=${toleranceMinutes}`
    ),
  getActive: (trainerId: number) =>
    fetchAPI<import("@/types").TrainingSession | import("@/types").SessionGroup | null>(
      `/sessions/active?trainer_id=${trainerId}`
    ),
  startActive: (data: import("@/types").StartSessionRequest) =>
    fetchAPI<import("@/types").TrainingSession | import("@/types").SessionGroup>(
      "/sessions/active/start",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
  saveClientNotes: (sessionId: number, clientId: number, notes: string) =>
    fetchAPI<import("@/types").TrainingSession>(`/sessions/${sessionId}/client-notes`, {
      method: "PATCH",
      body: JSON.stringify({ client_id: clientId, notes }),
    }),
  saveLapTimes: (
    sessionId: number,
    clientId: number,
    lapTimesMs: number[],
    totalDurationMs: number
  ) =>
    fetchAPI(`/sessions/${sessionId}/lap-times`, {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        lap_times_ms: lapTimesMs,
        total_duration_ms: totalDurationMs,
      }),
    }),
  // Session exercises
  getExercises: (sessionId: number) =>
    fetchAPI<import("@/types").SessionExercise[]>(`/sessions/${sessionId}/exercises`),
  addExercise: (
    sessionId: number,
    data: { exercise_template_id?: number; custom_name: string; data: Record<string, any> }
  ) =>
    fetchAPI<import("@/types").SessionExercise>(`/sessions/${sessionId}/exercises`, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        order_index: 0, // Backend will handle proper ordering
      }),
    }),
};

// Uploads API
export const uploadsApi = {
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/uploads/image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(error.detail || "Upload failed");
    }

    return response.json() as Promise<{ url: string }>;
  },
};

// Auth API
export const authApi = {
  getGoogleAuthUrl: () => fetchAPI<{ url: string; state: string }>("/auth/google/url"),
  exchangeGoogleCode: (code: string) =>
    fetchAPI<{
      trainer_id: number;
      email: string;
      name: string;
      is_new_user: boolean;
      has_app: boolean;
      app_id?: number;
      app_name?: string;
    }>("/auth/google/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  me: () =>
    fetchAPI<{
      trainer_id: number;
      email: string;
      name: string;
      has_app: boolean;
      app_id?: number;
      app_name?: string;
    }>("/auth/me"),
  logout: () => fetchAPI<{ detail: string }>("/auth/logout", { method: "POST" }),
};

// Dev Auth API (only for development)
export const devAuthApi = {
  login: () =>
    fetchAPI<{
      trainer_id: number;
      email: string;
      name: string;
      is_new_user: boolean;
      has_app: boolean;
      app_id?: number;
      app_name?: string;
    }>("/dev/login", {
      method: "POST",
    }),
  loginDiscipline: (discipline: "bmx" | "physio") =>
    fetchAPI<{
      trainer_id: number;
      email: string;
      name: string;
      is_new_user: boolean;
      has_app: boolean;
      app_id?: number;
      app_name?: string;
    }>(`/dev/login/${discipline}`, {
      method: "POST",
    }),
  onboarding: () =>
    fetchAPI<{
      trainer_id: number;
      email: string;
      name: string;
      is_new_user: boolean;
      has_app: boolean;
      app_id?: number;
      app_name?: string;
    }>("/dev/onboarding", {
      method: "POST",
    }),
};

// Exercise Templates API
export const exerciseTemplatesApi = {
  list: (trainerAppId: number) =>
    fetchAPI<import("@/types").ExerciseTemplate[]>(
      `/exercise-templates?trainer_app_id=${trainerAppId}`
    ),
  get: (id: number) => fetchAPI<import("@/types").ExerciseTemplate>(`/exercise-templates/${id}`),
  autocomplete: (trainerAppId: number, query: string, limit = 10) =>
    fetchAPI<import("@/types").ExerciseTemplate[]>(
      `/exercise-templates/autocomplete?trainer_app_id=${trainerAppId}&q=${encodeURIComponent(query)}&limit=${limit}`
    ),
  create: (data: import("@/types").ExerciseTemplateCreateInput) =>
    fetchAPI<import("@/types").ExerciseTemplate>("/exercise-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: import("@/types").ExerciseTemplateUpdateInput) =>
    fetchAPI<import("@/types").ExerciseTemplate>(`/exercise-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => fetchAPI<void>(`/exercise-templates/${id}`, { method: "DELETE" }),
};

// Exercise Sets API
export const exerciseSetsApi = {
  listForSession: (sessionId: number) =>
    fetchAPI<import("@/types").ExerciseSet[]>(`/exercise-sets/sessions/${sessionId}/sets`),
  listForGroup: (groupId: number) =>
    fetchAPI<import("@/types").ExerciseSet[]>(`/exercise-sets/session-groups/${groupId}/sets`),
  get: (setId: number) => fetchAPI<import("@/types").ExerciseSet>(`/exercise-sets/${setId}`),
  createForSession: (sessionId: number, data: import("@/types").ExerciseSetCreateInput) =>
    fetchAPI<import("@/types").ExerciseSet>(`/exercise-sets/sessions/${sessionId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createForGroup: (groupId: number, data: import("@/types").ExerciseSetCreateInput) =>
    fetchAPI<import("@/types").ExerciseSet>(`/exercise-sets/session-groups/${groupId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (setId: number, data: import("@/types").ExerciseSetUpdateInput) =>
    fetchAPI<import("@/types").ExerciseSet>(`/exercise-sets/${setId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (setId: number) => fetchAPI<void>(`/exercise-sets/${setId}`, { method: "DELETE" }),
  reorder: (setId: number, exerciseIds: number[]) =>
    fetchAPI<import("@/types").SessionExercise[]>(`/exercise-sets/${setId}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ exercise_ids: exerciseIds }),
    }),
};
