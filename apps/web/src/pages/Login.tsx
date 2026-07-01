import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <div className="container mx-auto p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-2">登录 / 注册</h1>
      <p className="text-sm text-base-content/60 mb-6">
        D6 用户系统实装 — 现在是占位
      </p>

      <form className="card bg-base-200 shadow-sm">
        <div className="card-body gap-4">
          <label className="form-control">
            <span className="label-text mb-1">邮箱</span>
            <input
              type="email"
              placeholder="you@example.com"
              className="input input-bordered"
              disabled
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">密码</span>
            <input
              type="password"
              placeholder="••••••••"
              className="input input-bordered"
              disabled
            />
          </label>
          <button type="button" className="btn btn-primary" disabled>
            登录 (D6 实装)
          </button>
          <p className="text-xs text-base-content/50 text-center mt-2">
            MVP 暂仅邮箱注册 · 单设备会话
          </p>
        </div>
      </form>

      <div className="text-center mt-6">
        <Link to="/" className="link link-hover text-sm">
          ← 回首页
        </Link>
      </div>
    </div>
  );
}
