import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * LED — simple two-pin device. Pin 'A' is anode (positive), 'K' is cathode.
 * Brightness comes from PartRenderState.pins['A'] (0 = off, 1 = full on, or
 * 0..255 from analogWrite in PWM-bright mode).
 */
function makeLed(): PartSpec {
  return {
    type: 'led',
    displayName: 'LED',
    width: 60,
    height: 50,
    pins: [
      { id: 'A', x: 0, y: 14, label: 'A' },
      { id: 'K', x: 0, y: 36, label: 'K' },
    ],
    defaultPinValues: { K: 0 },
    render(g, state) {
      const anode = state.pins['A'] ?? 0;
      // PWM-aware: brighten if analog value > 0
      const brightness = anode > 0 ? Math.max(0.15, Math.min(1, anode)) : 0;
      const colorHex = '#ff5252'; // MVP: 固定红色,颜色由 canvas 状态切换
      const lit = brightness > 0;

      appendAll(g, [
        svg('line', { x1: 0, y1: 14, x2: 18, y2: 14, stroke: '#888', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 36, x2: 18, y2: 36, stroke: '#888', 'stroke-width': 1.5 }),
        lit && brightness > 0.6
          ? svg('circle', {
              cx: 30,
              cy: 25,
              r: 16,
              fill: colorHex,
              'fill-opacity': brightness * 0.35,
            })
          : null,
        svg('circle', {
          cx: 30,
          cy: 25,
          r: 12,
          fill: lit ? colorHex : '#3a3a3a',
          fillOpacity: lit ? brightness : 1,
        }),
        svg('line', { x1: 22, y1: 17, x2: 22, y2: 33, stroke: '#222', 'stroke-width': 2 }),
        svg('text', {
          x: 30,
          y: 50,
          'text-anchor': 'middle',
          fill: '#d8dee9',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ].filter(Boolean) as SVGElement[]);
      g.lastElementChild!.textContent = lit ? `${Math.round(brightness * 100)}%` : 'LED';
    },
  };
}

export const led = makeLed();
