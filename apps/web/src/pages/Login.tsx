import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

type Mode = 'login' | 'register';

const TITLE: Record<Mode, string> = {
  login: '登录',
  register: '注册',
};
const SUBMIT: Record<Mode, string> = {
  login: '登录',
  register: '注册',
};
const TOGGLE_LABEL: Record<Mode, string> = {
  login: '还没有账号?注册',
  register: '已经有账号?登录',
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);

  const next = (location.state as { next?: string } | null)?.next ?? '/';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setRegisterMessage(null);
    try {
      if (mode === 'login') {
        const res = await auth.login(email.trim(), password);
        if (res.ok) navigate(next);
      } else {
        const res = await auth.register(email.trim(), password, name.trim() || undefined);
        if (res.ok) {
          setRegisterMessage(res.message ?? '注册成功');
          // After register we keep them on this page so they see the message
          // and can switch to login.
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-1">{TITLE[mode]}</h1>
      <p className="text-sm text-base-content/60 mb-6">
        wokwi-cn — 高职单片机仿真教学
      </p>

      <form onSubmit={onSubmit} className="card bg-base-200 shadow-sm">
        <div className="card-body gap-3">
          {mode === 'register' && (
            <label className="form-control">
              <span className="label-text mb-1 text-xs">昵称 (可选)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="小李"
                className="input input-bordered input-sm"
                autoComplete="nickname"
                maxLength={80}
              />
            </label>
          )}
          <label className="form-control">
            <span className="label-text mb-1 text-xs">邮箱</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input input-bordered input-sm"
              autoComplete="email"
              maxLength={254}
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1 text-xs">密码 (≥ 8 位)</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input input-bordered input-sm"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              maxLength={128}
            />
          </label>

          {auth.error && (
            <div className="alert alert-error py-2 text-xs">
              <span>
                {auth.error === 'invalid_credentials'
                  ? '邮箱或密码错误'
                  : auth.error === 'email_in_use'
                    ? '该邮箱已被注册'
                    : auth.error === 'invalid_input'
                      ? '输入有误 (邮箱格式 / 密码长度)'
                      : `错误: ${auth.error}`}
              </span>
            </div>
          )}

          {registerMessage && (
            <div className="alert alert-info py-2 text-xs">
              <span>{registerMessage} — 控制台已打印验证链接 (开发环境)</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || auth.loading}
            className="btn btn-primary btn-sm mt-1"
          >
            {submitting ? '处理中…' : SUBMIT[mode]}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setRegisterMessage(null);
            }}
            className="btn btn-ghost btn-xs"
          >
            {TOGGLE_LABEL[mode]}
          </button>
        </div>
      </form>

      <div className="flex justify-between items-center mt-4 text-xs">
        <Link to="/forgot" className="link link-hover">
          忘记密码?
        </Link>
        <Link to="/" className="link link-hover">
          ← 回首页
        </Link>
      </div>
    </div>
  );
}
