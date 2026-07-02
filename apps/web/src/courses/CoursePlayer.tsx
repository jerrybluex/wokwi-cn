/**
 * CoursePlayer — the main learning view.
 *
 * 设计目标 (PRD-sync §5 决策 8):
 *   - 代码编辑器可写 (学生动手)
 *   - 任务卡替代 step title,实时 check (轻量词法,不做 AST)
 *   - step 0 (只读) 不带 check,显示 "等待" 状态
 *
 * Layout:
 *   ┌──────────────────┬──────────────────────────┐
 *   │  Step rail (top) │  task card title         │
 *   │  ← 0 1 2 3 4 →   ├──────────────────────────┤
 *   │  task card       │  CodeEditor (editable)   │
 *   │  (markdown)      │  CanvasPanel             │
 *   │                  │                          │
 *   │                  │  [◀ 上一步] [下一步 ▶]   │
 *   └──────────────────┴──────────────────────────┘
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CodeEditor } from '../components/CodeEditor';
import { CanvasPanel } from '../canvas/CanvasPanel';
import {
  applyChange,
  initHistory,
  redo,
  undo,
  type History,
  type Change,
} from '../canvas/state';
import { fromWiringJSON } from '../canvas/wiring';
import type { Step, StepCheck } from './api';
import type { CourseProgressState } from './useCourseProgress';

type Props = {
  steps: Step[];
  progress: CourseProgressState;
};

/** Lightweight lexer-style check (no AST). */
function runCheck(code: string, check: StepCheck): boolean {
  if (check.kind === 'api-used') {
    const apis = check.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return apis.every((api) => new RegExp(`\\b${api}\\s*\\(`).test(code));
  }
  if (check.kind === 'pattern') {
    try {
      return new RegExp(check.value).test(code);
    } catch {
      return false;
    }
  }
  return false;
}

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconCircle({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function IconArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function CoursePlayer({ steps, progress }: Props) {
  const { stepIdx, goToStep, next, prev, isComplete } = progress;
  const step = steps[stepIdx];

  // ── canvas state from step wiring ──────────────────────────────
  const history = useMemo(
    () => initHistory(fromWiringJSON(step.taskWiring)),
    [step.stepIndex],
  );
  const [canvasHistory, setCanvasHistory] = useState<History>(history);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [wireMode, setWireMode] = useState(false);

  // ── code state (editable, sync on step change) ────────────────
  const [code, setCode] = useState<string>(step.taskCode);

  // sync canvas + code when step changes
  useEffect(() => {
    setCanvasHistory(history);
    setSelectedId(null);
    setSelectedWireId(null);
    setWireMode(false);
    setCode(step.taskCode);
  }, [history, step.taskCode]);

  // ── live check ────────────────────────────────────────────────
  const passed = step.check ? runCheck(code, step.check) : false;

  const onChange = useCallback((change: Change) => {
    setCanvasHistory((h) => applyChange(h, change));
  }, []);
  const onUndo = useCallback(() => setCanvasHistory((h) => undo(h)), []);
  const onRedo = useCallback(() => setCanvasHistory((h) => redo(h)), []);

  const onWireCreate = useCallback(
    (_from: { partId: string; pinId: string }, _to: { partId: string; pinId: string }) => {
      setWireMode(false);
    },
    [],
  );
  const onToggleWireMode = useCallback(() => setWireMode((m) => !m), []);

  // Strip prefix like "看:" / "亮:" from step.title for display
  const displayTitle = step.title.replace(/^[^：]+：/, '').trim();

  return (
    <div className="h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="border-b border-line bg-paper px-4 py-2 flex items-center gap-3">
        <Link to="/" className="text-xs link link-hover text-ink-soft">
          ← 首页
        </Link>
        <span className="text-sm font-semibold text-ink">LED 闪烁</span>
        <span className="text-xs text-muted font-mono">
          第 {stepIdx + 1} / {steps.length} 步
        </span>
      </header>

      {/* Step rail */}
      <div className="border-b border-line-soft bg-paper px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => goToStep(i)}
            className={`btn btn-xs shrink-0 ${
              i === stepIdx
                ? 'btn-primary'
                : i < stepIdx
                  ? 'btn-success btn-outline'
                  : 'btn-ghost'
            }`}
          >
            {i < stepIdx ? '✓' : i + 1}
          </button>
        ))}
      </div>

      {/* Body: left task card + right editor/canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: task card / read-only intro */}
        <div className="w-[38%] border-r border-line flex flex-col overflow-hidden bg-paper">
          <div className="px-5 pt-5 pb-4 border-b border-line-soft">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-2">
              {step.check
                ? `任务卡 · 第 ${stepIdx + 1} 步`
                : `第 ${stepIdx + 1} 步 · 只读`}
            </div>
            <h4 className="text-lg font-semibold text-ink leading-snug mb-3">
              {displayTitle}
            </h4>
            {step.check ? (
              <>
                <p className="text-sm text-ink-soft leading-relaxed mb-3">
                  {step.check.label}
                </p>
                <div
                  data-testid="task-card-status"
                  className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 border transition-colors ${
                    passed
                      ? 'bg-success/10 text-success border-success/30'
                      : 'bg-base-200 text-muted border-line'
                  }`}
                >
                  {passed ? <IconCheck /> : <IconCircle />}
                  {passed ? '已检测到 · 继续' : '等待你动手'}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-soft">这步只读,看完点下一步。</p>
            )}
          </div>
          <div
            className="flex-1 overflow-y-auto px-5 py-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(step.context) }}
          />
        </div>

        {/* Right: editor + canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden border-b border-line-soft">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted font-mono border-b border-line-soft bg-base-200/40 flex justify-between items-center">
              <span>sketch.ino · 可编辑</span>
              {step.check && (
                <span
                  className={`font-mono ${passed ? 'text-success' : 'text-muted'}`}
                  data-testid="editor-check-status"
                >
                  {passed ? '✓ check passed' : '○ check pending'}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <CodeEditor value={code} onChange={setCode} height="100%" />
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex">
            <div className="w-full flex flex-col">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted font-mono border-b border-line-soft bg-base-200/40">
                电路
              </div>
              <div className="flex-1 overflow-hidden">
                <CanvasPanel
                  state={canvasHistory.current}
                  history={canvasHistory}
                  onChange={onChange}
                  onUndo={onUndo}
                  onRedo={onRedo}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  selectedWireId={selectedWireId}
                  onSelectWire={setSelectedWireId}
                  wireMode={wireMode}
                  onToggleWireMode={onToggleWireMode}
                  onWireCreate={onWireCreate}
                />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="border-t border-line bg-paper px-4 py-2 flex items-center justify-between">
            <button
              onClick={prev}
              disabled={stepIdx === 0}
              className="btn btn-sm btn-ghost"
            >
              ◀ 上一步
            </button>
            {stepIdx === steps.length - 1 ? (
              isComplete ? (
                <span className="text-sm text-success">✓ 已完成</span>
              ) : (
                <button onClick={progress.markComplete} className="btn btn-success btn-sm">
                  <IconArrowRight />
                  完成课程
                </button>
              )
            ) : (
              <button onClick={next} className="btn btn-primary btn-sm">
                下一步 <IconArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Minimal markdown renderer — converts bold/code/headers/pre to HTML. */
function renderMarkdown(text: string): string {
  return text
    // code blocks (triple backtick)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
      return `<pre class="bg-base-300 rounded p-2 text-xs overflow-x-auto my-2"><code>${escapeHtml(code.trim())}</code></pre>`;
    })
    // inline code
    .replace(/`([^`]+)`/g, '<code class="bg-base-300 rounded px-1 text-xs">$1</code>')
    // headers
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // tables
    .replace(/\|(.+)\|/g, (m) => {
      const cells = m.split('|').filter(Boolean).map((c) => c.trim());
      const isHeader = cells.every((c) => c.match(/^-+$/));
      if (isHeader) return '';
      return `<tr>${cells.map((c) => `<td class="border border-base-300 px-2 py-1 text-xs">${c}</td>`).join('')}</tr>`;
    })
    // blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-primary pl-3 text-xs text-base-content/80 my-2">$1</blockquote>')
    // list items
    .replace(/^- (.+)$/gm, '<li class="text-sm ml-4 list-disc">$1</li>')
    // paragraph breaks
    .replace(/\n\n/g, '</p><p class="text-sm my-2">')
    // wrap in paragraph
    .replace(/^(?!<[h|b|p|l|c|p])/gm, '')
    .split('\n')
    .map((line) => {
      if (line.startsWith('<') || line.trim() === '') return line;
      return `<p class="text-sm my-2">${line}</p>`;
    })
    .join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
