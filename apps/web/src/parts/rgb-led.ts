import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Common-cathode RGB LED — 4 pins: R / G / B (anodes) + common (cathode).
 * Each color channel accepts 0–255 (PWM brightness).
 *   Pin 'r' — red anode
 *   Pin 'common' — shared cathode (ground)
 *   Pin 'g' — green anode
 *   Pin 'b' — blue anode
 */
function makeRgbLed(): PartSpec {
  return {
    type: 'rgb-led',
    displayName: 'RGB LED',
    width: 60,
    height: 60,
    pins: [
      { id: 'r', x: 0, y: 10, label: 'R' },
      { id: 'common', x: 0, y: 30, label: 'K' },
      { id: 'g', x: 0, y: 44, label: 'G' },
      { id: 'b', x: 0, y: 58, label: 'B' },
    ],
    defaultPinValues: { common: 0 },
    render(g, state) {
      const rVal = state.pins['r'] ?? 0;
      const gVal = state.pins['g'] ?? 0;
      const bVal = state.pins['b'] ?? 0;

      const rBright = rVal > 0 ? Math.max(0.15, Math.min(1, rVal)) : 0;
      const gBright = gVal > 0 ? Math.max(0.15, Math.min(1, gVal)) : 0;
      const bBright = bVal > 0 ? Math.max(0.15, Math.min(1, bVal)) : 0;

      const lit = rBright > 0 || gBright > 0 || bBright > 0;

      const bodyColor = lit
        ? `rgb(${Math.round(rBright * 255)},${Math.round(gBright * 255)},${Math.round(bBright * 255)})`
        : '#3a3a3a';

      const elements: SVGElement[] = [
        svg('line', { x1: 0, y1: 10, x2: 18, y2: 10, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 30, x2: 18, y2: 30, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 44, x2: 18, y2: 44, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 58, x2: 18, y2: 58, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
      ];

      if (lit) {
        elements.push(
          svg('circle', {
            cx: 30,
            cy: 30,
            r: 20,
            fill: bodyColor,
            'fill-opacity': Math.max(rBright, gBright, bBright) * 0.3,
          })
        );
      }

      appendAll(g, [
        ...elements,
        svg('circle', {
          cx: 30,
          cy: 30,
          r: 14,
          fill: bodyColor,
          fillOpacity: 1,
          stroke: '#555',
          'stroke-width': 1,
        }),
        svg('path', {
          d: 'M 24 22 A 12 12 0 0 1 30 18',
          fill: 'none',
          stroke: rBright > 0 ? '#ff4444' : '#4a4a4a',
          'stroke-width': 2.5,
          'stroke-linecap': 'round',
        }),
        svg('path', {
          d: 'M 30 18 A 12 12 0 0 1 36 22',
          fill: 'none',
          stroke: gBright > 0 ? '#44ff44' : '#4a4a4a',
          'stroke-width': 2.5,
          'stroke-linecap': 'round',
        }),
        svg('path', {
          d: 'M 36 22 A 12 12 0 0 1 38 30',
          fill: 'none',
          stroke: bBright > 0 ? '#4444ff' : '#4a4a4a',
          'stroke-width': 2.5,
          'stroke-linecap': 'round',
        }),
        svg('text', {
          x: 30,
          y: 60,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      g.lastElementChild!.textContent = lit
        ? `R${Math.round(rBright * 100)} G${Math.round(gBright * 100)} B${Math.round(bBright * 100)}`
        : 'RGB';
    },
  };
}

export const rgbLed = makeRgbLed();