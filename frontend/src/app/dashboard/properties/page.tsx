'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDataRefresh } from '@/lib/data-refresh-context';
import { propertiesApi, Property, CreatePropertyData } from '@/lib/api';

export default function PropertiesPage() {
    const { token } = useAuth();
    const { triggerRefresh } = useDataRefresh();
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newProperty, setNewProperty] = useState<CreatePropertyData>({
        name: '',
        type: 'HOUSE',
        address: '',
        city: '',
        state: '',
        pincode: '',
        landmark: '',
        description: '',
    });

    useEffect(() => {
        loadProperties();
    }, [token]);

    // Refresh data when window gains focus
    useEffect(() => {
        const handleFocus = () => {
            if (token) loadProperties();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [token]);

    const loadProperties = async () => {
        if (!token) return;
        try {
            const data = await propertiesApi.getAll();
            setProperties(data);
        } catch (error) {
            console.error('Failed to load properties:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddProperty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsSubmitting(true);
        try {
            await propertiesApi.create(newProperty);
            setShowAddModal(false);
            setNewProperty({
                name: '',
                type: 'HOUSE',
                address: '',
                city: '',
                state: '',
                pincode: '',
                landmark: '',
                description: '',
            });
            loadProperties();
            triggerRefresh(); // Notify other pages that data has changed
        } catch (error) {
            console.error('Failed to add property:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProperty = async (id: string) => {
        if (!token || !confirm('Are you sure you want to delete this property?')) return;

        try {
            await propertiesApi.delete(id);
            loadProperties();
            triggerRefresh(); // Notify other pages that data has changed
        } catch (error) {
            console.error('Failed to delete property:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Properties</h1>
                    <p className="text-slate-400">Manage your rental properties</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
                    <span>➕</span>
                    Add Property
                </button>
            </div>

            {properties.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-6xl mb-4">🏠</div>
                    <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
                    <p className="text-slate-400 mb-6">Add your first property to get started</p>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary">
                        Add Your First Property
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                        <div key={property.id} className="glass-card p-6 hover-card">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">🏠</span>
                                </div>
                                <span className="badge badge-info">{property.type}</span>
                            </div>

                            <h3 className="text-lg font-semibold mb-2">{property.name}</h3>
                            <p className="text-slate-400 text-sm mb-4">
                                {property.address}, {property.city}, {property.state} - {property.pincode}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                                <div className="text-sm">
                                    <span className="text-slate-400">Rooms: </span>
                                    <span className="font-medium">{property._count?.rooms || property.rooms?.length || 0}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDeleteProperty(property.id)}
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Property Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-6">Add New Property</h2>

                        <form onSubmit={handleAddProperty} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Property Name</label>
                                <input
                                    type="text"
                                    value={newProperty.name}
                                    onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                                    className="input-field"
                                    placeholder="My House"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Property Type</label>
                                <select
                                    value={newProperty.type}
                                    onChange={(e) => setNewProperty({ ...newProperty, type: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="HOUSE">House</option>
                                    <option value="APARTMENT">Apartment</option>
                                    <option value="VILLA">Villa</option>
                                    <option value="COMMERCIAL">Commercial</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                                <input
                                    type="text"
                                    value={newProperty.address}
                                    onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                                    className="input-field"
                                    placeholder="123, Main Street"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                                    <input
                                        type="text"
                                        value={newProperty.city}
                                        onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })}
                                        className="input-field"
                                        placeholder="Mumbai"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                                    <input
                                        type="text"
                                        value={newProperty.state}
                                        onChange={(e) => setNewProperty({ ...newProperty, state: e.target.value })}
                                        className="input-field"
                                        placeholder="Maharashtra"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Pincode</label>
                                    <input
                                        type="text"
                                        value={newProperty.pincode}
                                        onChange={(e) => setNewProperty({ ...newProperty, pincode: e.target.value })}
                                        className="input-field"
                                        placeholder="400001"
                                        required
                                        maxLength={6}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Landmark</label>
                                    <input
                                        type="text"
                                        value={newProperty.landmark || ''}
                                        onChange={(e) => setNewProperty({ ...newProperty, landmark: e.target.value })}
                                        className="input-field"
                                        placeholder="Near metro station"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                                <textarea
                                    value={newProperty.description || ''}
                                    onChange={(e) => setNewProperty({ ...newProperty, description: e.target.value })}
                                    className="input-field min-h-24"
                                    placeholder="Property description..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                                    {isSubmitting ? 'Adding...' : 'Add Property'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
