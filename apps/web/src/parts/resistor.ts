import type { PartSpec } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Resistor (220Ω default visual) — 真电阻外观 (Wokwi 风格):
 *   - 圆柱 body (rounded rect = 圆角矩形) — 比 rectangle 更接近真实电阻
 *   - 4 色环 (220Ω = red red black brown,符合标准 IEC 60062: red=2, red=2,
 *     black=0, brown=×10¹ → 220Ω × 1 = 220Ω)
 *   - 2 根银色 axial leads 从 pad 接到 body 边缘
 *   - 顶部 highlight stripe 给 3D 圆柱感
 * Two passive pins. No model — purely passive. Render only.
 */
function makeResistor(): PartSpec {
  return {
    type: 'resistor',
    displayName: 'Resistor (220Ω)',
    width: 100,
    height: 40,
    pins: [
      { id: 'A', x: 0, y: 20, label: 'A', pinType: 'digital' },
      { id: 'B', x: 100, y: 20, label: 'B', pinType: 'digital' },
    ],
    render(g, _state) {
      appendAll(g, [
        // Visual pin pads (canvas click / wire hit area)
        pinPad('A', 0, 20),
        pinPad('B', 100, 20),
        // Axial leads (银色,实心) 从 pad 接到 body 边缘
        svg('line', { x1: 0, y1: 20, x2: 30, y2: 20, stroke: '#a0a0a0', 'stroke-width': 1.5 }),
        svg('line', { x1: 70, y1: 20, x2: 100, y2: 20, stroke: '#a0a0a0', 'stroke-width': 1.5 }),
        // Cylindrical body (圆角矩形,rx=12 接近真实电阻的圆柱截面)
        svg('rect', {
          x: 30,
          y: 8,
          width: 40,
          height: 24,
          rx: 12,
          fill: '#d2b48c',  // tan/beige 真实电阻 body 颜色
          stroke: '#8b6f3e',
          'stroke-width': 1.2,
        }),
        // Highlight stripe on top (3D 圆柱感:顶部偏白高光)
        svg('rect', {
          x: 34,
          y: 10,
          width: 32,
          height: 2.5,
          rx: 1,
          fill: '#fff',
          'fill-opacity': 0.35,
        }),
        // 4 color bands (220Ω IEC 60062: 红红黑棕)
        svg('rect', { x: 36, y: 11, width: 3, height: 18, fill: '#c0392b' }),  // red  = 2
        svg('rect', { x: 43, y: 11, width: 3, height: 18, fill: '#c0392b' }),  // red  = 2
        svg('rect', { x: 50, y: 11, width: 3, height: 18, fill: '#1a1a1a' }),  // black= 0
        svg('rect', { x: 57, y: 11, width: 3, height: 18, fill: '#8b6f3e' }),  // brown= ×10¹
        // Label
        svg('text', {
          x: 50,
          y: 38,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      g.lastElementChild!.textContent = '220Ω';
    },
  };
}

export const resistor = makeResistor();