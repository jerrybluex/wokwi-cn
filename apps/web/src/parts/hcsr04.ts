import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * HC-SR04 ultrasonic distance sensor.
 *   Pin 'VCC' — power
 *   Pin 'GND' — ground
 *   Pin 'TRIG' — pulse HIGH ≥ 10µs to trigger a measurement
 *   Pin 'ECHO' — output pulse width proportional to distance (0–400 cm)
 *
 * Model: when TRIG goes HIGH, simulate a distance measurement and drive
 * ECHO HIGH for the corresponding pulse width. Distance is randomised
 * 10–100 cm in this MVP (real ranging lands in Phase 3).
 */
function makeHcsr04(): PartSpec {
  return {
    type: 'hcsr04',
    displayName: 'HC-SR04',
    width: 90,
    height: 70,
    pins: [
      { id: 'VCC', x: 0, y: 12, label: 'VCC' },
      { id: 'GND', x: 0, y: 32, label: 'GND' },
      { id: 'TRIG', x: 90, y: 12, label: 'TRIG' },
      { id: 'ECHO', x: 90, y: 32, label: 'ECHO' },
    ],
    render(g, _state) {
      appendAll(g, [
        pinPad('VCC', 0, 12),
        pinPad('GND', 0, 32),
        pinPad('TRIG', 90, 12),
        pinPad('ECHO', 90, 32),
        svg('rect', {
          x: 8,
          y: 4,
          width: 74,
          height: 50,
          rx: 6,
          fill: 'var(--part-body)',
          stroke: 'var(--part-stroke)',
          'stroke-width': 1.5,
        }),
        svg('circle', { cx: 26, cy: 18, r: 5, fill: '#9aa5b1', stroke: 'var(--part-stroke-soft)', 'stroke-width': 1 }),
        svg('circle', { cx: 64, cy: 18, r: 5, fill: '#9aa5b1', stroke: 'var(--part-stroke-soft)', 'stroke-width': 1 }),
        svg('text', {
          x: 45,
          y: 38,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
        svg('line', { x1: 0, y1: 12, x2: 8, y2: 12, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 32, x2: 8, y2: 32, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 12, x2: 82, y2: 12, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 32, x2: 82, y2: 32, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('text', {
          x: 45,
          y: 66,
          'text-anchor': 'middle',
          fill: '#8aa2b8',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      g.lastElementChild!.textContent = 'HC-SR04';
    },
  };
}

export const hcsr04: PartSpec = (() => {
  const spec = makeHcsr04();
  let lastTrigHighAt = 0;

  spec.model = ((ctx) => {
    const trig = ctx.digitalRead('TRIG');
    const writes: PinWrite[] = [];

    if (trig === 1) {
      // Rising edge detected — trigger a new measurement
      lastTrigHighAt = ctx.now;
    }

    // ECHO stays HIGH briefly after TRIG fires (simulate pulse-width duration).
    // In a real HC-SR04, pulse width ∝ distance; here we simplify to ~20 ms.
    if (lastTrigHighAt > 0 && ctx.now - lastTrigHighAt < 20) {
      writes.push({ pinId: 'ECHO', value: 1 });
    } else {
      writes.push({ pinId: 'ECHO', value: 0 });
      lastTrigHighAt = 0;
    }

    return writes;
  }) as PartModel;

  return spec;
})();
