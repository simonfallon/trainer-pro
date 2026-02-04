/**
 * TypeScript types for the application
 */

export interface Trainer {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    google_id: string | null;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface TrainerApp {
    id: string;
    trainer_id: string;
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
    id: string;
    trainer_id: string;
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
    id: string;
    trainer_id: string;
    name: string;
    phone: string;
    email: string | null;
    notes: string | null;
    default_location_id: string | null;
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
    id: string;
    trainer_id: string;
    client_id: string;
    location_id: string | null;
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

export interface SessionStats {
    total_sessions: number;
    completed_sessions: number;
    scheduled_sessions: number;
    cancelled_sessions: number;
    total_clients: number;
}

export interface Payment {
    id: string;
    client_id: string;
    trainer_id: string;
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
}

// Form types
export interface TrainerCreateInput {
    name: string;
    phone: string;
    email: string;
    logo_url?: string;
}

export interface AppCreateInput {
    trainer_id: string;
    name: string;
    theme_id: string;
    theme_config: ThemeConfig;
}

export interface ClientCreateInput {
    trainer_id: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    default_location_id?: string;
}

export interface SessionCreateInput {
    trainer_id: string;
    client_id: string;
    location_id?: string;
    scheduled_at: string;
    duration_minutes: number;
    notes?: string;
}

export interface LocationCreateInput {
    trainer_id: string;
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

