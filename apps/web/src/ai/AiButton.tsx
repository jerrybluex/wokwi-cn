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
        <span role="img" aria-label="AI">🤖</span>
        <span className="text-xs">AI</span>
        <span className="badge badge-xs badge-ghost">{remaining}</span>
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content z-50 menu p-1 shadow-lg bg-base-100 rounded-box w-52 border border-base-300"
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
            <span>💬</span>
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
            <span>🐛</span>
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
            <span>💡</span>
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