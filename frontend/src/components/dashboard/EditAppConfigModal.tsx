"use client";

import { useState } from "react";
import { themes, Theme } from "@/themes";
import { appsApi, trainersApi, uploadsApi } from "@/lib/api";
import { ImageUpload } from "@/components/ImageUpload";
import LogoColorPicker from "@/components/LogoColorPicker";
import type { TrainerApp, Trainer } from "@/types";

interface EditAppConfigModalProps {
  app: TrainerApp;
  trainer: Trainer;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditAppConfigModal({ app, trainer, onClose, onSuccess }: EditAppConfigModalProps) {
  const [appName, setAppName] = useState(app.name);
  const [phone, setPhone] = useState(trainer.phone);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(trainer.logo_url);

  // Theme options
  const [themeMode, setThemeMode] = useState<"templates" | "logo">(
    app.theme_id === "custom-logo" ? "logo" : "templates"
  );
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(
    app.theme_id !== "custom-logo" ? themes.find((t) => t.id === app.theme_id) || themes[0] : null
  );
  const [customColors, setCustomColors] = useState<{
    primary: string;
    secondary: string;
    background: string;
    text: string;
  } | null>(app.theme_id === "custom-logo" ? app.theme_config.colors : null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appName.trim()) return;

    if (themeMode === "templates" && !selectedTheme) {
      setError("Por favor selecciona un tema");
      return;
    }

    if (themeMode === "logo" && !customColors) {
      setError("Por favor selecciona los colores de tu logo");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let finalLogoUrl = uploadedLogoUrl;

      // Handle logo upload if a new file was selected
      if (logoFile) {
        const uploadResult = await uploadsApi.uploadImage(logoFile);
        finalLogoUrl = uploadResult.url;
        setUploadedLogoUrl(finalLogoUrl);
      }

      // Prepare theme data
      const themeId = themeMode === "logo" ? "custom-logo" : selectedTheme!.id;
      const themeConfig =
        themeMode === "logo"
          ? {
              colors: customColors!,
              fonts: {
                heading: "DejaVu Sans Bold, sans-serif",
                body: "DejaVu Sans, sans-serif",
              },
            }
          : {
              colors: selectedTheme!.colors,
              fonts: selectedTheme!.fonts,
            };

      // Update backend data
      await Promise.all([
        trainersApi.update(trainer.id, {
          phone: phone.trim(),
          logo_url: finalLogoUrl || undefined,
        }),
        appsApi.update(app.id, {
          name: appName.trim(),
          theme_id: themeId,
          theme_config: themeConfig,
        }),
      ]);

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la configuración");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px", width: "95%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header">
          <h3 className="modal-title">Editar Configuración</h3>
          <button className="modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <p style={{ color: "var(--color-secondary)", marginBottom: "1.5rem" }}>
          Modifica los detalles de tu aplicación y perfil
        </p>

        <form onSubmit={handleSubmit}>
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
              required
            />
          </div>

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
              required
            />
          </div>

          <div className="form-group">
            <ImageUpload
              onImageSelected={setLogoFile}
              label="Logo de tu Marca"
              currentImage={!logoFile && uploadedLogoUrl ? uploadedLogoUrl : undefined}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tema de la Aplicación *</label>

            <div className="tab-nav" style={{ marginBottom: "1.5rem" }}>
              <button
                type="button"
                className={`tab-link ${themeMode === "templates" ? "active" : ""}`}
                onClick={() => setThemeMode("templates")}
              >
                Temas Predefinidos
              </button>
              <button
                type="button"
                className={`tab-link ${themeMode === "logo" ? "active" : ""}`}
                onClick={() => setThemeMode("logo")}
                disabled={!logoFile && !uploadedLogoUrl}
              >
                Crear desde Logo
              </button>
            </div>

            {themeMode === "templates" && (
              <div className="theme-grid">
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    className={`theme-card ${selectedTheme?.id === theme.id ? "selected" : ""}`}
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
            )}

            {themeMode === "logo" && (
              <>
                {logoFile || uploadedLogoUrl ? (
                  <LogoColorPicker
                    logoUrl={logoFile ? URL.createObjectURL(logoFile) : uploadedLogoUrl!}
                    onColorsSelected={(colors) => setCustomColors(colors)}
                    onColorsCleared={() => setCustomColors(null)}
                    onCancel={() => setThemeMode("templates")}
                  />
                ) : (
                  <div className="empty-state">
                    <p>Sube un logo primero para extraer sus colores</p>
                  </div>
                )}
              </>
            )}
          </div>

          {error && <p style={{ color: "#dc3545", marginBottom: "1rem" }}>{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                isSubmitting ||
                !appName.trim() ||
                !phone.trim() ||
                (themeMode === "templates" && !selectedTheme) ||
                (themeMode === "logo" && !customColors)
              }
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
