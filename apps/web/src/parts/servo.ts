import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll } from './svg';

/**
 * SG90 servo — hobbyist hobby servo.
 *   Pin VCC — power (5V)
 *   Pin GND — ground
 *   Pin SIG — PWM control signal (50Hz, 1..2ms pulse width)
 *
 * Model: SG90 expects a 50Hz square on SIG. Position tracks the pulse width.
 * D3 model is structural; full servo movement lands in Phase 2.
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
      // state.pins['SIG'] could carry angle 0..180 via model — use if present.
      const sigVal = state.pins['SIG'] ?? 90;
      const angleDeg = Math.max(0, Math.min(180, sigVal));
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      const armLen = 22;
      const x2 = 45 + Math.cos(rad) * armLen;
      const y2 = 32 + Math.sin(rad) * armLen;

      appendAll(g, [
        svg('rect', {
          x: 18,
          y: 8,
          width: 54,
          height: 50,
          rx: 5,
          fill: '#1c2530',
          stroke: '#2c3848',
          'stroke-width': 1.5,
        }),
        svg('circle', { cx: 45, cy: 32, r: 14, fill: '#2a3742', stroke: '#3d4f60', 'stroke-width': 1 }),
        svg('line', { x1: 45, y1: 32, x2: x2, y2: y2, stroke: '#f1c40f', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
        svg('circle', { cx: 45, cy: 32, r: 2, fill: '#f1c40f' }),
        // Pin wires
        svg('line', { x1: 0, y1: 12, x2: 18, y2: 12, stroke: '#888', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 32, x2: 18, y2: 32, stroke: '#888', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 22, x2: 72, y2: 22, stroke: '#888', 'stroke-width': 1.5 }),
        svg('text', {
          x: 45,
          y: 66,
          'text-anchor': 'middle',
          fill: '#8aa2b8',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      g.lastElementChild!.textContent = `${Math.round(angleDeg)}°`;
    },
  };
}

export const servo: PartSpec = (() => {
  const spec = makeServo();
  spec.model = ((_ctx) => {
    // 后续 day 由 canvas 把 angle 推到 SIG pin
    return [] as PinWrite[];
  }) as PartModel;
  return spec;
})();
