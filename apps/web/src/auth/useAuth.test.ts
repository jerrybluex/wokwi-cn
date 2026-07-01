import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAuth } from './useAuth';

const realFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function mockJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useAuth', () => {
  it('starts as loading=true then settles to logged-out when /me 401s', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ error: 'unauthenticated' }, 401),
    );
    const { result } = renderHook(() => useAuth());
    // initial render is loading
    expect(result.current.loading).toBe(true);
    // wait for effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('hydrates the user when /me returns one', async () => {
    const user = {
      id: 'u-1',
      email: 'a@b.com',
      name: 'A',
      emailVerified: true,
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ user }),
    );
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.user).toEqual(user);
  });

  it('login() updates the user state on success', async () => {
    const user = {
      id: 'u-1',
      email: 'a@b.com',
      name: null,
      emailVerified: false,
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      // /api/me initial probe
      mockJsonResponse({ error: 'unauthenticated' }, 401),
    );
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.user).toBeNull();

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ user }),
    );
    let outcome: { ok: boolean; user?: unknown; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.login('a@b.com', 'whatever');
    });
    expect(outcome?.ok).toBe(true);
    expect(result.current.user).toEqual(user);
  });

  it('login() exposes the error code on 401', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ error: 'unauthenticated' }, 401),
    );
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ error: 'invalid_credentials' }, 401),
    );
    let outcome: { ok: boolean; user?: unknown; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.login('a@b.com', 'wrong');
    });
    expect(outcome?.ok).toBe(false);
    expect(outcome?.error).toBe('invalid_credentials');
    expect(result.current.error).toBe('invalid_credentials');
  });

  it('logout() clears the user', async () => {
    const user = {
      id: 'u-1',
      email: 'a@b.com',
      name: null,
      emailVerified: true,
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ user }),
    );
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ ok: true }),
    );
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
  });
});
