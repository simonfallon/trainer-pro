'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  getColorAtPixel,
  rgbToHex,
  generateCompleteTheme,
} from '@/lib/colorUtils';

interface LogoColorPickerProps {
  logoUrl: string;
  onColorsSelected: (colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  }) => void;
  onColorsCleared?: () => void;
  onCancel: () => void;
}

export default function LogoColorPicker({
  logoUrl,
  onColorsSelected,
  onColorsCleared,
  onCancel,
}: LogoColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Validate minimum size
      if (img.width < 50 || img.height < 50) {
        setError('El logo es demasiado pequeño. Usa una imagen de al menos 50x50 píxeles.');
        return;
      }

      // Set canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image
      ctx.drawImage(img, 0, 0);

      imageRef.current = img;
      setImageLoaded(true);
      setError(null);
    };

    img.onerror = () => {
      setError('Error al cargar el logo. Por favor intenta de nuevo.');
    };

    img.src = logoUrl;
  }, [logoUrl]);

  // Handle canvas click to extract color
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);

    const rgb = getColorAtPixel(canvas, x, y);
    if (rgb) {
      const hexColor = rgbToHex(rgb.r, rgb.g, rgb.b);
      setSelectedColor(hexColor);

      // Immediately set colors in parent - no confirmation needed
      const completeTheme = generateCompleteTheme(hexColor);
      onColorsSelected(completeTheme);
    }
  };

  // Generate derived colors for preview
  const derivedColors = selectedColor
    ? generateCompleteTheme(selectedColor)
    : null;

  // Handle reset
  const handleReset = () => {
    setSelectedColor(null);
    // Notify parent to clear colors
    if (onColorsCleared) {
      onColorsCleared();
    }
  };

  return (
    <div className="logo-picker-container">
      {/* Instructions */}
      <div className="picker-instructions">
        {!selectedColor
          ? 'Haz clic en tu logo para seleccionar el color principal de tu marca'
          : '✓ Color seleccionado. Haz clic en otro punto para cambiar o presiona "Crear Aplicación"'}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee',
          border: '2px solid #fcc',
          borderRadius: '8px',
          color: '#c00',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Canvas for logo */}
      {!error && (
        <div style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="logo-canvas"
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* Color previews */}
      {selectedColor && derivedColors && (
        <div>
          <h4 style={{
            textAlign: 'center',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            color: '#64748b'
          }}>
            Vista Previa de Colores
          </h4>

          <div className="color-preview-row">
            <div className="color-preview-item">
              <div
                className="color-circle selected"
                style={{ backgroundColor: derivedColors.primary }}
              />
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Principal
              </div>
              <div style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                marginTop: '0.25rem'
              }}>
                {derivedColors.primary}
              </div>
            </div>

            <div className="color-preview-item">
              <div
                className="color-circle selected"
                style={{ backgroundColor: derivedColors.secondary }}
              />
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Secundario
              </div>
              <div style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                marginTop: '0.25rem'
              }}>
                {derivedColors.secondary}
              </div>
            </div>
          </div>

          {/* Theme preview card */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            borderRadius: '8px',
            background: derivedColors.background,
            border: `2px solid ${derivedColors.primary}`,
          }}>
            <h5 style={{
              color: derivedColors.primary,
              margin: '0 0 0.5rem 0',
              fontSize: '1rem'
            }}>
              Vista Previa del Tema
            </h5>
            <p style={{
              color: derivedColors.text,
              margin: '0 0 1rem 0',
              fontSize: '0.875rem'
            }}>
              Este es un ejemplo de cómo se verá tu aplicación con estos colores.
            </p>
            <button
              type="button"
              style={{
                background: derivedColors.primary,
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}
            >
              Botón de Ejemplo
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="picker-actions">
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: '2px solid #e1e5e9',
            background: '#fff',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
          }}
        >
          Cancelar
        </button>

        {selectedColor && (
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: '2px solid #64748b',
              background: '#fff',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            Cambiar Color
          </button>
        )}
      </div>
    </div>
  );
}
