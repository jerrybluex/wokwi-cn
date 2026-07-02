import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Arduino UNO R3 — 按主理人物理真图逐像素换算 1:1 复刻(决策 12 v3)。
 *
 * 坐标换算:真图视觉 (1240x687 px,板子视觉 960x540 比例 1.78) → SVG 物理
 * (170x133 比例 1.28,实物 68.6×53.4mm 1:1)。每个元件 X 与 Y 独立换算:
 *   X_svg = (X_visual - 150) * 170 / 960
 *   Y_svg = (Y_visual - 120) * 133 / 540
 *
 * 真图 vs ebc876f 主要差异(本版逐个校正):
 *   - ON LED: ebc876f 偏左 50px → 真图右侧(板子右边缘)
 *   - ATmega: ebc876f w=36 → 真图 w=83(几乎占满右半中央)
 *   - ICSP 右下: ebc876f 偏左 40px → 真图右下角贴近右边缘
 *   - DIGITAL header: ebc876f 偏左 17px 且偏下 30px → 真图顶右半接近板子顶部
 *   - 元件整体: ebc876f 整体偏下 25-30px,真图元件稀疏铺满整个板子
 *
 * pin JSON 不动(决策 12 拍板):14 digital + 6 analog + 7 power = 27 针。
 * SCL/SDA/AREF/GND 4 pin 是 view-only 视觉(SVG 静态画)。
 *
 * 真图参考:/Users/wanghao/.mavis/uploads/1782979111314-image.png
 */
const W = 170;
const H = 133;

// 真图视觉起点偏移(板子在图中的左上角)
const VX0 = 150;
const VY0 = 120;
const VW = 960; // 板子视觉宽
const VH = 540; // 板子视觉高

/** 真图视觉坐标 → SVG 坐标(独立 X/Y 换算) */
function px2x(vx: number): number {
  return ((vx - VX0) * W) / VW;
}
function px2y(vy: number): number {
  return ((vy - VY0) * H) / VH;
}
function px2w(vw: number): number {
  return (vw * W) / VW;
}
function px2h(vh: number): number {
  return (vh * H) / VH;
}

// DIGITAL header(顶部右侧,14-pin 双排 D13-D0,真图距板子顶约 15px 视觉)
const DIG_TOP_Y = px2y(135); // 上排(约 3.7)
const DIG_BOT_Y = px2y(155); // 下排(约 8.6)
const DIG_X_START = px2x(645); // ≈ 87.9
const DIG_X_END = px2x(1095); // ≈ 167.2 → 收紧到 165
const DIG_GAP_X = (DIG_X_END - DIG_X_START) / 13;

// POWER header(底部中央,7 针横排,真图标 "POWER" 在上方)
const POW_Y = px2y(620); // ≈ 123
const POW_X_START = px2x(550); // ≈ 70.8
const POW_X_END = px2x(790); // ≈ 113.3 → 收紧
const POW_GAP_X = (POW_X_END - POW_X_START) / 6;

// ANALOG IN header(底部右侧,6 针横排)
const ANA_Y = px2y(620);
const ANA_X_START = px2x(820); // ≈ 118.7
const ANA_X_END = px2x(1020); // ≈ 154.2
const ANA_GAP_X = (ANA_X_END - ANA_X_START) / 5;

// SCL/SDA/AREF/GND 顶部左半 2x2(view-only)
const SCL_SDA_X = px2x(510); // ≈ 63.7
const SCL_SDA_Y = px2y(140); // ≈ 4.9
const SCL_SDA_W = px2w(60); // ≈ 10.6
const SCL_SDA_H = px2h(15); // ≈ 3.7
const SCL_SDA_GAP_X = px2w(30); // ≈ 5.3
const SCL_SDA_GAP_Y = px2h(35); // ≈ 8.6

// ICSP2(顶部中央 6-pin 2x3,AREF 旁)
const ICSP2_X = px2x(460);
const ICSP2_Y = px2y(215);

