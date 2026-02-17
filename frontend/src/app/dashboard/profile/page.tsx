'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { tenantsApi } from '@/lib/api';

interface TenantProfile {
    id: string;
    fatherName?: string;
    motherName?: string;
    dateOfBirth?: string;
    permanentAddress?: string;
    profession?: string;
    companyName?: string;
    emergencyContact?: string;
    emergencyContactName?: string;
    numberOfOccupants: number;
    status: string;
    createdAt: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
    };
    documents: {
        id: string;
        type: string;
        isVerified: boolean;
    }[];
    currentRoom?: {
        id: string;
        roomNumber: string;
        rentAmount: number;
        property: {
            name: string;
            address: string;
            city: string;
            state: string;
        };
    };
}

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<TenantProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        fatherName: '',
        motherName: '',
        dateOfBirth: '',
        permanentAddress: '',
        profession: '',
        companyName: '',
        emergencyContact: '',
        emergencyContactName: '',
        numberOfOccupants: 1,
    });

    useEffect(() => {
        // Only load profile for TENANT users
        if (user?.role === 'TENANT') {
            loadProfile();
        } else if (user) {
            // Non-tenant users should not load profile
            setIsLoading(false);
        }
    }, [user]);

    const loadProfile = async () => {
        try {
            setIsLoading(true);
            const data = await tenantsApi.getProfile();
            setProfile(data as unknown as TenantProfile);
            setFormData({
                fatherName: data.fatherName || '',
                motherName: data.motherName || '',
                dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
                permanentAddress: data.permanentAddress || '',
                profession: data.profession || '',
                companyName: data.companyName || '',
                emergencyContact: data.emergencyContact || '',
                emergencyContactName: data.emergencyContactName || '',
                numberOfOccupants: data.numberOfOccupants || 1,
            });
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await tenantsApi.updateProfile(formData);
            setSuccess('Profile updated successfully!');
            setIsEditing(false);
            loadProfile();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#fbbf24';
            case 'APPROVED': return '#22c55e';
            case 'ACTIVE': return '#6366f1';
            case 'REJECTED': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getCompletionPercentage = () => {
        if (!profile) return 0;
        const fields = [
            profile.fatherName,
            profile.permanentAddress,
            profile.profession,
            profile.emergencyContact,
            profile.emergencyContactName,
        ];
        const filledFields = fields.filter(f => f && f.trim() !== '').length;
        const docsComplete = profile.documents.length >= 3;
        return Math.round(((filledFields / fields.length) * 70) + (docsComplete ? 30 : (profile.documents.length / 3) * 30));
    };

    if (user?.role !== 'TENANT') {
        return (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Access Denied</h2>
                <p style={{ color: 'var(--color-text-secondary)' }}>This page is only for tenants.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p style={{ color: 'var(--color-text-secondary)' }}>Loading profile...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>Profile not found</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>My Profile</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Manage your tenant profile and KYC information</p>
                </div>
                {!isEditing && (
                    <button className="btn-primary" onClick={() => setIsEditing(true)}>
                        ✏️ Edit Profile
                    </button>
                )}
            </div>

            {/* Profile Completion */}
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '500' }}>Profile Completion</span>
                    <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>{getCompletionPercentage()}%</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${getCompletionPercentage()}%`,
                        background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                        transition: 'width 0.5s ease',
                    }} />
                </div>
            </div>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '0.5rem', color: '#22c55e', marginBottom: '1rem' }}>{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Main Profile Card */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: '600',
                        }}>
                            {profile.user.firstName[0]}{profile.user.lastName[0]}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                                {profile.user.firstName} {profile.user.lastName}
                            </h2>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{profile.user.email}</p>
                            <span style={{
                                display: 'inline-block',
                                marginTop: '0.5rem',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                background: `${getStatusColor(profile.status)}20`,
                                color: getStatusColor(profile.status),
                            }}>
                                {profile.status}
                            </span>
                        </div>
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="label">Father's Name</label>
                                        <input
                                            type="text"
                                            value={formData.fatherName}
                                            onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Mother's Name</label>
                                        <input
                                            type="text"
                                            value={formData.motherName}
                                            onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="label">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={formData.dateOfBirth}
                                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">No. of Occupants</label>
                                        <input
                                            type="number"
                                            value={formData.numberOfOccupants}
                                            onChange={(e) => setFormData({ ...formData, numberOfOccupants: parseInt(e.target.value) })}
                                            className="input"
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Permanent Address</label>
                                    <textarea
                                        value={formData.permanentAddress}
                                        onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                                        className="input"
                                        rows={2}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="label">Profession</label>
                                        <input
                                            type="text"
                                            value={formData.profession}
                                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Company Name</label>
                                        <input
                                            type="text"
                                            value={formData.companyName}
                                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="label">Emergency Contact</label>
                                        <input
                                            type="text"
                                            value={formData.emergencyContact}
                                            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                            className="input"
                                            placeholder="10-digit mobile"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Emergency Contact Name</label>
                                        <input
                                            type="text"
                                            value={formData.emergencyContactName}
                                            onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary" style={{ flex: 1 }}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                { label: 'Phone', value: profile.user.phone || 'Not provided' },
                                { label: "Father's Name", value: profile.fatherName || 'Not provided' },
                                { label: 'Date of Birth', value: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN') : 'Not provided' },
                                { label: 'Profession', value: profile.profession || 'Not provided' },
                                { label: 'Company', value: profile.companyName || 'Not provided' },
                                { label: 'Permanent Address', value: profile.permanentAddress || 'Not provided' },
                                { label: 'Emergency Contact', value: profile.emergencyContact ? `${profile.emergencyContactName} (${profile.emergencyContact})` : 'Not provided' },
                                { label: 'No. of Occupants', value: profile.numberOfOccupants?.toString() || '1' },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{item.label}</span>
                                    <span style={{ fontWeight: '500', fontSize: '0.875rem', textAlign: 'right', maxWidth: '60%' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Current Rental */}
                    {profile.currentRoom && (
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                                🏠 Current Rental
                            </h3>
                            <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{profile.currentRoom.property.name}</p>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                Room {profile.currentRoom.roomNumber}
                            </p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                                {profile.currentRoom.property.address}, {profile.currentRoom.property.city}, {profile.currentRoom.property.state}
                            </p>
                            <p style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                ₹{profile.currentRoom.rentAmount.toLocaleString('en-IN')}<span style={{ fontSize: '0.875rem', fontWeight: '400' }}>/month</span>
                            </p>
                        </div>
                    )}

                    {/* Documents Status */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>📄 Documents Status</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {['AADHAAR', 'PAN', 'PHOTO'].map((docType) => {
                                const doc = profile.documents.find(d => d.type === docType);
                                return (
                                    <div key={docType} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{docType}</span>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.75rem',
                                            background: doc
                                                ? doc.isVerified ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)'
                                                : 'rgba(239, 68, 68, 0.2)',
                                            color: doc
                                                ? doc.isVerified ? '#22c55e' : '#fbbf24'
                                                : '#ef4444',
                                        }}>
                                            {doc ? (doc.isVerified ? '✓ Verified' : '⏳ Pending') : '✕ Not uploaded'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <a href="/dashboard/documents" style={{ display: 'block', marginTop: '1rem', color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                            Manage Documents →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
