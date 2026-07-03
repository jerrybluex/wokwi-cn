/**
 * AiDrawer — AI 助教右侧抽屉 (决策 24 v1 重设计)
 *
 * 主理人 20:18 P0 反馈: 学生没有输入地方,无法主动问问题。
 * 重设计后:
 *   - 4 个 state tabs: 代码 / 报错 / 连线 / 元件 (read-only 项目状态展示)
 *   - chat history (multi-turn user/AI 气泡滚动)
 *   - 底部 textarea + 发送按钮 (Enter 发送, Shift+Enter 换行)
 *   - Cmd+I / Ctrl+I 快捷键在 Editor.tsx 触发开关
 *
 * v1 范围: 只读, 给建议 (不动连线, 不改代码)
 * 保留现有 AiDrawer API (open/onClose/initialRemaining), 新增 state props (code/state/errorMessage)。
 */
import { useEffect, useRef, useState } from 'react';
import { useAiChat, type AiStatus } from './useAiChat';
import { aiApi } from './api';

type StateTab = 'code' | 'errors' | 'wirings' | 'parts';

type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  ts: number;
};

type WireForDisplay = {
  id: string;
  from: { partId: string; pinId: string };
  to: { partId: string; pinId: string };
};

type PartForDisplay = {
  id: string;
  type: string;
  x: number;
  y: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Current code (CodeMirror buffer) */
  code: string;
  /** Compile / runtime error message, if any */
  compileError: string | null;
  /** Current wirings array — for "连线" tab + AI context */
  wires: WireForDisplay[];
  /** Current parts array — for "元件" tab + AI context */
  parts: PartForDisplay[];
  /** Project name (header decoration) */
  projectName?: string;
  initialRemaining?: number;
};

const STATE_TABS: Array<{ id: StateTab; label: string }> = [
  { id: 'code', label: '代码' },
  { id: 'errors', label: '报错' },
  { id: 'wirings', label: '连线' },
  { id: 'parts', label: '元件' },
];

function StatusLine({ status, remaining }: { status: AiStatus; remaining: number }) {
  switch (status) {
    case 'idle':
      return <span className="text-[10px] text-base-content/50">空闲 · 输入问题开始对话</span>;
    case 'streaming':
      return <span className="text-[10px] text-primary animate-pulse">思考中…</span>;
    case 'done':
      return <span className="text-[10px] text-success">✓ 回答完毕 · 今日剩余 {remaining} 次</span>;
    case 'error':
      return <span className="text-[10px] text-error">出错了,请检查网络后重试</span>;
    case 'rate_limited':
      return <span className="text-[10px] text-warning">今日次数已用完,明天再来吧</span>;
    case 'fallback':
      return <span className="text-[10px] text-warning">AI 暂时不可用,请稍后重试</span>;
  }
}

