import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Arduino UNO R3 — 严格按主理人真图(物理 Arduino UNO R3 板)1:1 还原(决策 12)。
 *
 * 真图 layout(板子 W=170 H=133,物理 68.6×53.4mm 1:1 比例 1.28):
 *   - PCB 深蓝绿(Wokwi UNO 实际色)
 *   - USB 接头 左侧顶部突出 (银色方头 22x15)
 *   - DC 电源 jack 左下角 (黑色方块 17x13,不是圆桶!)
 *   - 复位按钮 顶部左侧 (银色金属外壳 + 红色按钮)
 *   - 16MHz 晶振 左下 (银色金属壳卧式 10x8)
 *   - ICSP2 顶部中右(AREF 旁)6-pin 2x3
 *   - SCL/SDA/AREF/GND 顶部左半 4-pin 2x2(view-only 视觉装饰)
 *   - DIGITAL header 顶部右半 14-pin 双排 D13-D8 上 / D7-D0 下
 *   - L LED 顶部中右(D13 旁)黄色
 *   - TX/RX LED 中央偏左 绿色双 LED
 *   - ON LED 右侧(ATmega 旁)绿色
 *   - ICSP 右下(ATmega 旁)6-pin 2x3
 *   - ATmega328P-AU 右中下 黑色长条(水平 SMD 风格,不是 DIP)
 *   - "∞ UNO Arduino" 标牌 正中
 *   - POWER header 7 针 底部中央横排
 *   - ANALOG IN 6 针 底部右侧横排
 *
 * pin JSON 不动(决策 12 拍板):14 digital + 6 analog + 7 power = 27 针。
 * SCL/SDA/AREF/GND 4 pin 是 view-only 视觉(SVG 静态画),不进 SPEC.pins,不连 wire。
 *
 * 真图参考:主理人发的物理 Arduino UNO R3 板带引脚标注标准图
 * (/Users/wanghao/.mavis/uploads/1782979111314-image.png)。
 */
const W = 170;
const H = 133;

// DIGITAL header 右半(顶部,14-pin 双排 D13-D0)
// 上排 y=32:D13 D12 D11 D10 D9 D8(从右到左,D13 在最右)
// 下排 y=44:D7 D6 D5 D4 D3 D2 TX(D1) RX(D0)(从右到左,D0/RX 在最左)
const DIG_TOP_Y = 32;
const DIG_BOT_Y = 44;
const DIG_X_START = 70; // 起点(SCL/SDA/AREF/GND 左半之后)
const DIG_X_END = 165; // 终点(板子右边缘内)
const DIG_GAP_X = (DIG_X_END - DIG_X_START) / 13; // 14 针 → 13 间距 ≈ 7.3

// POWER header(底部中央,7 针横排)
const POW_Y = 120;
const POW_X_START = 56;
const POW_GAP_X = 4.8;

// ANALOG IN header(底部右侧,6 针横排)
const ANA_Y = 120;
const ANA_X_START = 90;
const ANA_GAP_X = 5;

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

