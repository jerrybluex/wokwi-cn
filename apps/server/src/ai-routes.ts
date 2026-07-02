/**
 * /api/ai/chat — DeepSeek V3 proxy with SSE streaming, rate limiting,
 * and graceful fallback.
 *
 * Endpoints:
 *   POST /api/ai/chat
 *     Body:    { taskType, code?, errorMessage?, question? }
 *     Returns: text/event-stream (SSE)
 *     Events:  { chunk: "..." } | { done, tokensIn, tokensOut } |
 *              { fallback, message } | { rateLimit, remaining, resetsAt }
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from './db.js';
import {
  AiTaskType,
  WOKWI_AI_DAILY_LIMIT,
} from '@wokwi/shared';

const chatBodySchema = z.object({
  taskType: z.enum(['explain', 'error', 'hint']),
  code: z.string().optional(),
  errorMessage: z.string().optional(),
  question: z.string().optional(),
});

/** System prompts per task type — see docs/ai-tutor-prompts.md */
export const SYSTEM_PROMPTS: Record<AiTaskType, string> = {
  explain: `你是"单片机小助手"，一位有耐心的单片机教师。

当学生发送一段 Arduino 代码时：
1. 先说这段代码"大概在干什么"（一句话）
2. 然后按顺序解释关键语句（每条一行）
3. 如果有 Arduino 特有的函数调用（pinMode/digitalWrite/delay 等），解释参数含义
4. 用学生能理解的比喻，不用术语堆砌

回答格式：
[功能概述]
（1-2句话）

[逐行解释]
- \`语句\`: 含义
- \`语句\`: 含义

不要超过 200 字。`,

  error: `你是"单片机小助手"，帮助学生读懂 Arduino 编译错误。

当学生发送编译错误信息时：
1. 先说"这段报错的意思是……"（大白话翻译）
2. 然后给出最可能的原因（2-3 个）
3. 给出修复方向（不说完整代码，给关键词）

常见错误模式要覆盖：
- "was not declared in this scope" → 变量/函数名拼写错，或没写分号
- "expected ';' before '}'" → 分号缺失
- "'digitalWrite' was not declared" → 没包含 Arduino.h 或函数名拼错
- "redefinition of 'setup'" → setup/loop 函数重复定义

格式：
[报错翻译]
（用生活中的例子解释这段报错在说什么）

[可能原因]
1. ...
2. ...

[修复方向]
- 先检查报错行附近的拼写和分号
- ...`,

  hint: `你是"单片机小助手"，给学生"只给方向，不给答案"的提示。

学生卡住了（只说"卡住了"或"不知道怎么写"）。你要：

**语气**：像老师在旁边指着电路图说"你先想想这里"，不是直接报答案。

**先问再答**：
1. 先问 1-2 个引导问题，让学生自己思考（参考下面的 H1 例）
2. 再给 1-3 个具体方向

**白话优先**：
- 如果出现"推挽输出""GPIO""寄存器"等术语，必须加括号白话注释，例如：
  "推挽输出（芯片能主动输出高电平或低电平）"
  "GPIO（通用输入输出引脚）"
- 如果不确定学生是否懂，直接换成大白话：不说"检查引脚模式"，说"确认这个引脚是输入还是输出"

**格式**：直接说，不要标题分段。保持鼓励语气。

**引导问题方向参考**：
- LED 不亮："先想想，LED 的两根针（阳极/阴极），哪根接信号，哪根接 GND？"
- 舵机不动："先检查一下，舵机有三根线（信号/电源/地），棕色/黑色接 GND，红色接电源，橙色/黄色接信号，信号线接的是哪个引脚？"
- 超声波读数不对："先量一量，Trig 和 Echo 的那根线有没有接错引脚？"`,
};

const FALLBACK_MESSAGE = `抱歉，AI 助教暂时不可用，请稍后重试。

常见问题可以先自己想一想：
- 代码拼写对不对？
- 引脚号和接线对不对？
- 分号和大括号有没有漏？`;

