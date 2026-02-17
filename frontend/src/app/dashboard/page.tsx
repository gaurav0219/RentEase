'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDataRefresh } from '@/lib/data-refresh-context';
import { propertiesApi, tenantsApi, PropertyStats, Tenant } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
    const { user, token } = useAuth();
    const { refreshKey } = useDataRefresh();
    const [stats, setStats] = useState<PropertyStats | null>(null);
    const [pendingTenants, setPendingTenants] = useState<Tenant[]>([]);
    const [tenantProfile, setTenantProfile] = useState<Tenant | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!token || !user) return;

        try {
            setIsLoading(true);
            if (user.role === 'OWNER') {
                const [statsData, tenantsData] = await Promise.all([
                    propertiesApi.getStats(),
                    tenantsApi.getAll('PENDING'),
                ]);
                setStats(statsData);
                setPendingTenants(tenantsData);
            } else if (user.role === 'TENANT') {
                const profile = await tenantsApi.getProfile();
                setTenantProfile(profile);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token, user]);

    // Load data on mount and when refreshKey changes (triggered by mutations)
    useEffect(() => {
        loadData();
    }, [loadData, refreshKey]);

    // Refresh data when page becomes visible or window gains focus
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && token && user) {
                loadData();
            }
        };

        const handleFocus = () => {
            if (token && user) {
                loadData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [token, user, loadData]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    // Owner Dashboard
    if (user?.role === 'OWNER') {
        return (
            <div className="animate-fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                    <p className="text-slate-400">Overview of your rental properties</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="stat-card">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-sm font-medium">Total Properties</span>
                            <span className="text-2xl">🏠</span>
                        </div>
                        <div className="text-3xl font-bold">{stats?.totalProperties || 0}</div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-sm font-medium">Total Rooms</span>
                            <span className="text-2xl">🚪</span>
                        </div>
                        <div className="text-3xl font-bold">{stats?.totalRooms || 0}</div>
                        <div className="mt-2 text-sm">
                            <span className="text-green-400">{stats?.occupiedRooms || 0} occupied</span>
                            <span className="text-slate-500 mx-2">•</span>
                            <span className="text-yellow-400">{stats?.vacantRooms || 0} vacant</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-sm font-medium">Occupancy Rate</span>
                            <span className="text-2xl">📈</span>
                        </div>
                        <div className="text-3xl font-bold">{(stats?.occupancyRate || 0).toFixed(1)}%</div>
                        <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                style={{ width: `${stats?.occupancyRate || 0}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-sm font-medium">Monthly Revenue</span>
                            <span className="text-2xl">💰</span>
                        </div>
                        <div className="text-3xl font-bold">
                            ₹{new Intl.NumberFormat('en-IN').format(stats?.totalMonthlyRent || 0)}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link href="/dashboard/properties" className="glass-card p-6 hover-card block">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">➕</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Add New Property</h3>
                                <p className="text-slate-400 text-sm">Register a new property or room</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/tenants" className="glass-card p-6 hover-card block">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">👥</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Manage Tenants</h3>
                                <p className="text-slate-400 text-sm">View and approve tenant applications</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Pending Tenants */}
                {pendingTenants.length > 0 && (
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-semibold mb-4">Pending Tenant Approvals</h2>
                        <div className="space-y-3">
                            {pendingTenants.slice(0, 5).map((tenant) => (
                                <div key={tenant.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                                            {tenant.user?.firstName?.[0]}{tenant.user?.lastName?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium">{tenant.user?.firstName} {tenant.user?.lastName}</p>
                                            <p className="text-sm text-slate-400">{tenant.user?.email}</p>
                                        </div>
                                    </div>
                                    <Link href={`/dashboard/tenants/${tenant.id}`} className="btn-secondary text-sm py-2 px-4">
                                        Review
                                    </Link>
                                </div>
                            ))}
                        </div>
                        {pendingTenants.length > 5 && (
                            <Link href="/dashboard/tenants?status=PENDING" className="block text-center text-indigo-400 hover:text-indigo-300 mt-4">
                                View all {pendingTenants.length} pending applications →
                            </Link>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Tenant Dashboard
    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Welcome, {user?.firstName}!</h1>
                <p className="text-slate-400">Manage your rental profile and documents</p>
            </div>

            {/* Status Card */}
            <div className="glass-card p-6 mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h2>
                        <p className="text-slate-400">{user?.email}</p>
                        <span className={`badge mt-2 inline-block ${tenantProfile?.status === 'APPROVED' || tenantProfile?.status === 'ACTIVE'
                            ? 'badge-success'
                            : tenantProfile?.status === 'PENDING'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}>
                            {tenantProfile?.status || 'PENDING'}
                        </span>
                    </div>
                </div>

                {tenantProfile?.status === 'PENDING' && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-yellow-400">
                            <strong>⏳ Application Pending:</strong> Your application is under review.
                            Please make sure you have uploaded all required documents.
                        </p>
                    </div>
                )}

                {tenantProfile?.status === 'ACTIVE' && tenantProfile?.currentRoom && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                        <p className="text-green-400 mb-2">
                            <strong>🏠 Currently Renting:</strong>
                        </p>
                        <p className="text-slate-300">
                            Room {tenantProfile.currentRoom.roomNumber} at {tenantProfile.currentRoom.property?.name}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            Rent: ₹{new Intl.NumberFormat('en-IN').format(tenantProfile.currentRoom.rentAmount)}/month
                        </p>
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/dashboard/profile" className="glass-card p-6 hover-card block">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">👤</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Complete Profile</h3>
                            <p className="text-slate-400 text-sm">Update your personal information</p>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/documents" className="glass-card p-6 hover-card block">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">📁</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Upload Documents</h3>
                            <p className="text-slate-400 text-sm">Aadhaar, PAN, and photo</p>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/agreements" className="glass-card p-6 hover-card block">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">📄</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">View Agreements</h3>
                            <p className="text-slate-400 text-sm">Download your rent agreements</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
