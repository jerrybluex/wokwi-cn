import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll } from './svg';

/**
 * Active buzzer — emits sound when SIG is HIGH.
 *   Pin 'VCC' — power
 *   Pin 'GND' — ground
 *   Pin 'SIG' — drive HIGH to buzz
 *
 * MVP: visual only — no actual sound. Model marks the visual state (lit when SIG=1).
 */
function makeBuzzer(): PartSpec {
  return {
    type: 'buzzer',
    displayName: 'Active Buzzer',
    width: 60,
    height: 56,
    pins: [
      { id: 'VCC', x: 0, y: 12, label: 'VCC' },
      { id: 'GND', x: 0, y: 32, label: 'GND' },
      { id: 'SIG', x: 60, y: 22, label: 'SIG' },
    ],
    defaultPinValues: { GND: 0 },
    render(g, state) {
      const sig = state.pins['SIG'] ?? 0;
      const buzzing = sig >= 1;
      appendAll(g, [
        svg('circle', { cx: 30, cy: 28, r: 18, fill: 'var(--part-body-deep)', stroke: 'var(--part-chip-edge)', 'stroke-width': 1.5 }),
        buzzing
          ? svg('circle', { cx: 30, cy: 28, r: 22, fill: '#f39c12', 'fill-opacity': 0.45 })
          : null,
        svg('circle', {
          cx: 30,
          cy: 28,
          r: 10,
          fill: buzzing ? '#f1c40f' : '#444',
          'fill-opacity': buzzing ? 0.9 : 1,
        }),
        svg('text', {
          x: 30,
          y: 50,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
        svg('line', { x1: 0, y1: 12, x2: 12, y2: 12, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 32, x2: 12, y2: 32, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 60, y1: 22, x2: 48, y2: 22, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
      ].filter(Boolean) as SVGElement[]);
      g.lastElementChild!.textContent = buzzing ? 'BZ' : 'BUZZER';
    },
  };
}

export const buzzer: PartSpec = (() => {
  const spec = makeBuzzer();
  spec.model = (() => () => {
    return [] as PinWrite[];
  })() as PartModel;
  return spec;
})();
