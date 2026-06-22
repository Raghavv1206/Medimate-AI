import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Axios instance with interceptors
export const apiClient = axios.create({ baseURL: API_BASE });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        apiClient.defaults.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(original);
      } catch {
        localStorage.clear();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Helper: normalize user object from backend
function normalizeUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.full_name || u.name || '',
    full_name: u.full_name || u.name || '',
    role: u.role,
    avatar_url: u.avatar_url || '',
    whatsapp_number: u.whatsapp_number || '',
    has_profile: u.has_profile,
    onboarding_done: u.onboarding_done,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await apiClient.post('/auth/login/', credentials);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const userData = normalizeUser(data.user);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await apiClient.post('/auth/register/', payload);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const userData = normalizeUser(data.user);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await apiClient.post('/auth/logout/', { refresh });
    } catch {}
    localStorage.clear();
    setUser(null);
  }, []);

  // Refresh user data from /auth/me/
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/me/');
      const userData = normalizeUser(data);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
