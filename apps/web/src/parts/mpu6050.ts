import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll } from './svg';

/**
 * MPU-6050 — 6-axis accelerometer + gyroscope (I2C).
 *   Pin 'vcc' — power (3.3V)
 *   Pin 'gnd' — ground
 *   Pin 'scl' — I2C clock
 *   Pin 'sda' — I2C data
 *   Pin 'int' — interrupt output
 *
 * Stub model: returns no PinWrites. Real sensor fusion lands in Phase 3.
 */
function makeMpu6050(): PartSpec {
  return {
    type: 'mpu6050',
    displayName: 'MPU-6050',
    width: 90,
    height: 80,
    pins: [
      { id: 'vcc', x: 0, y: 12, label: 'VCC' },
      { id: 'gnd', x: 0, y: 28, label: 'GND' },
      { id: 'scl', x: 0, y: 44, label: 'SCL' },
      { id: 'sda', x: 0, y: 60, label: 'SDA' },
      { id: 'int', x: 90, y: 36, label: 'INT' },
    ],
    render(g, _state) {
      appendAll(g, [
        // PCB outline
        svg('rect', {
          x: 8,
          y: 8,
          width: 74,
          height: 52,
          rx: 4,
          fill: 'var(--part-body)',
          stroke: 'var(--part-stroke)',
          'stroke-width': 1.5,
        }),
        // Chip mark (center square)
        svg('rect', {
          x: 32,
          y: 22,
          width: 26,
          height: 26,
          rx: 2,
          fill: '#2a2a3a',
          stroke: '#5a5a7a',
          'stroke-width': 1,
        }),
        // Axis arrows (X, Y decorative)
        svg('line', { x1: 38, y1: 35, x2: 52, y2: 35, stroke: '#ff6b6b', 'stroke-width': 1.5 }),
        svg('line', { x1: 45, y1: 28, x2: 45, y2: 42, stroke: '#51cf66', 'stroke-width': 1.5 }),
        svg('text', { x: 53, y: 33, fill: '#ff6b6b', 'font-size': 7 }) as SVGElement,
        svg('text', { x: 47, y: 26, fill: '#51cf66', 'font-size': 7 }) as SVGElement,
        // Pin wires left
        svg('line', { x1: 0, y1: 12, x2: 8, y2: 12, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 28, x2: 8, y2: 28, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 44, x2: 8, y2: 44, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 60, x2: 8, y2: 60, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        // Pin wire right (INT)
        svg('line', { x1: 90, y1: 36, x2: 82, y2: 36, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('text', {
          x: 45,
          y: 74,
          'text-anchor': 'middle',
          fill: '#8aa2b8',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      g.lastElementChild!.textContent = 'MPU-6050';
    },
  };
}

export const mpu6050: PartSpec = (() => {
  const spec = makeMpu6050();
  spec.model = (() => {
    return (_ctx): PinWrite[] => {
      // Stub: real sensor I2C reads land in Phase 3
      return [];
    };
  })() as PartModel;
  return spec;
})();