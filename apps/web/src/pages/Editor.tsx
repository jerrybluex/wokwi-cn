import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArduinoRunner } from '../sim';
import { CodeEditor } from '../components/CodeEditor';
// PartLibraryPanel replaced by inline <select> dropdown (decision 21).
import { CanvasPanel } from '../canvas/CanvasPanel';
import {
  applyChange,
  emptyCanvas,
  initHistory,
  replaceAll,
  redo,
  undo,
  type History,
  type Change,
  genId,
} from '../canvas/state';
import { toWiringJSON, fromWiringJSON } from '../canvas/wiring';
import { buildDemoCircuit } from '../canvas/demo';
import { projectsApi } from '../projects/api';
import { useAutosave } from '../projects/useAutosave';
import { AiButton } from '../ai/AiButton';
import { AiDrawer } from '../ai/AiDrawer';

const DEFAULT_CODE = `// D5 Demo: blink D13 on the canvas
// 右侧画布已预置:UNO + 220Ω + LED
// Run 之后 LED 会在画布里和下方指示器同时闪
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
`;

type Status = 'idle' | 'running' | 'error';

function fmtSavedAt(ts: number | null): string {
  if (!ts) return '';
  const dt = new Date(ts);
  return dt.toLocaleTimeString();
}

export function EditorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [code, setCode] = useState(DEFAULT_CODE);
  const [projectName, setProjectName] = useState<string>('Untitled');
  const [shareId, setShareId] = useState<string | null>(null);
  const [pendingRename, setPendingRename] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const runnerRef = useRef<ArduinoRunner | null>(null);
  const [pins, setPins] = useState<Record<number, number>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('就绪');
  const [tick, setTick] = useState(0);

  const [history, setHistory] = useState<History>(() => initHistory(buildDemoCircuit()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  // wireMode state removed (decision 20): click-and-drag is event-driven, no
  // toggle button. CanvasPanel owns its own in-progress wire state now.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiTaskType, setAiTaskType] = useState<'explain' | 'error' | 'hint'>('explain');
  const [aiRemaining, setAiRemaining] = useState<number>(20);

  // ── AI remaining quota ──
  useEffect(() => {
    import('../ai/api').then(({ aiApi: api }) => {
      api.getRemaining().then((r) => setAiRemaining(r.remaining)).catch(() => {});
    });
  }, []);

  // ── Load project when projectId changes ──
  useEffect(() => {
    if (!projectId) {
      setCode(DEFAULT_CODE);
      setHistory(initHistory(buildDemoCircuit()));
      setProjectName('Untitled');
      setShareId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { status, data } = await projectsApi.get(projectId);
      if (cancelled) return;
      if (status === 200 && 'project' in data) {
        setCode(data.project.code || DEFAULT_CODE);
        setProjectName(data.project.name);
        setShareId(data.project.shareId);
        try {
          const wiring = data.project.wiring
            ? fromWiringJSON(JSON.parse(data.project.wiring))
            : emptyCanvas();
          setHistory(initHistory(wiring));
        } catch {
          setHistory(initHistory(buildDemoCircuit()));
        }
        setLoadError(null);
      } else {
        setLoadError('加载项目失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // ── Autosave ──
  const wiringJson = useMemo(
    () => JSON.stringify(toWiringJSON(history.current)),
    [history.current],
  );
  const autosave = useAutosave(projectId, code, wiringJson);

  const onChange = useCallback((change: Change) => {
    setHistory((h) => applyChange(h, change));
  }, []);
  const onUndo = useCallback(() => setHistory((h) => undo(h)), []);
  const onRedo = useCallback(() => setHistory((h) => redo(h)), []);

  const onWireCreate = useCallback(
    (
      from: { partId: string; pinId: string },
      to: { partId: string; pinId: string },
    ) => {
      const wire = { id: genId('wire'), from, to };
      setHistory((h) => applyChange(h, { type: 'add-wire', wire }));
    },
    [],
  );

  const onLoadDemo = () => {
    setHistory((h) => replaceAll(h, buildDemoCircuit()));
    setSelectedId(null);
    setSelectedWireId(null);
    setMessage('已加载 Demo 电路 (UNO + 220Ω + LED)');
  };

  const onClearCanvas = () => {
    setHistory((h) => replaceAll(h, emptyCanvas()));
    setSelectedId(null);
    setSelectedWireId(null);
    setMessage('已清空画布');
  };

  const onExportWiring = () => {
    const json = toWiringJSON(history.current);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wiring.json';
    a.click();
    URL.revokeObjectURL(url);
    setMessage('已导出 wiring.json');
  };

  const onSaveNow = () => {
    if (!projectId) {
      // Create a project on the fly when the user clicks Save without
      // picking one from /projects.
      (async () => {
        const { status, data } = await projectsApi.create({ name: projectName, code, wiring: wiringJson });
        if (status === 201 && 'project' in data) {
          setSearchParams({ projectId: data.project.id });
          setShareId(data.project.shareId);
          setMessage('已保存为新项目');
        } else {
          setMessage('保存失败');
        }
      })();
      return;
    }
    autosave.saveNow();
    setMessage('已保存');
  };

  const onRenameStart = () => {
    setNameInput(projectName);
    setPendingRename(true);
  };
  const onRenameCommit = async () => {
    const next = nameInput.trim() || 'Untitled';
    setProjectName(next);
    setPendingRename(false);
    if (projectId) {
      await projectsApi.update(projectId, { name: next });
    }
  };

  const onToggleShare = async () => {
    if (!projectId) {
      setMessage('先保存项目再分享');
      return;
    }
    if (shareId) {
      const r = await projectsApi.disableShare(projectId);
      if ('project' in r.data) setShareId(null);
    } else {
      const r = await projectsApi.enableShare(projectId);
      if ('project' in r.data) setShareId(r.data.project.shareId);
    }
  };

  const onRun = async () => {
    runnerRef.current?.abort();
    setStatus('running');
    setMessage('运行中…');
    setPins({});

    const runner = new ArduinoRunner();
    runnerRef.current = runner;
    runner.onPin((ev) => {
      setPins((prev) => ({ ...prev, [ev.pin]: ev.value }));
      setTick((t) => t + 1);
    });

    const result = await runner.run(code);
    runnerRef.current = null;

    if (result.compileError) {
      setStatus('error');
      setMessage(`编译错误: ${result.compileError}`);
    } else if (result.runtimeError) {
      setStatus('error');
      setMessage(`运行时错误: ${result.runtimeError}`);
    } else {
      setStatus('idle');
      setMessage('已完成');
    }
  };

  const onStop = () => {
    runnerRef.current?.abort();
    runnerRef.current = null;
    setStatus('idle');
    setMessage('已停止');
  };

  const d13 = pins[13] ?? 0;
  const partCount = history.current.parts.length;
  const wireCount = history.current.wires.length;
  const saveLabel =
    autosave.status === 'saving'
      ? '保存中…'
      : autosave.status === 'saved'
        ? `已保存 ${fmtSavedAt(autosave.lastSavedAt)}`
        : autosave.status === 'error'
          ? `保存失败: ${autosave.error ?? 'unknown'}`
          : projectId
            ? '未修改'
            : '未保存到云端';

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-base-300 bg-base-200 px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/projects" className="text-xs link link-hover">
            ← 项目
          </Link>
          {pendingRename ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={onRenameCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameCommit();
                if (e.key === 'Escape') setPendingRename(false);
              }}
              className="input input-xs input-bordered w-48"
            />
          ) : (
            <button
              onClick={onRenameStart}
              className="text-lg font-bold truncate hover:underline"
              title="点击重命名"
            >
              {projectName}
            </button>
          )}
          <span
            className={`text-[10px] font-mono ${
              autosave.status === 'error'
                ? 'text-error'
                : autosave.status === 'saving'
                  ? 'text-primary'
                  : autosave.status === 'saved'
                    ? 'text-success'
                    : 'text-base-content/50'
            }`}
            data-testid="save-status"
          >
            {saveLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onLoadDemo} className="btn btn-ghost btn-xs gap-1" title="加载 Demo 电路">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Demo
          </button>
          <button
            onClick={onToggleShare}
            className={`btn btn-xs gap-1 ${shareId ? 'btn-info' : 'btn-ghost'}`}
            title={shareId ? `已分享 /p/${shareId}` : '生成公开链接'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            {shareId ? shareId : '分享'}
          </button>
          <button onClick={onExportWiring} className="btn btn-ghost btn-xs gap-1" title="导出 wiring.json">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            JSON
          </button>
          <button onClick={onSaveNow} className="btn btn-primary btn-xs gap-1" title="保存">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            保存
          </button>
          <button onClick={onClearCanvas} className="btn btn-ghost btn-xs text-error gap-1" title="清空画布">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
            清空
          </button>
          <AiButton
            code={code}
            compileError={status === 'error' ? message : null}
            remaining={aiRemaining}
            onOpen={(type) => {
              setAiTaskType(type);
              setAiDrawerOpen(true);
            }}
          />
        </div>
      </header>

      {loadError && (
        <div className="alert alert-error text-xs py-1">
          <span>{loadError}</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-base-300 flex flex-col bg-base-100">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-base-content/60 font-bold border-b border-base-300 flex items-center justify-between">
            <span>sketch.ino</span>
            <div className="flex gap-1.5">
              <button
                onClick={onRun}
                disabled={status === 'running'}
                className="btn btn-primary btn-xs gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                Run
              </button>
              <button onClick={onStop} disabled={status !== 'running'} className="btn btn-xs gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
                Stop
              </button>
              <button
                onClick={() => {
                  setCode(DEFAULT_CODE);
                  setPins({});
                  setStatus('idle');
                  setMessage('已重置代码');
                }}
                className="btn btn-ghost btn-xs gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                重置
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            <CodeEditor
              value={code}
              onChange={setCode}
              disabled={status === 'running'}
              height="100%"
            />
          </div>
          <div className="border-t border-base-300 bg-base-200/40 px-3 py-2 flex items-center gap-3">
            <D13Indicator d13={d13} tick={tick} />
            <span
              className={`text-[10px] font-mono ${
                status === 'error'
                  ? 'text-error'
                  : status === 'running'
                    ? 'text-primary'
                    : 'text-base-content/60'
              }`}
            >
              {message}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-base-content/60 font-bold border-b border-base-300 flex items-center justify-between gap-2">
            <span>画布</span>
            <div className="flex items-center gap-2">
              <span className="text-base-content/40 normal-case font-mono">
                {partCount} 件 / {wireCount} 线
              </span>
              {/* Part library collapsed to a select (decision 21). Wokwi-style
               * "add part" dropdown — picks a type, adds at canvas center. */}
              <select
                aria-label="添加元件"
                className="select select-bordered select-xs w-40 font-mono"
                value=""
                onChange={(e) => {
                  const type = e.target.value;
                  if (!type) return;
                  // 简单布局:在 canvas 中央插入,后续用户可拖动
                  onChange({
                    type: 'add-part',
                    part: {
                      id: `p${Math.random().toString(36).slice(2, 8)}`,
                      type,
                      x: 60,
                      y: 60,
                      rotation: 0,
                    },
                  });
                  e.target.value = '';
                }}
                data-testid="part-library-select"
              >
                <option value="">+ 添加元件…</option>
                {[
                  'arduino-uno',
                  'led',
                  'button',
                  'potentiometer',
                  'resistor',
                  'hcsr04',
                  'servo',
                  'buzzer',
                  'ssd1306',
                  'mpu6050',
                  'seven-segment',
                  'rgb-led',
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <CanvasPanel
            state={history.current}
            history={history}
            onChange={onChange}
            onUndo={onUndo}
            onRedo={onRedo}
            selectedId={selectedId}
            onSelect={setSelectedId}
            selectedWireId={selectedWireId}
            onSelectWire={setSelectedWireId}
            onWireCreate={onWireCreate}
            pins={pins}
            zoom={1.3}
          />
        </div>
      </div>
      <AiDrawer
        open={aiDrawerOpen}
        taskType={aiTaskType}
        code={code}
        compileError={status === 'error' ? message : null}
        onClose={() => setAiDrawerOpen(false)}
        initialRemaining={aiRemaining}
      />
    </div>
  );
}

function D13Indicator({ d13, tick }: { d13: number; tick: number }) {
  const ref = useRef<SVGGElement | null>(null);
  const [, force] = useState(0);
  useEffect(() => {
    if (ref.current) {
      while (ref.current.firstChild) ref.current.removeChild(ref.current.firstChild);
      import('../parts/led').then(({ led }) => {
        if (ref.current) led.render(ref.current, { pins: { A: d13 } });
        force((x) => x + 1);
      });
    }
  }, [d13, tick]);
  return (
    <svg
      width={50}
      height={40}
      viewBox="0 0 60 50"
      aria-label={d13 > 0 ? 'LED on' : 'LED off'}
      role="img"
    >
      <g ref={ref} />
    </svg>
  );
}
