'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { clientsApi, sessionsApi } from '@/lib/api';
import type { Client, TrainingSession, PaymentBalance } from '@/types';

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const clientId = params.id as string;
    const appId = searchParams.get('app_id');

    // Fetch client data
    const { data: client, error: clientError, isLoading: clientLoading } = useSWR<Client>(
        `/clients/${clientId}`,
        () => clientsApi.get(clientId)
    );

    // Fetch client sessions
    const { data: sessions, isLoading: sessionsLoading } = useSWR<TrainingSession[]>(
        `/clients/${clientId}/sessions`,
        () => clientsApi.getSessions(clientId)
    );

    // Fetch payment balance
    const { data: balance } = useSWR<PaymentBalance>(
        `/clients/${clientId}/payment-balance`,
        () => clientsApi.getPaymentBalance(clientId)
    );

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);

    const handleTogglePayment = async (sessionId: string) => {
        try {
            await sessionsApi.togglePayment(sessionId);
            // Revalidate both sessions and balance
            mutate(`/clients/${clientId}/sessions`);
            mutate(`/clients/${clientId}/payment-balance`);
        } catch (error) {
            console.error('Error toggling payment:', error);
            alert('Error al actualizar el estado de pago');
        }
    };

    const handleDeleteClient = async () => {
        if (!confirm(`¿Estás seguro de eliminar a ${client?.name}?`)) return;

        try {
            await clientsApi.delete(clientId);
            router.push(`/dashboard/clients?app_id=${appId}`);
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Error al eliminar el cliente');
        }
    };

    if (clientLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Cargando...</div>
            </div>
        );
    }

    if (clientError || !client) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Error al cargar el cliente</div>
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
                >
                    ← Volver
                </button>
                <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            </div>

            {/* Profile Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Profile Card */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            {client.photo_url ? (
                                <img src={client.photo_url} alt={client.name} className="w-24 h-24 rounded-full object-cover" />
                            ) : (
                                <span className="text-4xl text-gray-400">👤</span>
                            )}
                        </div>
                        <h2 className="text-xl font-semibold mb-2">{client.name}</h2>
                        <p className="text-gray-600">{client.phone}</p>
                        {client.email && <p className="text-gray-600">{client.email}</p>}
                    </div>
                </div>

                {/* Personal Info Card */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Información Personal</h3>
                    <div className="space-y-2">
                        {client.age && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Edad:</span>
                                <span className="font-medium">{client.age} años</span>
                            </div>
                        )}
                        {client.gender && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Género:</span>
                                <span className="font-medium">{client.gender}</span>
                            </div>
                        )}
                        {client.height_cm && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Altura:</span>
                                <span className="font-medium">{client.height_cm} cm</span>
                            </div>
                        )}
                        {client.weight_kg && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Peso:</span>
                                <span className="font-medium">{client.weight_kg} kg</span>
                            </div>
                        )}
                    </div>
                    {client.notes && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-gray-600">{client.notes}</p>
                        </div>
                    )}
                </div>

                {/* Payment Balance Card */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Estado de Pagos</h3>
                    {balance ? (
                        <div className="space-y-3">
                            <div className={`p-3 rounded-lg ${balance.has_positive_balance ? 'bg-green-50' : balance.unpaid_sessions > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                                {balance.has_positive_balance ? (
                                    <p className="text-green-700 font-medium">
                                        {balance.prepaid_sessions} sesiones prepagadas
                                    </p>
                                ) : balance.unpaid_sessions > 0 ? (
                                    <p className="text-red-700 font-medium">
                                        {balance.unpaid_sessions} sesiones pendientes de pago
                                    </p>
                                ) : (
                                    <p className="text-gray-700 font-medium">
                                        Todos los pagos al día
                                    </p>
                                )}
                            </div>
                            <div className="text-sm text-gray-600">
                                <p>Total sesiones: {balance.total_sessions}</p>
                                <p>Pagadas: {balance.paid_sessions}</p>
                            </div>
                            <button
                                onClick={() => setShowPaymentModal(true)}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                            >
                                Registrar Pagos
                            </button>
                        </div>
                    ) : (
                        <p className="text-gray-500">Cargando...</p>
                    )}
                </div>
            </div>

            {/* Sessions Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Sesiones de Entrenamiento</h3>
                </div>
                <div className="overflow-x-auto">
                    {sessionsLoading ? (
                        <div className="p-6 text-center">Cargando sesiones...</div>
                    ) : sessions && sessions.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Duración
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Pagado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(session.scheduled_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {session.status === 'completed' ? 'Completada' :
                                                    session.status === 'scheduled' ? 'Programada' :
                                                        'Cancelada'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {session.duration_minutes} min
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleTogglePayment(session.id)}
                                                className={`text-2xl ${session.is_paid ? 'text-green-600' : 'text-red-600'} hover:opacity-70`}
                                                title={session.is_paid ? 'Marcar como no pagado' : 'Marcar como pagado'}
                                            >
                                                {session.is_paid ? '✓' : '✗'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => {
                                                    setSelectedSession(session);
                                                    setShowSessionModal(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                Más Info
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            No hay sesiones registradas
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 flex-wrap">
                <button
                    onClick={() => router.push(`/dashboard/calendar?app_id=${appId}&client=${clientId}`)}
                    className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition"
                >
                    Ver Calendario
                </button>
                <button
                    onClick={handleDeleteClient}
                    className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition"
                >
                    Eliminar Cliente
                </button>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <PaymentModal
                    clientId={clientId}
                    clientName={client.name}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={() => {
                        mutate(`/clients/${clientId}/payment-balance`);
                        mutate(`/clients/${clientId}/sessions`);
                        setShowPaymentModal(false);
                    }}
                />
            )}

            {/* Session Detail Modal */}
            {showSessionModal && selectedSession && (
                <SessionDetailModal
                    session={selectedSession}
                    onClose={() => {
                        setShowSessionModal(false);
                        setSelectedSession(null);
                    }}
                    onUpdate={() => {
                        mutate(`/clients/${clientId}/sessions`);
                    }}
                />
            )}
        </div>
    );
}

// Payment Modal Component
function PaymentModal({ clientId, clientName, onClose, onSuccess }: {
    clientId: string;
    clientName: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [sessionsPaid, setSessionsPaid] = useState(1);
    const [amountPerSession, setAmountPerSession] = useState(50000);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const totalAmount = sessionsPaid * amountPerSession;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await clientsApi.registerPayment(clientId, {
                sessions_paid: sessionsPaid,
                amount_cop: totalAmount,
                notes: notes || undefined,
            });
            onSuccess();
        } catch (error) {
            console.error('Error registering payment:', error);
            alert('Error al registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Registrar Pago - {clientName}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número de sesiones
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={sessionsPaid}
                            onChange={(e) => setSessionsPaid(parseInt(e.target.value) || 1)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valor por sesión (COP)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1000"
                            value={amountPerSession}
                            onChange={(e) => setAmountPerSession(parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            required
                        />
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-lg font-semibold text-blue-900">
                            Total: ${totalAmount.toLocaleString('es-CO')} COP
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notas (opcional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            rows={2}
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Registrar Pago'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Session Detail Modal Component
function SessionDetailModal({ session, onClose, onUpdate }: {
    session: TrainingSession;
    onClose: () => void;
    onUpdate: () => void;
}) {
    const [sessionDoc, setSessionDoc] = useState(session.session_doc || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await sessionsApi.update(session.id, { session_doc: sessionDoc });
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating session:', error);
            alert('Error al actualizar la sesión');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Detalles de la Sesión</h2>

                <div className="space-y-4 mb-6">
                    <div>
                        <span className="text-gray-600">Fecha:</span>
                        <span className="ml-2 font-medium">{formatDate(session.scheduled_at)}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Duración:</span>
                        <span className="ml-2 font-medium">{session.duration_minutes} minutos</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Estado:</span>
                        <span className="ml-2 font-medium capitalize">{session.status}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Pagado:</span>
                        <span className="ml-2 font-medium">{session.is_paid ? 'Sí' : 'No'}</span>
                    </div>
                    {session.notes && (
                        <div>
                            <span className="text-gray-600">Notas:</span>
                            <p className="mt-1 text-sm">{session.notes}</p>
                        </div>
                    )}
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Documentación de la Sesión
                    </label>
                    <textarea
                        value={sessionDoc}
                        onChange={(e) => setSessionDoc(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        rows={6}
                        placeholder="Ej: Ejercicios realizados, observaciones, progreso..."
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
