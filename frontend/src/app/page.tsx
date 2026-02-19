"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { themes, Theme } from "@/themes";
import { trainersApi, appsApi, uploadsApi, devAuthApi, authApi } from "@/lib/api";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ImageUpload } from "@/components/ImageUpload";
import LogoColorPicker from "@/components/LogoColorPicker";

export default function HomePage() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [appName, setAppName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [themeMode, setThemeMode] = useState<"templates" | "logo">("templates");
  const [customColors, setCustomColors] = useState<{
    primary: string;
    secondary: string;
    background: string;
    text: string;
  } | null>(null);
  const [disciplineType, setDisciplineType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdTrainerId, setCreatedTrainerId] = useState<number | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const isNewUser = searchParams.get("new_user") === "true";

    if (isNewUser) {
      // Retrieve trainer identity from session cookie instead of URL param
      authApi
        .me()
        .then((me) => {
          setCreatedTrainerId(me.trainer_id);
          setStep(2); // Phone collection step
        })
        .catch(() => {
          // Not authenticated — stay on step 1
        });
    }
  }, [searchParams]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !createdTrainerId) return;

    setIsSubmitting(true);
    setError("");

    try {
      let logoUrl: string | undefined = undefined;

      if (logoFile) {
        const uploadResult = await uploadsApi.uploadImage(logoFile);
        logoUrl = uploadResult.url;
        setUploadedLogoUrl(logoUrl); // Store for Step 3
      }

      await trainersApi.update(createdTrainerId, {
        phone: phone.trim(),
        logo_url: logoUrl,
        discipline_type: disciplineType,
      });
      setStep(3); // Move to app creation
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el perfil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!appName.trim() || !createdTrainerId) return;

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
      // Prepare theme data based on mode
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

      const app = await appsApi.create({
        name: appName.trim(),
        theme_id: themeId,
        theme_config: themeConfig,
      });
      // Redirect to dashboard
      window.location.href = `/dashboard?app_id=${app.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la aplicación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevLogin = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await devAuthApi.login();
      if (response.has_app && response.app_id) {
        window.location.href = `/dashboard?app_id=${response.app_id}`;
      } else {
        alert("Dev trainer has no app. Run seed script again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en dev login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemeProvider>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div className="card fade-in" style={{ width: "100%", maxWidth: "600px" }}>
          {/* Progress indicator */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: "4px",
                  borderRadius: "2px",
                  backgroundColor: step >= i ? "var(--color-primary)" : "#e1e5e9",
                }}
              />
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
                Bienvenido a Trainer Pro
              </h1>
              <p style={{ color: "var(--color-secondary)", marginBottom: "2rem" }}>
                Comencemos configurando tu perfil de entrenador
              </p>

              <div style={{ padding: "2rem 0" }}>
                <GoogleSignInButton />

                {process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" && (
                  <>
                    <div
                      style={{
                        margin: "1.5rem 0",
                        textAlign: "center",
                        color: "var(--color-secondary)",
                      }}
                    >
                      — o —
                    </div>

                    {/* Fast Login Section */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "var(--color-secondary)",
                          marginBottom: "0.5rem",
                          textAlign: "center",
                        }}
                      >
                        Acceso Rápido (con datos existentes)
                      </div>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                          onClick={async () => {
                            setIsSubmitting(true);
                            setError("");
                            try {
                              const response = await devAuthApi.loginDiscipline("bmx");
                              if (response.has_app && response.app_id) {
                                window.location.href = `/dashboard?app_id=${response.app_id}`;
                              } else {
                                alert("BMX trainer has no app. Run seed script.");
                              }
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Error en dev login");
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          disabled={isSubmitting}
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                        >
                          🚴 {isSubmitting ? "Cargando..." : "BMX"}
                        </button>
                        <button
                          onClick={async () => {
                            setIsSubmitting(true);
                            setError("");
                            try {
                              const response = await devAuthApi.loginDiscipline("physio");
                              if (response.has_app && response.app_id) {
                                window.location.href = `/dashboard?app_id=${response.app_id}`;
                              } else {
                                alert("Physio trainer has no app. Run seed script.");
                              }
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Error en dev login");
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          disabled={isSubmitting}
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                        >
                          💪 {isSubmitting ? "Cargando..." : "Physio"}
                        </button>
                      </div>
                    </div>

                    {/* Test Onboarding Flow */}
                    <div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "var(--color-secondary)",
                          marginBottom: "0.5rem",
                          textAlign: "center",
                        }}
                      >
                        Probar Flujo Completo (subir logo, seleccionar colores)
                      </div>
                      <button
                        onClick={async () => {
                          setIsSubmitting(true);
                          setError("");
                          try {
                            const response = await devAuthApi.onboarding();
                            setCreatedTrainerId(response.trainer_id);
                            setStep(2); // Go to phone + logo step
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "Error en dev onboarding"
                            );
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={isSubmitting}
                        className="btn"
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          border: "none",
                        }}
                      >
                        🎨 {isSubmitting ? "Cargando..." : "Probar Onboarding Completo"}
                      </button>
                    </div>
                  </>
                )}

                {error && (
                  <p
                    style={{
                      marginTop: "1rem",
                      color: "#dc3545",
                      fontSize: "0.875rem",
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </p>
                )}

                <p
                  style={{
                    marginTop: "1.5rem",
                    fontSize: "0.875rem",
                    color: "var(--color-secondary)",
                    textAlign: "center",
                  }}
                >
                  Al iniciar sesión, aceptas nuestros Términos de Servicio y Política de Privacidad.
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Completa tu Perfil</h1>
              <p style={{ color: "var(--color-secondary)", marginBottom: "2rem" }}>
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
                  <small style={{ color: "var(--color-secondary)", fontSize: "0.875rem" }}>
                    Lo usaremos para notificaciones de WhatsApp
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="disciplineType">
                    Disciplina *
                  </label>
                  <select
                    id="disciplineType"
                    className="form-input"
                    value={disciplineType}
                    onChange={(e) => setDisciplineType(e.target.value)}
                    required
                  >
                    <option value="">Selecciona tu disciplina</option>
                    <option value="bmx">BMX</option>
                    <option value="physio">Fisioterapia / Rehabilitación</option>
                  </select>
                </div>

                <ImageUpload onImageSelected={setLogoFile} label="Logo de tu Marca (Opcional)" />
                <small
                  style={{
                    color: "var(--color-secondary)",
                    fontSize: "0.875rem",
                    display: "block",
                    marginTop: "-0.5rem",
                  }}
                >
                  Sube el logo de tu marca o negocio
                </small>

                {error && <p style={{ color: "#dc3545", marginBottom: "1rem" }}>{error}</p>}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  disabled={isSubmitting || !phone.trim() || !disciplineType}
                >
                  {isSubmitting ? "Guardando..." : "Continuar"}
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Crea tu Aplicación</h1>
              <p style={{ color: "var(--color-secondary)", marginBottom: "2rem" }}>
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

                  {/* Tab Navigation */}
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

                  {/* Templates Mode */}
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

                  {/* Logo Mode */}
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
                          <p>Para crear un tema desde tu logo, sube tu logo en el paso anterior</p>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setStep(2)}
                          >
                            Volver al Paso 2
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {error && <p style={{ color: "#dc3545", marginBottom: "1rem" }}>{error}</p>}

                <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
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
                    disabled={
                      isSubmitting ||
                      !appName.trim() ||
                      (themeMode === "templates" && !selectedTheme) ||
                      (themeMode === "logo" && !customColors)
                    }
                  >
                    {isSubmitting ? "Creando..." : "Crear Aplicación"}
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
