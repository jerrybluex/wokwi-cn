# Decision Log (ADR)

> Architecture Decision Records,记录影响产品方向的关键决策。每条记录:上下文 / 决策 / 后果。

---

## ADR-001 · 课程方向:Arduino (Phase 1)

**日期**:2026-07-01
**状态**:已采纳
**作者**:项目主理人

### 上下文

产品定位"高职单片机课程的教学产品"。但国内高职主流是 MCS-51 / Keil + Proteus 路线,Arduino 在高职中不是主流。市场看上去有 3 条路:
- A. 保 Arduino(从我们已有的 PoC 出发),先做学生侧 PMF 验证
- B. 转 MCS-51,直接对接高职主流
- C. 双线

调研同时发现 Arduino 在高职有"创客 / 物联网 / 选修课"分支,且有学术文献支撑(南宁职业技术学院 2015 年改革论文)。这让路线 A 看起来是可行的"细分市场"打法:不做 51 主战场,做 Arduino 在高职的选修 / 入门 / 创客分支。

### 决策

**采纳路线 A**:Phase 1 以 Arduino 为内核,目标用户是高职中"物联网 / 创客 / 入门选修 / 课前预习"的学生群体。MCS-51 内核放 Phase 3。

### 后果

**正面**:
- 工作量最小(simavr WASM 现成可用,Wokwi 开源)
- 仿真器技术成熟,文档丰富
- 我们 PoC 直接复用
- 风险最低,3 个月可上线

**负面**:
- 不直接对接"数字电压表 / 流水灯"这种 51 经典课程,要做适配
- 需要补充 Arduino 方向的高职教材(已经搜到几份,见 course-reference.md 新增章节)
- 主流高职任课老师可能不认(他们教 51),要打 Arduino 教师 / 创客教师细分

**风险缓解**:
- 课程内容直接对标"Arduino 入门 教学大纲"和"Arduino思维大爆炸"
- Phase 3 评估市场反应再决定要不要补 51

---

## ADR-002 · AI 助教模型:DeepSeek V3 为主

**日期**:2026-07-01
**状态**:已采纳(暂行,可调整)
**作者**:项目主理人

### 上下文

AI 助教是产品核心差异化能力之一。三家候选:
- DeepSeek V3:中文能力强,API 价格低(输入 ~2 元 / 百万 token),国内访问稳定
- Claude Sonnet:编码任务最强,价格中等
- GPT-4o:通用稳,价格高

### 决策

**DeepSeek V3 为主,复杂问题升级到 Claude**:
- 默认请求走 DeepSeek V3,成本最低,中文教学场景中文模型更贴
- 学生代码错误涉及复杂语法分析 / 时序问题时升级到 Claude Sonnet,提升质量
- 不接入 GPT-4o(性价比不够)
- 提供"使用 Claude 回答"开关,Pro 用户可用

### 后果

**正面**:
- 学生侧成本低(目标用户价格敏感)
- 中文教学问答质量好
- 国内 API 稳定,无墙问题

**负面**:
- DeepSeek 长上下文能力比 Claude 弱,长代码文件效果可能一般
- 模型迭代快,3 个月后要重新评估

**风险缓解**:
- prompt 中加"如果代码超过 100 行,自动切到 Claude"
- 每季度 review 一次
- API Key 走环境变量,模型切换代码改动小

---

## ADR-003 · 后端技术栈:Fastify + TypeScript + Prisma + Postgres

**日期**:2026-07-02(实际选型从 D6 起,本 ADR 由产品经理回写)
**状态**:已采纳
**作者**:项目主理人

### 上下文

后端候选:
- A. **Fastify + TypeScript + Prisma + Postgres** — 轻量、性能好、生态成熟、TypeScript 一致
- B. NestJS — 结构化但写起来慢,小项目过度设计
- C. Supabase(全 BaaS)— 速度快但锁定严重,迁移成本高
- D. Go / Rust — 性能好但语言切换成本高

单人 2 周 MVP 节奏,后端要:1) 快速 CRUD 写起来不累 2) 类型安全跟前端对齐 3) 部署简单(零配置到 Railway/Render)。

### 决策

**采纳 A:Fastify + TS + Prisma + Postgres**。

- Fastify 比 Express 快 ~2x,类型推断好,插件生态够用
- Prisma 跟 Postgres 配,migration / schema 直观,跟 TS 类型生成无缝
- 单仓 monorepo(`apps/server` + `apps/web` + `packages/shared`),共享类型零摩擦

