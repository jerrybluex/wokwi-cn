import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Active buzzer — emits sound when SIG is HIGH.
 *   Pin 'VCC' — power
 *   Pin 'GND' — ground
 *   Pin 'SIG' — drive HIGH to buzz
 *
 * Model: reads SIG pin. When SIG=1 the view shows buzzing state (glow).
 * The model propagates the SIG value so other parts can read it.
 */
function makeBuzzer(): PartSpec {
  return {
    type: 'buzzer',
    displayName: 'Active Buzzer',
    width: 60,
    height: 56,
    pins: [
      { id: 'VCC', x: 0, y: 12, label: 'VCC', pinType: 'vcc' },
      { id: 'GND', x: 0, y: 32, label: 'GND', pinType: 'gnd' },
      { id: 'SIG', x: 60, y: 22, label: 'SIG', pinType: 'pwm' },
    ],
    defaultPinValues: { GND: 0 },
    render(g, state) {
      const sig = state.pins['SIG'] ?? 0;
      const buzzing = sig >= 1;
      appendAll(g, [
        pinPad('VCC', 0, 12),
        pinPad('GND', 0, 32),
        pinPad('SIG', 60, 22),
        svg('circle', { cx: 30, cy: 28, r: 18, fill: 'var(--part-body-deep)', stroke: 'var(--part-chip-edge)', 'stroke-width': 1.5 }),
        // Decision 31f: wave ring on TOP of inner circle so animation is visible
        svg('circle', {
          cx: 30,
          cy: 28,
          r: 10,
          fill: buzzing ? '#f1c40f' : '#444',
          'fill-opacity': buzzing ? 0.9 : 1,
        }),
        buzzing
          ? (() => {
              const ring = svg('circle', {
                cx: 30, cy: 28, r: 12,
                fill: 'none',
                stroke: '#f39c12',
                'stroke-width': 2,
                class: 'buzzer-playing',
              });
              return ring;
            })()
          : null,
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
      (g.querySelector('text') as SVGTextElement)!.textContent = buzzing ? 'BZ' : 'BUZZER';
    },
  };
}

export const buzzer: PartSpec = (() => {
  const spec = makeBuzzer();
  spec.model = ((ctx) => {
    // SIG pin value (after BFS propagation). Reads full resolved value
    // (not truncated to 0/1) so the view reflects the actual driven state.
    const sig = ctx.pins['SIG'] ?? 0;
    return [{ pinId: 'SIG', value: sig }] as PinWrite[];
  }) as PartModel;
  return spec;
})();
