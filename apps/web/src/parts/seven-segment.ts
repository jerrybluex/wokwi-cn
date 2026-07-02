import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Common-cathode 7-segment display.
 *   Pin 'a'..'g' — 7 segment cathodes
 *   Pin 'dp' — decimal point
 *   Pin 'common' — shared cathode (ground)
 *
 * Model: propagates each segment pin through the wire graph so the render
 * can read pins['a'..'g'/'dp'] directly. No digit decoding — the MCU drives
 * each segment pin individually via digitalWrite.
 */
function makeSevenSegment(): PartSpec {
  return {
    type: 'seven-segment',
    displayName: '7-Segment',
    width: 90,
    height: 110,
    pins: [
      { id: 'a', x: 0, y: 10, label: 'A' },
      { id: 'b', x: 0, y: 26, label: 'B' },
      { id: 'c', x: 0, y: 42, label: 'C' },
      { id: 'd', x: 0, y: 58, label: 'D' },
      { id: 'e', x: 0, y: 74, label: 'E' },
      { id: 'f', x: 0, y: 90, label: 'F' },
      { id: 'g', x: 90, y: 10, label: 'G' },
      { id: 'dp', x: 90, y: 26, label: 'DP' },
      { id: 'common', x: 90, y: 90, label: 'COM' },
    ],
    defaultPinValues: { common: 0 },
    render(g, state) {
      const segs = {
        a: (state.pins['a'] ?? 0) > 0,
        b: (state.pins['b'] ?? 0) > 0,
        c: (state.pins['c'] ?? 0) > 0,
        d: (state.pins['d'] ?? 0) > 0,
        e: (state.pins['e'] ?? 0) > 0,
        f: (state.pins['f'] ?? 0) > 0,
        g: (state.pins['g'] ?? 0) > 0,
        dp: (state.pins['dp'] ?? 0) > 0,
      };

      const on = '#ff5252';
      const off = '#2a2a2a';
      const seg = (active: boolean) => (active ? on : off);

      appendAll(g, [
        pinPad('a', 0, 10),
        pinPad('b', 0, 26),
        pinPad('c', 0, 42),
        pinPad('d', 0, 58),
        pinPad('e', 0, 74),
        pinPad('f', 0, 90),
        pinPad('g', 90, 10),
        pinPad('dp', 90, 26),
        pinPad('common', 90, 90),
        svg('rect', { x: 8, y: 4, width: 74, height: 96, rx: 4, fill: '#1a1a1a', stroke: 'var(--part-stroke)', 'stroke-width': 1.5 }),
        svg('rect', { x: 22, y: 12, width: 46, height: 6, rx: 1, fill: seg(segs.a) }),
        svg('rect', { x: 66, y: 14, width: 6, height: 18, rx: 1, fill: seg(segs.b) }),
        svg('rect', { x: 66, y: 38, width: 6, height: 18, rx: 1, fill: seg(segs.c) }),
        svg('rect', { x: 22, y: 54, width: 46, height: 6, rx: 1, fill: seg(segs.d) }),
        svg('rect', { x: 18, y: 38, width: 6, height: 18, rx: 1, fill: seg(segs.e) }),
        svg('rect', { x: 18, y: 14, width: 6, height: 18, rx: 1, fill: seg(segs.f) }),
        svg('rect', { x: 22, y: 30, width: 46, height: 6, rx: 1, fill: seg(segs.g) }),
        svg('circle', { cx: 76, cy: 68, r: 4, fill: seg(segs.dp) }),
        svg('line', { x1: 0, y1: 10, x2: 8, y2: 10, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 26, x2: 8, y2: 26, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 42, x2: 8, y2: 42, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 58, x2: 8, y2: 58, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 74, x2: 8, y2: 74, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 90, x2: 8, y2: 90, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 10, x2: 82, y2: 10, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 26, x2: 82, y2: 26, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 90, x2: 82, y2: 90, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('text', { x: 45, y: 106, 'text-anchor': 'middle', fill: '#8aa2b8', 'font-family': 'JetBrains Mono, monospace', 'font-size': 9 }),
      ]);
      g.lastElementChild!.textContent = '7-SEG';
    },
  };
}

export const sevenSegment: PartSpec = (() => {
  const spec = makeSevenSegment();
  spec.model = ((ctx) => {
    // Propagate all segment pins so the render reflects what the MCU drives.
    const segPins = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'] as const;
    return segPins.map((p) => ({ pinId: p, value: ctx.digitalRead(p) })) as PinWrite[];
  }) as PartModel;
  return spec;
})();
