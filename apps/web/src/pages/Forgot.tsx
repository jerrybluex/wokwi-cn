import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi, isErrorResponse } from '../auth/api';

export function ForgotPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onRequest = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const { status, data } = await authApi.forgot({ email: email.trim() });
    setBusy(false);
    if (status === 200 && data && !isErrorResponse(data)) {
      setMessage(data.message);
      setStep('reset');
    } else {
      setError(isErrorResponse(data) ? data.error : 'forgot_failed');
    }
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { status, data } = await authApi.reset({ token: token.trim(), password });
    setBusy(false);
    if (status === 200 && data && !isErrorResponse(data)) {
      setMessage(data.message);
      setStep('done');
    } else {
      setError(isErrorResponse(data) ? data.error : 'reset_failed');
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-1">找回密码</h1>
      <p className="text-sm text-base-content/60 mb-6">
        输入邮箱 → 控制台看 reset URL → 把 token 粘到下方重置
      </p>

      {step === 'request' && (
        <form onSubmit={onRequest} className="card bg-base-200 shadow-sm">
          <div className="card-body gap-3">
            <label className="form-control">
              <span className="label-text mb-1 text-xs">邮箱</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered input-sm"
                autoComplete="email"
              />
            </label>
            {error && (
              <div className="alert alert-error py-2 text-xs">
                <span>错误: {error}</span>
              </div>
            )}
            <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
              {busy ? '处理中…' : '发送重置链接'}
            </button>
          </div>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={onReset} className="card bg-base-200 shadow-sm">
          <div className="card-body gap-3">
            {message && (
              <div className="alert alert-info py-2 text-xs">
                <span>{message}</span>
              </div>
            )}
            <label className="form-control">
              <span className="label-text mb-1 text-xs">重置 Token (从控制台 URL 里取)</span>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="input input-bordered input-sm font-mono"
                minLength={10}
                maxLength={200}
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1 text-xs">新密码 (≥ 8 位)</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered input-sm"
                autoComplete="new-password"
                maxLength={128}
              />
            </label>
            {error && (
              <div className="alert alert-error py-2 text-xs">
                <span>错误: {error}</span>
              </div>
            )}
            <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
              {busy ? '处理中…' : '重置密码'}
            </button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body gap-3 text-sm">
            <div className="alert alert-success py-2 text-xs">
              <span>{message ?? '密码已重置'}</span>
            </div>
            <Link to="/login" className="btn btn-primary btn-sm">
              前往登录
            </Link>
          </div>
        </div>
      )}

      <div className="text-center mt-6 text-xs">
        <Link to="/login" className="link link-hover">
          ← 回登录
        </Link>
      </div>
    </div>
  );
}
