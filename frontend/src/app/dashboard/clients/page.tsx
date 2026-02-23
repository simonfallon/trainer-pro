"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { clientsApi, locationsApi } from "@/lib/api";
import { useDashboardApp } from "@/hooks/useDashboardApp";
import type { Client, Location } from "@/types";

export default function ClientsPage() {
  const { app } = useDashboardApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const swrKey = `/clients-list-${app.trainer_id}`;
  const { data: clients = [], isLoading } = useSWR<Client[]>(swrKey, () =>
    clientsApi.list(app.trainer_id)
  );

  const { data: locations = [] } = useSWR<Location[]>(`/locations-list-${app.trainer_id}`, () =>
    locationsApi.list(app.trainer_id)
  );

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    birth_date: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    default_location_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Check for "new" query param to auto-open form
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setShowForm(true);
      // Optional: Clean up URL without refreshing
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("new");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      await clientsApi.create({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        birth_date: formData.birth_date || undefined,
        gender: formData.gender || undefined,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : undefined,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
        default_location_id: formData.default_location_id
          ? parseInt(formData.default_location_id)
          : undefined,
      });
      mutate(swrKey);
      setShowForm(false);
      setFormData({
        name: "",
        phone: "",
        email: "",
        notes: "",
        birth_date: "",
        gender: "",
        height_cm: "",
        weight_kg: "",
        default_location_id: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar el cliente");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (clientId: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar a este cliente?")) return;

    try {
      await clientsApi.delete(clientId);
      mutate(swrKey);
    } catch (err) {
      console.error("Failed to delete client:", err);
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "3rem" }}>Cargando clientes...</div>;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">Clientes</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Agregar Cliente
        </button>
      </div>

      {/* Add Client Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Agregar Nuevo Cliente</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="clientName">
                  Nombre *
                </label>
                <input
                  id="clientName"
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre completo del cliente"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="clientPhone">
                  Teléfono *
                </label>
                <input
                  id="clientPhone"
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+57 300 123 4567"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="clientEmail">
                  Correo Electrónico
                </label>
                <input
                  id="clientEmail"
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="clientBirthDate">
                    Fecha de Nacimiento
                  </label>
                  <input
                    id="clientBirthDate"
                    type="date"
                    className="form-input"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="clientGender">
                    Género
                  </label>
                  <select
                    id="clientGender"
                    className="form-select"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="clientHeight">
                    Altura (cm)
                  </label>
                  <input
                    id="clientHeight"
                    type="number"
                    className="form-input"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    placeholder="Ej: 175"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="clientWeight">
                    Peso (kg)
                  </label>
                  <input
                    id="clientWeight"
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                    placeholder="Ej: 70.5"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="clientLocation">
                  Ubicación Predeterminada
                </label>
                <select
                  id="clientLocation"
                  className="form-select"
                  value={formData.default_location_id}
                  onChange={(e) =>
                    setFormData({ ...formData, default_location_id: e.target.value })
                  }
                >
                  <option value="">Ninguna</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="clientNotes">
                  Notas
                </label>
                <textarea
                  id="clientNotes"
                  className="form-textarea"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Cualquier nota relevante sobre este cliente"
                />
              </div>

              {error && <p style={{ color: "#dc3545", marginBottom: "1rem" }}>{error}</p>}

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !formData.name.trim() || !formData.phone.trim()}
                  style={{ flex: 1 }}
                >
                  {submitting ? "Agregando..." : "Agregar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients List */}
      {clients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-text">Aún no hay clientes</div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Agrega tu primer cliente
          </button>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo Electrónico</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...clients]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/dashboard/clients/${client.id}?app_id=${app.id}`)}
                    style={{
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <td style={{ fontWeight: 600 }}>{client.name}</td>
                    <td>{client.phone}</td>
                    <td>{client.email || "-"}</td>
                    <td
                      style={{
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {client.notes || "-"}
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#dc3545",
                          cursor: "pointer",
                          padding: "0.5rem",
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
