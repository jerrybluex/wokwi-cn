import type { PartSpec } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Resistor (220Ω default visual). Two passive pins. No model — purely passive.
 * Render only.
 */
function makeResistor(): PartSpec {
  return {
    type: 'resistor',
    displayName: 'Resistor (220Ω)',
    width: 100,
    height: 40,
    pins: [
      { id: 'A', x: 0, y: 20, label: 'A' },
      { id: 'B', x: 100, y: 20, label: 'B' },
    ],
    render(g, _state) {
      appendAll(g, [
        // Visual pin pads (canvas click / wire hit area)
        pinPad('A', 0, 20),
        pinPad('B', 100, 20),
        svg('line', { x1: 0, y1: 20, x2: 30, y2: 20, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 70, y1: 20, x2: 100, y2: 20, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('rect', { x: 30, y: 8, width: 40, height: 24, rx: 4, fill: '#d2b48c', stroke: '#8b6f3e', 'stroke-width': 1 }),
        svg('rect', { x: 38, y: 8, width: 3, height: 24, fill: '#8b6f3e' }),
        svg('rect', { x: 45, y: 8, width: 3, height: 24, fill: '#c0392b' }),
        svg('rect', { x: 52, y: 8, width: 3, height: 24, fill: '#f39c12' }),
        svg('rect', { x: 59, y: 8, width: 3, height: 24, fill: '#8b6f3e' }),
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
