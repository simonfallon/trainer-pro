/**
 * TypeScript types for the application
 */

export interface Trainer {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    google_id: string | null;
    logo_url: string | null;
    discipline_type: string;
    created_at: string;
    updated_at: string;
}

export interface TrainerApp {
    id: number;
    trainer_id: number;
    name: string;
    theme_id: string;
    theme_config: ThemeConfig;
    created_at: string;
    updated_at: string;
}

export interface ThemeConfig {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
    };
    fonts: {
        heading: string;
        body: string;
    };
}

export type LocationType = 'trainer_base' | 'client_home' | 'gym' | 'track' | 'other';

export interface Location {
    id: number;
    trainer_id: number;
    name: string;
    type: LocationType;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    google_place_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface Client {
    id: number;
    trainer_id: number;
    name: string;
    phone: string;
    email: string | null;
    notes: string | null;
    default_location_id: number | null;
    google_id: string | null;
    // Profile fields
    photo_url: string | null;
    birth_date: string | null;
    gender: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    age: number | null;  // Computed field from backend
    created_at: string;
    updated_at: string;
}

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface TrainingSession {
    id: number;
    trainer_id: number;
    client_id: number;
    location_id: number | null;
    session_group_id: number | null;
    scheduled_at: string;
    duration_minutes: number;
    notes: string | null;
    status: SessionStatus;
    // Payment tracking
    is_paid: boolean;
    paid_at: string | null;
    // Session documentation
    session_doc: string | null;
    created_at: string;
    updated_at: string;
}

export interface SessionGroup {
    id: number;
    trainer_id: number;
    location_id: number | null;
    scheduled_at: string;
    duration_minutes: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
    sessions: TrainingSession[];
}

export interface SessionStats {
    total_sessions: number;
    completed_sessions: number;
    scheduled_sessions: number;
    cancelled_sessions: number;
    total_clients: number;
}

export interface Payment {
    id: number;
    client_id: number;
    trainer_id: number;
    sessions_paid: number;
    amount_cop: number;
    payment_date: string;
    notes: string | null;
    created_at: string;
}

export interface PaymentBalance {
    total_sessions: number;
    paid_sessions: number;
    unpaid_sessions: number;
    prepaid_sessions: number;
    has_positive_balance: boolean;
    total_amount_paid_cop: number;
}

export interface ExerciseTemplate {
    id: number;
    trainer_app_id: number;
    name: string;
    discipline_type: string;
    field_schema: Record<string, {
        type: 'number' | 'array' | 'integer' | 'float' | 'duration' | 'text'; // integer/float for backward compatibility
        label: string;
        required: boolean;
    }>;
    usage_count: number;
    created_at: string;
    updated_at: string;
}

// Form types
export interface TrainerCreateInput {
    name: string;
    phone: string;
    email: string;
    logo_url?: string;
}

export interface AppCreateInput {
    trainer_id: number;
    name: string;
    theme_id: string;
    theme_config: ThemeConfig;
}

export interface ClientCreateInput {
    trainer_id: number;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    default_location_id?: number;
    // Profile fields
    photo_url?: string;
    birth_date?: string;
    gender?: string;
    height_cm?: number;
    weight_kg?: number;
}

export interface SessionCreateInput {
    trainer_id: number;
    client_id: number;
    location_id?: number;
    scheduled_at: string;
    duration_minutes: number;
    notes?: string;
}

export interface SessionGroupCreateInput {
    trainer_id: number;
    client_ids: number[];
    location_id?: number;
    scheduled_at: string;
    duration_minutes: number;
    notes?: string;
}

export interface LocationCreateInput {
    trainer_id: number;
    name: string;
    type: LocationType;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    google_place_id?: string;
}

export interface ExerciseTemplateCreateInput {
    trainer_app_id: number;
    name: string;
    discipline_type: string;
    field_schema?: Record<string, {
        type: 'number' | 'array' | 'duration' | 'text';
        label: string;
        required: boolean;
    }>;
}

export interface ExerciseTemplateUpdateInput {
    name?: string;
    discipline_type?: string;
    field_schema?: Record<string, {
        type: 'number' | 'array' | 'duration' | 'text';
        label: string;
        required: boolean;
    }>;
}

