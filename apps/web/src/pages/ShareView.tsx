import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { projectsApi, type Project } from '../projects/api';
import { CodeEditor } from '../components/CodeEditor';
import { initHistory, type History } from '../canvas/state';
import { CanvasPanel } from '../canvas/CanvasPanel';
import { buildDemoCircuit } from '../canvas/demo';
import { fromWiringJSON } from '../canvas/wiring';
import { emptyCanvas } from '../canvas/state';
import { useAuth } from '../auth/useAuth';

export function ShareViewPage() {
  const { shareId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forking, setForking] = useState(false);
  const [history, setHistory] = useState<History>(() => initHistory(buildDemoCircuit()));

  useEffect(() => {
    if (!shareId) return;
    let cancelled = false;
    (async () => {
      const { status, data } = await projectsApi.publicGet(shareId);
      if (cancelled) return;
      if (status === 200 && 'project' in data) {
        setProject(data.project);
        try {
          const wiring = data.project.wiring
            ? fromWiringJSON(JSON.parse(data.project.wiring))
            : emptyCanvas();
          setHistory(initHistory(wiring));
        } catch {
          setHistory(initHistory(buildDemoCircuit()));
        }
      } else {
        setError('链接无效或已失效');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const onFork = async () => {
    if (!shareId || forking) return;
    setForking(true);
    const { status, data } = await projectsApi.fork(shareId);
    setForking(false);
    if (status === 201 && 'project' in data) {
      navigate(`/editor?projectId=${data.project.id}`);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">分享链接</h1>
        <div className="alert alert-error text-sm">
          <span>{error}</span>
        </div>
        <Link to="/" className="link link-hover text-sm mt-4 inline-block">
          ← 回首页
        </Link>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="container mx-auto p-8 max-w-2xl text-sm text-base-content/60">
        加载中…
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-base-300 bg-base-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-xs link link-hover">
            ← 回首页
          </Link>
          <h1 className="text-lg font-bold truncate">{project.name}</h1>
          <span className="badge badge-ghost badge-sm">只读 · 公开</span>
        </div>
        <div className="text-[10px] text-base-content/50 font-mono">
          /p/{project.shareId}
        </div>
        <div className="flex-none">
          {user ? (
            <button
              onClick={onFork}
              disabled={forking}
              className="btn btn-primary btn-sm"
            >
              {forking ? 'Fork 中…' : '⎘ Fork 到我的项目'}
            </button>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm">
              登录后 Fork
            </Link>
          )}
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-base-300 flex flex-col bg-base-100">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-base-content/60 font-bold border-b border-base-300">
            sketch.ino
          </div>
          <div className="flex-1 overflow-hidden p-2">
            <CodeEditor
              value={project.code}
              onChange={() => {}}
              disabled
              height="100%"
            />
          </div>
        </div>
        <div className="w-1/2 flex flex-col">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-base-content/60 font-bold border-b border-base-300">
            画布 (只读)
          </div>
          <div className="flex-1 relative bg-base-100">
            {/* CanvasPanel is interactive but the parent is read-only.
                We still render wires/parts. Interaction handlers are no-ops
                because the user has no need to edit a share. */}
            <CanvasPanel
              state={history.current}
              history={history}
              onChange={() => {}}
              onUndo={() => {}}
              onRedo={() => {}}
              selectedId={null}
              onSelect={() => {}}
              selectedWireId={null}
              onSelectWire={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
