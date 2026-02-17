'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDataRefresh } from '@/lib/data-refresh-context';
import { roomsApi, propertiesApi } from '@/lib/api';

interface Room {
    id: string;
    roomNumber: string;
    floor: number;
    description?: string;
    rentAmount: number;
    securityDeposit: number;
    maintenanceCharge?: number;
    furnishing: string;
    status: string;
    amenities: string[];
    property: {
        id: string;
        name: string;
    };
    currentTenant?: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
            email: string;
            phone?: string;
        };
    };
}

interface Property {
    id: string;
    name: string;
}

export default function RoomsPage() {
    const { user } = useAuth();
    const { triggerRefresh } = useDataRefresh();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        propertyId: '',
        roomNumber: '',
        floor: 0,
        description: '',
        rentAmount: '',
        securityDeposit: '',
        maintenanceCharge: '',
        furnishing: 'UNFURNISHED',
        amenities: [] as string[],
    });

    useEffect(() => {
        loadProperties();
    }, []);

    useEffect(() => {
        if (selectedProperty) {
            loadRooms(selectedProperty);
        }
    }, [selectedProperty]);

    // Refresh data when window gains focus
    useEffect(() => {
        const handleFocus = () => {
            loadProperties();
            if (selectedProperty) loadRooms(selectedProperty);
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [selectedProperty]);

    const loadProperties = async () => {
        try {
            const data = await propertiesApi.getAll();
            setProperties(data as unknown as Property[]);
            if (data.length > 0) {
                setSelectedProperty(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load properties:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRooms = async (propertyId: string) => {
        try {
            setIsLoading(true);
            const data = await roomsApi.getByProperty(propertyId);
            setRooms(data as unknown as Room[]);
        } catch (err) {
            console.error('Failed to load rooms:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const payload = {
                ...formData,
                propertyId: selectedProperty,
                rentAmount: parseFloat(formData.rentAmount),
                securityDeposit: parseFloat(formData.securityDeposit),
                maintenanceCharge: formData.maintenanceCharge ? parseFloat(formData.maintenanceCharge) : undefined,
            };

            if (editingRoom) {
                await roomsApi.update(editingRoom.id, payload);
            } else {
                await roomsApi.create(payload);
            }
            closeModal();
            loadRooms(selectedProperty);
            triggerRefresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : editingRoom ? 'Failed to update room' : 'Failed to create room');
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingRoom(null);
        setFormData({
            propertyId: '',
            roomNumber: '',
            floor: 0,
            description: '',
            rentAmount: '',
            securityDeposit: '',
            maintenanceCharge: '',
            furnishing: 'UNFURNISHED',
            amenities: [],
        });
        setError('');
    };

    const handleEdit = (room: Room) => {
        setEditingRoom(room);
        setFormData({
            propertyId: selectedProperty,
            roomNumber: room.roomNumber,
            floor: room.floor,
            description: room.description || '',
            rentAmount: String(room.rentAmount),
            securityDeposit: String(room.securityDeposit),
            maintenanceCharge: room.maintenanceCharge ? String(room.maintenanceCharge) : '',
            furnishing: room.furnishing,
            amenities: room.amenities || [],
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this room?')) return;
        try {
            await roomsApi.delete(id);
            loadRooms(selectedProperty);
            triggerRefresh(); // Notify other pages that data has changed
        } catch (err) {
            console.error('Failed to delete room:', err);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return '#22c55e';
            case 'OCCUPIED': return '#6366f1';
            case 'MAINTENANCE': return '#f59e0b';
            case 'RESERVED': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    const getFurnishingLabel = (furnishing: string) => {
        switch (furnishing) {
            case 'FURNISHED': return '🛋️ Furnished';
            case 'SEMI_FURNISHED': return '🪑 Semi-Furnished';
            case 'UNFURNISHED': return '📦 Unfurnished';
            default: return furnishing;
        }
    };

    const amenityOptions = ['AC', 'WiFi', 'TV', 'Fridge', 'Washing Machine', 'Geyser', 'Bed', 'Wardrobe', 'Study Table', 'Balcony', 'Attached Bathroom'];

    if (user?.role !== 'OWNER') {
        return (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Access Denied</h2>
                <p style={{ color: 'var(--color-text-secondary)' }}>Only property owners can access this page.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Rooms</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Manage rooms in your properties</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)} disabled={!selectedProperty}>
                    + Add Room
                </button>
            </div>

            {/* Property Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>Select Property</label>
                <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="input"
                    style={{ maxWidth: '300px' }}
                >
                    {properties.map((property) => (
                        <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Loading rooms...</p>
                </div>
            ) : rooms.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚪</p>
                    <h3 style={{ marginBottom: '0.5rem' }}>No rooms yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Add your first room to this property</p>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Room</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {rooms.map((room) => (
                        <div key={room.id} className="glass-card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                                        Room {room.roomNumber}
                                    </h3>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                        Floor {room.floor}
                                    </p>
                                </div>
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    background: `${getStatusColor(room.status)}20`,
                                    color: getStatusColor(room.status),
                                    border: `1px solid ${getStatusColor(room.status)}30`,
                                }}>
                                    {room.status}
                                </span>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                    ₹{room.rentAmount.toLocaleString('en-IN')}<span style={{ fontSize: '0.875rem', fontWeight: '400', color: 'var(--color-text-secondary)' }}>/month</span>
                                </p>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                    Deposit: ₹{room.securityDeposit.toLocaleString('en-IN')}
                                </p>
                            </div>

                            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>{getFurnishingLabel(room.furnishing)}</p>

                            {room.amenities && room.amenities.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {room.amenities.slice(0, 4).map((amenity, i) => (
                                        <span key={i} style={{
                                            padding: '0.25rem 0.5rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.75rem',
                                        }}>
                                            {amenity}
                                        </span>
                                    ))}
                                    {room.amenities.length > 4 && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                            +{room.amenities.length - 4} more
                                        </span>
                                    )}
                                </div>
                            )}

                            {room.currentTenant && (
                                <div style={{
                                    padding: '0.75rem',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Current Tenant</p>
                                    <p style={{ fontWeight: '500' }}>
                                        {room.currentTenant.user.firstName} {room.currentTenant.user.lastName}
                                    </p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        {room.currentTenant.user.email}
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleEdit(room)}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        color: '#6366f1',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(room.id)}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: '0.5rem',
                                        cursor: room.currentTenant ? 'not-allowed' : 'pointer',
                                        fontSize: '0.875rem',
                                        opacity: room.currentTenant ? 0.5 : 1,
                                    }}
                                    disabled={!!room.currentTenant}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Room Modal */}
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
                    <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>{editingRoom ? 'Edit Room' : 'Add New Room'}</h2>
                        <form onSubmit={handleSubmit}>
                            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label className="label">Room Number *</label>
                                    <input
                                        type="text"
                                        value={formData.roomNumber}
                                        onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                                        className="input"
                                        placeholder="101"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Floor</label>
                                    <input
                                        type="number"
                                        value={formData.floor}
                                        onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })}
                                        className="input"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                    rows={2}
                                    placeholder="Spacious room with balcony..."
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label className="label">Monthly Rent (₹) *</label>
                                    <input
                                        type="number"
                                        value={formData.rentAmount}
                                        onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                                        className="input"
                                        placeholder="10000"
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
                                        placeholder="20000"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label className="label">Maintenance (₹/month)</label>
                                    <input
                                        type="number"
                                        value={formData.maintenanceCharge}
                                        onChange={(e) => setFormData({ ...formData, maintenanceCharge: e.target.value })}
                                        className="input"
                                        placeholder="2000"
                                    />
                                </div>
                                <div>
                                    <label className="label">Furnishing</label>
                                    <select
                                        value={formData.furnishing}
                                        onChange={(e) => setFormData({ ...formData, furnishing: e.target.value })}
                                        className="input"
                                    >
                                        <option value="UNFURNISHED">Unfurnished</option>
                                        <option value="SEMI_FURNISHED">Semi-Furnished</option>
                                        <option value="FURNISHED">Furnished</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="label">Amenities</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {amenityOptions.map((amenity) => (
                                        <label key={amenity} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            padding: '0.5rem 0.75rem',
                                            background: formData.amenities.includes(amenity) ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            transition: 'all 0.2s',
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.amenities.includes(amenity)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, amenities: [...formData.amenities, amenity] });
                                                    } else {
                                                        setFormData({ ...formData, amenities: formData.amenities.filter(a => a !== amenity) });
                                                    }
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {amenity}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={closeModal} className="btn-secondary" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                    {editingRoom ? 'Update Room' : 'Add Room'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
