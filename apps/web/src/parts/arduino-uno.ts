import type { PartSpec } from './types';
// @ts-ignore — vite raw import
import unoPcbSvgRaw from './arduino-uno-pcb.svg?raw';
import { svg, appendAll } from './svg';

/**
 * Arduino UNO R3 — Fritzing 官方 PCB SVG 1:1(决策 16)。
 *
 * 用 Fritzing 官方仓库 svg/core/pcb/arduino_Uno_Rev3_pcb.svg 作为 view 内容。
 * 这是社区维护的官方 PCB 实物 layout,silkscreen(白丝印)+ pad(铜金 pad)
 * 跟 Arduino UNO R3 实物 1:1,实物比例 1.28 完美匹配(viewBox 194.592x151.2)。
 *
 * 缩放:viewBox 194.592x151.2 → SVG 物理 170x133
 *   scaleX = 170/194.592 = 0.8735
 *   scaleY = 133/151.2 = 0.8796(uniform scale 0.8735 略微高方向贴底)
 *
 * pin JSON 保持 14+6+7=27 实物 UNO R3 引脚(决策 12 拍板,不动)。
 * 数字 pin 位置基于 PCB SVG 内 silkscreen 标号 "13 12 11 10 9 8 7 6 5 4 3 2 5V A0..." 真实位置。
 * 实物 UNO R3 引脚:
 *   - 14 digital (D0-D13) → 顶部右侧 14 针单排(PCB 标号 "13 12 11 10 9 8 7 6 5 4 3 2 0 1")
 *   - 6 analog (A0-A5) → 底部右侧 6 针单排(PCB 标号 "A0 A1 A2 A3 A4 A5")
 *   - 8 power (IOREF/RESET/3V3/5V/GND/GND2/VIN + 1 spare) → 底部左侧 8 针(PCB 标号 "IOREF RESET 3V3 5V GND GND VIN + 1 spare")
 *
 * AI 实物图参考:docs/reference/arduino-uno-real-AI.png
 * Fritzing PCB SVG:github.com/fritzing/fritzing-parts svg/core/pcb/arduino_Uno_Rev3_pcb.svg
 */

const W = 170;
const H = 133;

const PCB_VW = 212.372;
const PCB_VH = 151.2;
const SCALE = 170 / PCB_VW; // ≈ 0.8006 (breadboard view scale to 170)

const DIGITAL_PINS = Array.from({ length: 14 }, (_, i) => i);
const ANALOG_PINS = Array.from({ length: 6 }, (_, i) => i);
const POWER_PINS: { id: string; label: string }[] = [
  { id: 'IOREF', label: 'IOREF' },
  { id: 'RESET', label: 'RESET' },
  { id: '3V3', label: '3V3' },
  { id: '5V', label: '5V' },
  { id: 'GND', label: 'GND' },
  { id: 'GND2', label: 'GND' },
  { id: 'Vin', label: 'VIN' },
];

/**
 * Fritzing PCB SVG 内 silkscreen 标号对应的 pad cx(PCB 视觉坐标)。
 * 来源:Fritzing PCB SVG line 477-499 (digital 13 12 11 10 9 8 7 6 5 4 3 2) + 131-138 (0 1)
 *   上排 D8-D13:cx 67.864 60.664 53.463 (来自 silkscreen text transform),pad cy=7.2
 *   上排 D7-D2:cx 75.064 82.264 89.464 96.664 103.864 111.065,pad cy=7.2
 *   上排 D0/D1:cx 180.185 172.985,pad cy=7.2
 * 实际:PCB SVG 顶部 pad circle (cx cy 7.2) 是 14 个 digital 14 针 (2 个 header 各 7 针)
 *   D13 cx ≈ 53.463, D12 cx ≈ 60.664, ..., D8 cx ≈ 82.264(第一组 6 pin)
 *   D7 cx ≈ 89.464, ..., D2 cx ≈ 118.263(第二组 7 pin)
 *   D1 cx ≈ 180.185(第三组?实际是 0/1 单独在右边)
 * 实际看 connector60-68 pad list:cx 53.463, 60.664, 67.864, 75.064, 82.264, 89.464, 96.664, 103.864, 111.065, 118.263
 *   = 10 pin(从 53.463 到 118.263,7.2 间距,这是 D13-D4? 10 pin 跨 64.8 视觉距离)
 *
 * 实际 Fritzing PCB 顶部 14 数字 pad 真实位置(从 SVG line 571-587):
 *   connector51pad cx 118.263 cy 7.2 (D4? 0/1 在 cx 180.185, 172.985 = D0 D1)
 *   connector60pad cx 53.463 cy 7.2 (D13 起点,最左)
 *
 * 让我直接 hardcode 14 pin 在 PCB 视觉坐标,基于 silkscreen 标号位置:
 *   D13 (左) cx=53.463 cy=7.2
 *   D12 cx=60.664
 *   D11 cx=67.864
 *   D10 cx=75.064
 *   D9 cx=82.264
 *   D8 cx=89.464
 *   D7 cx=96.664
 *   D6 cx=103.864
 *   D5 cx=111.065
 *   D4 cx=118.263
 *   D3 cx=125.485 (估)
 *   D2 cx=132.685
 *   D1 (TX) cx=172.985 (D0 在 cx 180.185)
 *   D0 (RX) cx=180.185
 *
 * 实际我需要看 PCB SVG 完整 — 14 pad 中可能有些是 POWER 不是 DIGITAL。
 * POWER pad (底部 cy=144) cx: 86.584, 93.784, 100.985, 108.185, 115.384, 122.583, 129.784, 144.185
 *   = 8 pin (IOREF, RESET, 3V3, 5V, GND, GND, VIN, 1 spare)
 * ANALOG pad (底部 cy=144) cx: 151.384, 158.583, 165.786, 172.985, 180.185
 *   = 5 pin (A0-A4? 实际 A0-A5 是 6 pin,我估计 1 spare 或数字?)
 *
 * 等等,cy=144 在 PCB 视觉 y=144,实物板子底部。但 PCB 实际 viewBox 151.2,所以 cy=144 接近底。
 * POWER + ANALOG pad 都在 cy=144(底边),但中间隔开。
 *
 * 简化:用 pcb silkscreen 标号 + pad 位置定义 pin 物理坐标,然后 scale to 170x133。
 */

