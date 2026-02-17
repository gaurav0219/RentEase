const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Helper to get token from localStorage
const getStoredToken = (): string | undefined => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('accessToken') || undefined;
    }
    return undefined;
};

interface RequestOptions extends RequestInit {
    token?: string;
}

class ApiClient {
    private getHeaders(token?: string): HeadersInit {
        const authToken = token || getStoredToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        return headers;
    }

    async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(options.token),
            ...options,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Request failed');
        }
        return response.json();
    }

    async post<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(options.token),
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Request failed');
        }
        return response.json();
    }

    async patch<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            headers: this.getHeaders(options.token),
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Request failed');
        }
        return response.json();
    }

    async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(options.token),
            ...options,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Request failed');
        }
        return response.json();
    }

    async uploadFile<T>(endpoint: string, file: File, fieldName: string = 'file', additionalData?: Record<string, string>, options: RequestOptions = {}): Promise<T> {
        const formData = new FormData();
        formData.append(fieldName, file);
        if (additionalData) {
            Object.entries(additionalData).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        const authToken = options.token || getStoredToken();
        const headers: HeadersInit = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || 'Upload failed');
        }
        return response.json();
    }

    async downloadFile(endpoint: string, options: RequestOptions = {}): Promise<Blob> {
        const authToken = options.token || getStoredToken();
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                Authorization: authToken ? `Bearer ${authToken}` : '',
            },
        });
        if (!response.ok) {
            throw new Error('Download failed');
        }
        return response.blob();
    }
}

export const api = new ApiClient();

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        api.post<AuthResponse>('/auth/login', { email, password }),
    register: (data: RegisterData) =>
        api.post<AuthResponse>('/auth/register', data),
    refresh: (refreshToken: string) =>
        api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),
};

// Properties API
export const propertiesApi = {
    getAll: () =>
        api.get<Property[]>('/properties'),
    getOne: (id: string) =>
        api.get<Property>(`/properties/${id}`),
    create: (data: CreatePropertyData) =>
        api.post<Property>('/properties', data),
    update: (id: string, data: Partial<CreatePropertyData>) =>
        api.patch<Property>(`/properties/${id}`, data),
    delete: (id: string) =>
        api.delete(`/properties/${id}`),
    getStats: () =>
        api.get<PropertyStats>('/properties/stats'),
};

// Rooms API
export const roomsApi = {
    getByProperty: (propertyId: string) =>
        api.get<Room[]>(`/rooms?propertyId=${propertyId}`),
    getOne: (id: string) =>
        api.get<Room>(`/rooms/${id}`),
    create: (data: CreateRoomData) =>
        api.post<Room>('/rooms', data),
    update: (id: string, data: Partial<CreateRoomData>) =>
        api.patch<Room>(`/rooms/${id}`, data),
    delete: (id: string) =>
        api.delete(`/rooms/${id}`),
    assignTenant: (roomId: string, tenantId: string) =>
        api.post(`/rooms/${roomId}/assign-tenant`, { tenantId }),
    removeTenant: (roomId: string) =>
        api.post(`/rooms/${roomId}/remove-tenant`, {}),
};

// Tenants API
export const tenantsApi = {
    getAll: (status?: string) =>
        api.get<Tenant[]>(`/tenants${status ? `?status=${status}` : ''}`),
    getOne: (id: string) =>
        api.get<Tenant>(`/tenants/${id}`),
    getProfile: () =>
        api.get<Tenant>('/tenants/profile'),
    updateProfile: (data: UpdateTenantData) =>
        api.patch<Tenant>('/tenants/profile', data),
    approve: (id: string, data: { status: string; rejectionReason?: string }) =>
        api.patch(`/tenants/${id}/approve`, data),
    getMyAgreements: () =>
        api.get<Agreement[]>('/tenants/my-agreements'),
};

// Documents API
export const documentsApi = {
    upload: (file: File, type: string) =>
        api.uploadFile('/documents/upload', file, 'file', { type }),
    getMyDocuments: () =>
        api.get<Document[]>('/documents/my-documents'),
    getByTenant: (tenantId: string) =>
        api.get<Document[]>(`/documents/tenant/${tenantId}`),
    verify: (id: string) =>
        api.post(`/documents/${id}/verify`, {}),
    reject: (id: string) =>
        api.post(`/documents/${id}/reject`, {}),
    delete: (id: string) =>
        api.delete(`/documents/${id}`),
    download: (id: string) =>
        api.downloadFile(`/documents/${id}/download`),
};

// Agreements API
export const agreementsApi = {
    getAll: () =>
        api.get<Agreement[]>('/agreements'),
    getOne: (id: string) =>
        api.get<Agreement>(`/agreements/${id}`),
    create: (data: CreateAgreementData) =>
        api.post<Agreement>('/agreements', data),
    update: (id: string, data: Partial<CreateAgreementData>) =>
        api.patch<Agreement>(`/agreements/${id}`, data),
    updateStatus: (id: string, status: string) =>
        api.patch(`/agreements/${id}/status?status=${status}`, {}),
    delete: (id: string) =>
        api.delete(`/agreements/${id}`),
    download: (id: string) =>
        api.downloadFile(`/agreements/${id}/download`),
};

