import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * SG90 servo — hobbyist servo.
 *   Pin VCC — power (5V)
 *   Pin GND — ground
 *   Pin SIG — PWM control signal (50Hz, 1..2ms pulse width → 0..180°)
 *
 * Model: maps SIG pin PWM value (0..255 from analogWrite) to angle 0–180°.
 * The render reads pins['SIG'] directly and converts to angle, so this model
 * ensures the pin value is properly propagated through the wire graph.
 */
function makeServo(): PartSpec {
  return {
    type: 'servo',
    displayName: 'Servo (SG90)',
    width: 90,
    height: 70,
    pins: [
      { id: 'VCC', x: 0, y: 12, label: 'VCC' },
      { id: 'GND', x: 0, y: 32, label: 'GND' },
      { id: 'SIG', x: 90, y: 22, label: 'SIG' },
    ],
    render(g, state) {
      // SIG pin carries 0–255 (PWM). Map to 0–180°.
      const sigVal = state.pins['SIG'] ?? 90;
      const angleDeg = Math.max(0, Math.min(180, sigVal));
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      const armLen = 22;
      const x2 = 45 + Math.cos(rad) * armLen;
      const y2 = 32 + Math.sin(rad) * armLen;

      appendAll(g, [
        pinPad('VCC', 0, 12),
        pinPad('GND', 0, 32),
        pinPad('SIG', 90, 22),
        svg('rect', {
          x: 18,
          y: 8,
          width: 54,
          height: 50,
          rx: 5,
          fill: 'var(--part-body)',
          stroke: 'var(--part-stroke)',
          'stroke-width': 1.5,
        }),
        svg('circle', { cx: 45, cy: 32, r: 14, fill: 'var(--part-stroke)', stroke: 'var(--part-stroke-soft)', 'stroke-width': 1 }),
        svg('line', { x1: 45, y1: 32, x2: x2, y2: y2, stroke: '#f1c40f', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
        svg('circle', { cx: 45, cy: 32, r: 2, fill: '#f1c40f' }),
        svg('line', { x1: 0, y1: 12, x2: 18, y2: 12, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 32, x2: 18, y2: 32, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 22, x2: 72, y2: 22, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('text', {
          x: 45,
          y: 66,
          'text-anchor': 'middle',
          fill: '#8aa2b8',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      (g.querySelector('text') as SVGTextElement)!.textContent = `${Math.round(angleDeg)}°`;
    },
  };
}

export const servo: PartSpec = (() => {
  const spec = makeServo();
  spec.model = ((ctx) => {
    // SIG pin receives PWM 0–255 (from Arduino analogWrite on the signal wire).
    // ctx.pins['SIG'] carries the full 0-255 value (not truncated to 0/1).
    const sig = ctx.pins['SIG'] ?? 0;
    return [{ pinId: 'SIG', value: sig }] as PinWrite[];
  }) as PartModel;
  return spec;
})();
