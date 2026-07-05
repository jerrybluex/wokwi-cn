/**
 * Pin type compatibility — Plan A wiring validation (P0 bug fix).
 *
 * Two pins are compatible when:
 *   - both are undefined  (unannotated pins — backward compat)
 *   - at least one is undefined (mixed annotated/unannotated)
 *   - both are the same PinType
 *   - 'digital' ↔ any of 'pwm' / 'analog'  (digital pins accept any signal)
 *   - 'gnd' ↔ 'gnd' and 'vcc' ↔ 'vcc'  (power buses are always compatible)
 *
 * Combinations that are REJECTED:
 *   - i2c ↔ non-i2c  (I2C is a bus protocol, can't mix with GPIO)
 *   - pwm ↔ i2c / analog ↔ i2c  (protocol mismatch)
 */

import type { PinType } from '../parts/types';
import { getPartSpec } from '../parts/registry';

export type WireValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

const COMPATIBILITY: Record<string, Set<string>> = {
  vcc: new Set(['vcc', 'digital', 'analog']),
  gnd: new Set(['gnd', 'digital', 'pwm', 'analog']),
  digital: new Set(['digital', 'pwm', 'analog', 'gnd', 'vcc']),
  pwm: new Set(['digital', 'pwm', 'analog', 'gnd']),
  analog: new Set(['digital', 'analog', 'vcc']),
  i2c: new Set(['i2c']),
};

/**
 * Returns true when a wire between two pin types is electrically valid.
 * Undefined on either side always passes (backward compat for legacy parts).
 * Symmetric: checks both (a→b) and (b→a) — allows connections where either
 * end is the "active" driver and the other is a passive sink.
 */
function typesCompatible(a: PinType | undefined, b: PinType | undefined): boolean {
  if (!a || !b) return true; // unannotated = any
  if (a === b) return true;
  // Check both directions: passive sinks (gnd/vcc) may be compatible with
  // active signal pins even if they can't "drive" in return.
  const aToB = COMPATIBILITY[a]?.has(b) ?? false;
  const bToA = COMPATIBILITY[b]?.has(a) ?? false;
  return aToB || bToA;
}

/**
 * Validate a proposed wire connection before creating it.
 * Returns { valid: true } or { valid: false, reason: string }.
 *
 * Uses getPartSpec to look up pin types — safe to call with any canvas
 * state; returns false gracefully if a part type is unknown.
 */
/**
 * LED-specific rules: reject connections that would short the LED.
 * These are checked after general pin-type compatibility.
 *
 * Rejected:
 *   - LED.A → GND  (anode pulled to ground = dead short)
 *   - LED.K → VCC  (cathode pulled to VCC = reverse-bias short)
 *
 * Allowed (and correct):
 *   - LED.K → GND  (normal circuit: cathode to ground)
 *   - LED.A → signal (normal: anode driven high)
 */
function validateLedWire(
  fromPartType: string,
  fromPinId: string,
  toPartType: string,
  toPinId: string,
): WireValidationResult {
  const isLedA = (t: string, p: string) => t === 'led' && p === 'A';
  const isLedK = (t: string, p: string) => t === 'led' && p === 'K';
  const isVcc = (t: string, p: string) =>
    t === 'arduino-uno' && (p === '5V' || p === '3V3' || p === 'Vin');
  const isGnd = (t: string, p: string) =>
    t === 'arduino-uno' && (p === 'GND' || p === 'GND2');

  // LED anode (A) connected to GND → short (anode pulled low, LED off)
  if (isLedA(fromPartType, fromPinId) && isGnd(toPartType, toPinId)) {
    return { valid: false, reason: 'LED 阳极(A)不能接 GND，这会使 LED 短路不亮' };
  }
  if (isLedA(toPartType, toPinId) && isGnd(fromPartType, fromPinId)) {
    return { valid: false, reason: 'LED 阳极(A)不能接 GND，这会使 LED 短路不亮' };
  }

  // LED cathode (K) connected to VCC → short (cathode pulled high, reverse bias)
  if (isLedK(fromPartType, fromPinId) && isVcc(toPartType, toPinId)) {
    return { valid: false, reason: 'LED 阴极(K)不能接 VCC，这会使 LED 短路不亮' };
  }
  if (isLedK(toPartType, toPinId) && isVcc(fromPartType, fromPinId)) {
    return { valid: false, reason: 'LED 阴极(K)不能接 VCC，这会使 LED 短路不亮' };
  }

  return { valid: true };
}

export function validateWireConnection(
  fromPartId: string,
  fromPinId: string,
  toPartId: string,
  toPinId: string,
  parts: { id: string; type: string }[],
): WireValidationResult {
  const fromPart = parts.find((p) => p.id === fromPartId);
  const toPart = parts.find((p) => p.id === toPartId);
  if (!fromPart || !toPart) return { valid: false, reason: 'Part not found' };

  const fromSpec = getPartSpec(fromPart.type);
  const toSpec = getPartSpec(toPart.type);
  if (!fromSpec || !toSpec) return { valid: false, reason: 'Unknown part type' };

  const fromPin = fromSpec.pins.find((p) => p.id === fromPinId);
  const toPin = toSpec.pins.find((p) => p.id === toPinId);
  if (!fromPin || !toPin) return { valid: false, reason: 'Unknown pin' };

  const ok = typesCompatible(fromPin.pinType, toPin.pinType);
  if (!ok) {
    const a = fromPin.pinType ?? 'any';
    const b = toPin.pinType ?? 'any';
    return {
      valid: false,
      reason: `Pin type 不兼容: ${fromPin.label}(${a}) ↔ ${toPin.label}(${b})`,
    };
  }

  // LED-specific rules
  const ledRule = validateLedWire(fromPart.type, fromPinId, toPart.type, toPinId);
  if (!ledRule.valid) return ledRule;

  return { valid: true };
}

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
  color?: string; // PCB-style wire color, round-robin assigned on creation
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
