import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Potentiometer — three-pin variable resistor.
 *   Pin 'A' = one end
 *   Pin 'B' = other end
 *   Pin 'W' = wiper (variable output)
 * Canvas gives `pins.W` a 0..100 value via state; render shows the dial angle.
 */
function makePotentiometer(): PartSpec {
  return {
    type: 'potentiometer',
    displayName: 'Potentiometer',
    width: 60,
    height: 80,
    pins: [
      { id: 'A', x: 0, y: 18, label: 'A' },
      { id: 'B', x: 60, y: 18, label: 'B' },
      { id: 'W', x: 30, y: 80, label: 'W' },
    ],
    render(g, state) {
      const raw = state.pins['W'] ?? 50; // canvas 默认给 0..100
      const v = Math.max(0, Math.min(100, raw));
      const angle = -135 + (v / 100) * 270;
      const rad = (angle * Math.PI) / 180;
      const x2 = 30 + Math.sin(rad) * 16;
      const y2 = 30 - Math.cos(rad) * 16;

      appendAll(g, [
        svg('circle', { cx: 30, cy: 30, r: 24, fill: '#1a1a1a', stroke: '#555', 'stroke-width': 1.5 }),
        svg('circle', { cx: 30, cy: 30, r: 22, fill: '#0a0a0a' }),
        svg('circle', { cx: 30, cy: 6, r: 1.5, fill: '#777' }),
        svg('line', { x1: 30, y1: 30, x2: x2, y2: y2, stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round' }),
        svg('circle', { cx: 30, cy: 30, r: 3, fill: '#888' }),
        svg('line', { x1: 0, y1: 18, x2: 18, y2: 18, stroke: '#888', 'stroke-width': 1.5 }),
        svg('line', { x1: 60, y1: 18, x2: 42, y2: 18, stroke: '#888', 'stroke-width': 1.5 }),
        svg('text', {
          x: 30,
          y: 70,
          'text-anchor': 'middle',
          fill: '#d8dee9',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 10,
        }),
      ]);
      g.lastElementChild!.textContent = `${Math.round(v)}%`;
    },
  };
}

export const potentiometer = makePotentiometer();
