'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api';

interface GoogleSignInButtonProps {
    className?: string;
    text?: string;
}

export function GoogleSignInButton({ className = '', text = 'Iniciar sesión con Google' }: GoogleSignInButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async () => {
        try {
            setIsLoading(true);
            const { url } = await authApi.getGoogleAuthUrl();
            window.location.href = url;
        } catch (error) {
            console.error('Failed to start Google Sign-In:', error);
            alert('No se pudo iniciar sesión con Google. Por favor intenta de nuevo.');
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className={`btn ${className}`}
            style={{
                backgroundColor: '#ffffff',
                color: '#757575',
                border: '1px solid #dadce0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '10px 16px',
                fontSize: '16px',
                fontWeight: 500,
                width: '100%',
                position: 'relative',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
            }}
        >
            {isLoading ? (
                <span>Cargando...</span>
            ) : (
                <>
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        style={{ width: '18px', height: '18px' }}
                    />
                    <span>{text}</span>
                </>
            )}
        </button>
    );
}
