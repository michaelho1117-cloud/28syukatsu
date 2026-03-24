const AUTH_KEY = 'shukatsu_auth_v1';

function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function shouldBypassAuthForLocal() {
  if (typeof window === 'undefined') return false;
  const host = window.location?.hostname || '';

  // Local device access: loopback hostname/IP always bypasses auth.
  if (isLocalHostname(host)) return true;

  // Keep a dev fallback for local debug sessions only (not tunnel domains).
  if (import.meta.env.DEV && isLocalHostname(host)) return true;

  return false;
}

function ensureLocalAutoLogin() {
  if (!shouldBypassAuthForLocal()) return false;
  localStorage.setItem(AUTH_KEY, '1');
  return true;
}

export function isAuthenticated() {
  if (ensureLocalAutoLogin()) {
    return true;
  }
  return localStorage.getItem(AUTH_KEY) === '1';
}

export function login(username, password) {
  const ok = username === 'admin' && password === 'admin';
  if (ok) {
    localStorage.setItem(AUTH_KEY, '1');
  }
  return ok;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}
