import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAutosave } from './useAutosave';

const realFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mockJson(body: unknown, status = 200) {
  // Return a fresh Response on every call so the test can call fetch
  // multiple times without tripping "Body already read".
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
}

describe('useAutosave', () => {
  it('does nothing when projectId is null', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const { result } = renderHook(() => useAutosave(null, 'code', 'wiring'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('skips the initial mount and saves after a value change', async () => {
    vi.useFakeTimers();
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(mockJson({ project: { id: 'p', code: 'new', wiring: 'w' } }));

    const { rerender, result } = renderHook(
      ({ code, wiring }: { code: string; wiring: string }) =>
        useAutosave('p1', code, wiring),
      { initialProps: { code: 'first', wiring: 'w1' } },
    );

    // initial mount: no fetch
    expect(fetchMock).not.toHaveBeenCalled();

    // change code → after 10s it should save
    rerender({ code: 'second', wiring: 'w1' });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/projects/p1');
    expect(result.current.status).toBe('saved');
  });

  it('saveNow forces an immediate save', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(mockJson({ project: { id: 'p', code: 'c', wiring: 'w' } }));

    const { result } = renderHook(() => useAutosave('p1', 'code', 'wiring'));
    await act(async () => {
      await result.current.saveNow();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });

  it('captures errors as status=error', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(mockJson({ error: 'forbidden' }, 403));

    const { result } = renderHook(() => useAutosave('p1', 'c', 'w'));
    await act(async () => {
      await result.current.saveNow();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('forbidden');
  });

  it('does not save when content matches the last persisted snapshot', async () => {
    vi.useFakeTimers();
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(mockJson({ project: { id: 'p', code: 'c', wiring: 'w' } }));

    const { rerender } = renderHook(
      ({ code, wiring }: { code: string; wiring: string }) =>
        useAutosave('p1', code, wiring),
      { initialProps: { code: 'A', wiring: 'w' } },
    );

    // First change to B (triggers effect — initial mount was skipped)
    rerender({ code: 'B', wiring: 'w' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Change to C — debounced save fires
    rerender({ code: 'C', wiring: 'w' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Re-render with the same values that were last persisted — no new
    // network call, even though the effect ran.
    rerender({ code: 'C', wiring: 'w' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resets snapshot when projectId changes', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(mockJson({ project: { id: 'p', code: 'c', wiring: 'w' } }));

    const { rerender, result } = renderHook(
      ({ id }: { id: string }) => useAutosave(id, 'c', 'w'),
      { initialProps: { id: 'p1' } },
    );
    await act(async () => {
      await result.current.saveNow();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Switch projects — internal snapshot resets, so the next saveNow hits
    // the network again with the new id.
    rerender({ id: 'p2' });
    await act(async () => {
      await result.current.saveNow();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/projects/p2');
  });
});
