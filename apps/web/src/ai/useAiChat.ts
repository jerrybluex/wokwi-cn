/**
 * useAiChat — React hook for SSE streaming AI chat.
 *
 * Usage:
 *   const { send, text, status, error, isRateLimited, remaining } = useAiChat();
 *   send({ taskType: 'explain', code: '...' });
 */
import { useCallback, useRef, useState } from 'react';
import type { AiTaskType } from './api';

export type AiStatus = 'idle' | 'streaming' | 'done' | 'error' | 'rate_limited' | 'fallback';

export type AiChatPayload = {
  taskType: AiTaskType;
  code?: string;
  errorMessage?: string;
  question?: string;
};

export type AiState = {
  text: string;
  status: AiStatus;
  error: string | null;
  isRateLimited: boolean;
  remaining: number;
  resetsAt: string;
};

const initial: AiState = {
  text: '',
  status: 'idle',
  error: null,
  isRateLimited: false,
  remaining: 20,
  resetsAt: '',
};

export function useAiChat() {
  const [state, setState] = useState<AiState>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (payload: AiChatPayload) => {
    // abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ text: '', status: 'streaming', error: null, isRateLimited: false, remaining: 20, resetsAt: '' });

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        setState((s) => ({ ...s, status: 'error', error: `请求失败 (${res.status})` }));
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const raw = decoder.decode(value, { stream: !done });
          // SSE may contain multiple events concatenated
          const lines = raw.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw2 = line.slice(6).trim();
            if (!raw2) continue;
            let event: Record<string, unknown>;
            try {
              event = JSON.parse(raw2) as Record<string, unknown>;
            } catch {
              continue;
            }
            if ('rateLimit' in event && event.rateLimit === true) {
              setState((s) => ({
                ...s,
                status: 'rate_limited',
                isRateLimited: true,
                remaining: 0,
                resetsAt: (event.resetsAt as string) ?? '',
              }));
              return;
            }
            if ('fallback' in event && event.fallback === true) {
              setState((s) => ({
                ...s,
                status: 'fallback',
                text: (event.message as string) ?? '',
              }));
              return;
            }
            if ('chunk' in event) {
              text += event.chunk as string;
              setState((s) => ({ ...s, text }));
            }
            if ('done' in event && event.done === true) {
              setState((s) => ({ ...s, status: 'done' }));
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState((s) => ({
        ...s,
        status: 'error',
        error: (err as Error).message ?? '网络错误',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initial);
  }, []);

  return { send, reset, ...state };
}