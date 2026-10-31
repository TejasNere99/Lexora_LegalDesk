const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: { code: 'NETWORK', message: 'Unexpected server response' } };
  }
}

let refreshPromise = null;

async function ensureCsrf() {
  if (readCookie('lexora_csrf')) return;
  await fetch(`${API_BASE}/api/v1/auth/csrf`, { credentials: 'include' });
}

async function rawRequest(path, { method = 'GET', body } = {}, retry = true) {
  await ensureCsrf();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': readCookie('lexora_csrf'),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = await parseBody(res);
  if (res.status === 401 && retry && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    if (!refreshPromise) {
      refreshPromise = fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': readCookie('lexora_csrf') },
      }).finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed.ok) return rawRequest(path, { method, body }, false);
  }
  if (!res.ok || payload.success === false) {
    const error = new Error(payload.error?.message || 'Request failed');
    error.status = res.status;
    error.code = payload.error?.code;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const api = {
  get: (path) => rawRequest(path),
  post: (path, body) => rawRequest(path, { method: 'POST', body }),
  patch: (path, body) => rawRequest(path, { method: 'PATCH', body }),
  delete: (path, body) => rawRequest(path, { method: 'DELETE', body }),
};
