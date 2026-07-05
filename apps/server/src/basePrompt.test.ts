import { describe, it, expect } from 'vitest';
import {
  CHAT_CONTEXT_SYSTEM_PROMPT,
  buildStateSummary,
  parseSuggestionsImpl,
} from './ai-routes.js';

describe('CHAT_CONTEXT_SYSTEM_PROMPT structured output requirements', () => {
  it('contains ## 💡 建议 section heading', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('## 💡 建议');
  });

  it('contains ## 提示 section heading', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('## 提示');
  });

  it('requires at least one suggestion (必填)', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('必填');
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('至少 1 条');
  });

  it('defines type: code suggestion type', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('type: code');
  });

  it('defines type: wiring suggestion type', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('type: wiring');
  });

  it('defines type: part suggestion type', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('type: part');
  });

  it('mentions target field for suggestions', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('target:');
  });

  it('mentions description field for suggestions', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('description:');
  });
});

describe('buildStateSummary', () => {
  const minimalState = {
    code: '',
    errors: [] as string[],
    wirings: [] as unknown[],
    parts: [] as { id: string; type: string; x: number; y: number }[],
  };

  it('includes project status header', () => {
    const summary = buildStateSummary(minimalState);
    expect(summary).toContain('## 当前项目状态');
  });

  it('reports code length', () => {
    const state = { ...minimalState, code: 'void setup() {}' };
    const summary = buildStateSummary(state);
    expect(summary).toContain('代码长度: 15 字符');
  });

  it('reports zero errors when none present', () => {
    const summary = buildStateSummary(minimalState);
    expect(summary).toContain('编译错误: 无');
  });

  it('lists errors when present', () => {
    const state = {
      ...minimalState,
      errors: ["error: 'digitalWrite' was not declared"],
    };
    const summary = buildStateSummary(state);
    expect(summary).toContain('编译错误: 1 个');
    expect(summary).toContain("! error: 'digitalWrite' was not declared");
  });

  it('shows "(无元件)" when parts list is empty', () => {
    const summary = buildStateSummary(minimalState);
    expect(summary).toContain('(无元件)');
  });

  it('shows "(无导线)" when wirings list is empty', () => {
    const summary = buildStateSummary(minimalState);
    expect(summary).toContain('(无导线)');
  });

  it('lists parts with id and type', () => {
    const state = {
      ...minimalState,
      parts: [{ id: 'led1', type: 'led', x: 100, y: 50 }],
    };
    const summary = buildStateSummary(state);
    expect(summary).toContain('led (id=led1, pos=(100,50))');
  });

  it('lists wirings with from/to pin info', () => {
    const state = {
      ...minimalState,
      wirings: [{ id: 'w1', from: { part: 'uno', pin: 'D13' }, to: { part: 'led1', pin: 'A' } }],
    };
    const summary = buildStateSummary(state);
    expect(summary).toContain('uno:D13');
    expect(summary).toContain('led1:A');
  });

  it('reads standard partId/pinId wire fields (主理人 P0)', () => {
    const state = {
      ...minimalState,
      wirings: [
        { from: { partId: 'u1', pinId: 'D13' }, to: { partId: 'led1', pinId: 'A' } },
        { from: { partId: 'led1', pinId: 'K' }, to: { partId: 'u1', pinId: 'GND' } },
      ],
    };
    const summary = buildStateSummary(state);
    expect(summary).toContain('u1:D13');
    expect(summary).toContain('led1:A');
    expect(summary).toContain('led1:K');
    expect(summary).toContain('u1:GND');
  });

  it('truncates code longer than 1200 chars', () => {
    const longCode = 'void loop() {} '.repeat(200); // > 1200 chars
    const state = { ...minimalState, code: longCode };
    const summary = buildStateSummary(state);
    expect(summary).toContain('...(已截断)');
    expect(summary).not.toContain(longCode);
  });
});


// ---------------------------------------------------------------------------
// parseSuggestionsImpl — simple v1 parser (emoji-tolerant hint block extractor)
// ---------------------------------------------------------------------------
describe('parseSuggestionsImpl', () => {
  // ── Section detection ───────────────────────────────────────────────────────

  it('parses lines after ## 💡 建议 section', () => {
    const raw = `## 💡 建议
检查一下引脚是否接对
再看看 delay 时间是不是太短`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(2);
    expect(result[0].payload).toBe('检查一下引脚是否接对');
    expect(result[1].payload).toBe('再看看 delay 时间是不是太短');
  });

  it('parses lines after ## 提示 section', () => {
    const raw = `## 提示
先想想 LED 两根针哪根接信号`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(1);
    expect(result[0].payload).toBe('先想想 LED 两根针哪根接信号');
  });

  it('ignores text outside ## 建议 / ## 提示 sections', () => {
    const raw = `这是 AI 的回答正文。LED 不亮可能有两个原因。
## 💡 建议
检查限流电阻是否接上`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(1);
    expect(result[0].payload).toBe('检查限流电阻是否接上');
  });

  it('returns empty array when no sections in response', () => {
    const raw = `LED 不亮可能有很多原因，先检查接线。`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(0);
  });

  // ── Emoji tolerance ─────────────────────────────────────────────────────────

  it('tolerates 💡 emoji between ## and 建议', () => {
    const raw = `## 💡 建议
先看看 delay 参数对不对`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(1);
    expect(result[0].payload).toBe('先看看 delay 参数对不对');
  });

  it('tolerates ## 建议 without emoji', () => {
    const raw = `## 建议
确认是 PWM 引脚`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(1);
    expect(result[0].payload).toBe('确认是 PWM 引脚');
  });

  it('tolerates 💡 tightly after ## (##💡 建议)', () => {
    const raw = `##💡 建议
检查舵机信号线是否接 D9`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(1);
    expect(result[0].payload).toBe('检查舵机信号线是否接 D9');
  });

  it('handles ## 提示 without emoji', () => {
    const raw = `## 提示
先量一量 Trig 和 Echo 线有没有接反`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(1);
    expect(result[0].payload).toBe('先量一量 Trig 和 Echo 线有没有接反');
  });

  // ── Bullet stripping ────────────────────────────────────────────────────────

  it('strips leading bullet markers (- • *)', () => {
    const raw = `## 💡 建议
- 检查限流电阻
  * 确认接在 LED 和 GND 之间`;
    const result = parseSuggestionsImpl(raw);
    expect(result[0].payload).toBe('检查限流电阻');
    expect(result[1].payload).toBe('确认接在 LED 和 GND 之间');
  });

  it('handles indented lines (multiline block)', () => {
    const raw = `## 💡 建议
  - 先检查接线是否松动
  - 再看看代码里的引脚号`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(2);
  });

  // ── Target tracking ─────────────────────────────────────────────────────────

  it('tracks target from preceding target: line', () => {
    const raw = `## 💡 建议
target: LED
检查 LED 阳极是否接信号`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('LED');
    expect(result[0].payload).toBe('检查 LED 阳极是否接信号');
  });

  it('defaults target to general when no target: line', () => {
    const raw = `## 💡 建议
先想想 LED 的正负极怎么区分`;
    const result = parseSuggestionsImpl(raw);
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('general');
  });

  // ── Limits ──────────────────────────────────────────────────────────────────

  it('limits to 5 suggestions max', () => {
    const suggestions = Array.from(
      { length: 7 },
      (_, i) => `## 💡 建议\n检查点 ${i}`,
    ).join('\n');
    const result = parseSuggestionsImpl(suggestions);
    expect(result).toHaveLength(5);
  });
});
