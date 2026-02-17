'use client';

import { useState, useEffect } from 'react';
import { applicationsApi, AvailableRoom, TenantApplication } from '@/lib/api';
import styles from './browse-rooms.module.css';

export default function BrowseRoomsPage() {
    const [rooms, setRooms] = useState<AvailableRoom[]>([]);
    const [myApplications, setMyApplications] = useState<TenantApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [roomsData, appsData] = await Promise.all([
                applicationsApi.getAvailableRooms(),
                applicationsApi.getMyApplications(),
            ]);
            setRooms(roomsData);
            setMyApplications(appsData);
        } catch (err) {
            setError('Failed to load rooms');
        } finally {
            setLoading(false);
        }
    };

    const hasApplied = (roomId: string) => {
        return myApplications.some(app => app.room.id === roomId && app.status !== 'WITHDRAWN');
    };

    const getApplicationStatus = (roomId: string) => {
        const app = myApplications.find(app => app.room.id === roomId);
        return app?.status;
    };

    const openApplyModal = (room: AvailableRoom) => {
        setSelectedRoom(room);
        setMessage('');
        setShowModal(true);
    };

    const handleApply = async () => {
        if (!selectedRoom) return;

        try {
            setApplying(selectedRoom.id);
            setError('');
            await applicationsApi.apply({
                roomId: selectedRoom.id,
                message: message || undefined,
            });
            setSuccess('Application submitted successfully!');
            setShowModal(false);
            loadData();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit application';
            setError(errorMessage);
        } finally {
            setApplying(null);
        }
    };

    const handleWithdraw = async (applicationId: string) => {
        if (!confirm('Are you sure you want to withdraw this application?')) return;

        try {
            await applicationsApi.withdraw(applicationId);
            setSuccess('Application withdrawn');
            loadData();
        } catch {
            setError('Failed to withdraw application');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading available rooms...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Browse Available Rooms</h1>
                <p>Find your perfect rental and apply today</p>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            {/* My Applications Section */}
            {myApplications.length > 0 && (
                <div className={styles.myApplications}>
                    <h2>My Applications</h2>
                    <div className={styles.applicationsList}>
                        {myApplications.map(app => (
                            <div key={app.id} className={styles.applicationCard}>
                                <div className={styles.applicationInfo}>
                                    <span className={styles.propertyName}>{app.room.property.name}</span>
                                    <span className={styles.roomNumber}>Room {app.room.roomNumber}</span>
                                </div>
                                <div className={styles.applicationStatus}>
                                    <span className={`${styles.statusBadge} ${styles[app.status.toLowerCase()]}`}>
                                        {app.status}
                                    </span>
                                    {app.status === 'PENDING' && (
                                        <button
                                            className={styles.withdrawBtn}
                                            onClick={() => handleWithdraw(app.id)}
                                        >
                                            Withdraw
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Available Rooms Grid */}
            <div className={styles.roomsSection}>
                <h2>Available Rooms ({rooms.length})</h2>
                {rooms.length === 0 ? (
                    <div className={styles.noRooms}>
                        <p>No rooms available at the moment. Check back later!</p>
                    </div>
                ) : (
                    <div className={styles.roomsGrid}>
                        {rooms.map(room => (
                            <div key={room.id} className={styles.roomCard}>
                                <div className={styles.roomHeader}>
                                    <h3>{room.property.name}</h3>
                                    <span className={styles.roomType}>{room.property.type}</span>
                                </div>

                                <div className={styles.roomDetails}>
                                    <div className={styles.roomNumber}>
                                        <span className={styles.label}>Room</span>
                                        <span className={styles.value}>{room.roomNumber}</span>
                                    </div>
                                    <div className={styles.floor}>
                                        <span className={styles.label}>Floor</span>
                                        <span className={styles.value}>{room.floor}</span>
                                    </div>
                                </div>

                                <div className={styles.location}>
                                    📍 {room.property.address}, {room.property.city}
                                </div>

                                <div className={styles.pricing}>
                                    <div className={styles.rent}>
                                        <span className={styles.amount}>{formatCurrency(room.rentAmount)}</span>
                                        <span className={styles.period}>/month</span>
                                    </div>
                                    <div className={styles.deposit}>
                                        Deposit: {formatCurrency(room.securityDeposit)}
                                    </div>
                                </div>

                                <div className={styles.furnishing}>
                                    🪑 {room.furnishing.replace('_', ' ')}
                                </div>

                                {room.amenities?.length > 0 && (
                                    <div className={styles.amenities}>
                                        {room.amenities.slice(0, 3).map((amenity, i) => (
                                            <span key={i} className={styles.amenity}>{amenity}</span>
                                        ))}
                                        {room.amenities.length > 3 && (
                                            <span className={styles.moreAmenities}>
                                                +{room.amenities.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className={styles.cardActions}>
                                    {hasApplied(room.id) ? (
                                        <span className={`${styles.appliedBadge} ${styles[getApplicationStatus(room.id)?.toLowerCase() || 'pending']}`}>
                                            {getApplicationStatus(room.id)}
                                        </span>
                                    ) : (
                                        <button
                                            className={styles.applyBtn}
                                            onClick={() => openApplyModal(room)}
                                        >
                                            Apply Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Apply Modal */}
            {showModal && selectedRoom && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2>Apply for Room</h2>
                        <div className={styles.modalContent}>
                            <div className={styles.selectedRoomInfo}>
                                <h3>{selectedRoom.property.name}</h3>
                                <p>Room {selectedRoom.roomNumber} • Floor {selectedRoom.floor}</p>
                                <p className={styles.modalRent}>{formatCurrency(selectedRoom.rentAmount)}/month</p>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Message to Landlord (optional)</label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Introduce yourself and explain why you're interested..."
                                    rows={4}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    className={styles.cancelBtn}
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.submitBtn}
                                    onClick={handleApply}
                                    disabled={applying !== null}
                                >
                                    {applying ? 'Submitting...' : 'Submit Application'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
