import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';
import { roleDash } from '../utils/helpers';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('cms_token');
    if (t) {
      authAPI.me().then(r => setUser(r.data)).catch(() => localStorage.removeItem('cms_token')).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const r = await authAPI.login({ email, password });
    localStorage.setItem('cms_token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };
  const logout = () => { localStorage.removeItem('cms_token'); setUser(null); };
  const is     = (...roles) => user && roles.includes(user.role);
  const dashPath = () => { const d = roleDash(user?.role); return d === 'chairman' ? '/' : '/' + d; };

  return <Ctx.Provider value={{ user, loading, login, logout, is, dashPath }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
