'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { clientsApi, appsApi } from '@/lib/api';
import type { Client, TrainerApp } from '@/types';

function ClientsPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const appId = searchParams.get('app_id');
    const [clients, setClients] = useState<Client[]>([]);
    const [app, setApp] = useState<TrainerApp | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchClients = async (trainerId: string) => {
        const data = await clientsApi.list(trainerId);
        setClients(data);
    };

    useEffect(() => {
        if (!appId) return;

        const loadData = async () => {
            try {
                const appData = await appsApi.get(appId);
                setApp(appData);
                await fetchClients(appData.trainer_id);
            } catch (err) {
                console.error('Failed to load clients:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [appId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!app || !formData.name.trim() || !formData.phone.trim()) return;

        setSubmitting(true);
        setError('');

        try {
            await clientsApi.create({
                trainer_id: app.trainer_id,
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim() || undefined,
                notes: formData.notes.trim() || undefined,
            });

            await fetchClients(app.trainer_id);
            setShowForm(false);
            setFormData({ name: '', phone: '', email: '', notes: '' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al agregar el cliente');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (clientId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar a este cliente?')) return;

        try {
            await clientsApi.delete(clientId);
            setClients(clients.filter(c => c.id !== clientId));
        } catch (err) {
            console.error('Failed to delete client:', err);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando clientes...</div>;
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
                            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="clientName">Nombre *</label>
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
                                <label className="form-label" htmlFor="clientPhone">Teléfono *</label>
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
                                <label className="form-label" htmlFor="clientEmail">Correo Electrónico</label>
                                <input
                                    id="clientEmail"
                                    type="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="cliente@email.com"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="clientNotes">Notas</label>
                                <textarea
                                    id="clientNotes"
                                    className="form-textarea"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Cualquier nota relevante sobre este cliente"
                                />
                            </div>

                            {error && (
                                <p style={{ color: '#dc3545', marginBottom: '1rem' }}>{error}</p>
                            )}

                            <div style={{ display: 'flex', gap: '1rem' }}>
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
                                    {submitting ? 'Agregando...' : 'Agregar Cliente'}
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
                            {clients.map((client) => (
                                <tr
                                    key={client.id}
                                    onClick={() => router.push(`/dashboard/clients/${client.id}?app_id=${appId}`)}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ fontWeight: 600 }}>{client.name}</td>
                                    <td>{client.phone}</td>
                                    <td>{client.email || '-'}</td>
                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {client.notes || '-'}
                                    </td>
                                    <td>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(client.id);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#dc3545',
                                                cursor: 'pointer',
                                                padding: '0.5rem',
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

export default function ClientsPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem' }}>Cargando...</div>}>
            <ClientsPageContent />
        </Suspense>
    );
}