function makeArduinoUno(): PartSpec {
  return {
    type: 'arduino-uno',
    displayName: 'Arduino UNO',
    width: W,
    height: H,
    pins: [
      // DIGITAL 14 针 — 顶部双排,从右到左 D13 → D0
      ...DIGITAL_PINS.map((i) => ({
        id: `D${i}`,
        // D0-D6 → 下排(y=44),D7-D13 → 上排(y=32)
        x: DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X,
        y: i <= 6 ? DIG_BOT_Y : DIG_TOP_Y,
        label: `D${i}`,
      })),
      // POWER 7 针 — 底部中央横排
      ...POWER_PINS.map((p, i) => ({
        id: p.id,
        x: POW_X_START + i * POW_GAP_X,
        y: POW_Y,
        label: p.label,
      })),
      // ANALOG 6 针 — 底部右侧横排
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

      // PCB 主板 — 深蓝绿
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

      // USB 接头 — 左侧顶部突出,银色方头
      children.push(
        svg('rect', {
          x: -22,
          y: 80,
          width: 22,
          height: 15,
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
          y: 84,
          width: 14,
          height: 7,
          fill: 'var(--part-body-pit)',
        }),
      );

      // DC 电源 jack — 左下角,黑色方块(不是圆桶!)
      children.push(
        svg('rect', {
          x: 15,
          y: 110,
          width: 17,
          height: 13,
          rx: 1.5,
          fill: 'var(--part-jack)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      // DC jack 中心圆孔
      children.push(
        svg('circle', {
          cx: 23.5,
          cy: 116.5,
          r: 3,
          fill: 'var(--part-body-pit)',
        }),
      );

      // 复位按钮 — 顶部左侧,银色金属外壳 + 红色按钮
      children.push(
        svg('rect', {
          x: 28,
          y: 30,
          width: 12,
          height: 14,
          rx: 1.5,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );
      // 红色按钮
      children.push(
        svg('circle', { cx: 34, cy: 37, r: 2.5, fill: '#b85252' }),
      );

      // 16MHz 晶振 — 左下,银色金属壳卧式
      children.push(
        svg('rect', {
          x: 33,
          y: 108,
          width: 10,
          height: 8,
          rx: 1,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );

      // ICSP2 — 顶部中央(AREF 旁)6-pin 2x3
      const icsp2X = 42;
      const icsp2Y = 50;
      const icspPinR = 1;
      const icspPinGap = 3.2;
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

      // SCL/SDA/AREF/GND 2x2(view-only 视觉装饰)
      // 上排 SCL SDA,下排 AREF GND
      children.push(
        svg('rect', { x: 52, y: 32, width: 2.5, height: 2, fill: 'var(--part-chip-pin)' }),
        svg('rect', { x: 56, y: 32, width: 2.5, height: 2, fill: 'var(--part-chip-pin)' }),
        svg('rect', { x: 52, y: 38, width: 2.5, height: 2, fill: 'var(--part-chip-pin)' }),
        svg('rect', { x: 56, y: 38, width: 2.5, height: 2, fill: 'var(--part-chip-pin)' }),
      );
      // SCL/SDA/AREF/GND 标号
      const sdaLabel = svg('text', {
        x: 55.5,
        y: 45,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.5,
      });
      sdaLabel.textContent = 'SCL SDA';
      children.push(sdaLabel);
      const arefLabel = svg('text', {
        x: 55.5,
        y: 50,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.5,
      });
      arefLabel.textContent = 'AREF GND';
      children.push(arefLabel);

      // DIGITAL header 14 pin 双排
      DIGITAL_PINS.forEach((i) => {
        const y = i <= 6 ? DIG_BOT_Y : DIG_TOP_Y;
        const x = DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X;
        children.push(
          svg('rect', {
            x: x - 2.5,
            y: y - 1,
            width: 5,
            height: 2,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // L LED — 顶部中右(D13 旁)
      children.push(
        svg('circle', { cx: 64, cy: 52, r: 1.5, fill: '#fbbf24' }),
      );
      const lLabel = svg('text', {
        x: 64,
        y: 60,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      lLabel.textContent = 'L';
      children.push(lLabel);

      // TX/RX LED — 中央偏左
      children.push(
        svg('rect', { x: 44, y: 60, width: 3, height: 5, fill: 'var(--part-body-deep)' }),
        svg('rect', { x: 50, y: 60, width: 3, height: 5, fill: 'var(--part-body-deep)' }),
      );
      const txLabel = svg('text', {
        x: 45.5,
        y: 70,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      txLabel.textContent = 'TX';
      children.push(txLabel);
      const rxLabel = svg('text', {
        x: 51.5,
        y: 70,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      rxLabel.textContent = 'RX';
      children.push(rxLabel);

      // ON LED — 右侧(ATmega 旁)
      children.push(
        svg('circle', { cx: 102, cy: 100, r: 1.5, fill: '#3f8c6a' }),
      );
      const onLabel = svg('text', {
        x: 102,
        y: 107,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      onLabel.textContent = 'ON';
      children.push(onLabel);

      // ATmega328P-AU — 右中下,黑色长条(SMD 风格,不是 DIP)
      children.push(
        svg('rect', {
          x: 62,
          y: 92,
          width: 36,
          height: 12,
          rx: 1,
          fill: 'var(--part-body-deep)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );
      // ATmega 标号
      const atmegaLabel = svg('text', {
        x: 80,
        y: 100,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      atmegaLabel.textContent = 'ATmega328P';
      children.push(atmegaLabel);

      // ICSP — 右下(ATmega 旁)6-pin 2x3
      const icspX = 110;
      const icspY = 95;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          children.push(
            svg('circle', {
              cx: icspX + col * icspPinGap,
              cy: icspY + row * icspPinGap,
              r: icspPinR,
              fill: 'var(--part-chip-pin)',
            }),
          );
        }
      }

      // "∞ UNO Arduino" 标牌 — 正中
      const infinityLabel = svg('text', {
        x: 80,
        y: 65,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 10,
        'font-weight': '700',
      });
      infinityLabel.textContent = '∞';
      children.push(infinityLabel);
      const unoLabel = svg('text', {
        x: 80,
        y: 78,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 7,
        'font-weight': '700',
      });
      unoLabel.textContent = 'UNO';
      children.push(unoLabel);
      const arduinoLabel = svg('text', {
        x: 80,
        y: 86,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 4,
      });
      arduinoLabel.textContent = 'Arduino';
      children.push(arduinoLabel);

      // POWER pin 头(底部中央,7 针横排)
      POWER_PINS.forEach((_, i) => {
        children.push(
          svg('rect', {
            x: POW_X_START + i * POW_GAP_X - 2,
            y: POW_Y + 6,
            width: 4,
            height: 2,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // ANALOG pin 头(底部右侧,6 针横排)
      ANALOG_PINS.forEach((_, i) => {
        children.push(
          svg('rect', {
            x: ANA_X_START + i * ANA_GAP_X - 2,
            y: ANA_Y + 6,
            width: 4,
            height: 2,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // "POWER" 标号
      const powerLabel = svg('text', {
        x: POW_X_START + 3 * POW_GAP_X,
        y: POW_Y - 2,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      powerLabel.textContent = 'POWER';
      children.push(powerLabel);
      // "ANALOG IN" 标号
      const analogLabel = svg('text', {
        x: ANA_X_START + 2.5 * ANA_GAP_X,
        y: ANA_Y - 2,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      analogLabel.textContent = 'ANALOG IN';
      children.push(analogLabel);

      // "DIGITAL (PWM~)" 标号
      const digitalLabel = svg('text', {
        x: (DIG_X_START + DIG_X_END) / 2,
        y: 55,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      digitalLabel.textContent = 'DIGITAL (PWM~)';
      children.push(digitalLabel);

      // DIGITAL pin 标号(顶部双排)
      DIGITAL_PINS.forEach((i) => {
        const y = i <= 6 ? DIG_BOT_Y : DIG_TOP_Y;
        const x = DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X;
        const t = svg('text', {
          x,
          y: y + 8,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.5,
        });
        t.textContent = i === 0 ? 'RX0' : i === 1 ? 'TX0' : `${i}`;
        children.push(t);
      });

      // POWER pin 标号(底部)
      POWER_PINS.forEach((p, i) => {
        const t = svg('text', {
          x: POW_X_START + i * POW_GAP_X,
          y: POW_Y + 12,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.5,
        });
        t.textContent = p.label;
        children.push(t);
      });

      // ANALOG pin 标号(底部)
      ANALOG_PINS.forEach((i) => {
        const t = svg('text', {
          x: ANA_X_START + i * ANA_GAP_X,
          y: ANA_Y + 12,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.5,
        });
        t.textContent = `A${i}`;
        children.push(t);
      });

      appendAll(g, children);
    },
  };
}

export const arduinoUno = makeArduinoUno();