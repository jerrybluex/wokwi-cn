import { Link, useParams } from 'react-router-dom';

export function ShareViewPage() {
  const { shareId } = useParams();
  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">只读项目分享</h1>
      <p className="text-sm text-base-content/60 mb-2">
        D7 项目保存 + 分享实装 — shareId ={' '}
        <code className="text-primary font-mono">{shareId}</code>
      </p>

      <div className="alert alert-info mt-6">
        <span>该项目还没被分享(占位页 — 分享链接口 D7 实现)</span>
      </div>

      <div className="card bg-base-200 shadow-sm mt-6">
        <div className="card-body">
          <h3 className="card-title text-base">路由验证</h3>
          <p className="text-sm text-base-content/70">
            URL 参数 <code className="text-primary">:shareId</code> 已被 React Router 解析。
            D7 实装后会改用 <code className="text-primary">useLoaderData()</code> 异步取项目 JSON。
          </p>
        </div>
      </div>

      <div className="text-center mt-6">
        <Link to="/" className="link link-hover text-sm">
          ← 回首页
        </Link>
      </div>
    </div>
  );
}
