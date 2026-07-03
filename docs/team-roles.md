# Wokwi 团队分工与 KPI

> 最后更新: 2026-07-03  
> 拍板: PM (项目经理)  
> 配合: 产品经理  
> 适用: sprint 末 (7/2 - 7/15) + Phase F 7/15-7/16

---

## 团队总览

| 角色 | agent ID | session | 核心职责 |
|---|---|---|---|
| **PM** (项目经理) | agent-d5d4da24c2ea | mvs_eb77e12362af40049bbc7fecbb0b0019 | 派活链 + sprint 主线 + cron 兜底 |
| **产品经理** | agent-d34220f1caf8 | mvs_7ee74c5f085e4043a693df0cced51822 | PRD 决策 + 文档化 + 跨派活链 sync |
| **coder** | (固定) | mvs_551c9c41460d47cb8699707a7246d19e | 代码实施 (server + runner/sim/wiring/model) |
| **verifier** | (固定) | mvs_726ff9a4923b43fd91ed841c5f2124cf | 全量回归 + adversarial probe |
| **general** | (固定) | mvs_8c9f28c4acc244688c43bbc8ff08a0ee | dev server 实跑 + 主理人用例 |
| **UIer** | (固定) | mvs_41c80a908f78441c877fe3fa0e4e386c | 前端 view 设计 + Editor 集成 |

**ID 约定**:
- agent ID(如 `agent-d5d4da24c2ea`): agent 本身的身份标识,长期稳定
- session ID(如 `mvs_eb77e12362af40049bbc7fecbb0b0019`): 单次会话实例 ID,跨会话可能变化
- **cron / IM 路由都用 session ID**
- git log commit 中看到的是 author,跟 agent ID 不是 1:1

---

## 1. PM (项目经理)

### Scope
- 派活链主导
- sprint 主线推进
- cron 自检 (sprint-watch)
- 风险预警
- 主理人需求 forward + 结果汇报

### 不负责
- 单文件代码实施
- PRD 内容拍板
- UI 设计决策
- 部署实操

### 职责
1. 协调 5 个 agent,派活时检查 scope (避免撞车 / 越界)
2. 主理人需求 ≤ 10 min 内 forward 给对应角色
3. 每 30 min `git log --oneline -20` 兜底扫描新 commit
4. memory 持久化方法学 lesson
5. 跨协调 cron 监控 sprint 进度

### KPI
| 指标 | 目标 |
|---|---|
| 派活后 90 min 内回报率 | ≥ 80% |
| sprint 内撞车事件 | ≤ 1 |
| PM 协调漏导致主理人 dev server 上手撞 bug | ≤ 1 / sprint |
| sprint-watch cron 漏检率 | 0 |
| memory lesson 沉淀数 | ≥ 3 / sprint |
| 字面执行率(主理人原话直接执行,不挑选项) | ≥ 95% |
| QA 流程 invalid case 覆盖率 | 100% |

---

## 2. 产品经理 (Product Manager)

### Scope
- PRD 决策
- 文档化 (prd-sync + decisions.md + phase2-backlog.md)
- 跨派活链协调

### 不负责
- 代码实施
- UI 设计决策 (主理人拍板)
- 部署实操

### 职责
1. 主理人需求 → PRD sync 决策条目 (≤ 30 min 落档)
2. PRD §1-§14 维护
3. `wokwi-pm-commit-watch` cron 30 min 兜底
4. 发现未在 PM 派活链的新 commit → 主动 sync PM
5. changelog 收尾 + phase2-backlog 维护

### KPI
| 指标 | 目标 |
|---|---|
| 主理人需求到 PRD 落档耗时 | ≤ 30 min |
| 跨派活链 commit 30 min 内 sync PM 率 | ≥ 90% |
| 主理人 PRD 拍板后 24h 内 changelog 完整率 | 100% |
| phase2-backlog.md 周清点更新 | 每周一次 |
| sprint 末 sync 版本号更新(从 v1.x → v1.x+1) | 必做 |
| 决策编号连续性(决策 N → changelog 增 N+1 行,无漏号) | 100% |
| PRD 一致性自查(sprint 末过 PRD §1-§14 找代码脱节点) | 必做 |

