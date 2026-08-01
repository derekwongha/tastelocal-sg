import axios from 'axios';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokenStorage';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API = axios.create({ baseURL });
const refreshClient = axios.create({ baseURL });

let refreshPromise = null;

const notifySessionExpired = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:session-expired'));
  }
};

const notifyTokensRefreshed = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:tokens-refreshed'));
  }
};

API.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
}, (error) => Promise.reject(error));

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const shouldRefresh = error.response?.status === 401
      && originalRequest
      && !originalRequest._retry
      && !originalRequest.skipAuthRefresh;

    if (!shouldRefresh) return Promise.reject(error);

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      notifySessionExpired();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshClient
        .post('/api/accounts/token/refresh/', { refresh: refreshToken })
        .then(({ data }) => {
          setTokens({
            access: data.access,
            refresh: data.refresh || refreshToken,
          });
          notifyTokensRefreshed();
          return data.access;
        })
        .catch((refreshError) => {
          clearTokens();
          notifySessionExpired();
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const accessToken = await refreshPromise;
    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return API(originalRequest);
  },
);

export const registerTourist = async (data) => {
  const response = await API.post('/api/accounts/register/tourist/', data, {
    skipAuth: true,
    skipAuthRefresh: true,
  });
  return response.data;
};

export const registerVendor = async (data) => {
  const response = await API.post('/api/accounts/register/vendor/', data, {
    skipAuth: true,
    skipAuthRefresh: true,
  });
  return response.data;
};

export const login = async (data) => {
  const response = await API.post('/api/accounts/login/', data, {
    skipAuth: true,
    skipAuthRefresh: true,
  });
  return response.data;
};

export const logout = async () => {
  const response = await API.post(
    '/api/accounts/logout/',
    { refresh: getRefreshToken() },
    { skipAuthRefresh: true },
  );
  return response.data;
};

export const getProfile = async () => {
  const response = await API.get('/api/accounts/profile/');
  return response.data;
};

export default API;
