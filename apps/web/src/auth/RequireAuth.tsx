/**
 * RequireAuth — HOC-style guard. While the auth probe is running we show
 * a small spinner; if there's no user we bounce to /login (preserving the
 * intended path in ?next=).
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-base-content/60">
        正在检查登录状态…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  }
  return <>{children}</>;
}
