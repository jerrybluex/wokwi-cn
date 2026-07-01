import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAiChat } from './useAiChat';

const realFetch = globalThis.fetch;

/** Build a mock SSE ReadableStream from a sequence of event objects. */
function mockSseStream(events: Record<string, unknown>[]): Response {
  const body = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('useAiChat', () => {
  it('starts idle with empty text', () => {
    const { result } = renderHook(() => useAiChat());
    expect(result.current.status).toBe('idle');
    expect(result.current.text).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isRateLimited).toBe(false);
  });

  it('accumulates all chunks and finishes with done status', async () => {
    const chunks = ['你好', '，我', '是单片', '机小助', '手'];
    const doneEvent = { done: true, tokensIn: 100, tokensOut: 50 };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockSseStream([...chunks.map((c) => ({ chunk: c })), doneEvent]),
    );

    const { result } = renderHook(() => useAiChat());

    // await act + await send so all state updates flush before assertions
    await act(async () => {
      await result.current.send({ taskType: 'explain', code: 'void setup(){}' });
    });

    expect(result.current.status).toBe('done');
    expect(result.current.text).toBe('你好，我是单片机小助手');
  });

  it('sets status to done after last SSE event', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockSseStream([{ chunk: 'test' }, { done: true, tokensIn: 10, tokensOut: 10 }]),
    );

    const { result } = renderHook(() => useAiChat());
    await act(async () => {
      await result.current.send({ taskType: 'hint' });
    });
    expect(result.current.status).toBe('done');
  });

  it('sets fallback status when SSE contains fallback event', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockSseStream([
        { fallback: true, message: 'AI 暂时不可用，请稍后重试。' },
        { done: true, tokensIn: 0, tokensOut: 0 },
      ]),
    );

    const { result } = renderHook(() => useAiChat());
    await act(async () => {
      await result.current.send({ taskType: 'error', errorMessage: 'error text' });
    });
    expect(result.current.status).toBe('fallback');
    expect(result.current.text).toBe('AI 暂时不可用，请稍后重试。');
  });

  it('sets rate_limited status when SSE contains rateLimit event', async () => {
    const resetsAt = '2026-07-02T00:00:00.000Z';
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockSseStream([{ rateLimit: true, remaining: 0, resetsAt }]),
    );

    const { result } = renderHook(() => useAiChat());
    await act(async () => {
      await result.current.send({ taskType: 'explain', code: 'test' });
    });
    expect(result.current.status).toBe('rate_limited');
    expect(result.current.isRateLimited).toBe(true);
  });

  it('sets error status when fetch returns non-ok', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('', { status: 500 }),
    );

    const { result } = renderHook(() => useAiChat());
    await act(async () => {
      await result.current.send({ taskType: 'hint' });
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('500');
  });

  it('resets state via reset()', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockSseStream([{ chunk: 'hello' }, { done: true, tokensIn: 5, tokensOut: 5 }]),
    );

    const { result } = renderHook(() => useAiChat());
    await act(async () => {
      await result.current.send({ taskType: 'explain', code: 'test' });
    });
    expect(result.current.text).toBe('hello');

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.text).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('sends explain payload with code field', async () => {
    let capturedBody: unknown;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_url: string, init?: RequestInit) => {
        capturedBody = init?.body;
        return Promise.resolve(mockSseStream([{ done: true, tokensIn: 0, tokensOut: 0 }]));
      },
    );

    const { result } = renderHook(() => useAiChat());
    await act(async () => {
      await result.current.send({ taskType: 'explain', code: 'void loop(){}' });
    });

    expect(capturedBody).not.toBeUndefined();
    const parsed = JSON.parse(capturedBody as string);
    expect(parsed.taskType).toBe('explain');
    expect(parsed.code).toBe('void loop(){}');
  });

  it('sends error payload with errorMessage field', async () => {
    let capturedBody: unknown;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_url: string, init?: RequestInit) => {
        capturedBody = init?.body;
        return Promise.resolve(mockSseStream([{ done: true, tokensIn: 0, tokensOut: 0 }]));
      },
    );

    const { result } = renderHook(() => useAiChat());
    await act(async () => {
      await result.current.send({ taskType: 'error', errorMessage: 'was not declared' });
    });

    expect(capturedBody).not.toBeUndefined();
    const parsed = JSON.parse(capturedBody as string);
    expect(parsed.taskType).toBe('error');
    expect(parsed.errorMessage).toBe('was not declared');
  });

  it('sends hint payload without code or errorMessage', async () => {
    let capturedBody: unknown;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_url: string, init?: RequestInit) => {
        capturedBody = init?.body;
        return Promise.resolve(mockSseStream([{ done: true, tokensIn: 0, tokensOut: 0 }]));
      },
    );

    const { result } = renderHook(() => useAiChat());
    await act(async () => {
      await result.current.send({ taskType: 'hint' });
    });

    expect(capturedBody).not.toBeUndefined();
    const parsed = JSON.parse(capturedBody as string);
    expect(parsed.taskType).toBe('hint');
    expect(parsed.code).toBeUndefined();
    expect(parsed.errorMessage).toBeUndefined();
  });
});