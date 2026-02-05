'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { themes, Theme } from '@/themes';
import { trainersApi, appsApi, uploadsApi, devAuthApi } from '@/lib/api';
import { ThemeProvider } from '@/components/ThemeProvider';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { ImageUpload } from '@/components/ImageUpload';

export default function HomePage() {
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [appName, setAppName] = useState('');
    const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [createdTrainerId, setCreatedTrainerId] = useState<number | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const trainerId = searchParams.get('trainer_id');
        const isNewUser = searchParams.get('new_user') === 'true';

        if (trainerId && isNewUser) {
            setCreatedTrainerId(Number(trainerId));
            setStep(2); // Phone collection step
        }
    }, [searchParams]);

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone.trim() || !createdTrainerId) return;

        setIsSubmitting(true);
        setError('');

        try {
            let logoUrl: string | undefined = undefined;

            if (logoFile) {
                const uploadResult = await uploadsApi.uploadImage(logoFile);
                logoUrl = uploadResult.url;
            }

            await trainersApi.update(createdTrainerId, {
                phone: phone.trim(),
                logo_url: logoUrl
            });
            setStep(3); // Move to app creation
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar el perfil');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAppSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appName.trim() || !selectedTheme || !createdTrainerId) return;

        setIsSubmitting(true);
        setError('');

        try {
            const app = await appsApi.create({
                trainer_id: createdTrainerId,
                name: appName.trim(),
                theme_id: selectedTheme.id,
                theme_config: {
                    colors: selectedTheme.colors,
                    fonts: selectedTheme.fonts,
                },
            });
            // Redirect to dashboard
            window.location.href = `/dashboard?app_id=${app.id}`;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear la aplicación');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDevLogin = async () => {
        setIsSubmitting(true);
        setError('');

        try {
            const response = await devAuthApi.login();
            if (response.has_app && response.app_id) {
                window.location.href = `/dashboard?app_id=${response.app_id}`;
            } else {
                alert('Dev trainer has no app. Run seed script again.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error en dev login');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ThemeProvider>
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div className="card fade-in" style={{ width: '100%', maxWidth: '600px' }}>
                    {/* Progress indicator */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} style={{
                                flex: 1,
                                height: '4px',
                                borderRadius: '2px',
                                backgroundColor: step >= i ? 'var(--color-primary)' : '#e1e5e9',
                            }} />
                        ))}
                    </div>

                    {step === 1 && (
                        <>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Bienvenido a Trainer Pro</h1>
                            <p style={{ color: 'var(--color-secondary)', marginBottom: '2rem' }}>
                                Comencemos configurando tu perfil de entrenador
                            </p>

                            <div style={{ padding: '2rem 0' }}>
                                <GoogleSignInButton />

                                {process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true' && (
                                    <>
                                        <div style={{ margin: '1rem 0', textAlign: 'center', color: 'var(--color-secondary)' }}>
                                            — o —
                                        </div>
                                        <button
                                            onClick={handleDevLogin}
                                            disabled={isSubmitting}
                                            className="btn btn-secondary"
                                            style={{ width: '100%' }}
                                        >
                                            🔧 {isSubmitting ? 'Cargando...' : 'Dev Login (Testing)'}
                                        </button>
                                    </>
                                )}

                                {error && (
                                    <p style={{ marginTop: '1rem', color: '#dc3545', fontSize: '0.875rem', textAlign: 'center' }}>
                                        {error}
                                    </p>
                                )}

                                <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-secondary)', textAlign: 'center' }}>
                                    Al iniciar sesión, aceptas nuestros Términos de Servicio y Política de Privacidad.
                                </p>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Completa tu Perfil</h1>
                            <p style={{ color: 'var(--color-secondary)', marginBottom: '2rem' }}>
                                Necesitamos algunos datos adicionales para configurar tu cuenta
                            </p>

                            <form onSubmit={handlePhoneSubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="phone">
                                        Número de Teléfono *
                                    </label>
                                    <input
                                        id="phone"
                                        type="tel"
                                        className="form-input"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+57 300 123 4567"
                                        required
                                    />
                                    <small style={{ color: 'var(--color-secondary)', fontSize: '0.875rem' }}>
                                        Lo usaremos para notificaciones de WhatsApp
                                    </small>
                                </div>

                                <ImageUpload
                                    onImageSelected={setLogoFile}
                                    label="Logo de tu Marca (Opcional)"
                                />
                                <small style={{ color: 'var(--color-secondary)', fontSize: '0.875rem', display: 'block', marginTop: '-0.5rem' }}>
                                    Sube el logo de tu marca o negocio
                                </small>

                                {error && (
                                    <p style={{ color: '#dc3545', marginBottom: '1rem' }}>{error}</p>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={isSubmitting || !phone.trim()}
                                >
                                    {isSubmitting ? 'Guardando...' : 'Continuar'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Crea tu Aplicación</h1>
                            <p style={{ color: 'var(--color-secondary)', marginBottom: '2rem' }}>
                                Nombra tu aplicación y elige un tema que represente tu marca
                            </p>

                            <form onSubmit={handleAppSubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="appName">
                                        Nombre de la Aplicación *
                                    </label>
                                    <input
                                        id="appName"
                                        type="text"
                                        className="form-input"
                                        value={appName}
                                        onChange={(e) => setAppName(e.target.value)}
                                        placeholder="ej. FitPro Entrenamiento, Academia BMX"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Elige un Tema *</label>
                                    <div className="theme-grid">
                                        {themes.map((theme) => (
                                            <div
                                                key={theme.id}
                                                className={`theme-card ${selectedTheme?.id === theme.id ? 'selected' : ''}`}
                                                onClick={() => setSelectedTheme(theme)}
                                            >
                                                <div className="theme-preview">
                                                    <div
                                                        className="theme-preview-primary"
                                                        style={{ backgroundColor: theme.colors.primary }}
                                                    />
                                                    <div
                                                        className="theme-preview-secondary"
                                                        style={{ backgroundColor: theme.colors.secondary }}
                                                    />
                                                </div>
                                                <div className="theme-name">{theme.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <p style={{ color: '#dc3545', marginBottom: '1rem' }}>{error}</p>
                                )}

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setStep(2)}
                                        style={{ flex: 1 }}
                                    >
                                        Volver
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                        disabled={isSubmitting || !appName.trim() || !selectedTheme}
                                    >
                                        {isSubmitting ? 'Creando...' : 'Crear Aplicación'}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </ThemeProvider>
    );
}