export function AiDrawer({
  open,
  onClose,
  code,
  compileError,
  wires,
  parts,
  projectName,
  initialRemaining,
}: Props) {
  const [tab, setTab] = useState<StateTab>('code');
  const [remaining, setRemaining] = useState<number>(initialRemaining ?? 20);
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { send, reset, text, status, isRateLimited } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // refresh remaining count when drawer opens
  useEffect(() => {
    if (!open) return;
    aiApi
      .getRemaining()
      .then((r) => setRemaining(r.remaining))
      .catch(() => {});
  }, [open]);

  // ESC 关闭抽屉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 抽屉关闭时重置 chat (避免下次打开看到上次的对话)
  const handleClose = () => {
    reset();
    setHistory([]);
    setInput('');
    onClose();
  };

  // 流式响应到达时,自动滚动到底部
  useEffect(() => {
    if (status === 'streaming' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, status]);

  // 当流式响应完成,把完整回答追加到历史
  useEffect(() => {
    if (status === 'done' && text) {
      setHistory((h) => [
        ...h,
        { id: `ai-${Date.now()}`, role: 'ai', text, ts: Date.now() },
      ]);
      reset();
    }
    if (status === 'fallback' && text) {
      setHistory((h) => [
        ...h,
        { id: `ai-fb-${Date.now()}`, role: 'ai', text, ts: Date.now() },
      ]);
      reset();
    }
  }, [status, text, reset]);

  // 发送消息:学生问题 + 当前 state (代码/报错/连线/元件)
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (status === 'streaming') return;
    if (remaining <= 0) return;

    // 追加学生消息
    setHistory((h) => [
      ...h,
      { id: `user-${Date.now()}`, role: 'user', text: trimmed, ts: Date.now() },
    ]);
    setInput('');

    // 触发 AI 请求 (useAiChat 处理 SSE 流)
    // 决策 24 v1:AI 读取当前 state 作为 context (由 coder / server 拼 prompt)
    // UIer 范围内:把 state 放进 payload,具体 prompt 模板由 coder 控制
    void send({
      taskType: 'hint' as const, // 当前 useAiChat API 还需要 taskType;v1 阶段 hint = 自由对话
      question: trimmed,
      code: tab === 'code' || tab === 'errors' ? code : undefined,
      errorMessage: tab === 'errors' ? compileError ?? undefined : undefined,
    });
  };

  // Textarea: Enter 发送, Shift+Enter 换行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop — 点击关闭 */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer
       * 决策 PM: 让 drawer 在所有常见视口都 in-viewport (w-[min(...)] + h-[min(...)])
       * 决策 24 v1: 抽屉宽度 = 画布右 1/3 左右 (w-[min(28rem,calc(100vw-1rem))])
       */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI 助教"
        className={`fixed right-0 top-0 z-50 bg-base-100 shadow-2xl flex flex-col transition-transform duration-200
          w-[min(28rem,calc(100vw-1rem))]
          h-[min(100vh,100dvh)]
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header: title + close X */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-200">
          <div className="flex items-center gap-2 min-w-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.9 5.9 6.1.6-4.7 4 1.4 6-4.7-3.5L7.3 19.5l1.4-6-4.7-4 6.1-.6L12 3z" />
            </svg>
            <span className="font-bold text-sm">AI 助教</span>
            {projectName && (
              <span className="text-[10px] text-base-content/50 ml-1 truncate">
                · {projectName}
              </span>
            )}
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-xs btn-square" aria-label="关闭 (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* State tabs: 4 个项目状态展示 (代码/报错/连线/元件) */}
        <div className="px-4 py-2 border-b border-base-200 flex gap-1" role="tablist">
          {STATE_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              onClick={() => setTab(t.id)}
              className={`btn btn-xs flex-1 ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
              data-testid={`ai-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* State content area (read-only) — 当前 tab 的项目状态
         * 显示当前 state,让 AI 和学生都看到一致的内容 (透明 context) */}
        <div className="border-b border-base-200 px-4 py-2 max-h-32 overflow-y-auto bg-base-200/50">
          {tab === 'code' && (
            <pre className="text-[10px] font-mono whitespace-pre-wrap break-words text-base-content/80">
              {code.trim() || '// (无代码)'}
            </pre>
          )}
          {tab === 'errors' && (
            <pre className="text-[10px] font-mono whitespace-pre-wrap text-error">
              {compileError ?? '(无报错)'}
            </pre>
          )}
          {tab === 'wirings' && (
            <div className="text-[10px] font-mono text-base-content/70">
              {wires.length === 0 ? '(无线)' : `${wires.length} 条连线`}
            </div>
          )}
          {tab === 'parts' && (
            <div className="text-[10px] font-mono text-base-content/70">
              {parts.length === 0 ? '(无元件)' : `${parts.length} 个元件`}
            </div>
          )}
        </div>

        {/* Chat history (multi-turn) — 滚动 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {history.length === 0 && status !== 'streaming' && (
            <div className="text-center text-xs text-base-content/50 py-8">
              <div className="mb-2 text-2xl">💬</div>
              <p>跟 AI 聊聊你的项目</p>
              <p className="mt-1 text-[10px]">例如:我的 LED 不亮怎么办?</p>
            </div>
          )}

          {/* 聊天气泡 */}
          {history.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`ai-msg-${m.role}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-200 text-base-content'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {/* 流式响应占位 (useAiChat 的 text 不是 ai message 的一部分) */}
          {status === 'streaming' && (
            <div className="flex justify-start" data-testid="ai-msg-streaming">
              <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-base-200 text-base-content">
                {text || '思考中…'}
                <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {/* 错误占位 */}
          {(status === 'error' || status === 'rate_limited' || status === 'fallback') && !text && (
            <div className={`text-[10px] text-center ${status === 'error' ? 'text-error' : status === 'fallback' ? 'text-warning' : 'text-warning'}`}>
              {status === 'error' && '出错了,请检查网络后重试'}
              {status === 'rate_limited' && '今日次数已用完,明天再来吧'}
              {status === 'fallback' && 'AI 暂时不可用,请稍后重试'}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="px-4 py-1.5 border-t border-base-200 flex items-center justify-between">
          <StatusLine status={status} remaining={remaining} />
          {isRateLimited && (
            <span className="text-[10px] text-warning">明天重置</span>
          )}
        </div>

        {/* Input: textarea + send button (Enter=send, Shift+Enter=newline) */}
        <div className="px-4 py-3 border-t border-base-300">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题…(Enter 发送,Shift+Enter 换行)"
              disabled={status === 'streaming' || remaining <= 0 || isRateLimited}
              className="textarea textarea-bordered textarea-sm flex-1 resize-none min-h-12 max-h-32 leading-snug text-sm"
              rows={2}
              data-testid="ai-input"
              aria-label="学生输入"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || status === 'streaming' || remaining <= 0 || isRateLimited}
              className="btn btn-primary btn-sm self-end h-12"
              data-testid="ai-send"
              aria-label="发送"
            >
              {status === 'streaming' ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
          {remaining <= 0 && (
            <p className="text-[10px] text-center text-base-content/50 mt-1">
              今日次数已用完 · 每天 20 次免费
            </p>
          )}
          <p className="text-[10px] text-center text-base-content/40 mt-1">
            <kbd className="kbd kbd-xs">⌘</kbd>
            <span className="mx-1">+</span>
            <kbd className="kbd kbd-xs">I</kbd>
            <span className="ml-2">切换抽屉 (Esc 关闭)</span>
          </p>
        </div>
      </div>
    </>
  );
}
