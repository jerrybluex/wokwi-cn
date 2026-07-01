import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function HomePage() {
  const { user, loading } = useAuth();
  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-3">在浏览器里学单片机</h1>
      <p className="text-base-content/70 mb-8">
        Sprint 2026-07-01 → 2026-07-15 · D1–D6 已就绪
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-success">✓ D1–D5 已就绪</h3>
            <ul className="text-sm space-y-1 text-base-content/70 mt-2">
              <li>D1 · pnpm workspace + Vite + Fastify + CI</li>
              <li>D2 · 浏览器 JS 软仿真器 + Editor + LED</li>
              <li>D3 · 8 件元件库 (UNO/LED/button/…)</li>
              <li>D4 · CodeMirror 6 (cpp 高亮)</li>
              <li>D5 · SVG 画布 + 撤销/重做 + 接线 + wiring.json</li>
            </ul>
          </div>
        </div>

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-primary">→ D6 完成后</h3>
            <ul className="text-sm space-y-1 text-base-content/70 mt-2">
              <li><strong>✓</strong> Prisma + User/EmailToken + Argon2id</li>
              <li><strong>✓</strong> /api/auth/* (register/login/logout/verify/forgot/reset)</li>
              <li><strong>✓</strong> /api/me · JWT cookie · 邮箱验证 stub</li>
              <li><strong>✓</strong> Login / Register / Forgot 页面</li>
              <li className="text-base-content/40">D7 项目保存 + 分享 · D8 AI 助教</li>
            </ul>
          </div>
        </div>
      </div>

      {/* D6 验收入口: 登录后这里显示 /me 信息 */}
      <div className="mt-8">
        {loading ? (
          <div className="text-sm text-base-content/40">检查登录状态…</div>
        ) : user ? (
          <div className="alert alert-success text-sm">
            <div>
              <div className="font-bold">登录中 (来自 /api/me)</div>
              <div className="text-xs opacity-70">
                {user.email} · {user.emailVerified ? '已验证' : '未验证'} · id: {user.id.slice(0, 12)}…
              </div>
            </div>
            <Link to="/editor" className="btn btn-sm btn-primary">进编辑器 →</Link>
          </div>
        ) : (
          <div className="alert text-sm">
            <span>未登录 — 点下方按钮注册或登录</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3 flex-wrap">
        <Link to="/editor" className="btn btn-primary btn-sm">
          试一下编辑器 →
        </Link>
        <Link to="/login" className="btn btn-ghost btn-sm">
          登录 / 注册
        </Link>
        <Link to="/p/demo123" className="btn btn-ghost btn-sm">
          只读分享页 (D7)
        </Link>
      </div>
    </div>
  );
}