/** Write an AiCall log row. Fails are warn-only so they never crash the SSE response. */
async function logAiCall(opts: {
  userId: string;
  taskType: AiTaskType;
  tokensIn: number;
  tokensOut: number;
}): Promise<void> {
  try {
    await prisma.aiCall.create({ data: opts });
  } catch (err) {
    console.warn('[ai:log]', {
      taskType: opts.taskType,
      userId: opts.userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Build the user message from the request body.
 */
function buildUserMessage(body: z.infer<typeof chatBodySchema>): string {
  switch (body.taskType) {
    case 'explain':
      return `请解释下面这段 Arduino 代码：\n\`\`\`cpp\n${body.code ?? ''}\n\`\`\``;
    case 'error':
      return `我的代码编译报错了，请帮我看看：\n\`\`\`\n${body.errorMessage ?? ''}\n\`\`\``;
    case 'hint':
      return body.question ?? '我卡住了，不知道下一步怎么写';
  }
}

/**
 * Check rate limit — count AiCall rows for this user in the last 24 h.
 * Returns { allowed: true, remaining } or { allowed: false, resetsAt }.
 */
async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetsAt: string;
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.aiCall.count({
    where: { userId, createdAt: { gte: since } },
  });
  const remaining = WOKWI_AI_DAILY_LIMIT - count;
  if (remaining <= 0) {
    // resets at midnight UTC
    const resetsAt = new Date(Date.now());
    resetsAt.setUTCHours(24, 0, 0, 0);
    return { allowed: false, remaining: 0, resetsAt: resetsAt.toISOString() };
  }
  return { allowed: true, remaining, resetsAt: '' };
}

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/ai/chat',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = (req.user as { sub: string } | undefined)?.sub;
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });

      // ── parse body ──
      const parsed = chatBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_input', details: parsed.error.format() });
      }
      const { taskType, code, errorMessage, question } = parsed.data;

      // ── rate limit ──
      const limit = await checkRateLimit(userId);
      if (!limit.allowed) {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        reply.raw.write(sse({ rateLimit: true, remaining: 0, resetsAt: limit.resetsAt }));
        reply.raw.end();
        return;
      }

      // ── SSE setup ──
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // disable nginx buffering
      });

      // ── call DeepSeek ──
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        // dev mode — no API key configured, send fallback
        reply.raw.write(sse({ fallback: true, message: FALLBACK_MESSAGE }));
        reply.raw.write(sse({ done: true, tokensIn: 0, tokensOut: 0 }));
        reply.raw.end();
        await logAiCall({ userId, taskType, tokensIn: 0, tokensOut: 0 });
        return;
      }

      const userMessage = buildUserMessage({ taskType, code, errorMessage, question });

      try {
        const controller = new AbortController();
        // timeout after 30s
        const timeout = setTimeout(() => controller.abort(), 30_000);

        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
            messages: [
              { role: 'system', content: SYSTEM_PROMPTS[taskType] },
              { role: 'user', content: userMessage },
            ],
            stream: true,
            max_tokens: Number(process.env.DEEPSEEK_MAX_TOKENS ?? 400),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          app.log.error({ status: response.status }, 'DeepSeek API error');
          reply.raw.write(sse({ fallback: true, message: FALLBACK_MESSAGE }));
          reply.raw.write(sse({ done: true, tokensIn: 0, tokensOut: 0 }));
          reply.raw.end();
          await logAiCall({ userId, taskType, tokensIn: 0, tokensOut: 0 });
          return;
        }

        if (!response.body) {
          reply.raw.write(sse({ fallback: true, message: FALLBACK_MESSAGE }));
          reply.raw.write(sse({ done: true, tokensIn: 0, tokensOut: 0 }));
          reply.raw.end();
          await logAiCall({ userId, taskType, tokensIn: 0, tokensOut: 0 });
          return;
        }

        const messages = [
          { role: 'system', content: SYSTEM_PROMPTS[taskType] },
          { role: 'user', content: userMessage },
        ];
        const tokensIn = new TextEncoder().encode(JSON.stringify(messages)).length;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let tokensOut = 0;

        // read SSE lines from DeepSeek stream
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const text = decoder.decode(value, { stream: !done });
            // split into SSE events
            const rawLines = text.split('\n');
            for (const rawLine of rawLines) {
              if (!rawLine.startsWith('data: ')) continue;
              const data = rawLine.slice(6).trim();
              if (data === '[DONE]') continue;

              let parsed2: { choices?: Array<{ delta?: { content?: string } }> };
              try {
                parsed2 = JSON.parse(data);
              } catch {
                continue;
              }
              const content = parsed2.choices?.[0]?.delta?.content;
              if (content) {
                tokensOut += content.length;
                reply.raw.write(sse({ chunk: content }));
              }
            }
          }
        }

        reply.raw.write(sse({ done: true, tokensIn, tokensOut }));
        reply.raw.end();

        // log to DB — await so errors are visible; don't let write failures crash the SSE response
        await logAiCall({ userId, taskType, tokensIn, tokensOut });

      } catch (err) {
        app.log.error(err, 'DeepSeek stream error');
        reply.raw.write(sse({ fallback: true, message: FALLBACK_MESSAGE }));
        reply.raw.write(sse({ done: true, tokensIn: 0, tokensOut: 0 }));
        reply.raw.end();
      }
    },
  );

  // ── GET /api/ai/remaining — check remaining quota ──
  app.get(
    '/api/ai/remaining',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = (req.user as { sub: string } | undefined)?.sub;
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const { allowed, remaining, resetsAt } = await checkRateLimit(userId);
      return reply.send({ allowed, remaining, resetsAt });
    },
  );
}