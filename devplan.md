# Dev Plan v1 — wokwi MVP

> 2 周冲刺 (2026-07-01 → 2026-07-15) 的可执行计划,PRD §11 的具体化。每天级、关键交付物、降级路径、验收方法都在这里。

| 字段 | 值 |
|---|---|
| Sprint | 2026-07-01 → 2026-07-15 |
| 投入 | 周内 5 天 × 7-8 h = 35-40 h / 周 |
| 总预算 | ~75 h(MVP) |
| 作者 | Mavis + 项目主理人 |

---

## 0. 全局依赖

| 项 | 说明 |
|---|---|
| Node.js | 20 LTS |
| 包管理 | `pnpm`(备 npm) |
| 单仓布局 | `apps/web` + `apps/server`(`pnpm workspace`) |
| 关键包 | `@wokwi/simavr-js`(Apache 2.0)、`@codemirror/state`、`fastify`(后端)、`prisma`(ORM) |
| 部署 | Vercel (前端) + Railway/Render (后端 + DB) |
| 监控 | Sentry (前后端) |
| 邮件 | MVP 用 console 占位 + dev 模式打印验证链接(不接真邮件) |

---

## 1. 文件结构(目标)

```
wokwi-cn/
├── apps/
│   ├── web/                          # React + Vite + TS 前端
│   │   ├── src/
│   │   │   ├── parts/               # 12 元件 (led.ts, button.ts, ...)
│   │   │   ├── canvas/              # SVG 画布
│   │   │   ├── editor/              # CodeMirror 6 wrapper
│   │   │   ├── ai/                  # AI 助教抽屉
│   │   │   ├── auth/                # 注册登录
│   │   │   ├── course/              # 课程播放器
│   │   │   ├── store/               # Zustand stores
│   │   │   ├── components/          # UI 组件
│   │   │   └── pages/               # 路由页面
│   │   └── index.html
│   └── server/                       # Fastify API
│       ├── src/
│       │   ├── routes/              # auth/projects/ai/courses
│       │   ├── db/                  # Prisma client + queries
│       │   └── lib/                 # 业务逻辑
│       └── prisma/
│           └── schema.prisma
├── packages/
│   └── shared/                       # 前后端共享类型
│       └── types.ts
├── docs/
│   ├── PRD.md
│   ├── devplan.md           ← 你在这里
│   ├── decisions.md
│   └── course-reference.md
└── wokwi-clone.html         # PoC,Day 2 迁移完后归档
```

