import type { PartModel, PartSpec } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Potentiometer — three-pin variable resistor.
 *   Pin 'A' = one end
 *   Pin 'B' = other end
 *   Pin 'W' = wiper (variable output, 0–1023)
 *
 * Canvas drag sets pins.W to 0–100 (UI dial position).
 * Model reads that value and writes it back as 0–1023 (Arduino analogRead range).
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
      const raw = state.pins['W'] ?? 50; // canvas gives 0..100
      const v = Math.max(0, Math.min(100, raw));
      const angle = -135 + (v / 100) * 270;
      const rad = (angle * Math.PI) / 180;
      const x2 = 30 + Math.sin(rad) * 16;
      const y2 = 30 - Math.cos(rad) * 16;

      appendAll(g, [
        pinPad('A', 0, 18),
        pinPad('B', 60, 18),
        pinPad('W', 30, 80),
        svg('circle', { cx: 30, cy: 30, r: 24, fill: 'var(--part-body-deep)', stroke: 'var(--part-stroke-soft)', 'stroke-width': 1.5 }),
        svg('circle', { cx: 30, cy: 30, r: 22, fill: 'var(--part-body-pit)' }),
        svg('circle', { cx: 30, cy: 6, r: 1.5, fill: '#777' }),
        svg('line', { x1: 30, y1: 30, x2: x2, y2: y2, stroke: 'var(--canvas-text)', 'stroke-width': 3, 'stroke-linecap': 'round' }),
        svg('circle', { cx: 30, cy: 30, r: 3, fill: 'var(--part-lead)' }),
        svg('line', { x1: 0, y1: 18, x2: 18, y2: 18, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 60, y1: 18, x2: 42, y2: 18, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('text', {
          x: 30,
          y: 70,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 10,
        }),
      ]);
      g.lastElementChild!.textContent = `${Math.round(v)}%`;
    },
  };
}

export const potentiometer: PartSpec = (() => {
  const spec = makePotentiometer();
  spec.model = ((ctx) => {
    // Canvas drag writes pins.W as 0–100 (UI position).
    // Model maps it to 0–1023 for Arduino analogRead.
    const dial = ctx.digitalRead('W'); // 0–100 from canvas
    const raw = Math.round((dial / 100) * 1023);
    return [{ pinId: 'W', value: Math.max(0, Math.min(1023, raw)) }];
  }) as PartModel;
  return spec;
})();
