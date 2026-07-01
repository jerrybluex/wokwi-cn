import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/useAuth';

export function App() {
  const { loading, user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="navbar bg-base-200 border-b border-base-300">
        <div className="flex-1 px-2">
          <Link to="/" className="btn btn-ghost text-lg gap-2">
            <span className="text-primary font-bold">W</span>
            <span>wokwi</span>
          </Link>
        </div>
        <div className="flex-none gap-2 px-2 text-sm">
          {loading ? (
            <span className="text-base-content/40">…</span>
          ) : user ? (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-1">
                <span className="text-xs opacity-70">{user.email}</span>
                {user.emailVerified ? null : (
                  <span className="badge badge-warning badge-xs">未验证</span>
                )}
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-box border border-base-300 w-44 p-1 shadow-md z-10"
              >
                <li>
                  <Link to="/editor">编辑器</Link>
                </li>
                <li>
                  <Link to="/projects">我的项目</Link>
                </li>
                <li>
                  <span className="opacity-50 text-xs">ID: {user.id.slice(0, 8)}…</span>
                </li>
                <li>
                  <button onClick={onLogout} className="text-error">
                    登出
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                登录
              </Link>
              <Link to="/login?mode=register" className="btn btn-primary btn-sm">
                注册
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="footer footer-center p-4 bg-base-200 text-base-content/70 text-sm border-t border-base-300">
        <p>wokwi · 高职单片机教学产品 · MVP · Sprint 2026-07-15</p>
      </footer>
    </div>
  );
}
