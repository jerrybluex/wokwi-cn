import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsApi, type ProjectSummary } from '../projects/api';
import { useAuth } from '../auth/useAuth';
import { TEMPLATES } from '../projects/templates';

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('Untitled Sketch');

  const refresh = useCallback(async () => {
    setError(null);
    const { status, data } = await projectsApi.list();
    if (status === 200 && 'projects' in data) {
      setItems(data.projects);
    } else {
      setError('加载失败');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const onCreate = async () => {
    if (creating) return;
    setCreating(true);
    const { status, data } = await projectsApi.create({ name: newName.trim() || 'Untitled' });
    setCreating(false);
    if (status === 201 && 'project' in data) {
      navigate(`/editor?projectId=${data.project.id}`);
    } else {
      setError('创建失败');
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`删除 "${name}"?`)) return;
    await projectsApi.remove(id);
    refresh();
  };

  const onCreateFromTemplate = async (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setCreating(true);
    const { status, data } = await projectsApi.create({
      name: tpl.name,
      code: tpl.code,
      wiring: tpl.wiring,
    });
    setCreating(false);
    if (status === 201 && 'project' in data) {
      navigate(`/editor?projectId=${data.project.id}`);
    } else {
      setError('从模板创建失败');
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-8 max-w-2xl text-sm">
        请先 <Link to="/login" className="link link-primary">登录</Link> 再访问项目列表。
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">我的项目</h1>
        <Link to="/editor" className="btn btn-ghost btn-sm">
          ← 编辑器
        </Link>
      </div>

      {/* Template picker */}
      <div className="mb-5">
        <h3 className="font-sans font-semibold text-xs uppercase tracking-wider text-muted mb-3">
          从模板新建
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onCreateFromTemplate(tpl.id)}
              disabled={creating}
              className="group block bg-paper border border-line rounded-card p-4 text-left hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-[10px] font-mono text-muted uppercase tracking-wider">
                  Template
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <div className="font-semibold text-sm text-ink mb-1">{tpl.name}</div>
              <div className="text-[11px] text-ink-soft leading-relaxed">
                {tpl.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="divider text-xs text-base-content/40 my-3">或手动创建</div>

      <div className="card bg-base-200 shadow-sm mb-4">
        <div className="card-body p-3 flex-row items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input input-bordered input-sm flex-1"
            placeholder="新项目名"
            maxLength={80}
          />
          <button
            onClick={onCreate}
            disabled={creating}
            className="btn btn-primary btn-sm"
          >
            {creating ? '创建中…' : '+ 新建项目'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error text-sm mb-3">
          <span>{error}</span>
        </div>
      )}

      {items === null ? (
        <div className="text-sm text-base-content/40">加载中…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-base-content/40">
          还没有项目。点上方「新建项目」开始第一个。
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((p) => (
            <li
              key={p.id}
              className="card bg-base-100 border border-base-300"
            >
              <div className="card-body p-3 flex-row items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{p.name}</div>
                  <div className="text-[10px] text-base-content/50 font-mono">
                    {fmtTime(p.updatedAt)} · {p.id.slice(0, 8)}…
                    {p.shareId ? (
                      <span className="ml-2 badge badge-info badge-xs">已分享</span>
                    ) : null}
                  </div>
                </div>
                <Link
                  to={`/editor?projectId=${p.id}`}
                  className="btn btn-ghost btn-xs"
                >
                  打开
                </Link>
                {p.shareId && (
                  <Link
                    to={`/p/${p.shareId}`}
                    className="btn btn-ghost btn-xs"
                  >
                    公开页
                  </Link>
                )}
                <button
                  onClick={() => onDelete(p.id, p.name)}
                  className="btn btn-ghost btn-xs text-error"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
