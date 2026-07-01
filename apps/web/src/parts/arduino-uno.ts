import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Arduino UNO R3 — simulator's primary controller board.
 * Pins exposed: 14 digital (D0..D13) on the right side, plus power + 2 analog
 * (A0..A1) on the left. MVP simplification: only A0/A1 are listed; A2..A5
 * will land in Phase 2.
 */
const DIGITAL_PINS = Array.from({ length: 14 }, (_, i) => i);

function makeArduinoUno(): PartSpec {
  return {
    type: 'arduino-uno',
    displayName: 'Arduino UNO',
    width: 220,
    height: 140,
    pins: [
      ...DIGITAL_PINS.map((i) => ({
        id: `D${i}`,
        x: 220,
        y: 30 + i * 8,
        label: `D${i}`,
      })),
      { id: '5V', x: 0, y: 30, label: '5V' },
      { id: '3V3', x: 0, y: 50, label: '3.3V' },
      { id: 'GND', x: 0, y: 70, label: 'GND' },
      { id: 'A0', x: 0, y: 100, label: 'A0' },
      { id: 'A1', x: 0, y: 108, label: 'A1' },
    ],
    defaultPinValues: { GND: 0 },
    render(g, _state) {
      appendAll(
        g,
        [
          // PCB
          svg('rect', { x: 0, y: 0, width: 220, height: 140, rx: 4, fill: '#1a4a8a', stroke: '#0c2c54', 'stroke-width': 2 }),
          svg('rect', { x: 12, y: 12, width: 196, height: 116, rx: 2, fill: '#0a3a6a' }),
          // USB connector
          svg('rect', { x: -14, y: 30, width: 14, height: 24, rx: 2, fill: '#888', stroke: '#444' }),
          // Power jack
          svg('rect', { x: 200, y: -8, width: 14, height: 8, rx: 2, fill: '#222' }),
          // ATmega chip
          svg('rect', { x: 80, y: 50, width: 60, height: 40, rx: 2, fill: '#1a1a1a', stroke: '#444' }),
          // Pin header strip (visual only)
          ...DIGITAL_PINS.map((i) =>
            svg('rect', {
              x: 212,
              y: 27 + i * 8,
              width: 14,
              height: 4,
              fill: '#ddd',
            }),
          ),
          // Board label
          svg('text', {
            x: 110,
            y: 124,
            'text-anchor': 'middle',
            fill: '#d8e6f3',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': 9,
          }),
          // ATmega label text (needs separate addChild)
        ],
      );
      g.lastChild!.textContent = 'ARDUINO UNO';
      const atmega = svg('text', {
        x: 50,
        y: 70,
        'text-anchor': 'middle',
        fill: '#8AB4D8',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 9,
      });
      atmega.textContent = 'ATmega328';
      g.appendChild(atmega);
    },
  };
}

export const arduinoUno = makeArduinoUno();
