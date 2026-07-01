# AGENTS.md

wokwi:中文教学产品,让中国高职学生在浏览器里学 Arduino 单片机。MVP 目标 — 学生从注册到完成"LED 闪烁"课,全程 simavr WASM 仿真器 + DeepSeek V3 AI 助教。Sprint 2026-07-01 → 2026-07-15。

## Setup commands

- Install deps: `pnpm install`
- Start dev:    `pnpm dev`     (前端 + 后端并行)
- Build:        `pnpm build`
- Test:         `pnpm test`    (Vitest 单元测)
- Lint:         `pnpm lint`    (ESLint)
- Typecheck:    `pnpm typecheck` (tsc --noEmit)

## Project layout

现状(2026-07-01):
- `PRD.md` — 产品需求文档 v2(聚焦 MVP)
- `devplan.md` — 2 周 sprint 详细任务清单
- `docs/` — 长期文档(课程参考、ADR、用户访谈)
- `wokwi-clone.html` — 76KB PoC,Day 2 后迁入 `apps/web/src`

目标结构(devplan §1):
- `apps/web/` — Vite + React + TS 前端
- `apps/server/` — Fastify + TS 后端
- `packages/shared/` — 共享类型
- 未来:`apps/web/src/parts/` 12 个元件

## Code style

- TypeScript strict mode(`tsconfig.json: strict: true`)
- Prettier: 单引号、120 字符宽
- ESLint: `@typescript-eslint/recommended-type-checked`
- Pre-commit: lint-staged 跑 `eslint --fix` + `prettier --write`
- 命名:文件 `kebab-case`、组件 `PascalCase`、变量 / 函数 `camelCase`
- 错误处理:不要 swallow,handle 完要么 rethrow 要么 log

## Testing instructions

- 单测: `pnpm test` (Vitest)
- 新加的元件每个函数必须加单测
- CI 跑 lint + typecheck + test,全绿才能合(sprint 内手动跑)
- 仿真器核心 (`src/parts/sim-*`) 覆盖率目标 ≥ 50%

## PR & commit conventions

- Sprint 期间(2026-07-15 前):单分支 `main`,直接 commit + push,不需要 PR
- 后期:引入分支 + PR
- Commit: conventional commits(`feat:` / `fix:` / `docs:` / `refactor:` / `chore:`)
- message 第一人称现在时、imperative,中文 OK

## Security

- DeepSeek API Key 走后端 `.env`,前端不能直接拿
- `.gitignore` 已就位,不要硬覆盖引入 `.env`
- 不在代码 / 注释里写 token / 真实邮箱
- 用户提交的代码路径走 React 默认 XSS 防护,不要直接 `dangerouslySetInnerHTML`

## Sprint constraints(2 周)

- 12 元件里至少 8 件通(UNO/LED/按钮/电位器/电阻/舵机/蜂鸣器/超声波)
- 1 门示范课 = LED 闪烁,5 step
- AI 助教 3 类能力(explain / error / hint)
- 不要做:教师、判题、班级、商业化、Phase 2/3 内容(都在 Out of Scope 里)
- 找不到参考 / 集成卡:降级到 `wokwi-clone.html` 的 JS 软仿真,**不阻塞 2 周 deadline**
