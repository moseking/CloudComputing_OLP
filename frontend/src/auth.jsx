import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, readToken, saveToken } from './api/client.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(readToken()));
  useEffect(() => {
    let active = true;
    const clear = () => { saveToken(null); setUser(null); setLoading(false); };
    window.addEventListener('oelp:unauthorized', clear);
    if (readToken()) api('/api/users/me').then(data => { if (active) setUser(data.user); })
      .catch(() => { if (active) clear(); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener('oelp:unauthorized', clear); };
  }, []);
  const login = async body => {
    const result = await api('/api/users/login', { method: 'POST', body });
    saveToken(result.access_token); setUser(result.user); return result.user;
  };
  const logout = () => { saveToken(null); setUser(null); window.location.hash = '/'; };
  return <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>{children}</AuthContext.Provider>;
}
