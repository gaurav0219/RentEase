'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { notificationsApi, Notification } from '@/lib/api';

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, token, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Notification state
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isLoading && !token) {
            router.push('/login');
        }
    }, [token, isLoading, router]);

    // Poll unread count every 30s
    const fetchUnreadCount = useCallback(async () => {
        try {
            const data = await notificationsApi.getUnreadCount();
            setUnreadCount(data.count);
        } catch {
            // Silently fail
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchUnreadCount();
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [token, fetchUnreadCount]);

    // Load notifications when dropdown opens
    const toggleNotifications = async () => {
        const opening = !showNotifications;
        setShowNotifications(opening);
        if (opening) {
            setNotifLoading(true);
            try {
                const data = await notificationsApi.getAll(20);
                setNotifications(data);
            } catch {
                // Silently fail
            } finally {
                setNotifLoading(false);
            }
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationsApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* silently fail */ }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch { /* silently fail */ }
    };

    const handleDeleteNotification = async (id: string, wasUnread: boolean) => {
        try {
            await notificationsApi.delete(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* silently fail */ }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    const ownerNavLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: '📊' },
        { href: '/dashboard/properties', label: 'Properties', icon: '🏠' },
        { href: '/dashboard/rooms', label: 'Rooms', icon: '🚪' },
        { href: '/dashboard/applications', label: 'Applications', icon: '📨' },
        { href: '/dashboard/tenants', label: 'Tenants', icon: '👥' },
        { href: '/dashboard/documents', label: 'Documents', icon: '📁' },
        { href: '/dashboard/agreements', label: 'Agreements', icon: '📄' },
        { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
    ];

    const tenantNavLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: '📊' },
        { href: '/dashboard/browse-rooms', label: 'Browse Rooms', icon: '🏠' },
        { href: '/dashboard/profile', label: 'My Profile', icon: '👤' },
        { href: '/dashboard/documents', label: 'Documents', icon: '📁' },
        { href: '/dashboard/agreements', label: 'My Agreements', icon: '📄' },
        { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
    ];

    const navLinks = user.role === 'OWNER' ? ownerNavLinks : tenantNavLinks;

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass-card rounded-none border-r border-slate-700/50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-700/50">
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">R</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg">RentEase</h1>
                                <p className="text-xs text-slate-400 capitalize">{user.role.toLowerCase()} Dashboard</p>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`nav-link ${pathname === link.href ? 'active' : ''}`}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <span className="text-xl">{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-slate-700/50">
                        <button
                            onClick={() => {
                                logout();
                                router.push('/');
                            }}
                            className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <span className="text-xl">🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Main Content */}
            <main className="flex-1 lg:ml-64">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 glass-card rounded-none border-b border-slate-700/50 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="lg:hidden p-2 rounded-lg hover:bg-slate-700/50"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <span className="text-slate-400 text-sm">Welcome back,</span>
                            <span className="font-medium">{user.firstName}!</span>
                        </div>

                        {/* Notification Bell */}
                        <div ref={notifRef} style={{ position: 'relative' }}>
                            <button
                                onClick={toggleNotifications}
                                style={{
                                    position: 'relative',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    transition: 'background 0.2s',
                                    fontSize: '1.3rem',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                title="Notifications"
                            >
                                🔔
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        minWidth: '18px',
                                        height: '18px',
                                        borderRadius: '9px',
                                        background: '#ef4444',
                                        color: 'white',
                                        fontSize: '0.65rem',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 4px',
                                        lineHeight: 1,
                                    }}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    right: 0,
                                    width: '380px',
                                    maxHeight: '480px',
                                    background: 'var(--color-surface, #1e293b)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                    zIndex: 100,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}>
                                    {/* Header */}
                                    <div style={{
                                        padding: '1rem 1.25rem',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllAsRead}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--color-primary, #6366f1)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500',
                                                }}
                                            >
                                                Mark all as read
                                            </button>
                                        )}
                                    </div>

                                    {/* Notification List */}
                                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
                                        {notifLoading ? (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                                Loading...
                                            </div>
                                        ) : notifications.length === 0 ? (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🔕</span>
                                                No notifications yet
                                            </div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    style={{
                                                        padding: '0.875rem 1.25rem',
                                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                        background: notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.06)',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.15s',
                                                        display: 'flex',
                                                        gap: '0.75rem',
                                                        alignItems: 'flex-start',
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.06)';
                                                    }}
                                                    onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                                                >
                                                    {/* Unread dot */}
                                                    <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: notif.isRead ? 'transparent' : '#6366f1',
                                                        flexShrink: 0,
                                                        marginTop: '6px',
                                                    }} />

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{
                                                            fontWeight: notif.isRead ? '400' : '600',
                                                            fontSize: '0.85rem',
                                                            marginBottom: '0.2rem',
                                                            lineHeight: 1.3,
                                                        }}>
                                                            {notif.subject}
                                                        </p>
                                                        <p style={{
                                                            color: 'var(--color-text-secondary)',
                                                            fontSize: '0.8rem',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {notif.message}
                                                        </p>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            color: 'var(--color-text-secondary)',
                                                            opacity: 0.7,
                                                        }}>
                                                            {timeAgo(notif.createdAt)}
                                                        </span>
                                                    </div>

                                                    {/* Delete button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteNotification(notif.id, !notif.isRead);
                                                        }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--color-text-secondary)',
                                                            cursor: 'pointer',
                                                            padding: '2px 4px',
                                                            fontSize: '0.75rem',
                                                            opacity: 0.5,
                                                            flexShrink: 0,
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                                                        title="Delete notification"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