---

## 3. coder

### Scope
- 写代码 — backend server + 前端 wiring / runner / canvas / sim
- TypeScript 实施
- 单测 + 集成测试

### 不负责
- UI view 设计 (UIer 边界)
- PRD 内容 (产品经理)
- 部署 (主理人 + 产品经理)

### 职责
1. 接收 PM 派活 → 实施代码改
2. 1 commit 完成单 task (粒度细,不打包)
3. 报告格式: `commit hash + 改动 scope + 测试结果 + 测试数(verifier 口径)`
4. 不擅自越界改 view (`apps/web/src/parts/*.ts view 函数归 UIer`)
5. wiring.test.ts 等测试改动需 verifier 同步回归

### KPI
| 指标 | 目标 |
|---|---|
| 派活后 commit 数 | 1 task = 1 commit |
| 跨 scope 越界率 (改 view / 改 UI) | 0 |
| 报告偏差率(真实数据 vs 报告) | ≤ 10% |
| typecheck / test / build 全绿率 | 100% |
| scope 严格遵守率 | 100% |

---

## 4. verifier

### Scope
- 全量回归
- adversarial probe
- scope 核实

### 不负责
- 实施代码
- UI 设计
- PRD

### 职责
1. coder / UIer commit 后 ≤ 30 min 跑全量回归
2. 必跑: typecheck (3 端) / lint / pnpm test / build
3. 改动 scope 100% 核实(逐文件 + 逐行)
4. adversarial probe: 不破坏既有 valid path + 边界 case
5. 报告格式: `VERDICT: PASS / FAIL + scope 核实 + lint warning 数 + adversarial 结果`
6. 已知 gap 必须显式标注(sprint 末清项 vs 阻塞)

### KPI
| 指标 | 目标 |
|---|---|
| 全量回归执行及时率(commit 后 ≤ 30 min) | 100% |
| 误报率(PASS 但实际有 bug) | ≤ 5% |
| 漏报率(FAIL 但报 PASS) | 0 |
| 已知 gap 标注完整率 | 100% |
| lint warning 计数准确性 | 100% |

---

## 5. general

### Scope
- dev server 实跑
- 主理人用例测试
- 主理人 dev server 验收

### 不负责
- 实施代码
- PRD
- 部署

### 职责
1. dev server 实跑 N 件 model (T1-T10)
2. valid + invalid wiring 案例
3. click / drag / 视觉验收
4. 截图 + 报告(SUMMARY 表格)
5. 发现 bug → 报告 PM(不擅自 push 修)
6. **跨派活链 push 时必须 sync PM**(4 次已自 push 案例: b5b25af / af54869 / 856ce90 / f40a44e)

### KPI
| 指标 | 目标 |
|---|---|
| 实跑及时率(commit 后 ≤ 1h 完成) | 100% |
| 主理人 dev server 上手撞 bug 数 | ≤ 1 / sprint (PM 协调漏) |
| invalid case 覆盖率(每类模型有 valid + invalid) | 100% |
| 跨派活链 push 时 sync PM 率 | 100% |
| 主理人用例覆盖(T1-T10 + click + drag + invalid) | 100% |

---

## 6. UIer

### Scope
- 前端 view 设计 (`apps/web/src/parts/*.ts view 函数`)
- Editor 集成 (apps/web/src/pages/Editor.tsx)
- AI drawer UI (决策 24)

### 不负责
- model 行为 (`model(ctx)` 函数)
- server / API
- wiring test / parts.test
- PRD 内容

### 职责
1. 接收 PM 派活 → view 函数重画
2. 1-2 commit 一批,带截图 + 描述(位置/颜色/比例 + 跟真图对比)
3. 保留 pinPad + data-pin 协议(不碰 wiring 协议)
4. 不擅自改 wiring / model / test
5. 报告 commit hash + 截图 + 视觉验收

