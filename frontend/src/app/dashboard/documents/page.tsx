'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDataRefresh } from '@/lib/data-refresh-context';
import { documentsApi, tenantsApi, Document } from '@/lib/api';

interface Tenant {
    id: string;
    status: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
    };
    documents: Document[];
}

export default function DocumentsPage() {
    const { user, token } = useAuth();
    const { triggerRefresh } = useDataRefresh();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedType, setSelectedType] = useState('AADHAAR');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!token || !user) return;
        if (user.role === 'OWNER') {
            loadTenants();
        } else if (user.role === 'TENANT') {
            loadMyDocuments();
        }
    }, [token, user]);

    useEffect(() => {
        if (selectedTenantId && user?.role === 'OWNER') {
            loadTenantDocuments(selectedTenantId);
        }
    }, [selectedTenantId]);

    const loadMyDocuments = async () => {
        try {
            const data = await documentsApi.getMyDocuments();
            setDocuments(data);
        } catch (error) {
            console.error('Failed to load documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTenants = async () => {
        try {
            const data = await tenantsApi.getAll() as unknown as Tenant[];
            setTenants(data);
            if (data.length > 0) {
                setSelectedTenantId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to load tenants:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTenantDocuments = async (tenantId: string) => {
        try {
            const data = await documentsApi.getByTenant(tenantId);
            setDocuments(data);
        } catch (error) {
            console.error('Failed to load tenant documents:', error);
            setDocuments([]);
        }
    };

    const handleUpload = async (file: File) => {
        if (!token) return;

        setIsUploading(true);
        try {
            await documentsApi.upload(file, selectedType);
            loadMyDocuments();
            triggerRefresh(); // Notify other pages that data has changed
        } catch (error) {
            console.error('Failed to upload document:', error);
            alert('Failed to upload document. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleDelete = async (id: string) => {
        if (!token || !confirm('Are you sure you want to delete this document?')) return;

        try {
            await documentsApi.delete(id);
            loadMyDocuments();
            triggerRefresh(); // Notify other pages that data has changed
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    const handleVerify = async (id: string) => {
        try {
            await documentsApi.verify(id);
            if (selectedTenantId) {
                loadTenantDocuments(selectedTenantId);
            }
            triggerRefresh(); // Notify other pages that data has changed
        } catch (error) {
            console.error('Failed to verify document:', error);
            alert('Failed to verify document');
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Are you sure you want to reject this document? The tenant will need to upload a new one.')) return;
        try {
            await documentsApi.reject(id);
            if (selectedTenantId) {
                loadTenantDocuments(selectedTenantId);
            }
            triggerRefresh(); // Notify other pages that data has changed
        } catch (error) {
            console.error('Failed to reject document:', error);
            alert('Failed to reject document');
        }
    };

    const handleDownload = async (id: string, name: string) => {
        if (!token) return;

        try {
            const blob = await documentsApi.download(id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download document:', error);
        }
    };

    const getDocumentIcon = (type: string) => {
        switch (type) {
            case 'AADHAAR': return '🪪';
            case 'PAN': return '💳';
            case 'PHOTO': return '📷';
            default: return '📄';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    // OWNER VIEW - View and verify tenant documents
    if (user?.role === 'OWNER') {
        return (
            <div className="animate-fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Tenant Documents</h1>
                    <p className="text-slate-400">View and verify tenant KYC documents</p>
                </div>

                {/* Tenant Selector */}
                {tenants.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-semibold mb-2">No Tenants Yet</h3>
                        <p className="text-slate-400">Tenants will appear here once they register and you can view their documents.</p>
                    </div>
                ) : (
                    <>
                        <div className="glass-card p-4 mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Select Tenant</label>
                            <select
                                value={selectedTenantId}
                                onChange={(e) => setSelectedTenantId(e.target.value)}
                                className="input-field"
                            >
                                {tenants.map((tenant) => (
                                    <option key={tenant.id} value={tenant.id}>
                                        {tenant.user.firstName} {tenant.user.lastName} - {tenant.user.email} ({tenant.status})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selected Tenant Info */}
                        {selectedTenantId && (
                            <div className="glass-card p-4 mb-6">
                                {(() => {
                                    const tenant = tenants.find(t => t.id === selectedTenantId);
                                    if (!tenant) return null;
                                    return (
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold">
                                                {tenant.user.firstName[0]}{tenant.user.lastName[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{tenant.user.firstName} {tenant.user.lastName}</p>
                                                <p className="text-slate-400 text-sm">{tenant.user.email}</p>
                                            </div>
                                            <span
                                                style={{
                                                    marginLeft: 'auto',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    background: tenant.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.2)' :
                                                        tenant.status === 'PENDING' ? 'rgba(251, 191, 36, 0.2)' :
                                                            tenant.status === 'ACTIVE' ? 'rgba(99, 102, 241, 0.2)' :
                                                                'rgba(239, 68, 68, 0.2)',
                                                    color: tenant.status === 'APPROVED' ? '#22c55e' :
                                                        tenant.status === 'PENDING' ? '#fbbf24' :
                                                            tenant.status === 'ACTIVE' ? '#6366f1' :
                                                                '#ef4444',
                                                }}
                                            >
                                                {tenant.status}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Documents List */}
                        {documents.length === 0 ? (
                            <div className="glass-card p-12 text-center">
                                <div className="text-6xl mb-4">📁</div>
                                <h3 className="text-xl font-semibold mb-2">No Documents</h3>
                                <p className="text-slate-400">This tenant hasn't uploaded any documents yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {documents.map((doc) => (
                                    <div key={doc.id} className="glass-card p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                                                {getDocumentIcon(doc.type)}
                                            </div>
                                            <div>
                                                <p className="font-medium">{doc.originalName}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="badge badge-info text-xs">{doc.type}</span>
                                                    {doc.isVerified ? (
                                                        <span className="badge badge-success text-xs">✓ Verified</span>
                                                    ) : (
                                                        <span className="badge badge-warning text-xs">⏳ Pending Verification</span>
                                                    )}
                                                    {doc.maskedData && (
                                                        <span className="text-slate-400 text-sm">{doc.maskedData}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDownload(doc.id, doc.originalName)}
                                                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
                                                title="Download"
                                            >
                                                📥
                                            </button>
                                            {!doc.isVerified && (
                                                <>
                                                    <button
                                                        onClick={() => handleVerify(doc.id)}
                                                        className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-medium"
                                                        title="Verify Document"
                                                    >
                                                        ✓ Verify
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(doc.id)}
                                                        className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium"
                                                        title="Reject Document"
                                                    >
                                                        ✕ Reject
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Summary Stats */}
                        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="glass-card p-4 text-center">
                                <p className="text-2xl font-bold text-indigo-400">{documents.length}</p>
                                <p className="text-sm text-slate-400">Total Documents</p>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <p className="text-2xl font-bold text-green-400">{documents.filter(d => d.isVerified).length}</p>
                                <p className="text-sm text-slate-400">Verified</p>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <p className="text-2xl font-bold text-yellow-400">{documents.filter(d => !d.isVerified).length}</p>
                                <p className="text-sm text-slate-400">Pending</p>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <p className="text-2xl font-bold text-purple-400">{tenants.length}</p>
                                <p className="text-sm text-slate-400">Total Tenants</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // TENANT VIEW - Upload and manage own documents
    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">My Documents</h1>
                <p className="text-slate-400">Upload and manage your KYC documents</p>
            </div>

            {/* Upload Section */}
            <div className="glass-card p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Upload New Document</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="input-field flex-1"
                    >
                        <option value="AADHAAR">Aadhaar Card</option>
                        <option value="PAN">PAN Card</option>
                        <option value="PHOTO">Passport Photo</option>
                        <option value="ADDRESS_PROOF">Address Proof</option>
                        <option value="OTHER">Other</option>
                    </select>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Uploading...
                            </>
                        ) : (
                            <>
                                <span>📤</span>
                                Choose File
                            </>
                        )}
                    </button>
                </div>
                <p className="text-sm text-slate-500 mt-3">
                    Accepted formats: JPG, PNG, PDF (max 5MB)
                </p>
            </div>

            {/* Documents List */}
            {documents.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-6xl mb-4">📁</div>
                    <h3 className="text-xl font-semibold mb-2">No Documents Yet</h3>
                    <p className="text-slate-400">Upload your first document above to get started</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {documents.map((doc) => (
                        <div key={doc.id} className="glass-card p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                                    {getDocumentIcon(doc.type)}
                                </div>
                                <div>
                                    <p className="font-medium">{doc.originalName}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="badge badge-info text-xs">{doc.type}</span>
                                        {doc.isVerified ? (
                                            <span className="badge badge-success text-xs">✓ Verified</span>
                                        ) : (
                                            <span className="badge badge-warning text-xs">Pending</span>
                                        )}
                                        {doc.maskedData && (
                                            <span className="text-slate-400 text-sm">{doc.maskedData}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDownload(doc.id, doc.originalName)}
                                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
                                    title="Download"
                                >
                                    📥
                                </button>
                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Required Documents Notice */}
            <div className="mt-8 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                <h3 className="font-semibold text-indigo-400 mb-2">📋 Required Documents</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                    <li>✓ Aadhaar Card (front and back)</li>
                    <li>✓ PAN Card</li>
                    <li>✓ Passport-size Photo</li>
                    <li>○ Address Proof (optional)</li>
                </ul>
            </div>
        </div>
    );
}
