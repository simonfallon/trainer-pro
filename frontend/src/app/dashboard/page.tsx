"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sessionsApi, clientsApi, locationsApi } from "@/lib/api";
import { getThemeById } from "@/themes";
import { useDashboardApp } from "@/hooks/useDashboardApp";
import { StartSessionModal } from "@/components/session/StartSessionModal";
import { EditAppConfigModal } from "@/components/dashboard/EditAppConfigModal";
import type { SessionStats, Client, Location } from "@/types";

export default function DashboardHomePage() {
  const { app, trainer } = useDashboardApp();
  const router = useRouter();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEditConfigModal, setShowEditConfigModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch stats
    sessionsApi
      .getStats(app.trainer_id, startOfMonth.toISOString(), endOfMonth.toISOString())
      .then(setStats)
      .catch(console.error);

    // Fetch clients and locations for StartSessionModal
    Promise.all([clientsApi.list(app.trainer_id), locationsApi.list(app.trainer_id)])
      .then(([c, l]) => {
        setClients(c);
        setLocations(l);
      })
      .catch(console.error);
  }, [app.trainer_id]);

  const handleStartSession = async () => {
    setStartingSession(true);
    try {
      // Check for scheduled session within ±15 minutes
      const currentSession = await sessionsApi.getCurrent(app.trainer_id, 15);

      if (currentSession) {
        // Found a scheduled session - start it
        await sessionsApi.startActive({
          session_id: currentSession.id,
          client_ids: [currentSession.client_id],
          duration_minutes: currentSession.duration_minutes,
          location_id: currentSession.location_id || undefined,
        });
        // Navigate to active session page
        router.push(`/dashboard/session/active?app_id=${app.id}`);
      } else {
        // No scheduled session - show modal for ad-hoc session
        setShowStartModal(true);
      }
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Error al iniciar la sesión. Por favor intenta de nuevo.");
    } finally {
      setStartingSession(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Welcome section */}
      <div
        style={{
          marginBottom: "2.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 className="page-title" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
            ¡Bienvenido de nuevo, {app.name}!
          </h2>
          <p style={{ color: "var(--color-secondary)", margin: 0, fontSize: "1.125rem" }}>
            Aquí tienes tu resumen de entrenamiento de este mes
          </p>
        </div>
        <div
          style={{
            flexShrink: 0,
            marginLeft: "1.5rem",
            marginTop: "-2.5rem",
            marginBottom: "-2rem",
          }}
        >
          {trainer?.logo_url ? (
            <img
              src={trainer.logo_url}
              alt="Logo"
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "4px solid var(--color-background)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
          ) : (
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${app.theme_config.colors.primary} 0%, ${app.theme_config.colors.secondary} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: "3rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              {app.name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{stats?.total_clients || 0}</div>
          <div className="metric-label">Total de Clientes</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{stats?.total_sessions || 0}</div>
          <div className="metric-label">Sesiones este mes</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{stats?.completed_sessions || 0}</div>
          <div className="metric-label">Completadas</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{stats?.scheduled_sessions || 0}</div>
          <div className="metric-label">Próximas</div>
        </div>
      </div>

      {/* App Info Card */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ margin: 0 }}>Configuración de la Aplicación</h3>
          <button
            className="btn btn-secondary"
            onClick={() => setShowEditConfigModal(true)}
            style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
          >
            Editar
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--color-secondary)",
                marginBottom: "0.25rem",
              }}
            >
              Nombre de la Aplicación
            </div>
            <div style={{ fontWeight: 600 }}>{app.name}</div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--color-secondary)",
                marginBottom: "0.25rem",
              }}
            >
              Tema
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${app.theme_config.colors.primary} 0%, ${app.theme_config.colors.secondary} 100%)`,
                }}
              />
              <span style={{ fontWeight: 600 }}>
                {getThemeById(app.theme_id)?.name || app.theme_id.replace(/-/g, " ")}
              </span>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--color-secondary)",
                marginBottom: "0.25rem",
              }}
            >
              Entrenador
            </div>
            <div style={{ fontWeight: 600 }}>{trainer?.name}</div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--color-secondary)",
                marginBottom: "0.25rem",
              }}
            >
              Contacto
            </div>
            <div style={{ fontWeight: 600 }}>{trainer?.phone}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 style={{ marginBottom: "1rem" }}>Acciones Rápidas</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={handleStartSession}
            disabled={startingSession}
            className="btn btn-primary"
            style={{ minWidth: "200px" }}
          >
            {startingSession ? "Iniciando..." : "Iniciar Sesión"}
          </button>
          <a href={`/dashboard/clients?app_id=${app.id}&new=true`} className="btn btn-secondary">
            Agregar Nuevo Cliente
          </a>
          <a href={`/dashboard/calendar?app_id=${app.id}`} className="btn btn-secondary">
            Programar Sesión
          </a>
        </div>
      </div>

      {/* Start Session Modal */}
      {showStartModal && (
        <StartSessionModal
          trainerId={app.trainer_id}
          appId={app.id}
          clients={clients}
          locations={locations}
          onClose={() => setShowStartModal(false)}
        />
      )}

      {/* Edit App Config Modal */}
      {showEditConfigModal && trainer && (
        <EditAppConfigModal
          app={app}
          trainer={trainer}
          onClose={() => setShowEditConfigModal(false)}
          onSuccess={() => {
            setShowEditConfigModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
