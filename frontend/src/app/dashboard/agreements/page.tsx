'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDataRefresh } from '@/lib/data-refresh-context';
import { agreementsApi, tenantsApi, propertiesApi } from '@/lib/api';

interface Agreement {
    id: string;
    agreementNumber: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    lockInPeriodMonths: number;
    noticePeriodDays: number;
    jurisdiction: string;
    tenant: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
            email: string;
        };
    };
    room: {
        id: string;
        roomNumber: string;
        property: {
            id: string;
            name: string;
            address: string;
            city: string;
            state: string;
        };
    };
}

interface Property {
    id: string;
    name: string;
    rooms: { id: string; roomNumber: string; status: string; currentTenantId?: string }[];
}

interface Tenant {
    id: string;
    status: string;
    user: { firstName: string; lastName: string; };
}

export default function AgreementsPage() {
    const { user } = useAuth();
    const { triggerRefresh } = useDataRefresh();
    const [agreements, setAgreements] = useState<Agreement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [properties, setProperties] = useState<Property[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        roomId: '',
        tenantId: '',
        startDate: '',
        endDate: '',
        monthlyRent: '',
        securityDeposit: '',
        maintenanceCharge: '',
        lockInPeriodMonths: 6,
        noticePeriodDays: 30,
        rentEscalation: '5',
        jurisdiction: '',
    });

    useEffect(() => {
        // Wait for user to be loaded before making API calls
        if (!user) return;

        loadAgreements();
        if (user.role === 'OWNER') {
            loadProperties();
            loadTenants();
        }
    }, [user]);

    // Refresh data when window gains focus
    useEffect(() => {
        const handleFocus = () => {
            if (!user) return;
            loadAgreements();
            if (user.role === 'OWNER') {
                loadProperties();
                loadTenants();
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user]);

    const loadAgreements = async () => {
        try {
            setIsLoading(true);
            const data = await agreementsApi.getAll();
            setAgreements(data as unknown as Agreement[]);
        } catch (err) {
            console.error('Failed to load agreements:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadProperties = async () => {
        try {
            const data = await propertiesApi.getAll();
            setProperties(data as unknown as Property[]);
        } catch (err) {
            console.error('Failed to load properties:', err);
        }
    };

    const loadTenants = async () => {
        try {
            const data = await tenantsApi.getAll();
            setTenants((data as unknown as Tenant[]).filter((t: Tenant) => t.status === 'APPROVED'));
        } catch (err) {
            console.error('Failed to load tenants:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await agreementsApi.create({
                ...formData,
                monthlyRent: parseFloat(formData.monthlyRent),
                securityDeposit: parseFloat(formData.securityDeposit),
                maintenanceCharge: formData.maintenanceCharge ? parseFloat(formData.maintenanceCharge) : undefined,
                rentEscalation: formData.rentEscalation ? parseFloat(formData.rentEscalation) : undefined,
            });
            setShowModal(false);
            setFormData({
                roomId: '',
                tenantId: '',
                startDate: '',
                endDate: '',
                monthlyRent: '',
                securityDeposit: '',
                maintenanceCharge: '',
                lockInPeriodMonths: 6,
                noticePeriodDays: 30,
                rentEscalation: '5',
                jurisdiction: '',
            });
            loadAgreements();
            triggerRefresh(); // Notify other pages that data has changed
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create agreement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownload = async (id: string, agreementNumber: string) => {
        try {
            const blob = await agreementsApi.download(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${agreementNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Failed to download agreement:', err);
            alert('Failed to download agreement PDF');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return '#6b7280';
            case 'PENDING_SIGNATURE': return '#f59e0b';
            case 'ACTIVE': return '#22c55e';
            case 'EXPIRED': return '#ef4444';
            case 'TERMINATED': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // Check if agreement can be modified (only DRAFT or PENDING_SIGNATURE)
    const isModifiable = (status: string) => {
        return status === 'DRAFT' || status === 'PENDING_SIGNATURE';
    };

    const handleDelete = async (id: string, agreementNumber: string) => {
        if (!confirm(`Are you sure you want to delete agreement ${agreementNumber}? This action cannot be undone.`)) {
            return;
        }
        try {
            await agreementsApi.delete(id);
            loadAgreements();
            triggerRefresh(); // Notify other pages that data has changed
        } catch (err) {
            console.error('Failed to delete agreement:', err);
            alert(err instanceof Error ? err.message : 'Failed to delete agreement');
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await agreementsApi.updateStatus(id, newStatus);
            loadAgreements();
            triggerRefresh(); // Notify other pages that data has changed
        } catch (err) {
            console.error('Failed to update status:', err);
            alert(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    const availableRooms = properties.flatMap(p =>
        p.rooms.filter(r => r.status === 'AVAILABLE' || r.currentTenantId).map(r => ({
            ...r,
            propertyName: p.name,
            propertyId: p.id,
        }))
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Rent Agreements</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        {user?.role === 'OWNER' ? 'Generate and manage legally-compliant rent agreements' : 'View your rental agreements'}
                    </p>
                </div>
                {user?.role === 'OWNER' && (
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        📄 Generate Agreement
                    </button>
                )}
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Loading agreements...</p>
                </div>
            ) : agreements.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</p>
                    <h3 style={{ marginBottom: '0.5rem' }}>No agreements yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                        {user?.role === 'OWNER' ? 'Generate your first rent agreement' : 'No agreements found for your profile'}
                    </p>
                    {user?.role === 'OWNER' && (
                        <button className="btn-primary" onClick={() => setShowModal(true)}>📄 Generate Agreement</button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {agreements.map((agreement) => (
                        <div key={agreement.id} className="glass-card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                                            {agreement.agreementNumber}
                                        </h3>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: '500',
                                            background: `${getStatusColor(agreement.status)}20`,
                                            color: getStatusColor(agreement.status),
                                            border: `1px solid ${getStatusColor(agreement.status)}30`,
                                        }}>
                                            {agreement.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Property</p>
                                            <p style={{ fontWeight: '500' }}>{agreement.room.property.name}</p>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                                Room {agreement.room.roomNumber}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Tenant</p>
                                            <p style={{ fontWeight: '500' }}>
                                                {agreement.tenant.user.firstName} {agreement.tenant.user.lastName}
                                            </p>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                                {agreement.tenant.user.email}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Duration</p>
                                            <p style={{ fontWeight: '500' }}>
                                                {formatDate(agreement.startDate)} - {formatDate(agreement.endDate)}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Monthly Rent</p>
                                            <p style={{ fontWeight: '600', color: 'var(--color-primary)', fontSize: '1.125rem' }}>
                                                ₹{agreement.monthlyRent.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Security Deposit</p>
                                            <p style={{ fontWeight: '500' }}>₹{agreement.securityDeposit.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Lock-in / Notice</p>
                                            <p style={{ fontWeight: '500' }}>{agreement.lockInPeriodMonths} months / {agreement.noticePeriodDays} days</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <button
                                        onClick={() => handleDownload(agreement.id, agreement.agreementNumber)}
                                        className="btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
                                    >
                                        ⬇️ Download PDF
                                    </button>

                                    {/* Action buttons for modifiable agreements (DRAFT/PENDING_SIGNATURE) */}
                                    {user?.role === 'OWNER' && isModifiable(agreement.status) && (
                                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                            {agreement.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleStatusChange(agreement.id, 'PENDING_SIGNATURE')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '0.5rem',
                                                        background: 'rgba(245, 158, 11, 0.2)',
                                                        color: '#f59e0b',
                                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                    }}
                                                    title="Send to tenant for signature"
                                                >
                                                    📤 Send for Signature
                                                </button>
                                            )}
                                            {agreement.status === 'PENDING_SIGNATURE' && (
                                                <button
                                                    onClick={() => handleStatusChange(agreement.id, 'ACTIVE')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '0.5rem',
                                                        background: 'rgba(34, 197, 94, 0.2)',
                                                        color: '#22c55e',
                                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                    }}
                                                    title="Mark as signed by both parties"
                                                >
                                                    ✅ Activate Agreement
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(agreement.id, agreement.agreementNumber)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.5rem',
                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                    color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem',
                                                }}
                                                title="Delete this agreement"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    )}

                                    {/* Status indicator for locked agreements */}
                                    {!isModifiable(agreement.status) && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--color-text-secondary)',
                                            fontStyle: 'italic',
                                        }}>
                                            🔒 This agreement is locked and cannot be modified
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Generate Agreement Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem',
                }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                            📄 Generate Rent Agreement
                        </h2>
                        <form onSubmit={handleSubmit}>
                            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label className="label">Room *</label>
                                    <select
                                        value={formData.roomId}
                                        onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                                        className="input"
                                        required
                                    >
                                        <option value="">Select Room</option>
                                        {availableRooms.map((room) => (
                                            <option key={room.id} value={room.id}>
                                                {room.propertyName} - Room {room.roomNumber}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Tenant *</label>
                                    <select
                                        value={formData.tenantId}
                                        onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                                        className="input"
                                        required
                                    >
                                        <option value="">Select Tenant</option>
                                        {tenants.map((tenant) => (
                                            <option key={tenant.id} value={tenant.id}>
                                                {tenant.user.firstName} {tenant.user.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label className="label">Start Date *</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">End Date *</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label className="label">Monthly Rent (₹) *</label>
                                    <input
                                        type="number"
                                        value={formData.monthlyRent}
                                        onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                                        className="input"
                                        placeholder="15000"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Security Deposit (₹) *</label>
                                    <input
                                        type="number"
                                        value={formData.securityDeposit}
                                        onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                                        className="input"
                                        placeholder="30000"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Maintenance (₹)</label>
                                    <input
                                        type="number"
                                        value={formData.maintenanceCharge}
                                        onChange={(e) => setFormData({ ...formData, maintenanceCharge: e.target.value })}
                                        className="input"
                                        placeholder="2000"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label className="label">Lock-in Period (months)</label>
                                    <input
                                        type="number"
                                        value={formData.lockInPeriodMonths}
                                        onChange={(e) => setFormData({ ...formData, lockInPeriodMonths: parseInt(e.target.value) || 0 })}
                                        className="input"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="label">Notice Period (days)</label>
                                    <input
                                        type="number"
                                        value={formData.noticePeriodDays}
                                        onChange={(e) => setFormData({ ...formData, noticePeriodDays: parseInt(e.target.value) || 0 })}
                                        className="input"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="label">Annual Escalation (%)</label>
                                    <input
                                        type="number"
                                        value={formData.rentEscalation}
                                        onChange={(e) => setFormData({ ...formData, rentEscalation: e.target.value })}
                                        className="input"
                                        placeholder="5"
                                        step="0.5"
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="label">Jurisdiction (City/District) *</label>
                                <input
                                    type="text"
                                    value={formData.jurisdiction}
                                    onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                                    className="input"
                                    placeholder="Bengaluru, Karnataka"
                                    required
                                />
                            </div>

                            <div style={{
                                padding: '1rem',
                                background: 'rgba(251, 191, 36, 0.1)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                borderRadius: '0.5rem',
                                marginBottom: '1.5rem',
                            }}>
                                <p style={{ fontSize: '0.875rem', color: '#fbbf24' }}>
                                    ⚠️ This will generate a legally-formatted rent agreement PDF with all Indian law compliances.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                                    {isSubmitting ? 'Generating...' : '📄 Generate Agreement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
