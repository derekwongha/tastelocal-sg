const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const LEGACY_TOKEN_KEY = 'token';
const LEGACY_USER_KEY = 'user';

const storage = () => (typeof window === 'undefined' ? null : window.localStorage);

export const getAccessToken = () => storage()?.getItem(ACCESS_TOKEN_KEY) || null;

export const getRefreshToken = () => storage()?.getItem(REFRESH_TOKEN_KEY) || null;

export const setTokens = ({ access, refresh }) => {
  const target = storage();
  if (!target || !access) return;

  target.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) target.setItem(REFRESH_TOKEN_KEY, refresh);
  target.removeItem(LEGACY_TOKEN_KEY);
  target.removeItem(LEGACY_USER_KEY);
};

export const clearLegacyToken = () => {
  const target = storage();
  target?.removeItem(LEGACY_TOKEN_KEY);
  target?.removeItem(LEGACY_USER_KEY);
};

export const clearTokens = () => {
  const target = storage();
  if (!target) return;

  target.removeItem(ACCESS_TOKEN_KEY);
  target.removeItem(REFRESH_TOKEN_KEY);
  target.removeItem(LEGACY_TOKEN_KEY);
  target.removeItem(LEGACY_USER_KEY);
};

export const hasStoredSession = () => Boolean(getAccessToken() || getRefreshToken());
