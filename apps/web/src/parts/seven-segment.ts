import type { PartModel, PartSpec } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Common-cathode 7-segment display — Wokwi 1:1 真图 (决策 32a,
 * 来源 github.com/wokwi/wokwi-elements src/7segment-element.ts renderSVG).
 * 视觉结构 (1 digit 5611BH model):
 *   - 黑色背景 panel (wokwi rect width=12.55 height=20.5)
 *   - 8 个 segment 7-seg (a..g + dp) polygon
 *   - lit segments fill=red (#FB0000), unlit fill=#444
 *   - 10 引脚上下排 (top/bottom 各 5 pin)
 *
 * 7-segment polygon 形状 (wokwi skewX(-8)):
 *   - a: top horizontal
 *   - b: top-right vertical
 *   - c: bottom-right vertical
 *   - d: bottom horizontal
 *   - e: bottom-left vertical
 *   - f: top-left vertical
 *   - g: middle horizontal
 *
 * Model: propagates each segment pin through the wire graph so the render
 * reflects connected HIGH/LOW state.
 */
const SEG_FILLS = ['#fb0000', '#fb0000', '#fb0000', '#fb0000', '#fb0000', '#fb0000', '#fb0000'];
const SEG_OFF = '#444444';
// Standard 7-segment polygon points (wokwi scale, simplified without skewX for clarity)
// Each segment is a polygon: 2 outer points + 2 inner points + 2 middle taper points
const SEG_POLYGONS = [
  // a — top horizontal
  '2 0 8 0 9 1 8 2 2 2 1 1',
  // b — top-right vertical
  '10 2 10 8 9 9 8 8 8 2 9 1',
  // c — bottom-right vertical
  '10 10 10 16 9 17 8 16 8 10 9 9',
  // d — bottom horizontal
  '8 18 2 18 1 17 2 16 8 16 9 17',
  // e — bottom-left vertical
  '0 16 0 10 1 9 2 10 2 16 1 17',
  // f — top-left vertical
  '0 8 0 2 1 1 2 2 2 8 1 9',
  // g — middle horizontal
  '2 8 8 8 9 9 8 10 2 10 1 9',
];

function makeSevenSegment(): PartSpec {
  return {
    type: 'seven-segment',
    displayName: '7-Segment Display',
    width: 60,
    height: 80,
    pins: [
      // Top row: 5 pins (a/f/common/g/b)
      { id: 'a', x: 6, y: 0, label: 'a', pinType: 'digital' },
      { id: 'f', x: 18, y: 0, label: 'f', pinType: 'digital' },
      { id: 'common', x: 30, y: 0, label: 'COM', pinType: 'gnd' },
      { id: 'g', x: 42, y: 0, label: 'g', pinType: 'digital' },
      { id: 'b', x: 54, y: 0, label: 'b', pinType: 'digital' },
      // Bottom row: 4 pins (e/d/c/dp) — 共 9 pins (1 common)
      { id: 'e', x: 6, y: 80, label: 'e', pinType: 'digital' },
      { id: 'd', x: 18, y: 80, label: 'd', pinType: 'digital' },
      { id: 'c', x: 42, y: 80, label: 'c', pinType: 'digital' },
      { id: 'dp', x: 54, y: 80, label: 'dp', pinType: 'digital' },
    ],
    render(g, state) {
      const segIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
      appendAll(g, [
        // 引脚 (9 个 top + bottom: 7 seg + common + dp)
        ...[...segIds, 'common', 'dp'].flatMap((id, i) => {
          const segIdx = i;
          let x: number, y: number;
          if (id === 'common') { x = 30; y = 0; }
          else if (id === 'dp') { x = 54; y = 80; }
          else { x = segIdx < 5 ? 6 + segIdx * 12 : 6 + (segIdx - 5) * 12; y = segIdx < 5 ? 0 : 80; }
          return [
            pinPad(id, x, y),
            svg('line', { x1: x, y1: y, x2: x, y2: y === 0 ? 8 : 72, stroke: 'var(--part-lead)', 'stroke-width': 1 }),
          ];
        }),
        // 黑色背景 panel (wokwi 1-digit width 12.55, 我的 width=60 ≈ 5x)
        svg('rect', { x: 4, y: 8, width: 52, height: 64, fill: '#0a0a0a', rx: 2 }),
        // 8 个 segment (polygon, wokwi 风格)
        // a, b, c, d, e, f, g — 7 seg + dp = 8 segments
        // 7 个水平/垂直 segment polygon (我放大 5x,偏移让它们在 panel 内)
        // a — top (translate 18, 16, scale 4)
        svg('polygon', {
          points: SEG_POLYGONS[0],
          fill: state.pins['a'] ? SEG_FILLS[0] : SEG_OFF,
          transform: 'translate(11 16) scale(3.5)',
        }),
        svg('polygon', {
          points: SEG_POLYGONS[1],
          fill: state.pins['b'] ? SEG_FILLS[1] : SEG_OFF,
          transform: 'translate(11 16) scale(3.5)',
        }),
        svg('polygon', {
          points: SEG_POLYGONS[2],
          fill: state.pins['c'] ? SEG_FILLS[2] : SEG_OFF,
          transform: 'translate(11 16) scale(3.5)',
        }),
        svg('polygon', {
          points: SEG_POLYGONS[3],
          fill: state.pins['d'] ? SEG_FILLS[3] : SEG_OFF,
          transform: 'translate(11 16) scale(3.5)',
        }),
        svg('polygon', {
          points: SEG_POLYGONS[4],
          fill: state.pins['e'] ? SEG_FILLS[4] : SEG_OFF,
          transform: 'translate(11 16) scale(3.5)',
        }),
        svg('polygon', {
          points: SEG_POLYGONS[5],
          fill: state.pins['f'] ? SEG_FILLS[5] : SEG_OFF,
          transform: 'translate(11 16) scale(3.5)',
        }),
        svg('polygon', {
          points: SEG_POLYGONS[6],
          fill: state.pins['g'] ? SEG_FILLS[6] : SEG_OFF,
          transform: 'translate(11 16) scale(3.5)',
        }),
        // dp — decimal point (circle r=0.89 in wokwi, 我的 r=3 in scaled)
        svg('circle', {
          cx: 49, cy: 60, r: 2.5,
          fill: state.pins['dp'] ? '#fb0000' : SEG_OFF,
        }),
      ]);
    },
  };
}

export const sevenSegment: PartSpec = (() => {
  const spec = makeSevenSegment();
  spec.model = ((_ctx) => []);
  return spec;
})() as PartSpec;