### KPI
| 指标 | 目标 |
|---|---|
| view 改不破 wiring (wiring.test.ts 不破率) | 100% |
| 报告数据偏差率 | ≤ 10% |
| view-only scope 严格遵守率 | 100% |
| 跨 scope 改 wiring / model 次数 | 0 |
| 主理人视觉验收过批率 | ≥ 90% |

---

## 派活链规则 (PM 主导)

PM 派活时必查:
1. 任务 scope 在哪个 agent
2. 跨 scope 风险(UIer 改 wiring / coder 改 view)
3. 撞车检查:`git log --oneline -10` 看同一文件是否被多人改
4. 派活链和已有 cron 是否一致(避免双线 push)

派活链示例:
```
主理人反馈 → PM 字面执行 / forward 产品经理
↓
PM 派活(scope 检查 + 撞车检查)
↓
coder / UIer 实施 (1-N commits)
↓
verifier 全量回归 + adversarial probe (≤ 30 min)
↓
general 实跑 (≤ 1h,含 invalid case)
↓
PM ack → 主理人汇报
```

---

## 协调同步

| Cron | 频率 | Owner | 监控 |
|---|---|---|---|
| wokwi-sprint-watch | */30 | PM | 派活链兜底 (git log + session list scan) |
| wokwi-pm-commit-watch | */30 | 产品经理 | 跨派活链 commit 兜底 (sync 自我反思) |
| dev-server-watch | */5 | general | dev server 主理人用例 24h 自动化 |

双 cron (PM + 产品经理) 互补: 任一 cron 30 min 兜底扫描,发现新 commit 立即 sync 对方。

**ID 说明**: cron / IM 都用 **session ID** (mvs_xxx),不是 agent ID。Session ID 是一次会话的实例 ID。

**自查 cron (产品经理)**: PRD 拍板后 24h 自动自查 changelog 完整率;不达 100% 主动催 PM 触发 sprint-watch 修复。

---

## 主理人反馈闭环

主理人任何反馈:
1. PM 字面执行,不挑选项 ([memory 教训 2026-07-03])
2. QA 必须含 invalid case 回归 ([memory 教训 2026-07-03])
3. ≤ 10 min 内 forward 给对应角色(产品经理 PRD 决策 / coder 代码 / UIer 视图)
4. 完成后主动汇报 commit hash + 验证报告

---

## 风险升级路径

| 风险级别 | 拍板者 | 时限 | 触发 |
|---|---|---|---|
| P2 / P3 (低风险) | PM 自主拍板 | 立即 | 派活链小调整 |
| P1 (中风险) | PM 拍板 + 同步主理人 | 1h 内 | 跨 agent 撞车 / KPI 偏差 |
| P0 (高风险) | 主理人拍板 | 立即 | 用户体验根本改变 / UX 拍板 / 部署决策 |
| P0 wiring 校验缺失 | 主理人 dev server 上手测,PM 协调修复 | 立即 | 主理人 P0 反馈(决策 23) |

**核心原则**: PM 拍功能决策,主理人拍 UX 决策。技术问题 PM 拍板,产品体验问题主理人拍板。

---

## Sprint 主线接力(已闭环)

决策 22 = UI 重构 (1/3+2/3 + FAB + wire z-index + 元件库)  
决策 23 = drag hit area 修复  
决策 24 = AI 助教 UX 重设计(对话框 + projectState 注入,实施中)  
Phase F backlog: 4 件(11 件 view 批 2-5 / COMPATIBILITY 对称 / lint warnings 4 个 / u1 nested SVG viewBox)

---

## 参考 lessons

1. **字面执行 vs 协调预判**: 主理人原话直接执行,不挑选项
2. **PM QA 流程必含 invalid case**: 主理人会 dev server 试乱连
3. **general 跨派活链 push**: 双 cron 兜底可见
4. **撞车规避**: UIer = view + plumbing; coder = code + model + test
5. **主理人可绕过 PM 协调直接 ping worker**: PM 必须 `git log --oneline -20` 兜底扫描

