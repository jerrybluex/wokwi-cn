import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Arduino UNO R3 — 严格按 Wokwi 真实视图 1:1 还原 (决策 12)。
 *
 * 真实 UNO R3 布局 (板子长边横向 W=170 H=133, 物理 68.6×53.4mm 比例 1.28):
 *   - USB 接头 顶部短边左突出 (银色金属壳)
 *   - POWER jack 黑色圆桶 顶部短边右侧
 *   - DIGITAL 14 针 (D0-D13) 顶部双排 header,从右到左
 *   - POWER 7 针 (IOREF/RESET/3V3/5V/GND/GND/Vin) 底部左侧横排
 *   - ANALOG 6 针 (A0-A5) 底部右侧横排 (POWER 旁边)
 *   - ATmega328P 黑色 DIP 28 针 中央
 *   - 16MHz 晶振 银色金属壳 ATmega 旁
 *   - L (黄) / TX / RX (绿) / ON (红) LED 指示灯
 *   - 复位按钮 黑色矩形 POWER jack 旁
 *   - ICSP header 2 个 6-pin 2x3 排列 板子右侧
 *   - "UNO ARDUINO" 文字标牌 中央
 *
 * 真图参考:https://wokwi.com/projects/new/arduino-uno
 */
const W = 170; // 板子长边 (横向)
const H = 133; // 板子短边 (纵向),约 W/1.28 (UNO R3 物理 1.28)

// DIGITAL 14 针 (顶部双排 header,从右到左 D13→D0)
// 真图布局:上排 D8-D13 + AREF/GND,下排 D0-D7 + GND
// pin id D0-D13 各占 14 个位置;AREF/GND 不进 pin 数组(决策 11 pin JSON 不动)
const DIG_TOP_Y = 14; // 上排 y (D8-D13)
const DIG_BOT_Y = 24; // 下排 y (D0-D7)
const DIG_X_START = 32; // 起点 (USB 旁)
const DIG_X_END = 150; // 终点 (POWER header 之前)
const DIG_GAP_X = (DIG_X_END - DIG_X_START) / 13; // 14 针 → 13 间距

// POWER 7 针 (底部左侧横排)
const POW_Y = H;
const POW_X_START = 16;
const POW_GAP_X = 18;

// ANALOG 6 针 (底部右侧横排,POWER 旁边)
const ANA_Y = H;
const ANA_X_START = 100;
const ANA_GAP_X = 11;

