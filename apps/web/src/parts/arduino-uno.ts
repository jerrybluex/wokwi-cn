import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Arduino UNO R3 — simulator's primary controller board.
 *
 * 严格 1:1 还原 Wokwi 真实 UNO R3 视觉 (决策 11,主理人 D15+ review):
 *   - 板子比例 ≈ 2:1.6,W=170 长边横向,H=136
 *   - PCB 色 #00979D (真实蓝绿,token --canvas-board-uno-pcb)
 *   - DIGITAL 14 针 (D0-D13) 板子右侧
 *   - POWER 7 针 (IOREF/RESET/3V3/5V/GND/GND2/Vin) 板子底边横排
 *   - ANALOG 6 针 (A0-A5) 板子左侧,POWER 上面分开
 *   - USB 接头 短边左侧突出,银色金属壳
 *   - POWER jack 黑色圆桶,在 USB 旁
 *   - ATmega328P DIP 28 针,中央偏下
 *   - 16MHz 晶振 银色,ATmega 旁
 *   - LED L (黄)/ TX / RX / ON (红) 指示灯
 *   - 复位按钮 黑色,POWER 上方
 *   - ICSP header 2 个 6-pin 2x3 排列
 */
const W = 170; // 板子长边 (横向)
const H = 136; // 板子短边 (纵向),约 W/1.25

// DIGITAL 14 针 (右侧)
const DIG_X = W;
const DIG_Y0 = 18;
const DIG_GAP = 8;

// POWER 7 针 (底边横排)
const POW_Y = H;
const POW_X0 = 4;
const POW_GAP_X = 22;

// ANALOG 6 针 (左侧,POWER 上面分开)
const ANA_X = 0;
const ANA_Y0 = 64;
const ANA_GAP = 10;

