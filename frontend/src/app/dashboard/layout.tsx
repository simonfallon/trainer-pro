'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { DashboardAppProvider } from '@/hooks/useDashboardApp';
import { appsApi, trainersApi } from '@/lib/api';
import type { TrainerApp, Trainer } from '@/types';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const appId = searchParams.get('app_id');
    const [app, setApp] = useState<TrainerApp | null>(null);
    const [trainer, setTrainer] = useState<Trainer | null>(null);
    const [loading, setLoading] = useState(true);
    const lastAppId = useRef<string | null>(null);

    // Persist the last known valid app_id so child pages without it in the URL
    // (e.g. /dashboard/clients/[id]) don't break the tab hrefs
    if (appId && appId !== 'null') {
        lastAppId.current = appId;
    }
    const effectiveAppId = appId && appId !== 'null' ? appId : lastAppId.current;

    useEffect(() => {
        if (effectiveAppId) {
            appsApi.get(Number(effectiveAppId))
                .then(async (appData) => {
                    setApp(appData);
                    // Fetch trainer
                    if (appData.trainer_id) {
                        try {
                            const trainerData = await trainersApi.get(appData.trainer_id);
                            setTrainer(trainerData);
                        } catch (err) {
                            console.error('Error fetching trainer:', err);
                        }
                    }
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [effectiveAppId]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Cargando...</p>
            </div>
        );
    }

    if (!app) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h2>No se encontró la aplicación</h2>
                    <p style={{ color: 'var(--color-secondary)', marginBottom: '1.5rem' }}>
                        Por favor, crea una aplicación primero
                    </p>
                    <Link href="/" className="btn btn-primary">
                        Crear Aplicación
                    </Link>
                </div>
            </div>
        );
    }

    const tabs = [
        { href: `/dashboard?app_id=${effectiveAppId}`, label: 'Inicio', exact: true },
        { href: `/dashboard/clients?app_id=${effectiveAppId}`, label: 'Clientes' },
        { href: `/dashboard/exercises?app_id=${effectiveAppId}`, label: 'Ejercicios' },
        { href: `/dashboard/locations?app_id=${effectiveAppId}`, label: 'Ubicaciones' },
        { href: `/dashboard/calendar?app_id=${effectiveAppId}`, label: 'Calendario' },
    ];

    const isActive = (href: string, exact = false) => {
        const basePath = href.split('?')[0];
        if (exact) {
            return pathname === basePath;
        }
        return pathname.startsWith(basePath);
    };

    // For custom logo themes, pass the full theme config directly
    const themeConfig = app.theme_id === 'custom-logo'
        ? {
            id: 'custom-logo',
            name: 'custom logo',
            description: 'Tema personalizado basado en el logo',
            colors: app.theme_config.colors,
            fonts: app.theme_config.fonts,
          }
        : undefined;

    return (
        <ThemeProvider
            initialThemeId={app.theme_id}
            initialTheme={themeConfig}
        >
            <DashboardAppProvider app={app} trainer={trainer}>
                <div style={{ minHeight: '100vh' }}>
                    {/* Header */}
                    <header style={{
                        borderBottom: '1px solid #e1e5e9',
                        padding: '1rem 0',
                        backgroundColor: 'var(--color-background)',
                    }}>
                        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{app.name}</h1>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                            }}>
                                {trainer?.logo_url ? (
                                    <img
                                        src={trainer.logo_url}
                                        alt="Logo"
                                        style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: '2px solid #e1e5e9'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${app.theme_config.colors.primary} 0%, ${app.theme_config.colors.secondary} 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.5rem'
                                    }}>
                                        {trainer?.name?.charAt(0) || app.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Tab Navigation */}
                    <nav style={{ backgroundColor: 'var(--color-background)' }}>
                        <div className="container">
                            <div className="tab-nav">
                                {tabs.map((tab) => (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        className={`tab-link ${isActive(tab.href, tab.exact) ? 'active' : ''}`}
                                    >
                                        {tab.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </nav>

                    {/* Content */}
                    <main className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
                        {children}
                    </main>
                </div>
            </DashboardAppProvider>
        </ThemeProvider>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>}>
            <DashboardContent>{children}</DashboardContent>
        </Suspense>
    );
}
