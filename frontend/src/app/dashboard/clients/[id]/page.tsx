'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { clientsApi, sessionsApi } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';
import type { Client, TrainingSession, PaymentBalance } from '@/types';

// ---------------------------------------------------------------------------
// Helpers (file-scope, pure, no React dependency)
// ---------------------------------------------------------------------------

function isDarkTheme(bgHex: string): boolean {
    const hex = bgHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const L = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
    return L < 0.18;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const clientId = params.id as string;
    const appId = searchParams.get('app_id');
    const { theme } = useTheme();

    // -----------------------------------------------------------------------
    // Data
    // -----------------------------------------------------------------------
    const { data: client, error: clientError, isLoading: clientLoading } = useSWR<Client>(
        `/clients/${clientId}`,
        () => clientsApi.get(clientId)
    );

    const { data: sessions, isLoading: sessionsLoading } = useSWR<TrainingSession[]>(
        `/clients/${clientId}/sessions`,
        () => clientsApi.getSessions(clientId)
    );

    const { data: balance } = useSWR<PaymentBalance>(
        `/clients/${clientId}/payment-balance`,
        () => clientsApi.getPaymentBalance(clientId)
    );

    // -----------------------------------------------------------------------
    // Derived / dark-mode styles (computed during render — no effect, no memo)
    // -----------------------------------------------------------------------
    const isDark = isDarkTheme(theme.colors.background);

    const darkStyles = isDark
        ? {
            card: { backgroundColor: 'rgba(255,255,255,0.08)', color: theme.colors.text } as React.CSSProperties,
            modal: { backgroundColor: 'rgba(255,255,255,0.1)', color: theme.colors.text } as React.CSSProperties,
            tableText: { color: theme.colors.text } as React.CSSProperties,
            divider: 'rgba(255,255,255,0.1)',
            noteTint: 'rgba(255,255,255,0.06)',
            progressTrack: 'rgba(255,255,255,0.12)',
            toggleOff: 'rgba(255,255,255,0.15)',
            totalTint: 'rgba(255,255,255,0.08)',
        }
        : {
            card: {} as React.CSSProperties,
            modal: {} as React.CSSProperties,
            tableText: {} as React.CSSProperties,
            divider: '#e1e5e9',
            noteTint: `${theme.colors.primary}12`,
            progressTrack: '#e1e5e9',
            toggleOff: '#d1d5db',
            totalTint: `${theme.colors.primary}1a`,
        };

    // Derived stats
    const totalSesiones = sessions?.length ?? 0;
    const sesionsPagadas = balance?.paid_sessions ?? 0;

    const statusBadge = balance?.has_positive_balance
        ? { label: 'Prepagado', bg: theme.colors.primary, color: '#fff' }
        : (balance?.unpaid_sessions ?? 0) > 0
            ? { label: 'Pendiente', bg: '#f59e0b', color: '#fff' }
            : { label: 'Al día', bg: '#22c55e', color: '#fff' };

    const progressPercent = balance && balance.total_sessions > 0
        ? (balance.paid_sessions / balance.total_sessions) * 100
        : 0;

    // -----------------------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------------------
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);

    const handleTogglePayment = async (sessionId: string) => {
        try {
            await sessionsApi.togglePayment(sessionId);
            mutate(`/clients/${clientId}/sessions`);
            mutate(`/clients/${clientId}/payment-balance`);
        } catch (error) {
            console.error('Error toggling payment:', error);
            alert('Error al actualizar el estado de pago');
        }
    };

    const handleDeleteClient = async () => {
        if (!confirm(`¿Estás seguro de eliminar a ${client?.name}?`)) return;
        try {
            await clientsApi.delete(clientId);
            router.push(`/dashboard/clients?app_id=${appId}`);
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Error al eliminar el cliente');
        }
    };

    // -----------------------------------------------------------------------
    // Early returns
    // -----------------------------------------------------------------------
    if (clientLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <p style={{ fontSize: '1.125rem', color: theme.colors.secondary }}>Cargando...</p>
            </div>
        );
    }

    if (clientError || !client) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <p style={{ fontSize: '1.125rem', color: '#dc3545' }}>Error al cargar el cliente</p>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="fade-in">

            {/* ============================================================
                HERO BANNER
                ============================================================ */}
            <div style={{
                background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                borderRadius: '0 0 16px 16px',
                padding: '1.25rem 1.5rem 1.5rem',
                marginBottom: '1.5rem',
            }}>
                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: 0,
                        opacity: 0.85,
                    }}
                >
                    ← Volver
                </button>

                {/* Avatar + Name + Contact (compact row) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                    }}>
                        {client.photo_url ? (
                            <img src={client.photo_url} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ color: 'white', fontSize: '2rem', fontWeight: 700 }}>
                                {client.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div>
                        <h1 style={{ color: 'white', fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>
                            {client.name}
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', margin: '0.2rem 0 0' }}>
                            {client.phone}{client.email ? ` · ${client.email}` : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* ============================================================
                STATS BAR
                ============================================================ */}
            <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
                {/* Total Sesiones */}
                <div className="metric-card">
                    <div className="metric-value">{totalSesiones}</div>
                    <div className="metric-label">Total Sesiones</div>
                </div>

                {/* Sesiones Pagadas */}
                <div className="metric-card">
                    <div className="metric-value">{sesionsPagadas}</div>
                    <div className="metric-label">
                        Sesiones Pagadas
                        <span style={{ opacity: 0.7, fontSize: '0.75rem', display: 'block', marginTop: '0.15rem' }}>
                            de {totalSesiones}
                        </span>
                    </div>
                </div>

                {/* Estado badge */}
                <div className="metric-card">
                    <div className="metric-value" style={{ fontSize: '1.5rem' }}>
                        <span style={{
                            display: 'inline-block',
                            background: statusBadge.bg,
                            color: statusBadge.color,
                            padding: '0.3rem 0.85rem',
                            borderRadius: '999px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                        }}>
                            {statusBadge.label}
                        </span>
                    </div>
                    <div className="metric-label">Estado</div>
                </div>
            </div>

            {/* ============================================================
                TWO-COLUMN BODY
                ============================================================ */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginBottom: '1.5rem',
            }}>
                {/* --------------------------------------------------------
                    LEFT COLUMN
                    -------------------------------------------------------- */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Información Personal */}
                    <div className="card" style={darkStyles.card}>
                        <h3 style={{ color: theme.colors.text, marginBottom: '1rem', fontSize: '1.125rem' }}>
                            Información Personal
                        </h3>
                        {([
                            client.age != null && { label: 'Edad', value: `${client.age} años` },
                            client.gender && { label: 'Género', value: client.gender },
                            client.height_cm != null && { label: 'Altura', value: `${client.height_cm} cm` },
                            client.weight_kg != null && { label: 'Peso', value: `${client.weight_kg} kg` },
                        ].filter(Boolean) as { label: string; value: string }[]).map((row) => (
                            <div key={row.label} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.55rem 0',
                                borderBottom: `1px solid ${darkStyles.divider}`,
                            }}>
                                <span style={{ color: theme.colors.secondary, fontSize: '0.9rem' }}>{row.label}</span>
                                <span style={{ fontWeight: 600, color: theme.colors.text }}>{row.value}</span>
                            </div>
                        ))}

                        {client.notes && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                background: darkStyles.noteTint,
                            }}>
                                <p style={{ fontSize: '0.875rem', color: theme.colors.text, margin: 0, lineHeight: 1.5 }}>
                                    {client.notes}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Estado de Pagos */}
                    <div className="card" style={darkStyles.card}>
                        <h3 style={{ color: theme.colors.text, marginBottom: '0.75rem', fontSize: '1.125rem' }}>
                            Estado de Pagos
                        </h3>

                        {balance ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                    <span style={{ color: theme.colors.secondary, fontSize: '0.85rem' }}>
                                        Total: {balance.total_sessions}
                                    </span>
                                    <span style={{ color: theme.colors.secondary, fontSize: '0.85rem' }}>
                                        Pagadas: {balance.paid_sessions}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div style={{
                                    height: '8px',
                                    borderRadius: '999px',
                                    background: darkStyles.progressTrack,
                                    marginBottom: '1rem',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${progressPercent}%`,
                                        background: theme.colors.primary,
                                        borderRadius: '999px',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowPaymentModal(true)}
                                    style={{ width: '100%' }}
                                >
                                    Registrar Pagos
                                </button>
                            </>
                        ) : (
                            <p style={{ color: theme.colors.secondary, fontSize: '0.875rem' }}>Cargando...</p>
                        )}
                    </div>
                </div>

                {/* --------------------------------------------------------
                    RIGHT COLUMN — Sessions Table
                    -------------------------------------------------------- */}
                <div className="card" style={{ ...darkStyles.card, padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderBottom: `1px solid ${darkStyles.divider}`,
                    }}>
                        <h3 style={{ color: theme.colors.text, fontSize: '1.125rem', margin: 0 }}>
                            Sesiones de Entrenamiento
                        </h3>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        {sessionsLoading ? (
                            <p style={{ padding: '1.5rem', textAlign: 'center', color: theme.colors.secondary }}>
                                Cargando sesiones...
                            </p>
                        ) : sessions && sessions.length > 0 ? (
                            <table className="table" style={{ ...darkStyles.tableText, margin: 0 }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${darkStyles.divider}` }}>
                                        <th style={{ color: theme.colors.secondary }}>Fecha</th>
                                        <th style={{ color: theme.colors.secondary }}>Estado</th>
                                        <th style={{ color: theme.colors.secondary }}>Duración</th>
                                        <th style={{ color: theme.colors.secondary }}>Pagado</th>
                                        <th style={{ color: theme.colors.secondary }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session) => (
                                        <tr key={session.id} style={{ borderBottom: `1px solid ${darkStyles.divider}` }}>
                                            <td style={{ fontSize: '0.85rem', color: theme.colors.text }}>
                                                {formatDate(session.scheduled_at)}
                                            </td>

                                            {/* Status dot + label */}
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600,
                                                    color: theme.colors.text,
                                                }}>
                                                    <span style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        background:
                                                            session.status === 'completed' ? '#22c55e' :
                                                            session.status === 'scheduled' ? theme.colors.primary :
                                                            '#9ca3af',
                                                        flexShrink: 0,
                                                    }} />
                                                    {session.status === 'completed' ? 'Completada' :
                                                     session.status === 'scheduled' ? 'Programada' :
                                                     'Cancelada'}
                                                </span>
                                            </td>

                                            <td style={{ fontSize: '0.85rem', color: theme.colors.text }}>
                                                {session.duration_minutes} min
                                            </td>

                                            {/* Toggle switch */}
                                            <td>
                                                <button
                                                    onClick={() => handleTogglePayment(session.id)}
                                                    aria-label={session.is_paid ? 'Marcar como no pagado' : 'Marcar como pagado'}
                                                    style={{
                                                        position: 'relative',
                                                        width: '44px',
                                                        height: '24px',
                                                        borderRadius: '12px',
                                                        background: session.is_paid ? theme.colors.primary : darkStyles.toggleOff,
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s',
                                                        padding: 0,
                                                    }}
                                                >
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: '2px',
                                                        left: session.is_paid ? '22px' : '2px',
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        background: 'white',
                                                        transition: 'left 0.2s',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                    }} />
                                                </button>
                                            </td>

                                            {/* Más Info */}
                                            <td>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSession(session);
                                                        setShowSessionModal(true);
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: theme.colors.primary,
                                                        cursor: 'pointer',
                                                        fontWeight: 600,
                                                        fontSize: '0.875rem',
                                                        padding: 0,
                                                    }}
                                                >
                                                    Más Info
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ padding: '2rem', textAlign: 'center', color: theme.colors.secondary }}>
                                No hay sesiones registradas
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================================
                BOTTOM ACTION ROW
                ============================================================ */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                    className="btn btn-primary"
                    onClick={() => router.push(`/dashboard/calendar?app_id=${appId}&client=${clientId}`)}
                >
                    Ver Calendario
                </button>
                <button
                    className="btn"
                    onClick={handleDeleteClient}
                    style={{ background: '#dc3545', color: 'white' }}
                >
                    Eliminar Cliente
                </button>
            </div>

            {/* ============================================================
                MODALS
                ============================================================ */}
            {showPaymentModal && (
                <PaymentModal
                    clientId={clientId}
                    clientName={client.name}
                    theme={theme}
                    darkStyles={darkStyles}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={() => {
                        mutate(`/clients/${clientId}/payment-balance`);
                        mutate(`/clients/${clientId}/sessions`);
                        setShowPaymentModal(false);
                    }}
                />
            )}

            {showSessionModal && selectedSession && (
                <SessionDetailModal
                    session={selectedSession}
                    theme={theme}
                    darkStyles={darkStyles}
                    onClose={() => {
                        setShowSessionModal(false);
                        setSelectedSession(null);
                    }}
                    onUpdate={() => {
                        mutate(`/clients/${clientId}/sessions`);
                    }}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// PaymentModal
// ---------------------------------------------------------------------------

interface DarkStyles {
    card: React.CSSProperties;
    modal: React.CSSProperties;
    tableText: React.CSSProperties;
    divider: string;
    noteTint: string;
    progressTrack: string;
    toggleOff: string;
    totalTint: string;
}

function PaymentModal({
    clientId,
    clientName,
    theme,
    darkStyles,
    onClose,
    onSuccess,
}: {
    clientId: string;
    clientName: string;
    theme: { colors: { primary: string; secondary: string; background: string; text: string } };
    darkStyles: DarkStyles;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [sessionsPaid, setSessionsPaid] = useState(1);
    const [amountPerSession, setAmountPerSession] = useState(50000);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const totalAmount = sessionsPaid * amountPerSession;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await clientsApi.registerPayment(clientId, {
                sessions_paid: sessionsPaid,
                amount_cop: totalAmount,
                notes: notes || undefined,
            });
            onSuccess();
        } catch (error) {
            console.error('Error registering payment:', error);
            alert('Error al registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={darkStyles.modal}>
                <div className="modal-header">
                    <h3 className="modal-title" style={{ color: theme.colors.text }}>
                        Registrar Pago — {clientName}
                    </h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Número de sesiones</label>
                        <input
                            type="number"
                            className="form-input"
                            min="1"
                            value={sessionsPaid}
                            onChange={(e) => setSessionsPaid(parseInt(e.target.value) || 1)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Valor por sesión (COP)</label>
                        <input
                            type="number"
                            className="form-input"
                            min="0"
                            step="1000"
                            value={amountPerSession}
                            onChange={(e) => setAmountPerSession(parseInt(e.target.value) || 0)}
                            required
                        />
                    </div>

                    {/* Total summary */}
                    <div style={{
                        background: darkStyles.totalTint,
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        marginBottom: '1.25rem',
                    }}>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700, color: theme.colors.text, margin: 0 }}>
                            Total: ${totalAmount.toLocaleString('es-CO')} COP
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notas (opcional)</label>
                        <textarea
                            className="form-textarea"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ flex: 1, opacity: loading ? 0.5 : 1 }}
                        >
                            {loading ? 'Guardando...' : 'Registrar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// SessionDetailModal
// ---------------------------------------------------------------------------

function SessionDetailModal({
    session,
    theme,
    darkStyles,
    onClose,
    onUpdate,
}: {
    session: TrainingSession;
    theme: { colors: { primary: string; secondary: string; background: string; text: string } };
    darkStyles: DarkStyles;
    onClose: () => void;
    onUpdate: () => void;
}) {
    const [sessionDoc, setSessionDoc] = useState(session.session_doc || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await sessionsApi.update(session.id, { session_doc: sessionDoc });
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating session:', error);
            alert('Error al actualizar la sesión');
        } finally {
            setLoading(false);
        }
    };

    const detailRows = [
        { label: 'Fecha', value: formatDate(session.scheduled_at) },
        { label: 'Duración', value: `${session.duration_minutes} minutos` },
        {
            label: 'Estado',
            value: session.status === 'completed' ? 'Completada' :
                   session.status === 'scheduled' ? 'Programada' : 'Cancelada',
        },
        { label: 'Pagado', value: session.is_paid ? 'Sí' : 'No' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ ...darkStyles.modal, maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3 className="modal-title" style={{ color: theme.colors.text }}>
                        Detalles de la Sesión
                    </h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                {/* Detail rows */}
                <div style={{ marginBottom: '1.5rem' }}>
                    {detailRows.map((row) => (
                        <div key={row.label} style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0' }}>
                            <span style={{ color: theme.colors.secondary, minWidth: '80px' }}>{row.label}:</span>
                            <span style={{ fontWeight: 600, color: theme.colors.text }}>{row.value}</span>
                        </div>
                    ))}
                    {session.notes && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <span style={{ color: theme.colors.secondary }}>Notas:</span>
                            <p style={{ fontSize: '0.875rem', color: theme.colors.text, marginTop: '0.25rem', marginBottom: 0 }}>
                                {session.notes}
                            </p>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Documentación de la Sesión</label>
                    <textarea
                        className="form-textarea"
                        value={sessionDoc}
                        onChange={(e) => setSessionDoc(e.target.value)}
                        rows={6}
                        placeholder="Ej: Ejercicios realizados, observaciones, progreso..."
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                        Cerrar
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={loading}
                        style={{ flex: 1, opacity: loading ? 0.5 : 1 }}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
