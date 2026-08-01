import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getProfile, login, logout, registerTourist, registerVendor } from '../api/auth';
import {
  clearLegacyToken,
  clearTokens,
  getAccessToken,
  hasStoredSession,
  setTokens,
} from '../api/tokenStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getAccessToken());
  const [loading, setLoading] = useState(true);

  const logoutUserLocal = useCallback(() => {
    clearTokens();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    clearLegacyToken();

    const restoreSession = async () => {
      if (!hasStoredSession()) {
        if (active) setLoading(false);
        return;
      }

      try {
        const data = await getProfile();
        if (!active) return;
        setToken(getAccessToken());
        setUser({
          ...data.user,
          vendor_profile: data.vendor_profile || null,
        });
      } catch (error) {
        if (active) {
          console.error('Failed to restore authentication session:', error);
          logoutUserLocal();
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const handleSessionExpired = () => {
      if (active) logoutUserLocal();
    };

    const handleTokensRefreshed = () => {
      if (active) setToken(getAccessToken());
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    window.addEventListener('auth:tokens-refreshed', handleTokensRefreshed);
    restoreSession();

    return () => {
      active = false;
      window.removeEventListener('auth:session-expired', handleSessionExpired);
      window.removeEventListener('auth:tokens-refreshed', handleTokensRefreshed);
    };
  }, [logoutUserLocal]);

  const applyAuthentication = (data) => {
    setTokens({ access: data.access, refresh: data.refresh });
    setToken(data.access);
    setUser({
      ...data.user,
      vendor_profile: data.vendor_profile || null,
    });
  };

  const loginUser = async (credentials) => {
    const data = await login(credentials);
    applyAuthentication(data);
    return data;
  };

  const registerTouristUser = async (formData) => {
    const data = await registerTourist(formData);
    applyAuthentication(data);
    return data;
  };

  const registerVendorUser = async (formData) => {
    const data = await registerVendor(formData);
    applyAuthentication(data);
    return data;
  };

  const logoutUser = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Backend logout error:', error);
    } finally {
      logoutUserLocal();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      loginUser,
      registerTouristUser,
      registerVendorUser,
      logoutUser,
      isAuthenticated: Boolean(token && user),
      role: user?.role || null,
      approvalStatus: user?.role === 'Vendor'
        ? (user?.vendor_profile?.approval_status || 'Pending')
        : null,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
