/**
 * demo.ts — the default circuit we ship in the editor. UNO + 220Ω + LED,
 * wired D13 → 220Ω → LED.A → LED.K → GND. The blink sketch drives D13
 * HIGH/LOW and the canvas + the on-screen indicator both light up.
 */
import type { CanvasState } from './state';
import { toWiringJSON } from './wiring';

export function buildDemoCircuit(): CanvasState {
  // 决策 21 v2 后续(主理人:画布上留白) — viewBox 0 0 615 385 (zoom 1.3x)。
  // 把 demo 3 件居中:UNO 中心对齐 viewBox 中心 (307, 192)。
  //   UNO height 170 → y = 192 - 85 = 107
  //   resistor/LED 跟 UNO D13/5V/GND 对齐
  return {
    parts: [
      { id: 'u1', type: 'arduino-uno', x: 40, y: 107, rotation: 0 },
      { id: 'r1', type: 'resistor', x: 290, y: 157, rotation: 0 },
      { id: 'l1', type: 'led', x: 450, y: 137, rotation: 0 },
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
