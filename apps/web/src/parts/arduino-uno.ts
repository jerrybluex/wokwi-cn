import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Arduino UNO R3 — simulator's primary controller board.
 *
 * 1:1 还原真实 UNO R3 (主理人 D15+ review):
 *   - DIGITAL 14 针 (D0-D13) — 板子右侧
 *   - POWER 7 针 (IOREF / RESET / 3V3 / 5V / GND / GND / Vin) — 板子左下
 *   - ANALOG 6 针 (A0-A5) — 板子左侧底部
 *   - 总 27 针
 */
const W = 220;
const H = 180;

const DIG_X = W;
const DIG_Y0 = 30;
const DIG_GAP = 8;

const POW_X = 0;
const POW_Y0 = 30;
const POW_GAP = 10;

const ANA_X = 0;
const ANA_Y0 = 110;
const ANA_GAP = 10;

const DIGITAL_PINS = Array.from({ length: 14 }, (_, i) => i);
const ANALOG_PINS = Array.from({ length: 6 }, (_, i) => i);
// UNO 真实布局有 2 个 GND (电气等价),但 pin id 必须唯一,
// 第 2 个用 'GND2',visual label 跟实物一致都显示 'GND'。
const POWER_PINS: { id: string; label: string }[] = [
  { id: 'IOREF', label: 'IOREF' },
  { id: 'RESET', label: 'RESET' },
  { id: '3V3', label: '3.3V' },
  { id: '5V', label: '5V' },
  { id: 'GND', label: 'GND' },
  { id: 'GND2', label: 'GND' },
  { id: 'Vin', label: 'Vin' },
];

function makeArduinoUno(): PartSpec {
  return {
    type: 'arduino-uno',
    displayName: 'Arduino UNO',
    width: W,
    height: H,
    pins: [
      ...DIGITAL_PINS.map((i) => ({
        id: `D${i}`,
        x: DIG_X,
        y: DIG_Y0 + i * DIG_GAP,
        label: `D${i}`,
      })),
      ...POWER_PINS.map((p, i) => ({
        id: p.id,
        x: POW_X,
        y: POW_Y0 + i * POW_GAP,
        label: p.label,
      })),
      ...ANALOG_PINS.map((i) => ({
        id: `A${i}`,
        x: ANA_X,
        y: ANA_Y0 + i * ANA_GAP,
        label: `A${i}`,
      })),
    ],
    defaultPinValues: { GND: 0 },
    render(g, _state) {
      const children: SVGElement[] = [];

      // PCB 主板 — UNO R3 真实 teal 蓝绿
      children.push(
        svg('rect', {
          x: 0,
          y: 0,
          width: W,
          height: H,
          rx: 4,
          fill: 'var(--canvas-board-uno)',
          stroke: 'var(--canvas-board-edge)',
          'stroke-width': 2,
        }),
      );
      // PCB 内框装饰
      children.push(
        svg('rect', {
          x: 6,
          y: 6,
          width: W - 12,
          height: H - 12,
          rx: 2,
          fill: 'none',
          stroke: 'var(--canvas-board-deep)',
          'stroke-width': 1,
        }),
      );

      // USB connector (左)
      children.push(
        svg('rect', {
          x: -18,
          y: 28,
          width: 18,
          height: 28,
          rx: 2,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1.5,
        }),
      );

      // Power jack (右上,UNO R3 圆口 DC jack)
      children.push(
        svg('rect', {
          x: W - 6,
          y: 14,
          width: 14,
          height: 12,
          rx: 1,
          fill: 'var(--part-jack)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );

      // ATmega328 chip (中央)
      children.push(
        svg('rect', {
          x: 80,
          y: 60,
          width: 60,
          height: 40,
          rx: 2,
          fill: 'var(--part-body-deep)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1.5,
        }),
      );

      // 数字 pin 头 (右侧,14 个)
      DIGITAL_PINS.forEach((i) => {
        children.push(
          svg('rect', {
            x: W - 6,
            y: DIG_Y0 + i * DIG_GAP - 2,
            width: 10,
            height: 4,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // POWER pin 头 (左侧,7 个)
      POWER_PINS.forEach((_, i) => {
        children.push(
          svg('rect', {
            x: -4,
            y: POW_Y0 + i * POW_GAP - 2,
            width: 10,
            height: 4,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // ANALOG pin 头 (左侧,6 个)
      ANALOG_PINS.forEach((i) => {
        children.push(
          svg('rect', {
            x: -4,
            y: ANA_Y0 + i * ANA_GAP - 2,
            width: 10,
            height: 4,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // Board label
      const boardLabel = svg('text', {
        x: W / 2,
        y: H - 6,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 9,
      });
      boardLabel.textContent = 'ARDUINO UNO R3';
      children.push(boardLabel);

      // ATmega 标号
      const atmega = svg('text', {
        x: 110,
        y: 78,
        'text-anchor': 'middle',
        fill: '#8AB4D8',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 8,
      });
      atmega.textContent = 'ATmega328';
      children.push(atmega);

      // 数字 pin 标号
      DIGITAL_PINS.forEach((i) => {
        const t = svg('text', {
          x: W - 10,
          y: DIG_Y0 + i * DIG_GAP + 1,
          'text-anchor': 'end',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 7,
        });
        t.textContent = `D${i}`;
        children.push(t);
      });

      // POWER pin 标号
      POWER_PINS.forEach((p, i) => {
        const t = svg('text', {
          x: 10,
          y: POW_Y0 + i * POW_GAP + 1,
          'text-anchor': 'start',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 7,
        });
        t.textContent = p.label;
        children.push(t);
      });

      // ANALOG pin 标号
      ANALOG_PINS.forEach((i) => {
        const t = svg('text', {
          x: 10,
          y: ANA_Y0 + i * ANA_GAP + 1,
          'text-anchor': 'start',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 7,
        });
        t.textContent = `A${i}`;
        children.push(t);
      });

      appendAll(g, children);
    },
  };
}

export const arduinoUno = makeArduinoUno();
