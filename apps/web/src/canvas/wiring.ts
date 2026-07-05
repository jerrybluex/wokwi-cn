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

/**
 * PCB-style wire routing — Manhattan (90-degree) orthogonal paths.
 *
 * Algorithm: for two points A and B, draw a 2-segment L-route:
 *   A → (midX, A.y) → B    (horizontal-first)
 *   or
 *   A → (A.x, midY) → B    (vertical-first, when horizontal would be too long)
 *
 * The midpoint is chosen at 1/2 of the total distance along the dominant axis,
 * creating a clean right-angle bend that mimics PCB traces.
 *
 * Future improvements (Phase 2):
 *   - Obstacle avoidance (shift around other parts)
 *   - Multi-segment Z-routes when simple L-routes cross
 *   - Auto-reroute when parts move
 */

/** Round-robin wire colors — 7 distinct PCB-style colors. */
export const WIRE_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#eab308', // yellow
  '#f97316', // orange
  '#06b6d4', // cyan
] as const;

let _wireColorIndex = 0;
/** Cycle through WIRE_COLORS for each new wire. */
export function nextWireColor(): string {
  const color = WIRE_COLORS[_wireColorIndex % WIRE_COLORS.length];
  _wireColorIndex++;
  return color;
}

/**
 * Compute a Manhattan (90-degree) orthogonal SVG path between two points.
 * Returns an array of {x, y} waypoints including start and end.
 *
 * Routing strategy:
 *   - |dx| >= |dy| → horizontal-first (L-shape via midX)
 *   - |dy| > |dx|  → vertical-first   (L-shape via midY)
 *   - For very short wires (< 5px), use a simple diagonal as-is
 *
 * @param from  Start point {x, y}
 * @param to    End point {x, y}
 * @param offsetPerpendicular  Extra perpendicular offset (for collision avoidance, Phase 2)
 */
export function manhattanRoute(
  from: { x: number; y: number },
  to: { x: number; y: number },
  offsetPerpendicular = 0,
): Array<{ x: number; y: number }> {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);

  // For very short wires, just connect directly
  if (dist < 5) {
    return [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
  }

  // Manhattan routing: L-shape via midpoint
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal-first: from → (midX, from.y) → to
    const midX = from.x + dx / 2;
    return [
      { x: from.x, y: from.y },
      { x: midX + offsetPerpendicular, y: from.y },
      { x: to.x + offsetPerpendicular, y: to.y },
    ];
  } else {
    // Vertical-first: from → (from.x, midY) → to
    const midY = from.y + dy / 2;
    return [
      { x: from.x, y: from.y },
      { x: from.x, y: midY + offsetPerpendicular },
      { x: to.x, y: to.y + offsetPerpendicular },
    ];
  }
}

/**
 * Convert an array of waypoints into an SVG path string.
 * Uses 'L' (line-to) commands for a sharp 90-degree PCB trace.
 */
export function waypointsToPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  const [first, ...rest] = pts;
  return `M ${first.x} ${first.y}` + rest.map((p) => ` L ${p.x} ${p.y}`).join('');
}
