/**
 * api.ts — fetch wrapper for /api/ai/*.
 *
 * /api/ai/chat uses SSE (text/event-stream) — caller must handle the
 * stream manually using useAiChat.ts.
 */
export type AiTaskType = 'explain' | 'error' | 'hint';

export type AiChatBody = {
  taskType: AiTaskType;
  code?: string;
  errorMessage?: string;
  question?: string;
};

export type AiRemainingResponse = {
  allowed: boolean;
  remaining: number;
  resetsAt: string;
};

const BASE = ''; // Vite proxies /api → :4000

export const aiApi = {
  async getRemaining(): Promise<AiRemainingResponse> {
    const res = await fetch(`${BASE}/api/ai/remaining`, {
      credentials: 'include',
    });
    return res.json() as Promise<AiRemainingResponse>;
  },
};