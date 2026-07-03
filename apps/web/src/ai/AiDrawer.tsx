/**
 * AiDrawer — AI 助教右侧抽屉 (决策 24 v1 收尾)
 *
 * 主理人 20:18 P0 反馈: 学生没有输入地方,无法主动问问题。
 * 重设计后:
 *   - 4 个 state tabs: 代码 / 报错 / 连线 / 元件 (read-only 项目状态展示)
 *   - chat history (multi-turn user/AI 气泡滚动)
 *   - 底部 textarea + 发送按钮 (Enter 发送, Shift+Enter 换行)
 *   - Cmd+I / Ctrl+I 快捷键在 Editor.tsx 触发开关
 *   - 联调 server POST /api/ai/chat-context (coder d0148a7 提交)
 *     request:  { studentMessage, projectState: { code, errors, wirings, parts } }
 *     response: { answer, suggestions: AiSuggestion[] }
 *     errors:   401 / 429 (rate_limit) / 502 (ai_service_error) / dev no-key fallback
 *
 * v1 范围: 只读, 给建议 (不动连线, 不改代码)
 */
import { useEffect, useRef, useState } from 'react';
import { aiApi } from './api';

/** Mirror of @wokwi/shared AiSuggestion (本地复制,避免 shared build chain 依赖) */
type AiSuggestion = {
  type: 'hint' | 'code' | 'wiring';
  /** Which entity the suggestion targets, e.g. 'led', 'servo', 'loop'. */
  target: string;
  /** Suggestion payload — content depends on type. */
  payload: string;
};

type StateTab = 'code' | 'errors' | 'wirings' | 'parts';

type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  ts: number;
  /** AI message only — 决策 24 v1 server parses suggestions from answer */
  suggestions?: AiSuggestion[];
  /** True while the request is in flight (for placeholder / spinner) */
  pending?: boolean;
  /** True if the AI message ended in an error (rate_limit / network / service) */
  error?: 'rate_limit' | 'service' | 'network' | 'no_key';
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

/** Hit /api/ai/chat-context (决策 24 v1 server endpoint, coder d0148a7).
 * Returns: { answer, suggestions } on success;
 *          throws on 429 (rate_limit) / 502 (ai_service_error) / network. */
async function askChatContext(opts: {
  studentMessage: string;
  projectState: {
    code: string;
    errors: string[];
    wirings: unknown[];
    parts: PartForDisplay[];
  };
  signal: AbortSignal;
}): Promise<{ answer: string; suggestions: AiSuggestion[] }> {
  const res = await fetch('/api/ai/chat-context', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentMessage: opts.studentMessage,
      projectState: opts.projectState,
    }),
    signal: opts.signal,
  });
  if (res.status === 429) {
    const e: Error & { kind?: 'rate_limit' } = new Error('今日 AI 次数已用完');
    e.kind = 'rate_limit';
    throw e;
  }
  if (res.status === 502) {
    const e: Error & { kind?: 'service' } = new Error('AI 服务暂时不可用');
    e.kind = 'service';
    throw e;
  }
  if (!res.ok) {
    const e: Error & { kind?: 'service' } = new Error(`请求失败 (${res.status})`);
    e.kind = 'service';
    throw e;
  }
  const data = (await res.json()) as { answer: string; suggestions: AiSuggestion[] };
  return data;
}