### 后果

**正面**:
- 注册 / 登录 / 项目 CRUD 全部 1 天写完(D6 验证)
- TS strict + zod schema 校验,前后端类型对齐
- 部署到 Railway 一行搞定,Postgres 托管

**负面**:
- Fastify 插件质量参差,需要甄别
- Prisma 在 serverless 边缘运行时有些坑(MVP 不上 edge,可忽略)

**风险缓解**:
- 关键路由(zod schema)放 `apps/server/src/lib/`,路由文件保持薄
- 共享类型放 `packages/shared/`,D7 已建

---

## ADR-004 · 部署平台:Vercel (前端) + Railway/Render (后端 + DB)

**日期**:2026-07-02
**状态**:已采纳
**作者**:项目主理人

### 上下文

部署候选:
- A. **Vercel + Railway** — Vercel 对 Vite/React 优化最好,Railway 一键 Postgres
- B. Fly.io — 全球边缘,但配置稍复杂
- C. 自建 Docker / 阿里云 — 长期成本低,但 MVP 阶段运维重
- D. Cloudflare Pages + Workers + D1 — 便宜但 D1 限制多

MVP 单人节奏,要"git push 即部署"。Vercel 的前端体验业界最强,Railway 跟 Vercel 配合最顺。

### 决策

**采纳 A:Vercel (前端) + Railway/Render (后端 + DB)**。

- 前端:`apps/web` 部署到 Vercel,自动从 GitHub 构建,`VITE_API_BASE` 环境变量指向 Railway URL
- 后端:`apps/server` 部署到 Railway / Render,Fastify + Prisma + Postgres
- DB:Railway Postgres 或 Render Postgres,Prisma migration 一次性跑

### 后果

**正面**:
- 部署流程 0 配置,git push 触发
- Vercel 自带 HTTPS + CDN + 全球边缘
- Railway Postgres 7 天免费层够 MVP

**负面**:
- 国内访问 Vercel / Railway 偶尔抖动(学生在国内高职,体验可能差)
- 锁定 Vercel / Railway 的环境变量体系

**风险缓解**:
- 后端 API base 用环境变量,后期换自建只改 .env
- 国内访问差的话,Phase 2 评估加阿里云 / 腾讯云镜像

---

## ADR-005 · MVP 编译方案:不做真实编译,只做语法 + 关键字检查

**日期**:2026-07-02
**状态**:已采纳(MVP 限定)
**作者**:项目主理人

### 上下文

Arduino 代码要跑起来,需要编译成 AVR 机器码。两条路:
- A. **真实编译**:云端 avr-gcc,或前端 `@wokwi/avr-gcc` WASM
- B. **不做真实编译**:只做语法 + Arduino API 关键字检查(pinMode / digitalWrite / delay 等是否拼对),运行交给 JS 软仿真器

D4(devplan §4)原计划用 avr-gcc,但实际尝试后发现集成复杂度超出 MVP 余量。**PRD §10 风险预案里"D4 报错难搞 → MVP 不真编译,只做语法 + 关键字检查"已被触发**。

### 决策

**采纳 B(降级路径):MVP 不真编译**。

- 前端 CodeMirror 6 做基础语法高亮
- 错误捕获只到"pinMode / digitalWrite 这种关键字是否拼对"
- 真运行交给 JS 软仿真器(`apps/web/src/sim/runner.ts`)

### 后果

**正面**:
- 集成成本从"~3 天真实编译"压到"半天关键字检查"
- 仿真启动 < 100ms,无需下载 WASM
- 仿真器接口干净,后期换 simavr WASM 时 UI 层无改动

**负面**:
- 复杂 Arduino 代码(库依赖、中断、SPI/I2C)无法验证
- 仿真精度跟真实 AVR 不一致(数字 / 模拟引脚行为靠 PoC 经验模拟)
- 学生写 `delay(1000)` 实际不是真正 1000ms,是 setTimeout best-effort

**风险缓解**:
- PRD §6.1 注明"MVP 走 JS 软仿真,best-effort"
- PRD §10 风险表加仿真精度风险,Phase 2 评估 simavr 替换
- 仿真器接口抽象(`PinListener` / `PinEvent`),换实现不改 UI

---

## 延后到 MVP 后定

- **ADR-006:产品部署在国内还是海外(影响备案、ICP、支付)** — MVP 用 Vercel 海外临时域名,4 周验证期根据用户地理分布决定是否补 ICP / 切阿里云。决策日期待定。
