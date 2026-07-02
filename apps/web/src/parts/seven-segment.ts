import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Common-cathode 7-segment display.
 *   Pin 'a'..'g' — 7 segment cathodes
 *   Pin 'dp' — decimal point
 *   Pin 'common' — shared cathode (ground)
 *
 * Segments light when their pin is HIGH (sink current through common).
 * Display shows '8' (all segments on) by default when all pins = 0 because
 * segments are active-LOW (MCU sinks → segment on).  For render clarity we
 * treat state = 0 as "off" and state > 0 as "on".
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

      // Layout: 8-digit display, segments at top half, DP at bottom-right
      // Top horizontal bar (a): y=14, x=20..70
      // Middle horizontal bar (g): y=54, x=20..70
      // Bottom horizontal bar (d): y=74, x=20..70
      // Left-top vertical (f): x=20, y=14..54
      // Right-top vertical (b): x=70, y=14..54
      // Left-bottom vertical (e): x=20, y=54..74
      // Right-bottom vertical (c): x=70, y=54..74

      appendAll(g, [
        // PCB / display background
        svg('rect', {
          x: 8,
          y: 4,
          width: 74,
          height: 96,
          rx: 4,
          fill: '#1a1a1a',
          stroke: 'var(--part-stroke)',
          'stroke-width': 1.5,
        }),
        // Segment A (top)
        svg('rect', { x: 22, y: 12, width: 46, height: 6, rx: 1, fill: seg(segs.a) }),
        // Segment B (right-top)
        svg('rect', { x: 66, y: 14, width: 6, height: 18, rx: 1, fill: seg(segs.b) }),
        // Segment C (right-bottom)
        svg('rect', { x: 66, y: 38, width: 6, height: 18, rx: 1, fill: seg(segs.c) }),
        // Segment D (bottom)
        svg('rect', { x: 22, y: 54, width: 46, height: 6, rx: 1, fill: seg(segs.d) }),
        // Segment E (left-bottom)
        svg('rect', { x: 18, y: 38, width: 6, height: 18, rx: 1, fill: seg(segs.e) }),
        // Segment F (left-top)
        svg('rect', { x: 18, y: 14, width: 6, height: 18, rx: 1, fill: seg(segs.f) }),
        // Segment G (middle)
        svg('rect', { x: 22, y: 30, width: 46, height: 6, rx: 1, fill: seg(segs.g) }),
        // Segment DP (bottom-right dot)
        svg('circle', { cx: 76, cy: 68, r: 4, fill: seg(segs.dp) }),
        // Pin wires left
        svg('line', { x1: 0, y1: 10, x2: 8, y2: 10, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 26, x2: 8, y2: 26, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 42, x2: 8, y2: 42, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 58, x2: 8, y2: 58, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 74, x2: 8, y2: 74, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 90, x2: 8, y2: 90, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        // Pin wires right
        svg('line', { x1: 90, y1: 10, x2: 82, y2: 10, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 26, x2: 82, y2: 26, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 90, x2: 82, y2: 90, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('text', {
          x: 45,
          y: 106,
          'text-anchor': 'middle',
          fill: '#8aa2b8',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      g.lastElementChild!.textContent = '7-SEG';
    },
  };
}

export const sevenSegment = makeSevenSegment();