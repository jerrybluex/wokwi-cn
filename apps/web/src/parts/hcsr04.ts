import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll } from './svg';

/**
 * HC-SR04 ultrasonic distance sensor.
 *   Pin 'VCC' — power
 *   Pin 'GND' — ground
 *   Pin 'TRIG' — pulse HIGH ≥ 10µs to trigger a measurement
 *   Pin 'ECHO' — output pulse width proportional to distance
 *
 * Stub model for MVP: no real-time echo simulation. Returns no PinWrites —
 * users can still observe the digitalRead('ECHO') value via test pins if
 * they hard-wire it. Real range logic lands in Phase 3.
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
        // PCB outline
        svg('rect', {
          x: 8,
          y: 4,
          width: 74,
          height: 50,
          rx: 6,
          fill: '#1c2530',
          stroke: '#2c3848',
          'stroke-width': 1.5,
        }),
        // Two cylindrical transducers (silver cylinders on top)
        svg('circle', { cx: 26, cy: 18, r: 5, fill: '#9aa5b1', stroke: '#555', 'stroke-width': 1 }),
        svg('circle', { cx: 64, cy: 18, r: 5, fill: '#9aa5b1', stroke: '#555', 'stroke-width': 1 }),
        // Label
        svg('text', {
          x: 45,
          y: 38,
          'text-anchor': 'middle',
          fill: '#d8dee9',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
        // Pin wires
        svg('line', { x1: 0, y1: 12, x2: 8, y2: 12, stroke: '#888', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 32, x2: 8, y2: 32, stroke: '#888', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 12, x2: 82, y2: 12, stroke: '#888', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 32, x2: 82, y2: 32, stroke: '#888', 'stroke-width': 1.5 }),
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
  // Real-time model lands in Phase 3; D3 stub returns nothing.
  spec.model = (() => {
    let lastTrigRise = 0;
    return (_ctx) => {
      // No-op until canvas wires ECHO pin; reserved for future logic.
      const writes: PinWrite[] = [];
      return writes;
    };
  })() as PartModel;
  return spec;
})();
