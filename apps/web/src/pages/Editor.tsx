import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArduinoRunner, type PinEvent } from '../sim';
import { CodeEditor } from '../components/CodeEditor';
import { PartLibraryPanel } from '../canvas/PartLibraryPanel';
import { CanvasPanel } from '../canvas/CanvasPanel';
import {
  applyChange,
  initHistory,
  replaceAll,
  redo,
  undo,
  type History,
  type Change,
  type CanvasState,
  genId,
} from '../canvas/state';
import { toWiringJSON } from '../canvas/wiring';
import { buildDemoCircuit } from '../canvas/demo';

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

export function EditorPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const runnerRef = useRef<ArduinoRunner | null>(null);
  const [pins, setPins] = useState<Record<number, number>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('就绪');
  const [tick, setTick] = useState(0);

  // Canvas state — own history so undo/redo are scoped to the canvas
  const [history, setHistory] = useState<History>(() => initHistory(buildDemoCircuit()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [wireMode, setWireMode] = useState(false);
  const [pendingWireFrom, setPendingWireFrom] = useState<{ partId: string; pinId: string } | null>(null);

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
      if (!from.partId || !to.partId) {
        setPendingWireFrom(null);
        setWireMode(false);
        return;
      }
      // complete the wire
      const wire = {
        id: genId('wire'),
        from,
        to,
      };
      setHistory((h) => applyChange(h, { type: 'add-wire', wire }));
      setPendingWireFrom(null);
      setWireMode(false);
    },
    [],
  );

  const onToggleWireMode = useCallback(() => {
    setWireMode((m) => {
      const next = !m;
      if (!next) setPendingWireFrom(null);
      return next;
    });
  }, []);

  const onLoadDemo = () => {
    setHistory((h) => replaceAll(h, buildDemoCircuit()));
    setSelectedId(null);
    setSelectedWireId(null);
    setMessage('已加载 Demo 电路 (UNO + 220Ω + LED)');
  };

  const onClearCanvas = () => {
    setHistory((h) => replaceAll(h, { parts: [], wires: [] }));
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
  const isLit = d13 > 0;
  const partCount = history.current.parts.length;
  const wireCount = history.current.wires.length;

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-base-300 bg-base-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">wokwi-cn 编辑器</h1>
          <span className="text-xs text-base-content/50 font-mono">
            D5 — 画布 + 撤销/重做
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onLoadDemo}
            className="btn btn-ghost btn-xs"
            title="加载 UNO+220Ω+LED Demo 电路"
          >
            📦 Demo
          </button>
          <button
            onClick={onExportWiring}
            className="btn btn-ghost btn-xs"
            title="导出 wiring.json"
          >
            ⤓ 导出 JSON
          </button>
          <button
            onClick={onClearCanvas}
            className="btn btn-ghost btn-xs text-error"
            title="清空画布"
          >
            🗑 清空
          </button>
          <Link to="/" className="link link-hover text-xs ml-2">
            ← 回首页
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: code editor */}
        <div className="w-1/2 border-r border-base-300 flex flex-col bg-base-100">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-base-content/60 font-bold border-b border-base-300 flex items-center justify-between">
            <span>sketch.ino</span>
            <div className="flex gap-1.5">
              <button
                onClick={onRun}
                disabled={status === 'running'}
                className="btn btn-primary btn-xs"
              >
                ▶ Run
              </button>
              <button
                onClick={onStop}
                disabled={status !== 'running'}
                className="btn btn-xs"
              >
                ■ Stop
              </button>
              <button
                onClick={() => {
                  setCode(DEFAULT_CODE);
                  setPins({});
                  setStatus('idle');
                  setMessage('已重置代码');
                }}
                className="btn btn-ghost btn-xs"
              >
                ↺ 重置
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

        {/* Right: canvas + library */}
        <div className="w-1/2 flex">
          <PartLibraryPanel />
          <div className="flex-1 flex flex-col">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-base-content/60 font-bold border-b border-base-300 flex items-center justify-between">
              <span>画布 — 拖元件到此处</span>
              <span className="font-mono text-base-content/50 normal-case">
                {partCount} 件 / {wireCount} 线
              </span>
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
              wireMode={wireMode}
              onToggleWireMode={onToggleWireMode}
              onWireCreate={onWireCreate}
              pendingWireFrom={pendingWireFrom}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function D13Indicator({ d13, tick }: { d13: number; tick: number }) {
  const ref = useRef<SVGGElement | null>(null);
  const [, force] = useState(0);
  useEffect(() => {
    if (ref.current) {
      while (ref.current.firstChild) ref.current.removeChild(ref.current.firstChild);
      // D3 part API: led.render takes pin A
      import('../parts/led').then(({ led }) => {
        if (ref.current) led.render(ref.current, { pins: { A: d13 } });
        force((x) => x + 1);
      });
    }
  }, [d13, tick]);
  return (
    <svg width={50} height={40} viewBox="0 0 60 50" aria-label={d13 > 0 ? 'LED on' : 'LED off'} role="img">
      <g ref={ref} />
    </svg>
  );
}
