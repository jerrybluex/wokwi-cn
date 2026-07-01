import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsApi, type ProjectSummary } from '../projects/api';
import { useAuth } from '../auth/useAuth';

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
