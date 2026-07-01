import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArduinoRunner, type PinEvent } from '../sim';

const DEFAULT_CODE = `// D2 Demo: blink D13
// 按 Run 即可看到右侧 LED 模拟闪
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
  const [tick, setTick] = useState(0); // forces re-render of LED ring

  const events = useRef<PinEvent[]>([]);
  // Use a small ring of "recent events" so LED brightness can do decay later.
  // For now we simply render latest pin state.

  const onRun = async () => {
    runnerRef.current?.abort();
    setStatus('running');
    setMessage('运行中…');
    setPins({});

    const runner = new ArduinoRunner();
    runnerRef.current = runner;
    runner.onPin((ev) => {
      events.current.push(ev);
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

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">代码编辑器</h1>
        <Link to="/" className="link link-hover text-sm">
          ← 回首页
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wide text-base-content/60 font-bold">
                  sketch.ino
                </span>
                <span className="text-xs text-base-content/60 font-mono">
                  D4 升级到 CodeMirror
                </span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="textarea w-full font-mono text-sm leading-relaxed bg-base-100 border border-base-300 h-96 rounded-md p-3"
                disabled={status === 'running'}
                aria-label="Arduino code editor"
              />
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={onRun}
                  disabled={status === 'running'}
                  className="btn btn-primary btn-sm"
                >
                  ▶ Run
                </button>
                <button
                  onClick={onStop}
                  disabled={status !== 'running'}
                  className="btn btn-sm"
                >
                  ■ Stop
                </button>
                <button
                  onClick={() => {
                    setCode(DEFAULT_CODE);
                    setPins({});
                    setStatus('idle');
                    setMessage('已重置');
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  ↺ Reset code
                </button>
                <span
                  className={`text-xs self-center font-mono ${
                    status === 'error' ? 'text-error' : status === 'running' ? 'text-primary' : 'text-base-content/60'
                  }`}
                >
                  {message}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4 items-center text-center">
              <h3 className="card-title text-base w-full">D13 输出</h3>
              <LedIndicator lit={isLit} tick={tick} />
              <div className="text-xs font-mono mt-2 self-start w-full space-y-1 max-h-72 overflow-y-auto">
                {Object.entries(pins).length === 0 ? (
                  <div className="text-base-content/40">暂无事件 — 点 Run 跑</div>
                ) : (
                  Object.entries(pins).map(([pin, value]) => (
                    <div key={pin} className="flex justify-between border-b border-base-300/40 py-0.5">
                      <span>D{pin}</span>
                      <span className={value ? 'text-success' : 'text-base-content/50'}>{value ? 'HIGH' : 'LOW'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LedIndicator({ lit, tick: _tick }: { lit: boolean; tick: number }) {
  // _tick 当前未用,保留以便以后加渐变
  return (
    <svg
      width={96}
      height={96}
      viewBox="0 0 96 96"
      className="block mx-auto"
      aria-label={lit ? 'LED on' : 'LED off'}
      role="img"
    >
      <defs>
        <radialGradient id="ledGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={lit ? '#ff5252' : '#3a3a3a'} stopOpacity="0.9" />
          <stop offset="100%" stopColor={lit ? '#ff5252' : '#3a3a3a'} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* halo */}
      <circle cx="48" cy="48" r="46" fill="url(#ledGlow)" />
      {/* dome */}
      <circle
        cx="48"
        cy="48"
        r="22"
        fill={lit ? '#ff5252' : '#3a3a3a'}
        stroke={lit ? '#ff8585' : '#5d5d5d'}
        strokeWidth="2"
      />
      {/* flat side */}
      <line x1="32" y1="38" x2="32" y2="58" stroke="#222" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
