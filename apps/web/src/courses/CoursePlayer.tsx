/**
 * CoursePlayer — the main learning view.
 *
 * Layout:
 *   ┌──────────────────┬──────────────────────────┐
 *   │  Step rail (top) │  step title              │
 *   │  ← 0 1 2 3 4 →   ├──────────────────────────┤
 *   │  Step content    │  CodeEditor (pre-filled) │
 *   │  (markdown)      │  CanvasPanel (pre-filed) │
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
import type { Step } from './api';
import type { CourseProgressState } from './useCourseProgress';

type Props = {
  steps: Step[];
  progress: CourseProgressState;
};

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

  // sync canvas when step changes
  useEffect(() => {
    setCanvasHistory(history);
    setSelectedId(null);
    setSelectedWireId(null);
    setWireMode(false);
  }, [history]);

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

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-base-300 bg-base-200 px-4 py-2 flex items-center gap-3">
        <Link to="/" className="text-xs link link-hover">← 首页</Link>
        <span className="text-sm font-bold">LED 闪烁</span>
        <span className="text-xs text-base-content/60">第 {stepIdx + 1} / {steps.length} 步</span>
      </header>

      {/* Step rail */}
      <div className="border-b border-base-200 px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
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

      {/* Body: left context + right editor/canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: step context */}
        <div className="w-[38%] border-r border-base-300 flex flex-col overflow-hidden">
          <div className="px-4 py-3 text-sm font-semibold border-b border-base-200">
            {step.title}
          </div>
          <div
            className="flex-1 overflow-y-auto px-5 py-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(step.context) }}
          />
        </div>

        {/* Right: editor + canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden border-b border-base-200">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-base-content/60 font-bold border-b border-base-200 bg-base-200/40">
              sketch.ino
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <CodeEditor
                value={step.taskCode}
                onChange={() => {}}
                disabled={true}
                height="100%"
              />
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex">
            <div className="w-full flex flex-col">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-base-content/60 font-bold border-b border-base-200 bg-base-200/40">
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
          <div className="border-t border-base-300 px-4 py-2 flex items-center justify-between">
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
                  🎉 完成课程
                </button>
              )
            ) : (
              <button onClick={next} className="btn btn-primary btn-sm">
                下一步 ▶
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