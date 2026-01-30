import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../lib/axios';

interface User {
    id: string;
    full_name: string;
    email: string;
    created_at: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string, remember?: boolean) => Promise<void>;
    signup: (fullName: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check for existing session on mount
    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('session_token');
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await api.get('/auth/me');
                setUser(response.data);
                setIsAuthenticated(true);
            } catch {
                // Session invalid - clear token
                localStorage.removeItem('session_token');
                localStorage.removeItem('user_id');
            } finally {
                setLoading(false);
            }
        };

        verifySession();
    }, []);

    const login = async (email: string, password: string, remember = false) => {
        const response = await api.post('/auth/login', { email, password, remember });

        localStorage.setItem('session_token', response.data.token);
        localStorage.setItem('user_id', response.data.user_id);

        // Fetch user data
        const userResponse = await api.get('/auth/me');
        setUser(userResponse.data);
        setIsAuthenticated(true);
    };

    const signup = async (fullName: string, email: string, password: string) => {
        const response = await api.post('/auth/signup', {
            full_name: fullName,
            email,
            password,
        });

        localStorage.setItem('session_token', response.data.token);
        localStorage.setItem('user_id', response.data.user_id);

        // Fetch user data
        const userResponse = await api.get('/auth/me');
        setUser(userResponse.data);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('session_token');
            localStorage.removeItem('user_id');
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
