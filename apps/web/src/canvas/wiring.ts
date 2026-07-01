/**
 * wiring.ts — convert a CanvasState to / from the WiringJSON format the
 * server expects. The devplan says we'll export wiring.json to power the
 * sim backend; for the MVP we render / download the JSON locally.
 */

import type { CanvasState, CanvasPart, Wire } from './state';
import { getPartSpec } from '../parts/registry';

export type WiringJSON = {
  version?: 1;
  parts: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    rotation: number;
  }>;
  wires: Array<{
    id: string;
    from: { part: string; pin: string };
    to: { part: string; pin: string };
  }>;
};

export function toWiringJSON(state: CanvasState): WiringJSON {
  return {
    version: 1,
    parts: state.parts.map((p) => ({
      id: p.id,
      type: p.type,
      x: p.x,
      y: p.y,
      rotation: p.rotation,
    })),
    wires: state.wires.map((w) => ({
      id: w.id,
      from: { part: w.from.partId, pin: w.from.pinId },
      to: { part: w.to.partId, pin: w.to.pinId },
    })),
  };
}

export function fromWiringJSON(json: WiringJSON): CanvasState {
  return {
    parts: json.parts.map((p) => ({
      id: p.id,
      type: p.type,
      x: p.x,
      y: p.y,
      rotation: ((p.rotation as 0 | 90 | 180 | 270) ?? 0),
    })),
    wires: json.wires.map((w) => ({
      id: w.id,
      from: { partId: w.from.part, pinId: w.from.pin },
      to: { partId: w.to.part, pinId: w.to.pin },
    })),
  };
}

/**
 * Pick out the wires that touch a given part. Used to highlight connected
 * pins on hover/select.
 */
export function wiresTouching(state: CanvasState, partId: string): Wire[] {
  return state.wires.filter((w) => w.from.partId === partId || w.to.partId === partId);
}

/**
 * Returns the absolute SVG position (x, y) of a part's pin, taking rotation
 * around the part's (x, y) origin into account. Used by the wire renderer.
 */
export function pinPosition(
  part: CanvasPart,
  pinId: string,
): { x: number; y: number } | null {
  const spec = getPartSpec(part.type);
  if (!spec) return null;
  const pin = spec.pins.find((p) => p.id === pinId);
  if (!pin) return null;
  const cx = spec.width / 2;
  const cy = spec.height / 2;
  const dx = pin.x - cx;
  const dy = pin.y - cy;
  let rx = dx;
  let ry = dy;
  switch (part.rotation) {
    case 0:
      rx = dx; ry = dy; break;
    case 90:
      rx = -dy; ry = dx; break;
    case 180:
      rx = -dx; ry = -dy; break;
    case 270:
      rx = dy; ry = -dx; break;
  }
  return { x: part.x + cx + rx, y: part.y + cy + ry };
}
