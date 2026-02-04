'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function AuthCallbackPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const code = searchParams.get('code');
    const [status, setStatus] = useState('Verificando credenciales...');
    const [error, setError] = useState('');
    const processedRef = useRef(false);

    useEffect(() => {
        if (!code || processedRef.current) return;

        processedRef.current = true;

        const exchangeCode = async () => {
            try {
                const result = await authApi.exchangeGoogleCode(code);

                if (result.has_app && result.app_id) {
                    setStatus('¡Éxito! Redirigiendo al panel...');
                    // Redirect to dashboard
                    window.location.href = `/dashboard?app_id=${result.app_id}`;
                } else {
                    setStatus('Cuenta creada. Configurando perfil...');
                    // Redirect to setup (home page with query params or special state)
                    // For now, simpler to redirect to home but we need to signal that we are logged in but incomplete.
                    // Ideally we'd store the trainer ID in a cookie or context.
                    // Since the current app is simple and URL-based, let's pass the trainer_id back to home
                    router.push(`/?trainer_id=${result.trainer_id}&new_user=true`);
                }
            } catch (err) {
                console.error('Auth error:', err);
                setError('Error al iniciar sesión. Por favor intenta de nuevo.');
                setStatus('Falló la autenticación');
            }
        };

        exchangeCode();
    }, [code, router]);

    if (!code) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Código de autorización no encontrado.</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
                {error ? (
                    <>
                        <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Error</h2>
                        <p>{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="btn btn-primary"
                            style={{ marginTop: '1.5rem' }}
                        >
                            Volver al Inicio
                        </button>
                    </>
                ) : (
                    <>
                        <h2 style={{ marginBottom: '1rem' }}>Procesando</h2>
                        <p style={{ color: 'var(--color-secondary)' }}>{status}</p>
                        <div style={{
                            marginTop: '1.5rem',
                            width: '40px',
                            height: '40px',
                            border: '3px solid #e1e5e9',
                            borderTopColor: 'var(--color-primary, #007bff)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <style jsx>{`
                            @keyframes spin {
                                to { transform: rotate(360deg); }
                            }
                        `}</style>
                    </>
                )}
            </div>
        </div>
    );
}