const DIGITAL_PINS = Array.from({ length: 14 }, (_, i) => i);
const ANALOG_PINS = Array.from({ length: 6 }, (_, i) => i);
// POWER 2 个 GND 用 id 区分 (visual label 都 'GND' 跟实物一致)
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
      // DIGITAL 14 针 — 顶部双排,从右到左 D13 → D0
      // 上排 D13-D8 (7 pin,DIG_TOP_Y),下排 D7-D0 (7 pin,DIG_BOT_Y)
      ...DIGITAL_PINS.map((i) => ({
        id: `D${i}`,
        // D0-D6 → 下排,D7-D13 → 上排
        x: DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X,
        y: i <= 6 ? DIG_BOT_Y : DIG_TOP_Y,
        label: `D${i}`,
      })),
      ...POWER_PINS.map((p, i) => ({
        id: p.id,
        x: POW_X_START + i * POW_GAP_X,
        y: POW_Y,
        label: p.label,
      })),
      ...ANALOG_PINS.map((i) => ({
        id: `A${i}`,
        x: ANA_X_START + i * ANA_GAP_X,
        y: ANA_Y,
        label: `A${i}`,
      })),
    ],
    defaultPinValues: { GND: 0 },
    render(g, _state) {
      const children: SVGElement[] = [];

      // PCB 主板 (Wokwi UNO 真实深蓝)
      children.push(
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

      // USB 接头 — 顶部短边左侧突出,银色金属壳
      children.push(
        svg('rect', {
          x: -22,
          y: 6,
          width: 22,
          height: 22,
          rx: 1,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      // USB 内层塑料
      children.push(
        svg('rect', {
          x: -18,
          y: 10,
          width: 14,
          height: 14,
          fill: 'var(--part-body-pit)',
        }),
      );

      // POWER jack — 顶部短边右侧,黑色圆桶
      children.push(
        svg('circle', {
          cx: -8,
          cy: 22,
          r: 6,
          fill: 'var(--part-jack)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      children.push(
        svg('circle', {
          cx: -8,
          cy: 22,
          r: 2.5,
          fill: 'var(--part-body-pit)',
        }),
      );

      // 复位按钮 — POWER jack 旁,黑色
      children.push(
        svg('rect', {
          x: 12,
          y: 12,
          width: 14,
          height: 10,
          rx: 1.5,
          fill: 'var(--part-body-deep)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );

      // DIGITAL pin 头 (顶部双排,7 + 7)
      DIGITAL_PINS.forEach((i) => {
        const y = i <= 6 ? DIG_BOT_Y : DIG_TOP_Y;
        const x = DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X;
        children.push(
          svg('rect', {
            x: x - 3,
            y: y - 1.5,
            width: 6,
            height: 3,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // POWER pin 头 (底部左侧,7 针横排)
      POWER_PINS.forEach((_, i) => {
        children.push(
          svg('rect', {
            x: POW_X_START + i * POW_GAP_X - 3,
            y: POW_Y - 3,
            width: 6,
            height: 3,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // ANALOG pin 头 (底部右侧,6 针横排)
      ANALOG_PINS.forEach((_, i) => {
        children.push(
          svg('rect', {
            x: ANA_X_START + i * ANA_GAP_X - 3,
            y: ANA_Y - 3,
            width: 6,
            height: 3,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // "DIGITAL (PWM~)" 标号 (在 DIGITAL header 下方)
      const digitalLabel = svg('text', {
        x: (DIG_X_START + DIG_X_END) / 2,
        y: 34,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 4,
      });
      digitalLabel.textContent = 'DIGITAL (PWM~)';
      children.push(digitalLabel);

      // "POWER" / "ANALOG IN" 标号 (在底部 header 上方)
      const powerLabel = svg('text', {
        x: POW_X_START + 3 * POW_GAP_X,
        y: POW_Y - 18,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 4,
      });
      powerLabel.textContent = 'POWER';
      children.push(powerLabel);
      const analogLabel = svg('text', {
        x: ANA_X_START + 2.5 * ANA_GAP_X,
        y: ANA_Y - 8,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 4,
      });
      analogLabel.textContent = 'ANALOG IN';
      children.push(analogLabel);

      // ATmega328P — 中央 DIP 28 针黑色
      children.push(
        svg('rect', {
          x: 50,
          y: 56,
          width: 60,
          height: 30,
          rx: 1,
          fill: 'var(--part-body-deep)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      // DIP 缺口标记 (左侧半圆)
      children.push(
        svg('circle', {
          cx: 56,
          cy: 63,
          r: 1.5,
          fill: 'var(--part-body-pit)',
        }),
      );

      // "UNO ARDUINO" 文字标牌 (板子中央)
      const brandText = svg('text', {
        x: W / 2,
        y: 80,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 6,
        'font-weight': '700',
      });
      brandText.textContent = 'UNO';
      children.push(brandText);
      const brandSubText = svg('text', {
        x: W / 2,
        y: 90,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 5,
      });
      brandSubText.textContent = 'ARDUINO';
      children.push(brandSubText);

      // 16MHz 晶振 — 银色金属壳,ATmega 旁
      children.push(
        svg('rect', {
          x: 118,
          y: 80,
          width: 16,
          height: 8,
          rx: 1,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );
      const xtalLabel = svg('text', {
        x: 126,
        y: 86,
        'text-anchor': 'middle',
        fill: 'var(--part-body-deep)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      xtalLabel.textContent = '16MHz';
      children.push(xtalLabel);

      // LED 指示灯
      // L (黄) 在板子底部中央
      children.push(
        svg('circle', { cx: 70, cy: 110, r: 2.5, fill: '#fbbf24' }),
      );
      const lLabel = svg('text', {
        x: 70,
        y: 120,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      lLabel.textContent = 'L';
      children.push(lLabel);
      // TX (绿)
      children.push(
        svg('circle', { cx: 80, cy: 110, r: 2, fill: '#3f8c6a' }),
      );
      const txLabel = svg('text', {
        x: 80,
        y: 122,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      txLabel.textContent = 'TX';
      children.push(txLabel);
      // RX (绿)
      children.push(
        svg('circle', { cx: 90, cy: 110, r: 2, fill: '#3f8c6a' }),
      );
      const rxLabel = svg('text', {
        x: 90,
        y: 122,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      rxLabel.textContent = 'RX';
      children.push(rxLabel);
      // ON (红) 在 POWER jack 旁
      children.push(
        svg('circle', { cx: 28, cy: 18, r: 1.8, fill: '#b85252' }),
      );
      const onLabel = svg('text', {
        x: 28,
        y: 27,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      onLabel.textContent = 'ON';
      children.push(onLabel);

      // ICSP header 1 — 板子右侧(PWM 区附近),6-pin 2x3
      const icsp1X = 142;
      const icsp1Y = 56;
      const icspPinR = 1.2;
      const icspPinGap = 4;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          children.push(
            svg('circle', {
              cx: icsp1X + col * icspPinGap,
              cy: icsp1Y + row * icspPinGap,
              r: icspPinR,
              fill: 'var(--part-chip-pin)',
            }),
          );
        }
      }

      // ICSP header 2 — 板子右侧(PWM 区附近,稍下)
      const icsp2X = 142;
      const icsp2Y = 70;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          children.push(
            svg('circle', {
              cx: icsp2X + col * icspPinGap,
              cy: icsp2Y + row * icspPinGap,
              r: icspPinR,
              fill: 'var(--part-chip-pin)',
            }),
          );
        }
      }

      // DIGITAL pin 标号 (顶部双排,标在 pin 头左侧)
      DIGITAL_PINS.forEach((i) => {
        const y = i <= 6 ? DIG_BOT_Y : DIG_TOP_Y;
        const x = DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X;
        const t = svg('text', {
          x: x,
          y: y - 3,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 3.5,
        });
        t.textContent = `D${i}`;
        children.push(t);
      });

      // POWER pin 标号 (底部)
      POWER_PINS.forEach((p, i) => {
        const t = svg('text', {
          x: POW_X_START + i * POW_GAP_X,
          y: POW_Y - 5,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 3.5,
        });
        t.textContent = p.label;
        children.push(t);
      });

      // ANALOG pin 标号 (底部)
      ANALOG_PINS.forEach((i) => {
        const t = svg('text', {
          x: ANA_X_START + i * ANA_GAP_X,
          y: ANA_Y - 5,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 3.5,
        });
        t.textContent = `A${i}`;
        children.push(t);
      });

      appendAll(g, children);
    },
  };
}

export const arduinoUno = makeArduinoUno();