import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiRequest, getAuthToken } from '../utils/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('llano_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyUser = async () => {
      const activeToken = getAuthToken();
      if (activeToken) {
        try {
          const freshUser = await apiRequest<User>('/auth/me');
          setUser(freshUser);
          localStorage.setItem('llano_user', JSON.stringify(freshUser));
        } catch {
          // A network outage should not discard the cached session. A rejected
          // token is handled separately by the session-expired event.
          const cached = localStorage.getItem('llano_user');
          try { if (cached) setUser(JSON.parse(cached)); } catch { setUser(null); }
        }
      }
      setIsLoading(false);
    };
    verifyUser();
  }, [token]);

  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener('llano:session-expired', handleExpired);
    return () => window.removeEventListener('llano:session-expired', handleExpired);
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await apiRequest<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('llano_token', res.token);
    localStorage.setItem('token', res.token);
    localStorage.setItem('llano_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('llano_token');
    localStorage.removeItem('token');
    localStorage.removeItem('llano_user');
  };

  const isAdmin = user?.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
