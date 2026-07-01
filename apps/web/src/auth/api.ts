/**
 * api.ts — fetch wrappers for /api/auth/* and /api/me.
 *
 * All requests use credentials: 'include' so the session cookie travels
 * with cross-origin calls in dev (Vite proxy on /api → :4000).
 */
export type User = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
};

export type AuthResponse = { user: User; message?: string };
export type ErrorResponse = { error: string; details?: unknown };

const BASE = ''; // Vite proxies /api → :4000

async function jsonFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T | ErrorResponse }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: 'bad_response', details: text };
    }
  }
  return { status: res.status, data: data as T | ErrorResponse };
}

export const authApi = {
  register(payload: { email: string; password: string; name?: string }) {
    return jsonFetch<AuthResponse>('POST', '/api/auth/register', payload);
  },
  login(payload: { email: string; password: string }) {
    return jsonFetch<AuthResponse>('POST', '/api/auth/login', payload);
  },
  logout() {
    return jsonFetch<{ ok: true }>('POST', '/api/auth/logout');
  },
  forgot(payload: { email: string }) {
    return jsonFetch<{ ok: true; message: string }>('POST', '/api/auth/forgot', payload);
  },
  reset(payload: { token: string; password: string }) {
    return jsonFetch<{ ok: true; message: string }>('POST', '/api/auth/reset', payload);
  },
  me() {
    return jsonFetch<{ user: User }>('GET', '/api/me');
  },
};

export function isErrorResponse(x: unknown): x is ErrorResponse {
  return !!x && typeof x === 'object' && 'error' in (x as Record<string, unknown>);
}
