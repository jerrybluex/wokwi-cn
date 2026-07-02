/**
 * AiButton — the trigger button shown in the editor toolbar.
 *
 * Props:
 *   code          — current editor code (for explain)
 *   compileError  — current compile error message, if any (for error)
 *   remaining     — remaining daily AI calls (passed from parent to avoid duplicate fetch)
 *   onOpen        — called when button is clicked
 */

type Props = {
  code: string;
  compileError: string | null;
  remaining: number;
  onOpen: (taskType: 'explain' | 'error' | 'hint') => void;
};

export function AiButton({ code, compileError, remaining, onOpen }: Props) {
  const hasSelection = code.trim().length > 0;
  const hasError = !!compileError;
  const limit = remaining;

  return (
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        className="btn btn-sm btn-ghost gap-1"
        title="AI 助教"
        aria-haspopup="true"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l1.9 5.9 6.1.6-4.7 4 1.4 6-4.7-3.5L7.3 19.5l1.4-6-4.7-4 6.1-.6L12 3z" />
        </svg>
        <span className="text-xs">AI</span>
        <span className="badge badge-xs badge-ghost">{remaining}</span>
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content z-50 menu p-1 shadow-lg bg-base-100 rounded-box w-52 max-w-[calc(100vw-1rem)] border border-base-300"
      >
        <li className="menu-title pt-1 pb-0">
          <span className="text-[10px] text-base-content/60">AI 助教 · 今日剩余 {limit} 次</span>
        </li>
        <li>
          <button
            onClick={() => onOpen('explain')}
            disabled={!hasSelection || limit <= 0}
            className="text-sm gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>
              <span className="font-medium">代码问答</span>
              <br />
              <span className="text-[10px] text-base-content/60">选中代码后点击，问这段做什么</span>
            </span>
          </button>
        </li>
        <li>
          <button
            onClick={() => onOpen('error')}
            disabled={!hasError || limit <= 0}
            className="text-sm gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              <span className="font-medium">错误翻译</span>
              <br />
              <span className="text-[10px] text-base-content/60">点击查看当前报错的中文解释</span>
            </span>
          </button>
        </li>
        <li>
          <button
            onClick={() => onOpen('hint')}
            disabled={limit <= 0}
            className="text-sm gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.5.4 1 1 1 2v.3h6v-.3c0-1 .5-1.6 1-2A7 7 0 0 0 12 2z" />
            </svg>
            <span>
              <span className="font-medium">引导提示</span>
              <br />
              <span className="text-[10px] text-base-content/60">卡住了？给你一点方向</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  );
}