import { describe, it, expect } from 'vitest';
import {
  CHAT_CONTEXT_SYSTEM_PROMPT,
  buildStateSummary,
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
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('[type: code]');
  });

  it('defines type: wiring suggestion type', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('[type: wiring]');
  });

  it('defines type: part suggestion type', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('[type: part]');
  });

  it('mentions target field for suggestions', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('[target:');
  });

  it('mentions description field for suggestions', () => {
    expect(CHAT_CONTEXT_SYSTEM_PROMPT).toContain('[描述]');
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
    expect(summary).toContain("编译错误: 1 个");
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

  it('truncates code longer than 1200 chars', () => {
    const longCode = 'void loop() {} '.repeat(200); // > 1200 chars
    const state = { ...minimalState, code: longCode };
    const summary = buildStateSummary(state);
    expect(summary).toContain('...(已截断)');
    expect(summary).not.toContain(longCode);
  });
});