const DIGITAL_PINS = Array.from({ length: 14 }, (_, i) => i);
const ANALOG_PINS = Array.from({ length: 6 }, (_, i) => i);
// POWER 2 个 GND 用 id 区分,visual label 都 'GND' 跟实物一致
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
        x: POW_X0 + i * POW_GAP_X,
        y: POW_Y,
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

      // PCB 主板 (真实 UNO R3 蓝绿色)
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
      // PCB 内框装饰
      children.push(
        svg('rect', {
          x: 4,
          y: 4,
          width: W - 8,
          height: H - 8,
          rx: 2,
          fill: 'none',
          stroke: 'var(--canvas-board-deep)',
          'stroke-width': 0.5,
        }),
      );

      // USB 接头 (短边左侧突出,银色金属壳)
      children.push(
        svg('rect', {
          x: -22,
          y: 30,
          width: 22,
          height: 26,
          rx: 1,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      // USB 内层 (塑料,稍微突出)
      children.push(
        svg('rect', {
          x: -18,
          y: 34,
          width: 14,
          height: 18,
          rx: 0,
          fill: 'var(--part-body-pit)',
        }),
      );

      // POWER jack (黑色圆桶,在 USB 旁,板子外)
      children.push(
        svg('circle', {
          cx: -10,
          y: 16,
          r: 7,
          fill: 'var(--part-jack)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      // POWER jack 内孔 (黑色)
      children.push(
        svg('circle', {
          cx: -10,
          y: 16,
          r: 3,
          fill: 'var(--part-body-pit)',
        }),
      );

      // ATmega328P 芯片 (DIP 28 针,中央偏下,黑色)
      children.push(
        svg('rect', {
          x: 50,
          y: 56,
          width: 60,
          height: 26,
          rx: 1,
          fill: 'var(--part-body-deep)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      // ATmega 缺口 (左侧缺口标记 DIP 方向)
      children.push(
        svg('circle', {
          cx: 56,
          cy: 62,
          r: 1.5,
          fill: 'var(--part-body-pit)',
        }),
      );

      // 16MHz 晶振 (银色金属壳,在 ATmega 旁)
      children.push(
        svg('rect', {
          x: 120,
          y: 80,
          width: 14,
          height: 8,
          rx: 1,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );
      // 晶振文字
      const xtalLabel = svg('text', {
        x: 127,
        y: 86,
        'text-anchor': 'middle',
        fill: 'var(--part-body-deep)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 4,
      });
      xtalLabel.textContent = '16MHz';
      children.push(xtalLabel);

      // 复位按钮 (黑色矩形,POWER 上方)
      children.push(
        svg('rect', {
          x: 80,
          y: 14,
          width: 14,
          height: 10,
          rx: 1.5,
          fill: 'var(--part-body-deep)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );
      // 复位按钮红色内框
      children.push(
        svg('rect', {
          x: 82,
          y: 16,
          width: 10,
          height: 6,
          rx: 1,
          fill: '#b85252',
        }),
      );
      // RESET label
      const resetLabel = svg('text', {
        x: 87,
        y: 33,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 4,
      });
      resetLabel.textContent = 'RESET';
      children.push(resetLabel);

      // 数字 pin 头 (右侧,14 个小方块)
      DIGITAL_PINS.forEach((i) => {
        children.push(
          svg('rect', {
            x: W - 5,
            y: DIG_Y0 + i * DIG_GAP - 1.5,
            width: 8,
            height: 3,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // POWER pin 头 (底边,7 个)
      POWER_PINS.forEach((_, i) => {
        children.push(
          svg('rect', {
            x: POW_X0 + i * POW_GAP_X - 3,
            y: H - 3,
            width: 6,
            height: 3,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // ANALOG pin 头 (左侧,6 个)
      ANALOG_PINS.forEach((i) => {
        children.push(
          svg('rect', {
            x: -3,
            y: ANA_Y0 + i * ANA_GAP - 1.5,
            width: 6,
            height: 3,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // LED 指示灯 (TX / RX / L / ON)
      // L (黄色) 在 D13 旁
      children.push(
        svg('circle', {
          cx: 145,
          cy: 122,
          r: 2,
          fill: '#fbbf24',
        }),
      );
      const lLabel = svg('text', {
        x: 145,
        y: 132,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      lLabel.textContent = 'L';
      children.push(lLabel);
      // TX (绿)
      children.push(
        svg('circle', {
          cx: 152,
          cy: 26,
          r: 1.8,
          fill: '#3f8c6a',
        }),
      );
      // RX (绿)
      children.push(
        svg('circle', {
          cx: 158,
          cy: 26,
          r: 1.8,
          fill: '#3f8c6a',
        }),
      );
      // ON (红,POWER 旁)
      children.push(
        svg('circle', {
          cx: 100,
          cy: 16,
          r: 1.8,
          fill: '#b85252',
        }),
      );
      const onLabel = svg('text', {
        x: 100,
        y: 24,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      onLabel.textContent = 'ON';
      children.push(onLabel);

      // ICSP header 1 (ATmega 旁,6-pin 2x3)
      // 位置:ATmega 下方 (x=30, y=86)
      const icsp1X = 30;
      const icsp1Y = 86;
      const icspPinR = 1.2;
      const icspPinGap = 5;
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
      const icsp1Label = svg('text', {
        x: icsp1X + 5,
        y: icsp1Y + 16,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      icsp1Label.textContent = 'ICSP';
      children.push(icsp1Label);

      // ICSP header 2 (USB 旁,6-pin 2x3)
      const icsp2X = 14;
      const icsp2Y = 60;
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
      const icsp2Label = svg('text', {
        x: icsp2X + 5,
        y: icsp2Y + 16,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      icsp2Label.textContent = 'ICSP2';
      children.push(icsp2Label);

      // 板子中央 "ARDUINO UNO R3" 标号
      const boardLabel = svg('text', {
        x: W / 2,
        y: H - 8,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 5,
      });
      boardLabel.textContent = 'ARDUINO UNO R3';
      children.push(boardLabel);

      // ATmega328P 标号 (在芯片内)
      const atmega = svg('text', {
        x: 80,
        y: 71,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 5,
      });
      atmega.textContent = 'ATmega328P';
      children.push(atmega);

      // DIGITAL pin 标号 (在 pin 头左侧)
      DIGITAL_PINS.forEach((i) => {
        const t = svg('text', {
          x: W - 7,
          y: DIG_Y0 + i * DIG_GAP + 1,
          'text-anchor': 'end',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 4.5,
        });
        t.textContent = `D${i}`;
        children.push(t);
      });

      // POWER pin 标号 (在 pin 头上方)
      POWER_PINS.forEach((p, i) => {
        const t = svg('text', {
          x: POW_X0 + i * POW_GAP_X,
          y: H - 6,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 4.5,
        });
        t.textContent = p.label;
        children.push(t);
      });

      // ANALOG pin 标号 (在 pin 头右侧)
      ANALOG_PINS.forEach((i) => {
        const t = svg('text', {
          x: 5,
          y: ANA_Y0 + i * ANA_GAP + 1,
          'text-anchor': 'start',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 4.5,
        });
        t.textContent = `A${i}`;
        children.push(t);
      });

      appendAll(g, children);
    },
  };
}

export const arduinoUno = makeArduinoUno();