import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-3">在浏览器里学单片机</h1>
      <p className="text-base-content/70 mb-8">
        D1 脚手架已就位 · Sprint 2026-07-01 → 2026-07-15
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-success">✓ D1 已就绪</h3>
            <ul className="text-sm space-y-1 text-base-content/70 mt-2">
              <li>pnpm workspace + monorepo</li>
              <li>Vite + React + TS</li>
              <li>Tailwind + daisyUI</li>
              <li>路由 / · /editor · /login · /p/:shareId</li>
              <li>Fastify 后端 + Vitest 单测</li>
              <li>GitHub Actions CI</li>
            </ul>
          </div>
        </div>

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-primary">→ D2 进行中</h3>
            <ul className="text-sm space-y-1 text-base-content/70 mt-2">
              <li><strong>✓</strong> JS 软仿真器在浏览器跑(降级路径)</li>
              <li><strong>✓</strong> Editor + 数字 LED 视图</li>
              <li className="text-base-content/40">— simavr WASM 集成(后置)</li>
              <li>D3 元件 8 件</li>
              <li>D4 CodeMirror 6</li>
              <li>D5 SVG 画布</li>
              <li>D6 用户系统</li>
              <li>D7 项目保存 + 分享</li>
              <li>D8 AI 助教 (DeepSeek V3)</li>
              <li>D9 课程播放器 + LED 5 step</li>
              <li>D10 部署 + 内测</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3 flex-wrap">
        <Link to="/editor" className="btn btn-primary btn-sm">
          试一下 D2 编辑器 →
        </Link>
        <Link to="/login" className="btn btn-ghost btn-sm">
          登录入口 (D6)
        </Link>
        <Link to="/p/demo123" className="btn btn-ghost btn-sm">
          只读分享页 (D7)
        </Link>
      </div>
    </div>
  );
}
