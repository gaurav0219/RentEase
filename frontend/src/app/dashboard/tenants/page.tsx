'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDataRefresh } from '@/lib/data-refresh-context';
import { tenantsApi } from '@/lib/api';

interface Tenant {
    id: string;
    status: string;
    fatherName?: string;
    profession?: string;
    numberOfOccupants: number;
    createdAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        isActive?: boolean;
    };
    documents: {
        id: string;
        type: string;
        isVerified: boolean;
    }[];
    currentRoom?: {
        id: string;
        roomNumber: string;
        property: {
            id: string;
            name: string;
        };
    };
}

export default function TenantsPage() {
    const { user } = useAuth();
    const { refreshKey, triggerRefresh } = useDataRefresh();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        loadTenants();
    }, [refreshKey]);

    // Refresh data when window gains focus
    useEffect(() => {
        const handleFocus = () => loadTenants();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const loadTenants = async () => {
        try {
            setIsLoading(true);
            const data = await tenantsApi.getAll();
            setTenants(data as unknown as Tenant[]);
        } catch (err) {
            setError('Failed to load tenants');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (tenantId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
        try {
            await tenantsApi.approve(tenantId, { status, rejectionReason: reason });
            loadTenants();
            triggerRefresh(); // Notify other pages that data has changed
        } catch (err) {
            console.error('Failed to update tenant status:', err);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3);',
            APPROVED: 'background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3);',
            ACTIVE: 'background: rgba(99, 102, 241, 0.2); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.3);',
            REJECTED: 'background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);',
            INACTIVE: 'background: rgba(107, 114, 128, 0.2); color: #6b7280; border: 1px solid rgba(107, 114, 128, 0.3);',
        };
        return styles[status] || styles.INACTIVE;
    };

    const filteredTenants = filter === 'all'
        ? tenants
        : tenants.filter(t => t.status === filter);

    if (user?.role !== 'OWNER') {
        return (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Access Denied</h2>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    Only property owners can access this page.
                </p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Tenants</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Manage tenant applications and profiles</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {['all', 'PENDING', 'APPROVED', 'ACTIVE', 'REJECTED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: filter === status ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                            color: filter === status ? 'white' : 'var(--color-text-secondary)',
                        }}
                    >
                        {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                        {status !== 'all' && (
                            <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                                ({tenants.filter(t => t.status === status).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {error && (
                <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>
            )}

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Loading tenants...</p>
                </div>
            ) : filteredTenants.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem' }}>
                        {filter === 'all' ? 'No tenants found' : `No ${filter.toLowerCase()} tenants`}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredTenants.map((tenant) => (
                        <div key={tenant.id} className="glass-card" style={{ padding: '1.5rem', opacity: tenant.user.isActive === false ? 0.7 : 1, position: 'relative' }}>
                            {tenant.user.isActive === false && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    color: '#f87171',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                }}>
                                    ⚠️ Account Deactivated — This tenant has deleted their account
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.25rem',
                                            fontWeight: '600',
                                        }}>
                                            {tenant.user.firstName[0]}{tenant.user.lastName[0]}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                                                {tenant.user.firstName} {tenant.user.lastName}
                                            </h3>
                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                                {tenant.user.email}
                                            </p>
                                        </div>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: '500',
                                            ...Object.fromEntries(getStatusBadge(tenant.status).split(';').filter(s => s.trim()).map(s => {
                                                const [key, value] = s.split(':').map(x => x.trim());
                                                return [key.replace(/-([a-z])/g, g => g[1].toUpperCase()), value];
                                            }))
                                        } as React.CSSProperties}>
                                            {tenant.status}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                        {tenant.user.phone && (
                                            <div>
                                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Phone</p>
                                                <p style={{ fontWeight: '500' }}>{tenant.user.phone}</p>
                                            </div>
                                        )}
                                        {tenant.profession && (
                                            <div>
                                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Profession</p>
                                                <p style={{ fontWeight: '500' }}>{tenant.profession}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Occupants</p>
                                            <p style={{ fontWeight: '500' }}>{tenant.numberOfOccupants}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Documents</p>
                                            <p style={{ fontWeight: '500' }}>
                                                {tenant.documents.filter(d => d.isVerified).length}/{tenant.documents.length} verified
                                            </p>
                                        </div>
                                        {tenant.currentRoom && (
                                            <div>
                                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Assigned Room</p>
                                                <p style={{ fontWeight: '500' }}>
                                                    {tenant.currentRoom.property.name} - Room {tenant.currentRoom.roomNumber}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {tenant.status === 'PENDING' && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleApprove(tenant.id, 'APPROVED')}
                                            className="btn-primary"
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                        >
                                            ✓ Approve
                                        </button>
                                        <button
                                            onClick={() => {
                                                const reason = prompt('Enter rejection reason:');
                                                if (reason) handleApprove(tenant.id, 'REJECTED', reason);
                                            }}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                fontSize: '0.875rem',
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                color: '#ef4444',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✕ Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
