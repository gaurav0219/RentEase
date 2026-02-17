'use client';

import { useState, useEffect } from 'react';
import { applicationsApi, TenantApplication } from '@/lib/api';
import { useDataRefresh } from '@/lib/data-refresh-context';
import styles from './applications.module.css';

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<TenantApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filter, setFilter] = useState<string>('ALL');
    const [processing, setProcessing] = useState<string | null>(null);
    const { triggerRefresh } = useDataRefresh();
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedApp, setSelectedApp] = useState<TenantApplication | null>(null);
    const [rejectNotes, setRejectNotes] = useState('');

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = async () => {
        try {
            setLoading(true);
            const data = await applicationsApi.getForOwner();
            setApplications(data);
        } catch {
            setError('Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (applicationId: string) => {
        try {
            setProcessing(applicationId);
            setError('');
            await applicationsApi.review(applicationId, {
                status: 'APPROVED',
                reviewNotes: 'Application approved',
            });
            setSuccess('Application approved successfully!');
            loadApplications();
            triggerRefresh();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to approve application';
            setError(errorMessage);
        } finally {
            setProcessing(null);
        }
    };

    const openRejectModal = (app: TenantApplication) => {
        setSelectedApp(app);
        setRejectNotes('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!selectedApp) return;

        try {
            setProcessing(selectedApp.id);
            setError('');
            await applicationsApi.review(selectedApp.id, {
                status: 'REJECTED',
                reviewNotes: rejectNotes || 'Application rejected',
            });
            setSuccess('Application rejected');
            setShowRejectModal(false);
            loadApplications();
            triggerRefresh();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reject application';
            setError(errorMessage);
        } finally {
            setProcessing(null);
        }
    };

    const filteredApplications = applications.filter(app => {
        if (filter === 'ALL') return true;
        return app.status === filter;
    });

    const pendingCount = applications.filter(a => a.status === 'PENDING').length;
    const approvedCount = applications.filter(a => a.status === 'APPROVED').length;
    const rejectedCount = applications.filter(a => a.status === 'REJECTED').length;

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading applications...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Tenant Applications</h1>
                <p>Review and manage applications for your properties</p>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            {/* Stats Cards */}
            <div className={styles.stats}>
                <div className={`${styles.statCard} ${styles.pending}`}>
                    <span className={styles.statNumber}>{pendingCount}</span>
                    <span className={styles.statLabel}>Pending</span>
                </div>
                <div className={`${styles.statCard} ${styles.approved}`}>
                    <span className={styles.statNumber}>{approvedCount}</span>
                    <span className={styles.statLabel}>Approved</span>
                </div>
                <div className={`${styles.statCard} ${styles.rejected}`}>
                    <span className={styles.statNumber}>{rejectedCount}</span>
                    <span className={styles.statLabel}>Rejected</span>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <button
                    className={`${styles.filterBtn} ${filter === 'ALL' ? styles.active : ''}`}
                    onClick={() => setFilter('ALL')}
                >
                    All ({applications.length})
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'PENDING' ? styles.active : ''}`}
                    onClick={() => setFilter('PENDING')}
                >
                    Pending ({pendingCount})
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'APPROVED' ? styles.active : ''}`}
                    onClick={() => setFilter('APPROVED')}
                >
                    Approved ({approvedCount})
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'REJECTED' ? styles.active : ''}`}
                    onClick={() => setFilter('REJECTED')}
                >
                    Rejected ({rejectedCount})
                </button>
            </div>

            {/* Applications List */}
            {filteredApplications.length === 0 ? (
                <div className={styles.noApplications}>
                    <p>No applications found</p>
                </div>
            ) : (
                <div className={styles.applicationsList}>
                    {filteredApplications.map(app => (
                        <div key={app.id} className={styles.applicationCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.tenantInfo}>
                                    <div className={styles.avatar}>
                                        {app.tenant?.user?.firstName?.[0]}{app.tenant?.user?.lastName?.[0]}
                                    </div>
                                    <div>
                                        <h3>{app.tenant?.user?.firstName} {app.tenant?.user?.lastName}</h3>
                                        <p className={styles.email}>{app.tenant?.user?.email}</p>
                                        {app.tenant?.user?.phone && (
                                            <p className={styles.phone}>📞 {app.tenant.user.phone}</p>
                                        )}
                                    </div>
                                </div>
                                <span className={`${styles.statusBadge} ${styles[app.status.toLowerCase()]}`}>
                                    {app.status}
                                </span>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.propertyInfo}>
                                    <span className={styles.propertyName}>{app.room.property.name}</span>
                                    <span className={styles.roomNumber}>Room {app.room.roomNumber}</span>
                                </div>

                                {app.message && (
                                    <div className={styles.message}>
                                        <strong>Message:</strong>
                                        <p>&quot;{app.message}&quot;</p>
                                    </div>
                                )}

                                {app.tenant?.documents && app.tenant.documents.length > 0 && (
                                    <div className={styles.documents}>
                                        <strong>Documents:</strong>
                                        <div className={styles.docList}>
                                            {app.tenant.documents.map(doc => (
                                                <span
                                                    key={doc.id}
                                                    className={`${styles.docBadge} ${doc.isVerified ? styles.verified : styles.unverified}`}
                                                >
                                                    {doc.type} {doc.isVerified ? '✓' : '○'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className={styles.meta}>
                                    <span>Applied: {formatDate(app.createdAt)}</span>
                                    {app.reviewedAt && (
                                        <span>Reviewed: {formatDate(app.reviewedAt)}</span>
                                    )}
                                </div>

                                {app.reviewNotes && app.status !== 'PENDING' && (
                                    <div className={styles.reviewNotes}>
                                        <strong>Review Notes:</strong> {app.reviewNotes}
                                    </div>
                                )}
                            </div>

                            {app.status === 'PENDING' && (
                                <div className={styles.cardActions}>
                                    <button
                                        className={styles.rejectBtn}
                                        onClick={() => openRejectModal(app)}
                                        disabled={processing !== null}
                                    >
                                        Reject
                                    </button>
                                    <button
                                        className={styles.approveBtn}
                                        onClick={() => handleApprove(app.id)}
                                        disabled={processing !== null}
                                    >
                                        {processing === app.id ? 'Processing...' : 'Approve'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedApp && (
                <div className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2>Reject Application</h2>
                        <div className={styles.modalContent}>
                            <p>
                                Are you sure you want to reject the application from{' '}
                                <strong>{selectedApp.tenant?.user?.firstName} {selectedApp.tenant?.user?.lastName}</strong>{' '}
                                for Room {selectedApp.room.roomNumber}?
                            </p>

                            <div className={styles.formGroup}>
                                <label>Reason (optional)</label>
                                <textarea
                                    value={rejectNotes}
                                    onChange={e => setRejectNotes(e.target.value)}
                                    placeholder="Provide a reason for rejection..."
                                    rows={3}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    className={styles.cancelBtn}
                                    onClick={() => setShowRejectModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.confirmRejectBtn}
                                    onClick={handleReject}
                                    disabled={processing !== null}
                                >
                                    {processing ? 'Rejecting...' : 'Confirm Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
