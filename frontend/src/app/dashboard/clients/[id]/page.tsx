"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import useSWR, { mutate } from "swr";
import { clientsApi, sessionsApi, uploadsApi } from "@/lib/api";
import { useDarkStyles } from "@/hooks/useDarkStyles";
import { useDashboardApp } from "@/hooks/useDashboardApp";
import { formatDate } from "@/lib/dateUtils";
import { SESSION_STATUS_LABELS } from "@/lib/labels";
import { PaymentModal } from "@/components/PaymentModal";
import { SessionDetailModal } from "@/components/SessionDetailModal";
import { ClientLapTimesCard } from "@/components/ClientLapTimesCard";
import { ClientExerciseHistoryCard } from "@/components/ClientExerciseHistoryCard";
import type { Client, TrainingSession, PaymentBalance } from "@/types";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = Number(params.id);
  const appId = searchParams.get("app_id");
  const { darkStyles, theme } = useDarkStyles();
  const { trainer } = useDashboardApp();

  // -----------------------------------------------------------------------
  // Data
  // -----------------------------------------------------------------------
  const {
    data: client,
    error: clientError,
    isLoading: clientLoading,
  } = useSWR<Client>(`/clients/${clientId}`, () => clientsApi.get(clientId));

  const { data: sessions, isLoading: sessionsLoading } = useSWR<TrainingSession[]>(
    `/clients/${clientId}/sessions`,
    () => clientsApi.getSessions(clientId)
  );

  const { data: balance } = useSWR<PaymentBalance>(`/clients/${clientId}/payment-balance`, () =>
    clientsApi.getPaymentBalance(clientId)
  );

  // -----------------------------------------------------------------------
  // Derived stats
  // -----------------------------------------------------------------------
  const totalSesiones = sessions?.length ?? 0;
  const sesionsPagadas = balance?.paid_sessions ?? 0;

  const progressPercent =
    balance && balance.total_sessions > 0
      ? (balance.paid_sessions / balance.total_sessions) * 100
      : 0;

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTogglePayment = async (sessionId: number) => {
    try {
      await sessionsApi.togglePayment(sessionId);
      mutate(`/clients/${clientId}/sessions`);
      mutate(`/clients/${clientId}/payment-balance`);
    } catch (err) {
      console.error("Error toggling payment:", err);
      setError("Error al actualizar el estado de pago");
    }
  };

  const handleDeleteClient = async () => {
    if (!confirm(`¿Estás seguro de eliminar a ${client?.name}?`)) return;
    try {
      await clientsApi.delete(clientId);
      router.push(`/dashboard/clients?app_id=${appId}`);
    } catch (err) {
      console.error("Error deleting client:", err);
      setError("Error al eliminar el cliente");
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona una imagen válida");
      return;
    }

    setUploadingImage(true);
    setError("");

    try {
      // Upload image
      const { url } = await uploadsApi.uploadImage(file);

      // Update client with new photo URL
      await clientsApi.update(clientId, { photo_url: url });

      // Refresh client data
      mutate(`/clients/${clientId}`);
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Error al subir la imagen");
    } finally {
      setUploadingImage(false);
    }
  };

  // -----------------------------------------------------------------------
  // Early returns
  // -----------------------------------------------------------------------
  if (clientLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <p style={{ fontSize: "1.125rem", color: theme.colors.secondary }}>Cargando...</p>
      </div>
    );
  }

  if (clientError || !client) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <p style={{ fontSize: "1.125rem", color: "#dc3545" }}>Error al cargar el cliente</p>
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
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
          borderRadius: "0 0 16px 16px",
          padding: "1.25rem 1.5rem 1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "0.875rem",
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: 0,
            opacity: 0.85,
          }}
        >
          ← Volver
        </button>

        {/* Main Content Flex Container */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {/* LEFT SECTION: Avatar + Name + Delete */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}
          >
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
                cursor: "pointer",
              }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={(e) => {
                const overlay = e.currentTarget.querySelector(".upload-overlay") as HTMLElement;
                if (overlay) overlay.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const overlay = e.currentTarget.querySelector(".upload-overlay") as HTMLElement;
                if (overlay) overlay.style.opacity = "0";
              }}
            >
              {client.photo_url ? (
                <img
                  src={client.photo_url}
                  alt={client.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "white", fontSize: "2.5rem", fontWeight: 700 }}>
                  {client.name.charAt(0).toUpperCase()}
                </span>
              )}

              {/* Upload overlay */}
              <div
                className="upload-overlay"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  opacity: 0,
                  transition: "opacity 0.2s",
                }}
              >
                {uploadingImage ? (
                  <span style={{ color: "white", fontSize: "0.875rem" }}>Subiendo...</span>
                ) : (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </div>

            <div style={{ textAlign: "center" }}>
              <h1
                style={{
                  color: "white",
                  fontSize: "1.5rem",
                  margin: "0 0 0.5rem 0",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {client.name}
              </h1>
              <button
                className="btn btn-danger"
                onClick={handleDeleteClient}
                style={{
                  fontSize: "0.80rem",
                  padding: "0.3rem 0.6rem",
                  background: "rgba(220, 53, 69, 0.2)",
                  border: "1px solid rgba(220, 53, 69, 0.4)",
                  color: "#ffcdd2",
                }}
              >
                Eliminar Cliente
              </button>
            </div>
          </div>

          {/* RIGHT SECTION: Info Cards */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
              width: "100%",
            }}
          >
            {/* Información de Contacto */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "1rem",
              }}
            >
              <h3
                style={{
                  color: "white",
                  marginBottom: "0.75rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                }}
              >
                Información de Contacto
              </h3>
              {(
                [
                  { label: "Teléfono", value: client.phone },
                  client.email && { label: "Email", value: client.email },
                  client.default_location && {
                    label: "Ubicación",
                    value: client.default_location.name,
                  },
                ].filter(Boolean) as { label: string; value: string }[]
              ).map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem" }}>
                    {row.label}
                  </span>
                  <span style={{ fontWeight: 600, color: "white", fontSize: "0.875rem" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Información Personal */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "1rem",
              }}
            >
              <h3
                style={{
                  color: "white",
                  marginBottom: "0.75rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                }}
              >
                Información Personal
              </h3>
              {(
                [
                  client.age != null && { label: "Edad", value: `${client.age} años` },
                  client.gender && { label: "Género", value: client.gender },
                  client.height_cm != null && { label: "Altura", value: `${client.height_cm} cm` },
                  client.weight_kg != null && { label: "Peso", value: `${client.weight_kg} kg` },
                ].filter(Boolean) as { label: string; value: string }[]
              ).map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem" }}>
                    {row.label}
                  </span>
                  <span style={{ fontWeight: 600, color: "white", fontSize: "0.875rem" }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {client.notes && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "rgba(255,255,255,0.9)",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {client.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
                TWO-COLUMN BODY
                ============================================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* --------------------------------------------------------
                    LEFT COLUMN
                    -------------------------------------------------------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Sessions Table (moved to left column) */}
          <div className="card" style={{ ...darkStyles.card, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: `1px solid ${darkStyles.divider}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ color: theme.colors.text, fontSize: "1.125rem", margin: 0 }}>
                Sesiones de Entrenamiento
              </h3>
              <button
                className="btn btn-primary"
                onClick={() =>
                  router.push(`/dashboard/calendar?app_id=${appId}&client=${clientId}`)
                }
                style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
              >
                Ver Calendario
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              {sessionsLoading ? (
                <p
                  style={{ padding: "1.5rem", textAlign: "center", color: theme.colors.secondary }}
                >
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
                      <tr
                        key={session.id}
                        style={{ borderBottom: `1px solid ${darkStyles.divider}` }}
                      >
                        <td style={{ fontSize: "0.85rem", color: theme.colors.text }}>
                          {formatDate(session.scheduled_at)}
                        </td>

                        {/* Status dot + label */}
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: theme.colors.text,
                            }}
                          >
                            <span
                              style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                background:
                                  session.status === "completed"
                                    ? "#22c55e"
                                    : session.status === "scheduled"
                                      ? theme.colors.primary
                                      : "#9ca3af",
                                flexShrink: 0,
                              }}
                            />
                            {SESSION_STATUS_LABELS[session.status] || session.status}
                          </span>
                        </td>

                        <td style={{ fontSize: "0.85rem", color: theme.colors.text }}>
                          {session.duration_minutes} min
                        </td>

                        {/* Toggle switch */}
                        <td>
                          <button
                            onClick={() => handleTogglePayment(session.id)}
                            aria-label={
                              session.is_paid ? "Marcar como no pagado" : "Marcar como pagado"
                            }
                            style={{
                              position: "relative",
                              width: "44px",
                              height: "24px",
                              borderRadius: "12px",
                              background: session.is_paid
                                ? theme.colors.primary
                                : darkStyles.toggleOff,
                              border: "none",
                              cursor: "pointer",
                              transition: "background 0.2s",
                              padding: 0,
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                top: "2px",
                                left: session.is_paid ? "22px" : "2px",
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: "white",
                                transition: "left 0.2s",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                              }}
                            />
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
                              background: "none",
                              border: "none",
                              color: theme.colors.primary,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: "0.875rem",
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
                <p style={{ padding: "2rem", textAlign: "center", color: theme.colors.secondary }}>
                  No hay sesiones registradas
                </p>
              )}
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------
                    RIGHT COLUMN — Payment Status + Discipline-Specific Components
                    -------------------------------------------------------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Estado de Pagos */}
          <div className="card" style={darkStyles.card}>
            <h3 style={{ color: theme.colors.text, marginBottom: "0.75rem", fontSize: "1.125rem" }}>
              Estado de Pagos
            </h3>

            {balance ? (
              <>
                {/* Session count and Total paid - side by side */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: theme.colors.text }}>
                      {balance.paid_sessions}/{balance.total_sessions}
                    </div>
                    <div
                      style={{
                        color: theme.colors.secondary,
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      Sesiones Pagadas
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: theme.colors.text }}>
                      ${(balance.total_amount_paid_cop ?? 0).toLocaleString("es-CO")}
                    </div>
                    <div
                      style={{
                        color: theme.colors.secondary,
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      Total Pagado (COP)
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: "8px",
                    borderRadius: "999px",
                    background: darkStyles.progressTrack,
                    marginBottom: "1rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPercent}%`,
                      background: theme.colors.primary,
                      borderRadius: "999px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => setShowPaymentModal(true)}
                  style={{ width: "100%" }}
                >
                  Registrar Pagos
                </button>
              </>
            ) : (
              <p style={{ color: theme.colors.secondary, fontSize: "0.875rem" }}>Cargando...</p>
            )}
          </div>

          {/* Discipline-Specific Components */}
          {trainer?.discipline_type === "bmx" && <ClientLapTimesCard clientId={clientId} />}
          {trainer?.discipline_type === "physio" && (
            <ClientExerciseHistoryCard clientId={clientId} />
          )}
        </div>
      </div>

      {error && <p style={{ color: "#dc3545", marginTop: "1rem" }}>{error}</p>}

      {/* ============================================================
                MODALS
                ============================================================ */}
      {showPaymentModal && (
        <PaymentModal
          clientId={clientId}
          clientName={client.name}
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
