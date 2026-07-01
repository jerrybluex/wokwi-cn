import { Link, Outlet } from 'react-router-dom';

export function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="navbar bg-base-200 border-b border-base-300">
        <div className="flex-1 px-2">
          <Link to="/" className="btn btn-ghost text-lg gap-2">
            <span className="text-primary font-bold">W</span>
            <span>wokwi</span>
          </Link>
        </div>
        <div className="flex-none gap-2 px-2">
          <Link to="/login" className="btn btn-primary btn-sm">
            登录
          </Link>
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
