/**
 * Base URL for REST + Socket.IO. Set VITE_BACKEND_URL at build time when the API
 * is on another origin; omit it when the API is served from the same host (e.g. STATIC_ROOT).
 */
export function getBackendBaseUrl() {
  const fromEnv = import.meta.env.VITE_BACKEND_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}
