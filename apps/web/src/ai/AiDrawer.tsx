/**
 * AiDrawer — slide-in drawer panel for AI tutoring.
 *
 * Shows a chat-like conversation with streaming response.
 * Triggered by AiButton.
 */
import { useEffect, useRef, useState } from 'react';
import { useAiChat, type AiStatus } from './useAiChat';
import { aiApi } from './api';

type TaskType = 'explain' | 'error' | 'hint';

type Props = {
  open: boolean;
  taskType: TaskType;
  code: string;
  compileError: string | null;
  onClose: () => void;
  initialRemaining?: number;
};

const TASK_LABELS: Record<TaskType, string> = {
  explain: '代码问答',
  error: '错误翻译',
  hint: '引导提示',
};

const TASK_DESCRIPTIONS: Record<TaskType, string> = {
  explain: '解释这段代码的功能和关键语句',
  error: '翻译编译错误，给出修复方向',
  hint: '给你一点方向，不直接给答案',
};

function StatusLine({ status, remaining }: { status: AiStatus; remaining: number }) {
  switch (status) {
    case 'idle':
      return <span className="text-[10px] text-base-content/50">等待提问…</span>;
    case 'streaming':
      return <span className="text-[10px] text-primary animate-pulse">思考中…</span>;
    case 'done':
      return <span className="text-[10px] text-success">✓ 回答完毕 · 今日剩余 {remaining} 次</span>;
    case 'error':
      return <span className="text-[10px] text-error">出错了，请检查网络后重试</span>;
    case 'rate_limited':
      return <span className="text-[10px] text-warning">今日次数已用完，明天再来吧</span>;
    case 'fallback':
      return <span className="text-[10px] text-warning">AI 暂时不可用，请稍后重试</span>;
  }
}

export function AiDrawer({ open, taskType, code, compileError, onClose, initialRemaining }: Props) {
  const [selectedType, setSelectedType] = useState<TaskType>(taskType);
  const [remaining, setRemaining] = useState<number>(initialRemaining ?? 20);
  const { send, reset, text, status, isRateLimited } = useAiChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // sync incoming taskType from parent
  useEffect(() => {
    setSelectedType(taskType);
  }, [taskType]);

  // refresh remaining count when drawer opens
  useEffect(() => {
    if (!open) return;
    aiApi
      .getRemaining()
      .then((r) => setRemaining(r.remaining))
      .catch(() => {/* keep current */});
  }, [open]);

  // auto-scroll to bottom on new text
  useEffect(() => {
    if (text) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [text]);

  const handleAsk = () => {
    reset();
    const payload =
      selectedType === 'explain'
        ? { taskType: 'explain' as const, code }
        : selectedType === 'error'
          ? { taskType: 'error' as const, errorMessage: compileError ?? '' }
          : { taskType: 'hint' as const };
    send(payload);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI 助教"
        className={`fixed right-0 top-0 h-full w-80 z-50 bg-base-100 shadow-2xl flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-200">
          <div className="flex items-center gap-2">
            <span>🤖</span>
            <span className="font-bold text-sm">AI 助教</span>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-xs btn-square">
            ✕
          </button>
        </div>

        {/* Task type selector */}
        <div className="px-4 py-2 border-b border-base-200 flex gap-1">
          {(['explain', 'error', 'hint'] as TaskType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setSelectedType(t);
                reset();
              }}
              className={`btn btn-xs flex-1 ${
                selectedType === t ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {TASK_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* User's question context */}
          <div className="bg-base-200 rounded-lg p-3 text-xs">
            <p className="font-semibold text-primary mb-1">{TASK_LABELS[selectedType]}</p>
            <p className="text-base-content/70">{TASK_DESCRIPTIONS[selectedType]}</p>
            {selectedType === 'explain' && code && (
              <pre className="mt-2 p-2 bg-base-300 rounded text-[10px] overflow-x-auto max-h-32 whitespace-pre-wrap">
                {code.slice(0, 300)}
                {code.length > 300 && '…'}
              </pre>
            )}
            {selectedType === 'error' && compileError && (
              <pre className="mt-2 p-2 bg-error/10 text-error rounded text-[10px] overflow-x-auto max-h-32">
                {compileError}
              </pre>
            )}
          </div>

          {/* AI response */}
          {(text || status === 'streaming' || status === 'fallback' || status === 'rate_limited') && (
            <div className="bg-base-100 border border-base-300 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {text || (status === 'fallback' ? 'AI 暂时不可用，请稍后重试。' : '')}
              {status === 'streaming' && (
                <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Status bar */}
        <div className="px-4 py-1.5 border-t border-base-200 flex items-center justify-between">
          <StatusLine status={status} remaining={remaining} />
          {isRateLimited && (
            <span className="text-[10px] text-warning">明天 {new Date(Date.now() + 86400000).toLocaleDateString()} 重置</span>
          )}
        </div>

        {/* Ask button */}
        <div className="px-4 py-3 border-t border-base-300">
          <button
            onClick={handleAsk}
            disabled={status === 'streaming' || status === 'rate_limited' || remaining <= 0}
            className="btn btn-primary btn-sm w-full"
          >
            {status === 'streaming' ? '思考中…' : '问问 AI'}
          </button>
          {remaining <= 0 && (
            <p className="text-[10px] text-center text-base-content/50 mt-1">
              今日次数已用完 · 每天 20 次免费
            </p>
          )}
        </div>
      </div>
    </>
  );
}