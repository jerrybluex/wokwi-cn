/**
 * Shared types between @wokwi/web and @wokwi/server.
 *
 * Phased expansion (devplan v1):
 *   D6: User + Auth types
 *   D7: Project + Share types
 *   D9: Course + Step types
 *   D8: AI task types
 *
 * 当前 D1 占位。下面放已经定下来的常量,
 * 后续 day 按需扩,不要提前定义未到的类型。
 */

export const WOKWI_API_VERSION = '0.1.0' as const;

export const WOKWI_AI_DAILY_LIMIT = 20 as const;

export type AiTaskType = 'explain' | 'error' | 'hint' | 'chat';

/** Project state snapshot sent with AI chat requests (决策 24 v1). */
export interface ProjectState {
  /** Current Arduino code in the editor. */
  code: string;
  /** Compilation errors, if any. */
  errors: string[];
  /** Wiring JSON serialised from the canvas. */
  wirings: unknown[];
  /** Parts placed on the canvas (id + type + position). */
  parts: { id: string; type: string; x: number; y: number }[];
}

export type AiChatRequest = {
  taskType: AiTaskType;
  code?: string;
  errorMessage?: string;
  question?: string;
};

export type AiChatChunk = { chunk: string };
export type AiChatDone = { done: true; tokensIn: number; tokensOut: number };
export type AiChatFallback = { fallback: true; message: string };
export type AiChatRateLimit = { rateLimit: true; remaining: number; resetsAt: string };

/** Suggestion returned by the context-aware chat endpoint. */
export type AiSuggestion = {
  type: 'hint' | 'code' | 'wiring';
  /** Which entity the suggestion targets, e.g. 'led', 'servo', 'loop'. */
  target: string;
  /** Suggestion payload — content depends on type. */
  payload: string;
};

/** Response body for POST /api/ai/chat-context (决策 24 v1). */
export type AiChatContextResponse = {
  /** AI tutor's text reply. Named 'answer' to avoid conflict with FastifyReply. */
  answer: string;
  suggestions: AiSuggestion[];
};

export type ApiHealth = {
  status: 'ok';
  time: string;
  service: 'wokwi-server';
  version: typeof WOKWI_API_VERSION;
};