/** Suggestion card — type-specific 颜色 (决策 24 v1 视觉规范) */
function SuggestionCard({ s }: { s: AiSuggestion }) {
  const colorClass =
    s.type === 'wiring'
      ? 'border-warning/40 bg-warning/10 text-warning-content'
      : s.type === 'code'
        ? 'border-info/40 bg-info/10 text-info-content'
        : 'border-base-300 bg-base-200 text-base-content';
  const typeLabel = s.type === 'wiring' ? '连线' : s.type === 'code' ? '代码' : '提示';
  return (
    <div
      className={`mt-1.5 rounded-md border ${colorClass} px-2 py-1.5 text-[11px] leading-snug`}
      data-testid={`ai-suggestion-${s.type}`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[9px] uppercase tracking-wide font-bold opacity-70">
          {typeLabel}
        </span>
        <span className="text-[10px] font-mono opacity-80">→ {s.target}</span>
      </div>
      <div className="whitespace-pre-wrap break-words">{s.payload}</div>
    </div>
  );
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
  const [isAsking, setIsAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  // 抽屉关闭时取消未完成请求 + 清空 chat
  const handleClose = () => {
    abortRef.current?.abort();
    setIsAsking(false);
    setHistory([]);
    setInput('');
    onClose();
  };

  // 流式 / 加载时滚动跟随
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  /** 决策 24 v1: 调用 /api/ai/chat-context (server d0148a7) */
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (isAsking) return;
    if (remaining <= 0) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      ts: Date.now(),
    };
    const aiPendingMsg: Message = {
      id: `ai-${Date.now()}`,
      role: 'ai',
      text: '',
      ts: Date.now(),
      pending: true,
    };
    setHistory((h) => [...h, userMsg, aiPendingMsg]);
    setInput('');
    setIsAsking(true);

    // abort any in-flight
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const errorsArr = compileError ? [compileError] : [];
      const result = await askChatContext({
        studentMessage: trimmed,
        projectState: {
          code,
          errors: errorsArr,
          wirings: wires as unknown[],
          parts,
        },
        signal: controller.signal,
      });
      // replace the pending AI message with real answer
      setHistory((h) =>
        h.map((m) =>
          m.id === aiPendingMsg.id
            ? { ...m, text: result.answer, suggestions: result.suggestions, pending: false }
            : m,
        ),
      );
      // refresh remaining
      aiApi
        .getRemaining()
        .then((r) => setRemaining(r.remaining))
        .catch(() => {});
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const e = err as Error & { kind?: 'rate_limit' | 'service' };
      const errorKind =
        e.kind === 'rate_limit'
          ? 'rate_limit'
          : e.kind === 'service'
            ? 'service'
            : 'network';
      setHistory((h) =>
        h.map((m) =>
          m.id === aiPendingMsg.id
            ? {
                ...m,
                text: errorMessageText(errorKind),
                pending: false,
                error: errorKind,
              }
            : m,
        ),
      );
    } finally {
      setIsAsking(false);
    }
  };

  // Textarea: Enter 发送, Shift+Enter 换行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
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
       * 决策 24 v1: 抽屉宽度 = 画布右 1/3 左右 (w-[min(28rem,calc(100vw-1rem))]) */}
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
          {history.length === 0 && !isAsking && (
            <div className="text-center text-xs text-base-content/50 py-8">
              <div className="mb-2 text-2xl">💬</div>
              <p>跟 AI 聊聊你的项目</p>
              <p className="mt-1 text-[10px]">例如:我的 LED 不亮怎么办?</p>
              <p className="mt-1 text-[10px] opacity-70">AI 会读你的代码 / 报错 / 连线 / 元件</p>
            </div>
          )}

          {/* 聊天气泡 */}
          {history.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`ai-msg-${m.role}`}
            >
              <div className="max-w-[88%] min-w-0">
                <div
                  className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-content'
                      : m.error
                        ? 'bg-error/10 border border-error/40 text-error-content'
                        : 'bg-base-200 text-base-content'
                  }`}
                >
                  {m.pending ? (
                    <span className="inline-flex items-center gap-1.5 text-base-content/60">
                      <span className="loading loading-spinner loading-xs" />
                      思考中…
                    </span>
                  ) : (
                    m.text
                  )}
                </div>
                {/* AI 消息下方:suggestion 卡片 (v1 简单 list) */}
                {m.role === 'ai' && !m.pending && m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-1.5 space-y-1" data-testid="ai-suggestions">
                    <div className="text-[10px] text-base-content/50 px-1">
                      💡 {m.suggestions.length} 条建议
                    </div>
                    {m.suggestions.map((s, idx) => (
                      <SuggestionCard key={idx} s={s} />
                    ))}
                  </div>
                )}
                {m.role === 'ai' && !m.pending && m.error && (
                  <div className="text-[10px] text-base-content/50 px-1 mt-1">
                    {m.error === 'rate_limit' && '配额已用完,明天再来'}
                    {m.error === 'service' && 'AI 服务暂时不可用'}
                    {m.error === 'network' && '网络异常'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div className="px-4 py-1.5 border-t border-base-200 flex items-center justify-between">
          <span className="text-[10px] text-base-content/50">
            {isAsking ? (
              <span className="text-primary animate-pulse">AI 正在读你的项目…</span>
            ) : (
              <>空闲 · 今日剩余 {remaining} 次</>
            )}
          </span>
          {remaining <= 0 && (
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
              disabled={isAsking || remaining <= 0}
              className="textarea textarea-bordered textarea-sm flex-1 resize-none min-h-12 max-h-32 leading-snug text-sm"
              rows={2}
              data-testid="ai-input"
              aria-label="学生输入"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isAsking || remaining <= 0}
              className="btn btn-primary btn-sm self-end h-12"
              data-testid="ai-send"
              aria-label="发送"
            >
              {isAsking ? (
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

function errorMessageText(kind: 'rate_limit' | 'service' | 'network'): string {
  switch (kind) {
    case 'rate_limit':
      return '⚠ 今日 AI 次数已用完,明天再来吧';
    case 'service':
      return '⚠ AI 服务暂时不可用,请稍后重试';
    case 'network':
      return '⚠ 网络异常,请检查网络后重试';
  }
}
