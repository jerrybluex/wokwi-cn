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

// ── Template 2: Button Read Pin (replaces coder's "按钮控制 LED") ──────────
// 教 digitalRead 基础:按钮按下读 D2 引脚,通过串口监视器输出
// 比 "按钮控制 LED" 更聚焦,LED 那部分已经在 LED 课学过
const buttonReadState: CanvasState = {
  parts: [
    { id: 'u1', type: 'arduino-uno', x: 40, y: 60, rotation: 0 },
    { id: 'b1', type: 'button', x: 320, y: 90, rotation: 0 },
  ],
  wires: [
    // 按钮: D2 → button.A, button.B → GND
    { id: 'w1', from: { partId: 'u1', pinId: 'D2' }, to: { partId: 'b1', pinId: 'A' } },
    { id: 'w2', from: { partId: 'b1', pinId: 'B' }, to: { partId: 'u1', pinId: 'GND' } },
  ],
};

// ── Template 3: Potentiometer Dimmer (replaces coder's "PWM 调光") ─────────
// 教 analogRead + analogWrite: 用电位器读 0-1023 映射到 LED PWM 0-255
// 比 "PWM 调光"(纯代码无元件)更"实物感",符合高职教学定位
const potState: CanvasState = {
  parts: [
    { id: 'u1', type: 'arduino-uno', x: 40, y: 60, rotation: 0 },
    { id: 'p1', type: 'potentiometer', x: 280, y: 90, rotation: 0 },
    { id: 'r1', type: 'resistor', x: 460, y: 110, rotation: 0 },
    { id: 'l1', type: 'led', x: 580, y: 90, rotation: 0 },
  ],
  wires: [
    // 电位器: A 接 5V, B 接 GND, W 接 A0(读)
    { id: 'w1', from: { partId: 'u1', pinId: '5V' }, to: { partId: 'p1', pinId: 'A' } },
    { id: 'w2', from: { partId: 'u1', pinId: 'GND' }, to: { partId: 'p1', pinId: 'B' } },
    { id: 'w3', from: { partId: 'u1', pinId: 'A0' }, to: { partId: 'p1', pinId: 'W' } },
    // LED: D9 → 220Ω → LED.A, LED.K → GND (D9 是 PWM 引脚)
    { id: 'w4', from: { partId: 'u1', pinId: 'D9' }, to: { partId: 'r1', pinId: 'A' } },
    { id: 'w5', from: { partId: 'r1', pinId: 'B' }, to: { partId: 'l1', pinId: 'A' } },
    { id: 'w6', from: { partId: 'l1', pinId: 'K' }, to: { partId: 'u1', pinId: 'GND' } },
  ],
};

// ── Export ─────────────────────────────────────────────────────────────────

export const TEMPLATES: ProjectTemplate[] = [
  makeTemplate(
    'led-blink',
    'LED 闪烁',
    'UNO + 220Ω + LED,接 D13。按下 Run 按钮后 LED 会闪烁。',
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
    'button-read',
    '按钮读引脚',
    '按钮接 D2(GND 下拉)。点 Run 后打开串口监视器(9600),按下按钮会看到状态变化。',
    buttonReadState,
    `void setup() {
  Serial.begin(9600);          // 启动串口,波特率 9600
  pinMode(2, INPUT_PULLUP);   // D2 上拉,默认 HIGH,按下变 LOW
}

void loop() {
  int val = digitalRead(2);   // 读 D2: HIGH = 松开, LOW = 按下
  Serial.println(val);        // 通过串口监视器看到状态
  delay(100);                 // 100 ms 间隔,避免刷屏
}
`,
  ),

  makeTemplate(
    'pot-dimmer',
    '电位器调亮度',
    '电位器接 A0(读)+ 5V/GND(供电),LED 接 D9(PWM)。转电位器,LED 跟着亮/暗。',
    potState,
    `void setup() {
  pinMode(9, OUTPUT);   // D9 是 PWM 引脚
}

void loop() {
  int val = analogRead(A0);     // 读电位器: 0..1023
  int bright = val / 4;         // 映射到 PWM 范围: 0..255
  analogWrite(9, bright);       // 设置 LED 亮度
  delay(10);
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
