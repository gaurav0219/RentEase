'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usersApi, UserSettings } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('account');

    // Profile form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');
    const [profileError, setProfileError] = useState('');

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Settings state
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState('');

    // Delete account state
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const tabs = [
        { id: 'account', label: '👤 Account', icon: '👤' },
        { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
        { id: 'security', label: '🔒 Security', icon: '🔒' },
        { id: 'preferences', label: '⚙️ Preferences', icon: '⚙️' },
    ];

    // Load user profile on mount
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
        }
        loadSettings();
    }, [user]);

    const loadSettings = async () => {
        try {
            const data = await usersApi.getSettings();
            setSettings(data);
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const handleProfileSave = async () => {
        setProfileLoading(true);
        setProfileMessage('');
        setProfileError('');
        try {
            await usersApi.updateProfile({ firstName, lastName, phone: phone || undefined });
            setProfileMessage('Profile updated successfully!');
            setTimeout(() => setProfileMessage(''), 3000);
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        setPasswordLoading(true);
        setPasswordMessage('');
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            setPasswordLoading(false);
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            setPasswordLoading(false);
            return;
        }

        try {
            await usersApi.changePassword({ currentPassword, newPassword });
            setPasswordMessage('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordMessage(''), 3000);
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        setDeleteError('');
        try {
            await usersApi.deleteAccount();
            logout();
            router.push('/');
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to delete account';
            setDeleteError(message);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSettingToggle = async (key: keyof UserSettings, value: boolean) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        try {
            await usersApi.updateSettings({ [key]: value });
        } catch (err) {
            console.error('Failed to update setting:', err);
            // Revert on error
            setSettings(settings);
        }
    };

    const handlePreferenceSave = async () => {
        if (!settings) return;
        setSettingsLoading(true);
        setSettingsMessage('');
        try {
            await usersApi.updateSettings({
                language: settings.language,
                dateFormat: settings.dateFormat,
                theme: settings.theme,
            });
            setSettingsMessage('Preferences saved successfully!');
            setTimeout(() => setSettingsMessage(''), 3000);
        } catch (err) {
            console.error('Failed to save preferences:', err);
        } finally {
            setSettingsLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Settings</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Manage your account settings and preferences</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1.5rem' }}>
                {/* Sidebar Tabs */}
                <div className="glass-card" style={{ padding: '1rem', height: 'fit-content' }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '0.75rem 1rem',
                                textAlign: 'left',
                                background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: activeTab === tab.id ? 'white' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '0.25rem',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    {activeTab === 'account' && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Account Settings</h2>

                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Profile Information</h3>
                                {profileMessage && (
                                    <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem', color: '#22c55e', marginBottom: '1rem' }}>
                                        ✅ {profileMessage}
                                    </div>
                                )}
                                {profileError && (
                                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', color: '#ef4444', marginBottom: '1rem' }}>
                                        ❌ {profileError}
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="label">First Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Last Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Email Address</label>
                                        <input type="email" className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                                    </div>
                                    <div>
                                        <label className="label">Phone Number</label>
                                        <input
                                            type="tel"
                                            className="input"
                                            placeholder="+91 9876543210"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button
                                    className="btn-primary"
                                    style={{ marginTop: '1rem' }}
                                    onClick={handleProfileSave}
                                    disabled={profileLoading}
                                >
                                    {profileLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem', color: '#ef4444' }}>Danger Zone</h3>

                                {user?.role === 'TENANT' && (
                                    <div style={{
                                        background: 'rgba(251, 191, 36, 0.1)',
                                        border: '1px solid rgba(251, 191, 36, 0.3)',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem 1rem',
                                        marginBottom: '1rem',
                                        fontSize: '0.85rem',
                                        color: '#fbbf24',
                                    }}>
                                        ⚠️ <strong>Note:</strong> You cannot delete your account if you have active rent agreements or are assigned to a room. Your landlord will be notified.
                                    </div>
                                )}

                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                    Once you delete your account, there is no going back. Please be certain.
                                </p>

                                {deleteError && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem 1rem',
                                        marginBottom: '1rem',
                                        color: '#f87171',
                                        fontSize: '0.875rem',
                                    }}>
                                        ❌ {deleteError}
                                    </div>
                                )}

                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); }}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Delete Account
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={deleteLoading}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                cursor: deleteLoading ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                                        </button>
                                        <button
                                            onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                background: 'transparent',
                                                color: 'var(--color-text-secondary)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Notification Settings</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[
                                    { key: 'emailRentReminders' as keyof UserSettings, label: 'Rent Due Reminders', desc: 'Get notified before rent is due' },
                                    { key: 'emailAgreementUpdates' as keyof UserSettings, label: 'Agreement Updates', desc: 'Notifications about agreement status changes' },
                                    { key: 'emailTenantApplications' as keyof UserSettings, label: 'Tenant Applications', desc: 'New tenant registration alerts' },
                                    { key: 'emailDocumentVerification' as keyof UserSettings, label: 'Document Verification', desc: 'When documents are verified or rejected' },
                                    { key: 'smsNotifications' as keyof UserSettings, label: 'SMS Notifications', desc: 'Receive important alerts via SMS' },
                                    { key: 'whatsappNotifications' as keyof UserSettings, label: 'WhatsApp Updates', desc: 'Get updates on WhatsApp' },
                                ].map((item) => (
                                    <div key={item.key} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        borderRadius: '0.5rem',
                                    }}>
                                        <div>
                                            <p style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{item.label}</p>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{item.desc}</p>
                                        </div>
                                        <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                                            <input
                                                type="checkbox"
                                                checked={settings?.[item.key] as boolean ?? false}
                                                onChange={(e) => handleSettingToggle(item.key, e.target.checked)}
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span
                                                onClick={() => handleSettingToggle(item.key, !(settings?.[item.key] as boolean))}
                                                style={{
                                                    position: 'absolute',
                                                    cursor: 'pointer',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    background: settings?.[item.key] ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '24px',
                                                    transition: '0.3s',
                                                }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    height: '18px',
                                                    width: '18px',
                                                    left: settings?.[item.key] ? '26px' : '4px',
                                                    bottom: '3px',
                                                    background: 'white',
                                                    borderRadius: '50%',
                                                    transition: '0.3s',
                                                }} />
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Security Settings</h2>

                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Change Password</h3>
                                {passwordMessage && (
                                    <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem', color: '#22c55e', marginBottom: '1rem' }}>
                                        ✅ {passwordMessage}
                                    </div>
                                )}
                                {passwordError && (
                                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', color: '#ef4444', marginBottom: '1rem' }}>
                                        ❌ {passwordError}
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                                    <div>
                                        <label className="label">Current Password</label>
                                        <input
                                            type="password"
                                            className="input"
                                            placeholder="••••••••"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">New Password</label>
                                        <input
                                            type="password"
                                            className="input"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Confirm New Password</label>
                                        <input
                                            type="password"
                                            className="input"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        className="btn-primary"
                                        onClick={handlePasswordChange}
                                        disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                                    >
                                        {passwordLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Two-Factor Authentication</h3>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                    Add an extra layer of security to your account by enabling two-factor authentication.
                                </p>
                                <button className="btn-secondary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                    Enable 2FA (Coming Soon)
                                </button>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '2rem', marginTop: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Active Sessions</h3>
                                <div style={{
                                    padding: '1rem',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '0.5rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <div>
                                        <p style={{ fontWeight: '500' }}>Current Session</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Windows • Chrome • Active now</p>
                                    </div>
                                    <span style={{ color: '#22c55e', fontSize: '0.875rem' }}>● Active</span>
                                </div>
                                <button onClick={logout} style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem 1.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                }}>
                                    Log Out
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Preferences</h2>
                            {settingsMessage && (
                                <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem', color: '#22c55e', marginBottom: '1rem' }}>
                                    ✅ {settingsMessage}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label className="label">Language</label>
                                    <select
                                        className="input"
                                        style={{ maxWidth: '300px' }}
                                        value={settings?.language || 'en'}
                                        onChange={(e) => setSettings(s => s ? { ...s, language: e.target.value } : null)}
                                    >
                                        <option value="en">English</option>
                                        <option value="hi">हिंदी (Hindi)</option>
                                        <option value="kn">ಕನ್ನಡ (Kannada)</option>
                                        <option value="ta">தமிழ் (Tamil)</option>
                                        <option value="te">తెలుగు (Telugu)</option>
                                        <option value="mr">मराठी (Marathi)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="label">Currency Format</label>
                                    <select className="input" style={{ maxWidth: '300px' }}>
                                        <option value="inr">₹ Indian Rupee (INR)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="label">Date Format</label>
                                    <select
                                        className="input"
                                        style={{ maxWidth: '300px' }}
                                        value={settings?.dateFormat || 'dd/mm/yyyy'}
                                        onChange={(e) => setSettings(s => s ? { ...s, dateFormat: e.target.value } : null)}
                                    >
                                        <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                                        <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                                        <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="label">Theme</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {['dark', 'light', 'system'].map((theme) => (
                                            <button
                                                key={theme}
                                                onClick={() => setSettings(s => s ? { ...s, theme } : null)}
                                                style={{
                                                    padding: '1rem 2rem',
                                                    background: settings?.theme === theme ? 'var(--color-primary)' : 'transparent',
                                                    border: settings?.theme === theme ? '2px solid var(--color-primary)' : '2px solid rgba(255, 255, 255, 0.2)',
                                                    borderRadius: '0.5rem',
                                                    color: settings?.theme === theme ? 'white' : 'var(--color-text-secondary)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {theme === 'dark' ? '🌙 Dark' : theme === 'light' ? '☀️ Light' : '💻 System'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    className="btn-primary"
                                    style={{ width: 'fit-content', marginTop: '1rem' }}
                                    onClick={handlePreferenceSave}
                                    disabled={settingsLoading}
                                >
                                    {settingsLoading ? 'Saving...' : 'Save Preferences'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
