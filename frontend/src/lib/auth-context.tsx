'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, User, AuthResponse } from './api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: {
        email: string;
        phone?: string;
        password: string;
        firstName: string;
        lastName: string;
        role: 'OWNER' | 'TENANT';
    }) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored auth data
        const storedToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const handleAuthResponse = useCallback((response: AuthResponse) => {
        setToken(response.accessToken);
        setUser(response.user);
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const response = await authApi.login(email, password);
        handleAuthResponse(response);
    }, [handleAuthResponse]);

    const register = useCallback(async (data: {
        email: string;
        phone?: string;
        password: string;
        firstName: string;
        lastName: string;
        role: 'OWNER' | 'TENANT';
    }) => {
        const response = await authApi.register(data);
        handleAuthResponse(response);
    }, [handleAuthResponse]);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
