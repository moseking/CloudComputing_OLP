import { apiErrorMessage, t } from '../lib/i18n.js';
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(
  /\/$/,
  '',
);
const TOKEN_KEY = 'oelp_access_token';

export const readToken = () => sessionStorage.getItem(TOKEN_KEY);
export const saveToken = (token) =>
  token
    ? sessionStorage.setItem(TOKEN_KEY, token)
    : sessionStorage.removeItem(TOKEN_KEY);

export async function api(
  path,
  { method = 'GET', body, headers = {}, signal } = {},
) {
  const token = readToken();
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token)
      window.dispatchEvent(new Event('oelp:unauthorized'));
    const error = new Error(apiErrorMessage(data.error, response.status));
    error.status = response.status;
    error.code = data.error?.code;
    error.fields = data.error?.fields;
    throw error;
  }
  return data;
}

export const getJson = (path) => api(path);
export const message = (error) =>
  error.name === 'TimeoutError'
    ? t('Yêu cầu quá thời gian. Vui lòng thử lại.')
    : error instanceof TypeError
      ? t('Không kết nối được API. Kiểm tra hệ thống rồi thử lại.')
      : error.message;
