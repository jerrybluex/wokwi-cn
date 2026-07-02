/**
 * HomePage — landing page.
 *
 * 设计目标:首屏明确一个主操作(进 LED 课),引导北极星指标完成首课率。
 * 参考:docs/designs/led-course-wireframe.html §03 + design-system.html。
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const FEATURED_COURSE = {
  slug: 'led-blink',
  title: 'LED 闪烁',
  badge: '现已上线',
  description: '5 步。从打开 IDE 到 LED 一闪一闪。15 分钟。',
} as const;

function IconArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconPlay({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

export function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="bg-cream">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 md:px-8 pt-14 md:pt-20 pb-10 max-w-5xl">
        <h1 className="font-serif text-[32px] md:text-[34px] leading-[1.18] text-ink mb-3 tracking-[-0.005em]">
          在浏览器里学单片机
          <br />
          不用硬件,不用排队。
        </h1>
        <p className="text-ink-soft text-[15px] md:text-base leading-relaxed max-w-[560px] mb-7">
          5 步走完 LED 闪烁,写出你的第一行 Arduino 代码,看见它真的亮起来。
        </p>

        <div className="flex flex-wrap gap-3 mb-3">
          <Link to={`/learn/${FEATURED_COURSE.slug}`} className="btn btn-primary">
            <IconPlay />
            从 LED 课开始 · 5 分钟
          </Link>
          <Link to="/editor" className="btn btn-ghost">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.7L13 2.4a2 2 0 0 0-2 0l-7 3.9A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 3.9a2 2 0 0 0 2 0l7-3.9A2 2 0 0 0 21 16z" />
            </svg>
            直接打开编辑器
          </Link>
        </div>

        {loading ? (
          <p className="text-xs text-muted mt-4">检查登录状态…</p>
        ) : user ? (
          <p className="text-xs text-ink-soft mt-4">
            已登录 · <span className="font-mono">{user.email}</span>
            <Link to="/projects" className="link link-primary ml-3">
              我的项目 →
            </Link>
          </p>
        ) : (
          <p className="text-xs text-ink-soft mt-4">
            新用户?
            <Link to="/login?mode=register" className="link link-primary mx-1">
              30 秒注册
            </Link>
            ,直接进 LED 课。
          </p>
        )}
      </section>

      {/* ── Courses ─────────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 md:px-8 pb-20 max-w-5xl">
        <h3 className="font-sans font-semibold text-xs uppercase tracking-wider text-muted mb-4">
          课程
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 现线上 — LED 闪烁 */}
          <Link
            to={`/learn/${FEATURED_COURSE.slug}`}
            className="group block bg-paper border border-line rounded-card p-5 hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="text-[11px] font-mono text-success tracking-wide mb-2">
              {FEATURED_COURSE.badge}
            </div>
            <h4 className="text-base font-semibold text-ink mb-2">
              第 1 课 · {FEATURED_COURSE.title}
            </h4>
            <p className="text-sm text-ink-soft leading-relaxed">{FEATURED_COURSE.description}</p>
            <div className="mt-4 text-primary text-sm font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              开始课程 <IconArrowRight />
            </div>
          </Link>

          {/* P1 占位 — 更多课程 */}
          <div
            className="block border border-dashed border-line rounded-card p-5"
            style={{
              background:
                'repeating-linear-gradient(135deg, #ffffff 0 10px, #f7f5f0 10px 20px)',
            }}
          >
            <div className="text-[11px] font-mono text-muted tracking-wide mb-2">P1 · 路上</div>
            <h4 className="text-base font-semibold text-muted mb-2">更多课程</h4>
            <p className="text-sm text-ink-soft leading-relaxed">
              按钮控制 / 电位器调亮度 / 串口打印……按需上线。
            </p>
            <div className="mt-4 text-xs text-muted">Phase 2 扩展</div>
          </div>
        </div>
      </section>
    </div>
  );
}