// Users API
export const usersApi = {
    getProfile: () =>
        api.get<UserProfile>('/users/profile'),
    updateProfile: (data: UpdateProfileData) =>
        api.patch<UserProfile>('/users/profile', data),
    changePassword: (data: ChangePasswordData) =>
        api.patch<{ message: string }>('/users/password', data),
    deleteAccount: () =>
        api.delete<{ message: string }>('/users/account'),
    getSettings: () =>
        api.get<UserSettings>('/users/settings'),
    updateSettings: (data: Partial<UserSettings>) =>
        api.patch<UserSettings>('/users/settings', data),
};

// Types
export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'OWNER' | 'TENANT';
}

export interface RegisterData {
    email: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'OWNER' | 'TENANT';
}

export interface Property {
    id: string;
    name: string;
    type: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    description?: string;
    rooms?: Room[];
    _count?: { rooms: number };
}

export interface CreatePropertyData {
    name: string;
    type: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    description?: string;
}

export interface PropertyStats {
    totalProperties: number;
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyRate: number;
    totalMonthlyRent: number;
}

export interface Room {
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
    property?: Property;
    currentTenant?: Tenant;
}

export interface CreateRoomData {
    propertyId: string;
    roomNumber: string;
    floor: number;
    description?: string;
    rentAmount: number;
    securityDeposit: number;
    maintenanceCharge?: number;
    furnishing?: string;
    amenities?: string[];
}

export interface Tenant {
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
    createdAt?: string;
    user: User;
    documents?: Document[];
    currentRoom?: Room;
}

export interface UpdateTenantData {
    fatherName?: string;
    motherName?: string;
    dateOfBirth?: string;
    permanentAddress?: string;
    profession?: string;
    companyName?: string;
    emergencyContact?: string;
    emergencyContactName?: string;
    numberOfOccupants?: number;
}

export interface Document {
    id: string;
    type: string;
    originalName: string;
    isVerified: boolean;
    maskedData?: string;
    createdAt: string;
}

export interface Agreement {
    id: string;
    agreementNumber: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    maintenanceCharge?: number;
    rentDueDay: number;
    lockInPeriodMonths: number;
    noticePeriodDays: number;
    rentEscalation?: number;
    jurisdiction: string;
    pdfPath?: string;
    createdAt?: string;
    room?: Room;
    tenant?: Tenant;
}

export interface CreateAgreementData {
    roomId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    maintenanceCharge?: number;
    rentDueDay?: number;
    lockInPeriodMonths?: number;
    noticePeriodDays?: number;
    rentEscalation?: number;
    jurisdiction: string;
    additionalClauses?: Record<string, string>;
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: 'OWNER' | 'TENANT';
    createdAt?: string;
    lastLoginAt?: string;
}

export interface UpdateProfileData {
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

export interface UserSettings {
    id?: string;
    emailRentReminders: boolean;
    emailAgreementUpdates: boolean;
    emailTenantApplications: boolean;
    emailDocumentVerification: boolean;
    smsNotifications: boolean;
    whatsappNotifications: boolean;
    language: string;
    dateFormat: string;
    theme: string;
}

// Applications
export interface AvailableRoom {
    id: string;
    roomNumber: string;
    floor: number;
    description?: string;
    rentAmount: number;
    securityDeposit: number;
    furnishing: string;
    amenities: string[];
    property: {
        id: string;
        name: string;
        address: string;
        city: string;
        state: string;
        type: string;
    };
}

export interface TenantApplication {
    id: string;
    message?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
    reviewedAt?: string;
    reviewNotes?: string;
    createdAt: string;
    tenant?: {
        id: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone?: string;
        };
        documents?: Array<{
            id: string;
            type: string;
            isVerified: boolean;
        }>;
    };
    room: {
        id: string;
        roomNumber: string;
        rentAmount?: number;
        property: {
            id: string;
            name: string;
            address?: string;
            city?: string;
        };
    };
}

export interface CreateApplicationData {
    roomId: string;
    message?: string;
}

export interface ReviewApplicationData {
    status: 'APPROVED' | 'REJECTED';
    reviewNotes?: string;
}

export const applicationsApi = {
    getAvailableRooms: () => api.get<AvailableRoom[]>('/applications/rooms/available'),
    apply: (data: CreateApplicationData) => api.post<TenantApplication>('/applications', data),
    getMyApplications: () => api.get<TenantApplication[]>('/applications/my-applications'),
    withdraw: (applicationId: string) => api.patch<TenantApplication>(`/applications/${applicationId}/withdraw`),
    getForOwner: () => api.get<TenantApplication[]>('/applications/for-owner'),
    review: (applicationId: string, data: ReviewApplicationData) =>
        api.patch<TenantApplication>(`/applications/${applicationId}/review`, data),
};

// Notification types
export interface Notification {
    id: string;
    type: string;
    subject: string;
    message: string;
    isRead: boolean;
    readAt: string | null;
    sentAt: string | null;
    createdAt: string;
}

// Notifications API
export const notificationsApi = {
    getAll: (limit?: number) => api.get<Notification[]>(`/notifications${limit ? `?limit=${limit}` : ''}`),
    getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
    markAsRead: (id: string) => api.patch<void>(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch<void>('/notifications/read-all'),
    delete: (id: string) => api.delete<void>(`/notifications/${id}`),
};

