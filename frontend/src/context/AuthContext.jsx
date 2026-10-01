import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextDef';
import { api, getStoredUser, getStoredToken, setStoredSession, clearStoredSession } from '../api/client';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      const storedToken = getStoredToken();
      if (storedToken) {
        try {
          const profile = await api.getMe();
          if (isMounted && profile) {
            setCurrentUser(profile);
            setStoredSession(storedToken, profile);
          }
        } catch (err) {
          console.warn('Stored session invalid or expired:', err.message);
          if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('Invalid'))) {
            if (isMounted) logout();
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    if (data && data.token) {
      setToken(data.token);
      setCurrentUser(data.user);
      return data.user;
    }
    throw new Error('Authentication failed');
  };

  const register = async (registerData) => {
    const data = await api.register(registerData);
    if (data && data.token) {
      setToken(data.token);
      setCurrentUser(data.user);
      return data.user;
    }
    throw new Error('Registration failed');
  };

  const isAuthenticated = !!currentUser && !!token;
  const isCustomer = currentUser?.role === 'CUSTOMER';
  const isTechnician = currentUser?.role === 'TECHNICIAN';
  const isDispatcher = currentUser?.role === 'DISPATCHER';
  const isAdmin = currentUser?.role === 'ADMINISTRATOR';

  return (
    <AuthContext.Provider value={{
      currentUser,
      token,
      isAuthenticated,
      isCustomer,
      isTechnician,
      isDispatcher,
      isAdmin,
      login,
      register,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
