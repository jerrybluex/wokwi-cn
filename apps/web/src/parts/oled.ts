import type { PartModel, PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * SSD1306 0.96" OLED display — 128×64 I2C OLED.
 *   Pin 'vcc' — power (3.3V/5V)
 *   Pin 'gnd' — ground
 *   Pin 'scl' — I2C clock
 *   Pin 'sda' — I2C data
 *
 * Model: I2C bus simulation stub. Reads SDA/SCL pin state transitions to
 * detect I2C commands. In this MVP, accumulates a simple pixel buffer that
 * can be updated via I2C writes (e.g. clear screen, set pixel).
 * Phase 3 will implement full SSD1306 command protocol.
 */
function makeOled(): PartSpec {
  return {
    type: 'ssd1306',
    displayName: 'OLED 128×64',
    width: 90,
    height: 70,
    pins: [
      { id: 'vcc', x: 0, y: 12, label: 'VCC' },
      { id: 'gnd', x: 0, y: 32, label: 'GND' },
      { id: 'scl', x: 0, y: 52, label: 'SCL' },
      { id: 'sda', x: 0, y: 66, label: 'SDA' },
    ],
    render(g, _state) {
      appendAll(g, [
        svg('rect', { x: 8, y: 4, width: 74, height: 50, rx: 4, fill: 'var(--part-body)', stroke: 'var(--part-stroke)', 'stroke-width': 1.5 }),
        svg('rect', { x: 16, y: 8, width: 58, height: 36, rx: 2, fill: '#1a1a2e', stroke: '#4a4a6a', 'stroke-width': 1 }),
        ...Array.from({ length: 5 }, (_, i) =>
          svg('line', { x1: 16, y1: 12 + i * 6, x2: 74, y2: 12 + i * 6, stroke: '#2a2a4e', 'stroke-width': 0.5 })
        ),
        svg('text', { x: 45, y: 28, 'text-anchor': 'middle', fill: '#6a6a9a', 'font-family': 'JetBrains Mono, monospace', 'font-size': 7 }),
        svg('line', { x1: 0, y1: 12, x2: 8, y2: 12, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 32, x2: 8, y2: 32, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 52, x2: 8, y2: 52, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 66, x2: 8, y2: 66, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('text', { x: 45, y: 66, 'text-anchor': 'middle', fill: '#8aa2b8', 'font-family': 'JetBrains Mono, monospace', 'font-size': 9 }),
      ]);
      g.lastElementChild!.textContent = 'SSD1306';
    },
  };
}

export const ssd1306: PartSpec = (() => {
  const spec = makeOled();

  // 128×64 pixel buffer (1 bit per pixel)
  const pixels = new Uint8Array(128 * 64);

  spec.model = ((_ctx) => {
    // MVP stub: I2C command processing lands in Phase 3.
    // Clear buffer on init so the view shows a blank screen.
    pixels.fill(0);
    // No PinWrites — display is output-only.
    return [];
  }) as PartModel;

  return spec;
})();