> 详细 monorepo 配置见 [§7](#7-monorepo--devops)

---

## 2. 数据模型 (Prisma)

```prisma
// apps/server/prisma/schema.prisma

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  emailVerified Boolean @default(false)
  verifyToken  String?  @unique
  createdAt    DateTime @default(now())

  projects     Project[]
  progress     CourseProgress[]
  aiCalls      AiCall[]
}

model EmailToken {
  id        String   @id @default(cuid())
  userId    String
  purpose   String   // 'verify' | 'reset'
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?

  @@index([userId])
}

model Project {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String   @default("Untitled")
  code      String   @default("")
  wiring    Json     @default("{}")
  shareId   String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model CourseProgress {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseSlug String
  stepIdx    Int      @default(0)
  completedAt DateTime?

  @@unique([userId, courseSlug])
  @@index([userId])
}

model AiCall {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskType  String   // 'explain' | 'error' | 'hint'
  tokensIn  Int      @default(0)
  tokensOut Int      @default(0)
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
```

**为什么这样设计**:
- `AiCall` 留 `tokensIn/Out` 是为后续做成本核算
- `EmailToken` 独立表是因为 verify/reset 都需要可过期可复用
- `Project.shareId` 单独索引便于分享链接快查
- 删除用户级联所有内容

---

## 3. API 设计

### 3.1 认证(`/api/auth/*`)

| 方法 | 路径 | 用途 | Body | 返回 |
|---|---|---|---|---|
| POST | `/register` | 注册 | `{email, password}` | `{user}` + Set-Cookie |
| POST | `/login` | 登录 | `{email, password}` | `{user}` + Set-Cookie |
| POST | `/logout` | 登出 | | 204 + 清 cookie |
| POST | `/verify` | 邮箱验证 | `{token}` | 200 |
| POST | `/forgot` | 找回密码 | `{email}` | 200(防枚举,无返回) |
| POST | `/reset` | 重置密码 | `{token, password}` | 200 |
| GET | `/me` | 当前用户 | | `{user}` 或 401 |

### 3.2 项目(`/api/projects/*`)

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/projects` | 列出当前用户项目 |
| POST | `/api/projects` | 创建新项目 |
| GET | `/api/projects/:id` | 单项目详情 |
| PUT | `/api/projects/:id` | 全量保存 |
| DELETE | `/api/projects/:id` | 删除 |
| POST | `/api/projects/:id/share` | 生成/刷新 shareId |

### 3.3 分享(`/p/:shareId`)

GET `/p/:shareId` 返回项目 JSON(code + wiring + title),只读,任何人不登录可访问。

### 3.4 课程(`/api/courses/*`)

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/courses` | 课程列表(1 门,LED 课) |
| GET | `/api/courses/led-blink` | 单课程详情(含 step JSON) |
| GET | `/api/courses/led-blink/progress` | 当前用户进度 |
| POST | `/api/courses/led-blink/progress` | 同步进度 `{stepIdx, completed}` |

**课程 JSON 写死在 server**(MVP 就 1 门,不需要 DB 存)。

### 3.5 AI(`/api/ai/chat`)

```
POST /api/ai/chat
Headers: Cookie: jwt=...
Body: {
  taskType: 'explain' | 'error' | 'hint',
  code?: string,
  errorMessage?: string,
  question?: string,
}
Response: SSE
data: {"chunk": "..."}
...
data: {"done": true, "tokensIn": 200, "tokensOut": 50}
```

后端代理 DeepSeek,限流 20 次/天/账号(PG 计数 24h 内)。

---

## 4. 每日任务 (Day 1 — Day 10)

### Day 1 — 项目骨架 (2026-07-01 周二,预计 8h)

**目标**:`pnpm dev` 起来看到空 layout;`pnpm test` 跑通一个示例测试。

| 时段 | 任务 |
|---|---|
| 上午 4h | `apps/web` Vite + React + TS 脚手架;`apps/server` Fastify + TS 起步;`packages/shared` 共享类型;`pnpm workspace` 配置;ESLint + Prettier |
| 下午 4h | TailwindCSS 接入(用 `daisyui` 写点基础组件);路由 `/`、`/login`、`/p/:shareId` 占位;CI:GitHub Actions 跑 lint + typecheck |

**验收**:
- `pnpm dev` 启动,首页空白带 layout
- `pnpm test` 跑过 1 个 dummy test
- `pnpm lint` 无 error
- CI 绿

**降级**:如果 Tailwind 集成出问题 → 用 CSS Modules;如果 pnpm 没装 → 改 npm + workspaces。

### Day 2 — simavr WASM 集成 (2026-07-02 周三,8h)

**目标**:一个 React 组件内点 Run,LED 真闪。

| 时段 | 任务 |
|---|---|
| 上午 4h | 装 `@wokwi/simavr-js`;在 server 端 wrapper 出 `/api/compile-and-run` (MVP 用云端跑);前端发 code → 拿 pin events stream(SSE) |
| 下午 4h | 复用 PoC 的 SVG 视图 + 组件逻辑,改成 TS;把 PoC 里的 JS 软仿真**留为降级路径**;LED 真根据 simavr 输出闪 |

**验收**:
```arduino
void setup() { pinMode(13, OUTPUT); }
void loop() {
  digitalWrite(13, HIGH); delay(500);
  digitalWrite(13, LOW);  delay(500);
}
```
→ 浏览器看到 LED 500ms 闪一次

**降级**:如果 WASM 集成超出 8h,切到 JS 软仿真(MVP 也合格,留作技术债)。

### Day 3 — 12 元件(早 8 件) (2026-07-03 周四,8h)

**目标**:`src/parts/*.ts` 8 个元件可用。

| 时段 | 任务 |
|---|---|
| 上午 4h | 把 PoC 的 PART_DEFS 重写为 TS module,每个元件一个文件;定义 `PartSpec` 类型(`pins`/`model`/`view`) |
| 下午 4h | 写 led.ts / button.ts / potentiometer.ts / resistor.ts / uno.ts / hcsr04.ts / servo.ts / buzzer.ts(8 件,MVP 必备);每件极简单测 |

**验收**:`pnpm test` 元件单测全过;`PartRegistry` 注册这 8 件能正确出现。

**延后**:OLED / MPU6050 / RGB LED / 七段 → 等用户需要时再加(暂不实现,week 2 内审看是否需要)。

### Day 4 — 编辑器 (2026-07-04 周五,8h)

**目标**:CodeMirror 6 + Arduino 高亮 + 错误捕获。

| 时段 | 任务 |
|---|---|
| 上午 4h | CodeMirror 6 (`@codemirror/state` + `view` + `lang-cpp`);Arduino keyword 扩(pinMode 等加到 cpp keywords) |
| 下午 4h | 编译走法:用 avrgccjs 或 `@wokwi/avr-libc` JS 实现 pinMode/delay 等基础 API 验证,**MVP 不真编译**(运行时做基础词法检查+内置函数名匹配);错误显示在底部面板 |

**验收**:代码区支持 syntax highlight;运行按钮触发报错时,显示错误指向行。

**降级**:不上真实 gcc,MVP 验收"代码不被解析错误则接受,运行就调模拟器"。

### Day 5 — 画布 + 撤销 (2026-07-07 周一,8h)

**目标**:`UNO + LED + 电阻 + 按钮` 电路可搭可拆可撤销。

| 时段 | 任务 |
|---|---|
| 上午 4h | 把 PoC 的 SVG 画布迁到 src/canvas/;完善拖放 + 连线交互(React 化) |
| 下午 4h | 命令栈 + 撤销/重做(undo/redo),限制 20 步;Delete 键删除;ESC 取消连线 |

**验收**:用户可以在画布搭建 `UNO D13 + LED`,Run 后灯亮,导线连接稳定。

### Day 6 — 用户系统 (2026-07-08 周二,8h)

**目标**:邮箱注册 → 验证 → 登录 整条链路通(邮件用 console 占位)。

| 时段 | 任务 |
|---|---|
| 上午 4h | Fastify 路由 `register/login/logout/verify/forgot/reset`;Prisma 生成 User + EmailToken;Argon2id hash;JWT cookie |
| 下午 4h | React 登录页 + 注册页 + 找回密码页;`useAuth` hook;`<RequireAuth>` 高阶组件;`me` API |

**验收**:注册邮箱 → server console 打 `verify URL: ...` → 浏览器点 → 验证 → 可登录 → 访问 `/me` 拿到自己。

**降级**:邮件发送 stub,所有链接打 console。

### Day 7 — 项目保存 + 分享 (2026-07-09 周三,8h)

**目标**:能保存项目 + 生成只读链接。

| 时段 | 任务 |
|---|---|
| 上午 4h | 后端 CRUD `/api/projects/*`;Prisma queries;shareId 生成 |
| 下午 4h | 前端:`/projects` 列表 + 单项目页;自动保存(debounce 10s + diff);`/p/:shareId` 只读视图 |

**验收**:写代码 → 关闭 → 重开 → 内容在;分享链接打开别人能看只读。

### Day 8 — AI 助教 (2026-07-10 周四,8h)

**目标**:DeepSeek 集成 + 3 类能力 + 限流。

| 时段 | 任务 |
|---|---|
| 上午 4h | `POST /api/ai/chat` 代理 DeepSeek API;3 类 system prompt(`docs/ai-tutor-prompts.md`);SSE 流式输出 |
| 下午 4h | 前端抽屉 UI;3 个触发器(选中代码→explain / 错误→translate / 卡住→hint);限流 20/天 |

**验收**:
- 代码问"这段做什么",5 秒内拿回答
- 故意写错,点击"为什么错",给中文解释
- 网络断开 → 优雅降级文案

**降级**:DeepSeek API 挂 → 显示"AI 助教暂时不可用,请稍后重试"。

### Day 9 — 课程播放器 + 1 门示范课 (2026-07-11 周五,8h)

**目标**:走完 LED 课。

| 时段 | 任务 |
|---|---|
| 上午 4h | `<CoursePlayer>` 组件(左 step 列表 / 右编辑区);上一步/下一步;完成 step 同步进度 |
| 下午 4h | 1 门课 = 5 step(看 / 亮 / 闪 / 调频 / 完成),写在 server `courses/led-blink.ts`;`<RequireAuth>` 包装(必须登录才能继续) |

**验收**:登录后访问 `/learn/led-blink`,5 步全走完,关掉再回来仍在 step 4。

### Day 10 — 部署 + 内测 (2026-07-14 周一,8h)

**目标**:公网 https 可访问 + 1 个真实学生 30 min 试用。

| 时段 | 任务 |
|---|---|
| 上午 4h | Vercel 部署前端(从 GitHub 自动构建);Render/Railway 部署后端;Postgres 创建 migration;DNS 临时用 `.vercel.app` |
| 下午 4h | Sentry 接入(前端 + 后端);找 1 个学生约 30 min 试用,记录反馈;fix 致命 bug |

**验收**:
- 公网 https:`wokwi-cn.vercel.app` 可访问
- Sentry 有事件流入
- 1 个学生走完 5 step 无致命阻塞

---

## 5. 关键技术决策(草案,落地后写 ADR)

| Topic | 倾向方案 | 备选 |
|---|---|---|
| 后端框架 | **Fastify + TypeScript** | NestJS(更结构化但写起来慢) |
| ORM | **Prisma + Postgres** | Drizzle |
| 部署 | **Vercel + Railway** | Fly.io / 自建 |
| 状态管理 | **Zustand** | Jotai / Redux |
| 样式 | **Tailwind + daisyUI** | CSS Modules |
| 仿真 | **@wokwi/simavr-js**(主) / JS 软仿真(备) | 自己写 simulator |
| AI | **DeepSeek V3 代理** | Anthropic / OpenAI |
| 邮件 | **dev: console stub** | 后期接 SMTP/Resend |
| 测试 | **Vitest** | Jest |
| E2E | **Playwright(MVP 后)** | Cypress |

> 这些都用 ADR 落到 [`./docs/decisions.md`](./docs/decisions.md)。

---

## 6. 风险预案(MVP 内)

| 风险 | 触发条件 | 降级路径 |
|---|---|---|
| simavr 集成卡 | D2 收工时 LED 不闪 | 切 PoC 的 JS 软仿真 |
| 真实编译难 | D4 报错难搞 | MVP 不真编译,只做语法 + 关键字检查 |
| DeepSeek API 不可达 | D8 测试调用失败 | 把限流改宽松到 5 次,降级文案 |
| 部署复杂 | D10 deadline 前没部署完 | 临时 Vercel only,后端放 Render |
| 真实邮件接 | 收工前发现需要邮件 | 全部 stub 走 console |

---

## 7. Monorepo / DevOps(MVP 必填)

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm -r lint
      - run: pnpm -r typecheck
      - run: pnpm -r test
```

```
.gitignore 已就位
```

Vercel 配置:`apps/web` 设 root;`pnpm --filter web build` 触发;环境变量: `VITE_API_BASE` 指向 Railway URL。

---

## 8. 4 周验证期 (2026-07-15 → 2026-08-12)

上线后只观察,**不立刻加新功能**。如果数据不达预期,做一次复盘决定 Phase 2 起点。

| 看什么 | 怎么看到 |
|---|---|
| 注册数 / 完成课学生数 | Postgres + 简单 admin SQL 查询 |
| AI 调用次数 | `AiCall` 表 count |
| Sentry 错误流 | Sentry dashboard |
| Lighthouse 性能 | 手动跑 |

每周一次日报(给未来的自己看):

```markdown
## Week 1 (Jul 15-21)
- 注册: X
- 完成课学生: Y
- 致命 bug: Z 个
- 改进要点: ...
```

---

## 9. 验证清单(MVP 完成)

打开这个清单,跑通过一遍才能闭 Sprint:

```
[ ] D1-D10 任务全部完成
[ ] 12 元件里至少有 8 件完整功能可用
[ ] LED 闪烁 demo 跑通(simavr 或软仿真)
[ ] 邮箱注册/登录/找回密码 全通
[ ] 项目保存 + 分享链接 端到端通
[ ] AI 助教 3 类能力可触发
[ ] 1 门示范课 LED 闪烁 5 step 能走完
[ ] Vercel + Railway 部署完成
[ ] Sentry 接好
[ ] CI 跑 lint + typecheck + test
[ ] 至少 1 个非自己人端到端 30 min 试用
```

---

## 10. 变更日志

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-07-01 | 初稿(配合 PRD v2.0 重写) |