// ICSP 右下 6-pin 2x3
const ICSP_R_X = px2x(990);
const ICSP_R_Y = px2y(410);

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

      // PCB 主板 — 深青绿(真图视觉色)
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

      // USB 接头 — 左侧中部突出,银色方头
      const USB_X = px2x(230); // 14.1
      const USB_Y = px2y(310); // 46.8
      const USB_W = px2w(150); // 26.6
      const USB_H = px2h(130); // 32.0
      // USB 金属壳 — 突出左侧(银色)
      children.push(
        svg('rect', {
          x: USB_X - USB_W,
          y: USB_Y,
          width: USB_W,
          height: USB_H,
          rx: 1.5,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      // USB 内层塑料(深色凹陷)
      children.push(
        svg('rect', {
          x: USB_X - USB_W + 4,
          y: USB_Y + 12,
          width: USB_W - 8,
          height: USB_H - 24,
          fill: 'var(--part-body-pit)',
        }),
      );

      // DC 电源 jack — 左下角,黑色方块 + 中心圆孔
      const DC_X = px2x(230); // 14.1
      const DC_Y = px2y(540); // 103.4
      const DC_W = px2w(160); // 28.3
      const DC_H = px2h(90); // 22.2
      children.push(
        svg('rect', {
          x: DC_X,
          y: DC_Y,
          width: DC_W,
          height: DC_H,
          rx: 2,
          fill: 'var(--part-jack)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      // DC jack 中心圆孔
      children.push(
        svg('circle', {
          cx: DC_X + DC_W / 2,
          cy: DC_Y + DC_H / 2,
          r: px2w(20) / 2,
          fill: 'var(--part-body-pit)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );

      // 复位按钮 — 顶部左侧,银色金属外壳
      const RST_X = px2x(320); // 30.2
      const RST_Y = px2y(130); // 2.5
      const RST_W = px2w(90); // 15.9
      const RST_H = px2h(70); // 17.2
      children.push(
        svg('rect', {
          x: RST_X,
          y: RST_Y,
          width: RST_W,
          height: RST_H,
          rx: 2,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );
      // 红色按钮(居中)
      children.push(
        svg('circle', {
          cx: RST_X + RST_W / 2,
          cy: RST_Y + RST_H / 2,
          r: Math.min(RST_W, RST_H) / 3,
          fill: '#b85252',
        }),
      );

      // 16MHz 晶振 — 左下(USB 下方),银色金属壳
      const XTAL_X = px2x(350); // 35.4
      const XTAL_Y = px2y(450); // 81.3
      const XTAL_W = px2w(70); // 12.4
      const XTAL_H = px2h(40); // 9.8
      children.push(
        svg('rect', {
          x: XTAL_X,
          y: XTAL_Y,
          width: XTAL_W,
          height: XTAL_H,
          rx: 1.5,
          fill: 'var(--part-lead)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 0.5,
        }),
      );
      // 晶振文字
      const xtalLabel = svg('text', {
        x: XTAL_X + XTAL_W / 2,
        y: XTAL_Y + XTAL_H / 2 + 1.5,
        'text-anchor': 'middle',
        fill: 'var(--part-body-deep)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
        'font-weight': '700',
      });
      xtalLabel.textContent = '16MHz';
      children.push(xtalLabel);

      // ICSP2 — 顶部中央(AREF 旁)6-pin 2x3
      const icspPinR = 1.2;
      const icspPinGap = px2w(15); // ≈ 2.7
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          children.push(
            svg('circle', {
              cx: ICSP2_X + col * icspPinGap,
              cy: ICSP2_Y + row * icspPinGap,
              r: icspPinR,
              fill: 'var(--part-chip-pin)',
            }),
          );
        }
      }

      // SCL/SDA/AREF/GND 顶部左半 2x2(view-only 视觉装饰)
      // 真图布局:左半 SCL/SDA 上排 + AREF/GND 下排
      const sclGndXs = [SCL_SDA_X, SCL_SDA_X + SCL_SDA_GAP_X];
      const sclGndYs = [SCL_SDA_Y, SCL_SDA_Y + SCL_SDA_GAP_Y];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          children.push(
            svg('rect', {
              x: sclGndXs[col],
              y: sclGndYs[row],
              width: SCL_SDA_W,
              height: SCL_SDA_H,
              fill: 'var(--part-chip-pin)',
            }),
          );
        }
      }
      // SCL/SDA 标号(上排)
      const sclLabel = svg('text', {
        x: SCL_SDA_X,
        y: SCL_SDA_Y - 1.5,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      sclLabel.textContent = 'SCL';
      children.push(sclLabel);
      const sdaLabel = svg('text', {
        x: SCL_SDA_X + SCL_SDA_GAP_X,
        y: SCL_SDA_Y - 1.5,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      sdaLabel.textContent = 'SDA';
      children.push(sdaLabel);
      // AREF/GND 标号(下排)
      const arefLabel = svg('text', {
        x: SCL_SDA_X,
        y: SCL_SDA_Y + SCL_SDA_GAP_Y + SCL_SDA_H + 3,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      arefLabel.textContent = 'AREF';
      children.push(arefLabel);
      const gndLabel = svg('text', {
        x: SCL_SDA_X + SCL_SDA_GAP_X,
        y: SCL_SDA_Y + SCL_SDA_GAP_Y + SCL_SDA_H + 3,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      gndLabel.textContent = 'GND';
      children.push(gndLabel);

      // DIGITAL header 14 pin 双排(pin 头矩形)
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

      // L LED — 顶部中右(D13 旁)黄色
      children.push(
        svg('circle', { cx: px2x(560), cy: px2y(230), r: 1.5, fill: '#fbbf24' }),
      );
      const lLabel = svg('text', {
        x: px2x(560),
        y: px2y(225),
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
        'font-weight': '700',
      });
      lLabel.textContent = 'L';
      children.push(lLabel);

      // TX/RX LED — 中央偏左,两个绿色 LED 灯
      children.push(
        svg('circle', { cx: px2x(475), cy: px2y(265), r: 2, fill: '#3f8c6a' }),
        svg('circle', { cx: px2x(515), cy: px2y(265), r: 2, fill: '#3f8c6a' }),
      );
      const txLabel = svg('text', {
        x: px2x(475),
        y: px2y(285),
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      txLabel.textContent = 'TX';
      children.push(txLabel);
      const rxLabel = svg('text', {
        x: px2x(515),
        y: px2y(285),
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      rxLabel.textContent = 'RX';
      children.push(rxLabel);

      // ON LED — 右侧(标牌右侧板子边缘)
      children.push(
        svg('circle', { cx: px2x(1040), cy: px2y(305), r: 2, fill: '#3f8c6a' }),
      );
      const onLabel = svg('text', {
        x: px2x(1040),
        y: px2y(325),
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3,
      });
      onLabel.textContent = 'ON';
      children.push(onLabel);

      // ATmega328P-AU — 右中下,水平长条(占板子右半中央,几乎横跨)
      const ATM_X = px2x(580); // 76.1
      const ATM_Y = px2y(470); // 86.3
      const ATM_W = px2w(470); // 83.2
      const ATM_H = px2h(110); // 27.1
      children.push(
        svg('rect', {
          x: ATM_X,
          y: ATM_Y,
          width: ATM_W,
          height: ATM_H,
          rx: 1.5,
          fill: 'var(--part-body-deep)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1,
        }),
      );
      // ATmega 标号(居中)
      const atmegaLabel = svg('text', {
        x: ATM_X + ATM_W / 2,
        y: ATM_Y + ATM_H / 2 + 4,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 7,
        'font-weight': '700',
      });
      atmegaLabel.textContent = 'ATmega328P-AU';
      children.push(atmegaLabel);

      // ICSP 右下 — 6-pin 2x3(贴近板子右下角)
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          children.push(
            svg('circle', {
              cx: ICSP_R_X + col * icspPinGap,
              cy: ICSP_R_Y + row * icspPinGap,
              r: icspPinR,
              fill: 'var(--part-chip-pin)',
            }),
          );
        }
      }

      // "∞ UNO Arduino" 标牌 — 正中(三行,∞ + UNO + Arduino)
      const INF_X = px2x(780); // ≈ 111.5
      const INF_Y = px2y(265); // ≈ 35.7
      const INF_SIZE = px2w(40); // ≈ 7.1
      const infinityLabel = svg('text', {
        x: INF_X,
        y: INF_Y,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': INF_SIZE * 1.5,
        'font-weight': '700',
      });
      infinityLabel.textContent = '∞';
      children.push(infinityLabel);
      const unoLabel = svg('text', {
        x: INF_X + px2w(50),
        y: INF_Y,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': INF_SIZE * 1.2,
        'font-weight': '700',
      });
      unoLabel.textContent = 'UNO';
      children.push(unoLabel);
      const arduinoLabel = svg('text', {
        x: INF_X + px2w(60),
        y: INF_Y + px2h(40) + 4,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': INF_SIZE,
      });
      arduinoLabel.textContent = 'Arduino';
      children.push(arduinoLabel);

      // POWER pin 头(底部中央,7 针横排)
      POWER_PINS.forEach((_, i) => {
        children.push(
          svg('rect', {
            x: POW_X_START + i * POW_GAP_X - 2,
            y: POW_Y + 5,
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
            y: ANA_Y + 5,
            width: 4,
            height: 2,
            fill: 'var(--part-chip-pin)',
          }),
        );
      });

      // "POWER" 标号
      const powerLabel = svg('text', {
        x: POW_X_START + (POW_X_END - POW_X_START) / 2,
        y: POW_Y - 3,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      powerLabel.textContent = 'POWER';
      children.push(powerLabel);
      // "ANALOG IN" 标号
      const analogLabel = svg('text', {
        x: ANA_X_START + (ANA_X_END - ANA_X_START) / 2,
        y: ANA_Y - 3,
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
        y: DIG_BOT_Y + 10,
        'text-anchor': 'middle',
        fill: 'var(--canvas-text)',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
      });
      digitalLabel.textContent = 'DIGITAL (PWM~)';
      children.push(digitalLabel);

      // DIGITAL pin 标号
      DIGITAL_PINS.forEach((i) => {
        const y = i <= 6 ? DIG_BOT_Y : DIG_TOP_Y;
        const x = DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X;
        const t = svg('text', {
          x,
          y: y + 6,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.8,
        });
        t.textContent = i === 0 ? 'RX(0)' : i === 1 ? 'TX(1)' : `${i}`;
        children.push(t);
      });

      // POWER pin 标号
      POWER_PINS.forEach((p, i) => {
        const t = svg('text', {
          x: POW_X_START + i * POW_GAP_X,
          y: POW_Y + 12,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.8,
        });
        t.textContent = p.label;
        children.push(t);
      });

      // ANALOG pin 标号
      ANALOG_PINS.forEach((i) => {
        const t = svg('text', {
          x: ANA_X_START + i * ANA_GAP_X,
          y: ANA_Y + 12,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.8,
        });
        t.textContent = `A${i}`;
        children.push(t);
      });

      appendAll(g, children);
    },
  };
}

export const arduinoUno = makeArduinoUno();