// DIGITAL 14 pad (顶部,来自 Fritzing breadboard viewPad connector0-68 真实 pad 中心)
// connector60-51 在左段 D13-D4 (cx 71-136),connector68-65 在右段 D3-D0 (cx 147-169)
const DIGITAL_PAD_CX_PCB = [
  71.251, 78.452, 85.652, 92.852, 100.052, 107.252, // D13 D12 D11 D10 D9 D8
  114.452, 121.652, 128.852, 136.051, // D7 D6 D5 D4
  147.573, 154.772, // D3 D2
  161.972, 169.172, // D1 D0
];
const DIGITAL_PAD_CY_PCB = 7.2;

// POWER 8 pad (底部,connector91-90 = 7 power + 1 spare,从左到右 IOREF → VIN)
const POWER_PAD_CX_PCB = [
  97.172, 104.372, 111.573, 118.772, 125.972, 133.172, 140.372, // IOREF RESET 3V3 5V GND GND VIN
  147.573, // N/C spare
];
const POWER_PAD_CY_PCB = 144;

// ANALOG 6 pad (底部,connector0-5 = A0-A5 从左到右)
const ANALOG_PAD_CX_PCB = [
  161.972, 169.172, 176.372, 183.573, 190.772, 197.972, // A0 A1 A2 A3 A4 A5
];
const ANALOG_PAD_CY_PCB = 144;

function makeArduinoUno(): PartSpec {
  return {
    type: 'arduino-uno',
    displayName: 'Arduino UNO',
    width: W,
    height: H,
    pins: [
      // DIGITAL 14 针 — 顶部,PCB 视觉 → SVG 物理 (scale + offset)
      ...DIGITAL_PINS.map((i) => ({
        id: `D${i}`,
        x: DIGITAL_PAD_CX_PCB[i] * SCALE,
        y: DIGITAL_PAD_CY_PCB * SCALE,
        label: `D${i}`,
      })),
      // POWER 7 针 — 底部,PCB 视觉
      ...POWER_PINS.map((p, i) => ({
        id: p.id,
        x: POWER_PAD_CX_PCB[i] * SCALE,
        y: POWER_PAD_CY_PCB * SCALE,
        label: p.label,
      })),
      // ANALOG 6 针 — 底部
      ...ANALOG_PINS.map((i) => ({
        id: `A${i}`,
        x: ANALOG_PAD_CX_PCB[i] * SCALE,
        y: ANALOG_PAD_CY_PCB * SCALE,
        label: `A${i}`,
      })),
    ],
    defaultPinValues: { GND: 0 },
    render(g: SVGGElement, _state: unknown) {
      const children: SVGElement[] = [];

      // 解析 Fritzing PCB SVG,import 到当前 document
      const doc = new DOMParser().parseFromString(unoPcbSvgRaw, 'image/svg+xml');
      const pcbSvg = document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
      // 重新设置 viewBox + width/height,缩放到 170x133
      pcbSvg.setAttribute('viewBox', `0 0 ${PCB_VW} ${PCB_VH}`);
      pcbSvg.setAttribute('width', String(W));
      pcbSvg.setAttribute('height', String(H));
      pcbSvg.removeAttribute('x');
      pcbSvg.removeAttribute('y');
      pcbSvg.setAttribute('id', 'fritzing-uno-pcb');
      children.push(pcbSvg);

      // PCB 背景层(深蓝绿渐变,放在 pcb 后面,防止 silkscreen 透明区域露出 canvas 底色)
      children.unshift(
        svg('rect', {
          x: 0,
          y: 0,
          width: W,
          height: H,
          rx: 4,
          fill: 'var(--canvas-board-uno-pcb)',
          stroke: 'var(--canvas-board-edge)',
          'stroke-width': 1.5,
        }),
      );

      appendAll(g, children);
    },
  };
}

export const arduinoUno = makeArduinoUno();