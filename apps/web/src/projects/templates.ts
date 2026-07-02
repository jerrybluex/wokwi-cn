/**
 * templates.ts — starter project templates.
 *
 * Each template is a named preset with a wiring JSON (compatible with CanvasState)
 * and an Arduino sketch. Templates are plain JS objects — no DB needed.
 *
 * To add a template:
 *   1. Design the circuit in the editor and note down parts + wires
 *   2. Convert CanvasState → toWiringJSON → JSON.stringify
 *   3. Paste the string here and add the matching sketch code
 */
import { toWiringJSON } from '../canvas/wiring';
import type { CanvasState } from '../canvas/state';
import type { WiringJSON } from '../canvas/wiring';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  /** JSON string of WiringJSON — stored as project.wiring in the DB */
  wiring: string;
  code: string;
}

function makeTemplate(
  id: string,
  name: string,
  description: string,
  state: CanvasState,
  code: string,
): ProjectTemplate {
  return { id, name, description, wiring: JSON.stringify(toWiringJSON(state)), code };
}

// ── Template 1: LED Blink ───────────────────────────────────────────────────
const blinkState: CanvasState = {
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

// ── Template 2: Button Controlled LED ───────────────────────────────────────
const buttonState: CanvasState = {
  parts: [
    { id: 'u1', type: 'arduino-uno', x: 40, y: 60, rotation: 0 },
    { id: 'b1', type: 'button', x: 280, y: 80, rotation: 0 },
    { id: 'r1', type: 'resistor', x: 420, y: 110, rotation: 0 },
    { id: 'l1', type: 'led', x: 580, y: 90, rotation: 0 },
  ],
  wires: [
    // Button: D2 → button.A, button.B → GND
    { id: 'w1', from: { partId: 'u1', pinId: 'D2' }, to: { partId: 'b1', pinId: 'A' } },
    { id: 'w2', from: { partId: 'b1', pinId: 'B' }, to: { partId: 'u1', pinId: 'GND' } },
    // LED: D13 → 220Ω → LED.A, LED.K → GND
    { id: 'w3', from: { partId: 'u1', pinId: 'D13' }, to: { partId: 'r1', pinId: 'A' } },
    { id: 'w4', from: { partId: 'r1', pinId: 'B' }, to: { partId: 'l1', pinId: 'A' } },
    { id: 'w5', from: { partId: 'l1', pinId: 'K' }, to: { partId: 'u1', pinId: 'GND' } },
  ],
};

// ── Template 3: PWM Dimming ─────────────────────────────────────────────────
const pwmState: CanvasState = {
  parts: [
    { id: 'u1', type: 'arduino-uno', x: 40, y: 60, rotation: 0 },
    { id: 'r1', type: 'resistor', x: 320, y: 110, rotation: 0 },
    { id: 'l1', type: 'led', x: 480, y: 90, rotation: 0 },
  ],
  wires: [
    // PWM on D9 (supports analogWrite)
    { id: 'w1', from: { partId: 'u1', pinId: 'D9' }, to: { partId: 'r1', pinId: 'A' } },
    { id: 'w2', from: { partId: 'r1', pinId: 'B' }, to: { partId: 'l1', pinId: 'A' } },
    { id: 'w3', from: { partId: 'l1', pinId: 'K' }, to: { partId: 'u1', pinId: 'GND' } },
  ],
};

// ── Export ─────────────────────────────────────────────────────────────────

export const TEMPLATES: ProjectTemplate[] = [
  makeTemplate(
    'led-blink',
    'LED 闪烁',
    'UNO + 220Ω + LED，接 D13。按下 Run 按钮后 LED 会闪烁。',
    blinkState,
    `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
`,
  ),

  makeTemplate(
    'button-led',
    '按钮控制 LED',
    '按钮读 D2，LED 接 D13。按下按钮 LED 亮，松开熄灭。',
    buttonState,
    `void setup() {
  pinMode(2, INPUT_PULLUP);  // 内置上拉电阻
  pinMode(13, OUTPUT);
}

void loop() {
  int val = digitalRead(2);   // 按钮按下为 LOW
  digitalWrite(13, val == LOW ? HIGH : LOW);
}
`,
  ),

  makeTemplate(
    'pwm-dim',
    'PWM 调光',
    'LED 接 D9（PWM 引脚），用 analogWrite 渐变调光。',
    pwmState,
    `void setup() {
  // D9 支持 PWM，无需 pinMode
}

void loop() {
  // 渐亮
  for (int b = 0; b <= 255; b += 5) {
    analogWrite(9, b);
    delay(20);
  }
  // 渐暗
  for (int b = 255; b >= 0; b -= 5) {
    analogWrite(9, b);
    delay(20);
  }
}
`,
  ),
];

/** Look up a template by id. Returns undefined if not found. */
export function getTemplate(id: string): ProjectTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Validate that a template's wiring JSON parses to a WiringJSON. */
export function validateTemplate(t: ProjectTemplate): boolean {
  try {
    const w = JSON.parse(t.wiring) as WiringJSON;
    return Array.isArray(w.parts) && Array.isArray(w.wires);
  } catch {
    return false;
  }
}
