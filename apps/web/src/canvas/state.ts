/**
 * Canvas state — pure data + reducer + history (undo/redo).
 *
 * This is the heart of D5. The React layer (CanvasPanel) holds a `History`
 * and renders it; all mutations go through `apply()` so the history stays
 * consistent.
 *
 * Design choices:
 *   - History is a simple { past, current, future } triple.
 *   - We cap `past` at 200 entries to keep memory bounded for the MVP.
 *   - Operations are immutable: apply() always returns a new History.
 *   - Reducer actions are a tagged union; we can add/remove cases safely.
 */

export type Rotation = 0 | 90 | 180 | 270;

export type CanvasPart = {
  id: string;
  type: string; // matches PartSpec.type, e.g. 'led', 'arduino-uno'
  x: number;
  y: number;
  rotation: Rotation;
};

export type Wire = {
  id: string;
  from: { partId: string; pinId: string };
  to: { partId: string; pinId: string };
  color?: string;
};

export type CanvasState = {
  parts: CanvasPart[];
  wires: Wire[];
};

export type Change =
  | { type: 'add-part'; part: CanvasPart }
  | { type: 'move-part'; id: string; x: number; y: number }
  | { type: 'remove-part'; id: string }
  | { type: 'rotate-part'; id: string }
  | { type: 'add-wire'; wire: Wire }
  | { type: 'remove-wire'; id: string };

export const MAX_HISTORY = 200;

export function emptyCanvas(): CanvasState {
  return { parts: [], wires: [] };
}

export function reduce(state: CanvasState, change: Change): CanvasState {
  switch (change.type) {
    case 'add-part':
      if (state.parts.find((p) => p.id === change.part.id)) return state;
      return { ...state, parts: [...state.parts, change.part] };

    case 'move-part': {
      const idx = state.parts.findIndex((p) => p.id === change.id);
      if (idx < 0) return state;
      const cur = state.parts[idx];
      if (cur.x === change.x && cur.y === change.y) return state;
      const next = state.parts.slice();
      next[idx] = { ...cur, x: change.x, y: change.y };
      return { ...state, parts: next };
    }

    case 'remove-part': {
      const parts = state.parts.filter((p) => p.id !== change.id);
      if (parts.length === state.parts.length) return state;
      const wires = state.wires.filter(
        (w) => w.from.partId !== change.id && w.to.partId !== change.id,
      );
      return { parts, wires };
    }

    case 'rotate-part': {
      const idx = state.parts.findIndex((p) => p.id === change.id);
      if (idx < 0) return state;
      const cur = state.parts[idx];
      const rotation = (((cur.rotation + 90) % 360) as Rotation);
      const next = state.parts.slice();
      next[idx] = { ...cur, rotation };
      return { ...state, parts: next };
    }

    case 'add-wire':
      if (state.wires.find((w) => w.id === change.wire.id)) return state;
      return { ...state, wires: [...state.wires, change.wire] };

    case 'remove-wire':
      if (!state.wires.find((w) => w.id === change.id)) return state;
      return { ...state, wires: state.wires.filter((w) => w.id !== change.id) };
  }
}

export type History = {
  past: CanvasState[];
  current: CanvasState;
  future: CanvasState[];
};

export function initHistory(initial: CanvasState = emptyCanvas()): History {
  return { past: [], current: initial, future: [] };
}

export function applyChange(h: History, change: Change): History {
  const next = reduce(h.current, change);
  if (next === h.current) return h; // no-op, no history entry
  const past = [...h.past, h.current];
  if (past.length > MAX_HISTORY) past.shift();
  return { past, current: next, future: [] };
}

export function undo(h: History): History {
  if (h.past.length === 0) return h;
  const prev = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    current: prev,
    future: [h.current, ...h.future],
  };
}

export function redo(h: History): History {
  if (h.future.length === 0) return h;
  const [next, ...rest] = h.future;
  return {
    past: [...h.past, h.current],
    current: next,
    future: rest,
  };
}

export function canUndo(h: History): boolean {
  return h.past.length > 0;
}

export function canRedo(h: History): boolean {
  return h.future.length > 0;
}

export function historySize(h: History): { past: number; future: number } {
  return { past: h.past.length, future: h.future.length };
}

/**
 * Replace the entire canvas and clear history. Used for "Load demo" /
 * "Reset" buttons that aren't meant to be undo-able.
 */
export function replaceAll(h: History, state: CanvasState): History {
  if (
    h.current.parts === state.parts &&
    h.current.wires === state.wires
  ) {
    return h;
  }
  return { past: [], current: state, future: [] };
}

/** Generate a short unique id for parts and wires. */
let _counter = 0;
export function genId(prefix = 'id'): string {
  _counter += 1;
  // crypto.randomUUID is available in modern browsers + node 19+
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${_counter}`;
}
