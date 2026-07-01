/**
 * useAuth — the React hook every component uses to know who's logged in.
 *
 * State:
 *   - loading: true while we ask /api/me once at mount
 *   - user:    null when logged out, User when logged in
 *   - error:   most recent auth action error, cleared on next call
 *
 * Methods (all return the result so callers can navigate / show errors):
 *   - login(email, password)
 *   - register(email, password, name?)
 *   - logout()
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { authApi, isErrorResponse, type User } from './api';

export type AuthState = {
  loading: boolean;
  user: User | null;
  error: string | null;
};

const initial: AuthState = { loading: true, user: null, error: null };

export function useAuth() {
  const [state, setState] = useState<AuthState>(initial);
  // Guard against double-fetch in StrictMode dev double-invocation.
  const fetchedRef = useRef(false);

  // Initial probe — run once per mount.
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      const { status, data } = await authApi.me();
      if (status === 200 && data && !isErrorResponse(data)) {
        setState({ loading: false, user: data.user, error: null });
      } else {
        setState({ loading: false, user: null, error: null });
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { status, data } = await authApi.login({ email, password });
    if (status === 200 && data && !isErrorResponse(data)) {
      setState({ loading: false, user: data.user, error: null });
      return { ok: true as const, user: data.user };
    }
    const msg = isErrorResponse(data) ? data.error : 'login_failed';
    setState({ loading: false, user: null, error: msg });
    return { ok: false as const, error: msg };
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { status, data } = await authApi.register({ email, password, name });
    if (status === 201 && data && !isErrorResponse(data)) {
      setState({ loading: false, user: data.user, error: null });
      return { ok: true as const, user: data.user, message: data.message };
    }
    const msg = isErrorResponse(data) ? data.error : 'register_failed';
    setState({ loading: false, user: null, error: msg });
    return { ok: false as const, error: msg };
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ loading: false, user: null, error: null });
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return { ...state, login, register, logout, clearError };
}
