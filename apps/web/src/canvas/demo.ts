/**
 * demo.ts — the default circuit we ship in the editor. UNO + 220Ω + LED,
 * wired D13 → 220Ω → LED.A → LED.K → GND. The blink sketch drives D13
 * HIGH/LOW and the canvas + the on-screen indicator both light up.
 */
import type { CanvasState } from './state';
import { toWiringJSON } from './wiring';

export function buildDemoCircuit(): CanvasState {
  return {
    parts: [
      { id: 'u1', type: 'arduino-uno', x: 40, y: 60, rotation: 0 },
      { id: 'r1', type: 'resistor', x: 320, y: 110, rotation: 0 },
      { id: 'l1', type: 'led', x: 480, y: 90, rotation: 0 },
    ],
    wires: [
      { id: 'w1', from: { partId: 'u1', pinId: 'D13' }, to: { partId: 'r1', pinId: 'A' } },
      { id: 'w2', from: { partId: 'r1', pinId: 'B' }, to: { partId: 'l1', pinId: 'A' } },
      { id: 'w3', from: { partId: 'l1', pinId: 'K' }, to: { partId: 'u1', pinId: 'GND' } },
    ],
  };
}

export function demoWiringJSON() {
  return toWiringJSON(buildDemoCircuit());
}
