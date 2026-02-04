'use client';

import { useEffect, useState } from 'react';
import { sessionsApi } from '@/lib/api';
import { getThemeById } from '@/themes';
import { useDashboardApp } from '@/hooks/useDashboardApp';
import type { SessionStats } from '@/types';

export default function DashboardHomePage() {
    const { app, trainer } = useDashboardApp();
    const [stats, setStats] = useState<SessionStats | null>(null);

    useEffect(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        sessionsApi.getStats(
            app.trainer_id,
            startOfMonth.toISOString(),
            endOfMonth.toISOString()
        ).then(setStats).catch(console.error);
    }, [app.trainer_id]);

    return (
        <div className="fade-in">
            {/* Welcome section */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 className="page-title">
                    ¡Bienvenido de nuevo{trainer ? `, ${trainer.name.split(' ')[0]}` : ''}!
                </h2>
                <p style={{ color: 'var(--color-secondary)' }}>
                    Aquí tienes tu resumen de entrenamiento de este mes
                </p>
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
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Configuración de la Aplicación</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-secondary)', marginBottom: '0.25rem' }}>
                            Nombre de la Aplicación
                        </div>
                        <div style={{ fontWeight: 600 }}>{app.name}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-secondary)', marginBottom: '0.25rem' }}>
                            Tema
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${app.theme_config.colors.primary} 0%, ${app.theme_config.colors.secondary} 100%)`,
                            }} />
                            <span style={{ fontWeight: 600 }}>
                                {getThemeById(app.theme_id)?.name || app.theme_id.replace(/-/g, ' ')}
                            </span>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-secondary)', marginBottom: '0.25rem' }}>
                            Entrenador
                        </div>
                        <div style={{ fontWeight: 600 }}>{trainer?.name}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-secondary)', marginBottom: '0.25rem' }}>
                            Contacto
                        </div>
                        <div style={{ fontWeight: 600 }}>{trainer?.phone}</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Acciones Rápidas</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <a href={`/dashboard/clients?app_id=${app.id}`} className="btn btn-primary">
                        Agregar Nuevo Cliente
                    </a>
                    <a href={`/dashboard/calendar?app_id=${app.id}`} className="btn btn-secondary">
                        Programar Sesión
                    </a>
                </div>
            </div>
        </div>
    );
}
