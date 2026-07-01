import { describe, it, expect } from 'vitest';
import {
  emptyCanvas,
  reduce,
  initHistory,
  applyChange,
  undo,
  redo,
  canUndo,
  canRedo,
  historySize,
  replaceAll,
  genId,
  MAX_HISTORY,
  type Change,
} from './state';

function part(id: string, x = 0, y = 0) {
  return { id, type: 'led', x, y, rotation: 0 as const };
}

function wire(id: string, a = 'p1', b = 'p2') {
  return {
    id,
    from: { partId: a, pinId: 'A' },
    to: { partId: b, pinId: 'A' },
  };
}

describe('reduce / applyChange', () => {
  it('add-part appends a part', () => {
    const next = reduce(emptyCanvas(), { type: 'add-part', part: part('l1') });
    expect(next.parts).toHaveLength(1);
    expect(next.parts[0].id).toBe('l1');
  });

  it('add-part is idempotent (same id → no change)', () => {
    const s0 = reduce(emptyCanvas(), { type: 'add-part', part: part('l1') });
    const s1 = reduce(s0, { type: 'add-part', part: part('l1') });
    expect(s1).toBe(s0);
  });

  it('move-part updates coordinates', () => {
    const s0 = reduce(emptyCanvas(), { type: 'add-part', part: part('l1') });
    const s1 = reduce(s0, { type: 'move-part', id: 'l1', x: 50, y: 80 });
    expect(s1.parts[0]).toMatchObject({ x: 50, y: 80 });
  });

  it('move-part with same coords is a no-op', () => {
    const s0 = reduce(emptyCanvas(), { type: 'add-part', part: part('l1', 10, 20) });
    const s1 = reduce(s0, { type: 'move-part', id: 'l1', x: 10, y: 20 });
    expect(s1).toBe(s0);
  });

  it('remove-part also removes wires that touch it', () => {
    let s = emptyCanvas();
    s = reduce(s, { type: 'add-part', part: part('a') });
    s = reduce(s, { type: 'add-part', part: part('b') });
    s = reduce(s, { type: 'add-wire', wire: wire('w1', 'a', 'b') });
    s = reduce(s, { type: 'remove-part', id: 'a' });
    expect(s.parts).toHaveLength(1);
    expect(s.wires).toHaveLength(0);
  });

  it('rotate-part cycles 0→90→180→270→0', () => {
    let s = reduce(emptyCanvas(), { type: 'add-part', part: part('l1') });
    s = reduce(s, { type: 'rotate-part', id: 'l1' });
    expect(s.parts[0].rotation).toBe(90);
    s = reduce(s, { type: 'rotate-part', id: 'l1' });
    s = reduce(s, { type: 'rotate-part', id: 'l1' });
    s = reduce(s, { type: 'rotate-part', id: 'l1' });
    expect(s.parts[0].rotation).toBe(0);
  });

  it('add-wire / remove-wire work', () => {
    const s0 = reduce(emptyCanvas(), { type: 'add-part', part: part('a') });
    const s1 = reduce(s0, { type: 'add-wire', wire: wire('w1', 'a', 'a') });
    expect(s1.wires).toHaveLength(1);
    const s2 = reduce(s1, { type: 'remove-wire', id: 'w1' });
    expect(s2.wires).toHaveLength(0);
  });
});

describe('history (undo / redo)', () => {
  it('applyChange records past and clears future', () => {
    let h = initHistory();
    h = applyChange(h, { type: 'add-part', part: part('l1') });
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
    expect(h.past).toHaveLength(1);
    expect(h.current.parts).toHaveLength(1);
  });

  it('undo pops past into current and pushes current to future', () => {
    let h = initHistory();
    h = applyChange(h, { type: 'add-part', part: part('l1') });
    h = applyChange(h, { type: 'add-part', part: part('l2') });
    h = undo(h);
    expect(h.current.parts.map((p) => p.id)).toEqual(['l1']);
    expect(canRedo(h)).toBe(true);
  });

  it('redo restores a previously-undone change', () => {
    let h = initHistory();
    h = applyChange(h, { type: 'add-part', part: part('l1') });
    h = applyChange(h, { type: 'add-part', part: part('l2') });
    h = undo(h);
    h = redo(h);
    expect(h.current.parts.map((p) => p.id)).toEqual(['l1', 'l2']);
  });

  it('a new applyChange clears the future (the redo stack)', () => {
    let h = initHistory();
    h = applyChange(h, { type: 'add-part', part: part('l1') });
    h = applyChange(h, { type: 'add-part', part: part('l2') });
    h = undo(h);
    h = applyChange(h, { type: 'add-part', part: part('l3') });
    expect(canRedo(h)).toBe(false);
  });

  it('undo is a no-op when past is empty', () => {
    const h = initHistory();
    const h2 = undo(h);
    expect(h2).toBe(h);
  });

  it('redo is a no-op when future is empty', () => {
    const h = initHistory();
    const h2 = redo(h);
    expect(h2).toBe(h);
  });

  it('historySize reports counts', () => {
    let h = initHistory();
    h = applyChange(h, { type: 'add-part', part: part('l1') });
    h = applyChange(h, { type: 'add-part', part: part('l2') });
    h = undo(h);
    expect(historySize(h)).toEqual({ past: 1, future: 1 });
  });

  it('caps past at MAX_HISTORY', () => {
    let h = initHistory();
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      h = applyChange(h, { type: 'add-part', part: part(`p${i}`) });
    }
    expect(h.past.length).toBe(MAX_HISTORY);
  });

  it('no-op applyChange does not pollute history', () => {
    let h = initHistory();
    h = applyChange(h, { type: 'add-part', part: part('l1') });
    const sizeBefore = historySize(h);
    h = applyChange(h, { type: 'add-part', part: part('l1') });
    expect(historySize(h)).toEqual(sizeBefore);
  });
});

describe('replaceAll (non-undoable reset)', () => {
  it('replaces state and clears history', () => {
    let h = initHistory();
    h = applyChange(h, { type: 'add-part', part: part('l1') });
    h = applyChange(h, { type: 'add-part', part: part('l2') });
    const target = { parts: [part('x1')], wires: [] };
    h = replaceAll(h, target);
    expect(h.current).toEqual(target);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('is a no-op when the new state is identical to current', () => {
    const h = initHistory();
    const h2 = replaceAll(h, h.current);
    expect(h2).toBe(h);
  });
});

describe('genId', () => {
  it('produces ids with the given prefix', () => {
    expect(genId('foo')).toMatch(/^foo-/);
    expect(genId('bar')).toMatch(/^bar-/);
  });
});
