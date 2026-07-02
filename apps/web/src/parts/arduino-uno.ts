import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Arduino UNO R3 — 严格按 AI 实物图 1:1 复刻(决策 15)。
 *
 * AI 图参考:/Volumes/MOVESPEED/Dev/wokwi-cn/docs/reference/arduino-uno-real-AI.png
 * (1920x1434 px,板子视觉 1300x1110 比例 1.17,实物 68.6×53.4mm 1.28 比例 1:1)
 *
 * 视觉换算:AI 图 板子视觉 1300x1110 → SVG 物理 170x133 (1.28 实物 1:1)
 *   X_svg = (X_visual - 320) * 170 / 1300
 *   Y_svg = (Y_visual - 80) * 133 / 1110
 *
 * 关键修正(跟 98561ec 比):
 *   - DC jack:梯形 path → 黑色圆桶(AI 图实物是圆桶,不是梯形)
 *   - 加 2 个 DC 圆桶电容器(标 "17 6.3V" 100uF 6.3V)
 *   - SCL/SDA/AREF/GND:4 个独立焊盘 → 2x3 黑色塑料座(AI 图是 6 pin 座)
 *   - 加 ICSP 第二个(右侧 ON LED 旁,AI 图实物 2 个 ICSP)
 *   - 加回 16MHz 文字(AI 图实物有 "16MHz" silkscreen)
 *   - 标牌 'Arduino™' → 'Arduino®'(AI 图实物 ®)
 *   - 加 USB / RESET silkscreen 文字
 *   - L LED 挪到 DIGITAL 下方中央(AI 图实物 L 标)
 *
 * pin JSON 不动(决策 12 拍板):14 digital + 6 analog + 7 power = 27 针。
 * SCL/SDA/AREF/GND 2x3 黑色塑料座作为 view-only 视觉装饰(不进 SPEC.pins)。
 */
const W = 170;
const H = 133;

// 实物 1.28 比例换算(板子视觉 1300x1110 → SVG 170x133)
const VX0 = 320; // AI 图板子视觉 X 起点
const VY0 = 80; // AI 图板子视觉 Y 起点
const VW = 1300; // AI 图板子视觉宽
const VH = 1110; // AI 图板子视觉高

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

// DIGITAL header(顶部右半,14-pin 单排长 header,AI 图实物是单排 14 针 + 标号 "13 12 11 10 9 8 7 6 5 4 3 2 TX 1 RX 0")
const DIG_Y = px2y(140);
const DIG_X_START = px2x(620);
const DIG_X_END = px2x(1610);
const DIG_GAP_X = (DIG_X_END - DIG_X_START) / 13;

// POWER header(底部偏左,7 针黑色塑料)
const POW_Y = px2y(1130);
const POW_X_START = px2x(550);
const POW_X_END = px2x(1080);
const POW_GAP_X = (POW_X_END - POW_X_START) / 6;

// ANALOG IN header(底部偏右,6 针黑色塑料)
const ANA_Y = px2y(1130);
const ANA_X_START = px2x(1200);
const ANA_X_END = px2x(1610);
const ANA_GAP_X = (ANA_X_END - ANA_X_START) / 5;

// SCL/SDA/AREF/GND 2x3 黑色塑料座(顶部左半,AI 图实物 6 pin)
const SCL_SDA_X = px2x(470);
const SCL_SDA_Y = px2y(140);
const SCL_SDA_W = px2w(110);
const SCL_SDA_H = px2h(90);

// ICSP 1 — 左下 USB 旁(2x3 6 pin 黑色塑料)
const ICSP1_X = px2x(440);
const ICSP1_Y = px2y(720);

// ICSP 2 — 右侧 ON LED 旁(2x3 6 pin 黑色塑料)
const ICSP2_X = px2x(1610);
const ICSP2_Y = px2y(470);

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
      // DIGITAL 14 针 — 顶部单排,从右到左 D13 → D0
      ...DIGITAL_PINS.map((i) => ({
        id: `D${i}`,
        x: DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X,
        y: DIG_Y,
        label: `D${i}`,
      })),
      // POWER 7 针 — 底边左侧横排
      ...POWER_PINS.map((p, i) => ({
        id: p.id,
        x: POW_X_START + i * POW_GAP_X,
        y: POW_Y,
        label: p.label,
      })),
      // ANALOG 6 针 — 底边右侧横排
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

      // SVG defs — PCB 渐变(海军蓝 #00538a → #002d54)
      const defs = svg('defs', {});
      const grad = svg('linearGradient', {
        id: 'pcbGrad-uno',
        x1: '0%',
        y1: '0%',
        x2: '100%',
        y2: '100%',
      });
      grad.appendChild(svg('stop', { offset: '0%', 'stop-color': '#00538a' }));
      grad.appendChild(svg('stop', { offset: '100%', 'stop-color': '#002d54' }));
      defs.appendChild(grad);
      children.push(defs);

      // PCB 主板 — 渐变海军蓝 + 右下角圆弧切角
      const PCB_CUT_R = 8;
      children.push(
        svg('path', {
          d: `M 0 0 L ${W} 0 L ${W} ${H - PCB_CUT_R} A ${PCB_CUT_R} ${PCB_CUT_R} 0 0 1 ${W - PCB_CUT_R} ${H} L 0 ${H} Z`,
          fill: 'url(#pcbGrad-uno)',
          stroke: '#007ecc',
          'stroke-width': 1.2,
        }),
      );

      // 4 角安装孔(借鉴 reference 金边 r=14 风格,缩到 r=2)
      const MOUNT_R = 2;
      const MOUNT_MARGIN = 4;
      [
        { x: MOUNT_MARGIN, y: MOUNT_MARGIN },
        { x: W - MOUNT_MARGIN, y: MOUNT_MARGIN },
        { x: MOUNT_MARGIN, y: H - MOUNT_MARGIN },
        { x: W - MOUNT_MARGIN - 4, y: H - MOUNT_MARGIN - 4 },
      ].forEach((p) => {
        children.push(svg('circle', { cx: p.x, cy: p.y, r: MOUNT_R, fill: '#0a0a0a' }));
        children.push(
          svg('circle', {
            cx: p.x,
            cy: p.y,
            r: MOUNT_R + 0.6,
            fill: 'none',
            stroke: '#ffd700',
            'stroke-width': 0.5,
          }),
        );
      });

      // USB 接头 — 左侧中部突出,银色方头(AI 图实物)
      const USB_X = px2x(50);
      const USB_Y = px2y(350);
      const USB_W = px2w(230);
      const USB_H = px2h(230);
      children.push(
        svg('rect', {
          x: -USB_W,
          y: USB_Y,
          width: USB_W,
          height: USB_H,
          rx: 2,
          fill: '#d0d0d0',
          stroke: '#888',
          'stroke-width': 1,
        }),
      );
      // USB 内层深色凹陷
      children.push(
        svg('rect', {
          x: -USB_W + 6,
          y: USB_Y + 30,
          width: USB_W - 12,
          height: USB_H - 60,
          fill: '#222',
        }),
      );
      // USB 内层金属壳
      children.push(
        svg('rect', {
          x: -USB_W + 18,
          y: USB_Y + 60,
          width: USB_W - 36,
          height: USB_H - 120,
          rx: 1,
          fill: '#b8b8b8',
        }),
      );
      // USB silkscreen 文字
      const usbLabel = svg('text', {
        x: USB_X + USB_W / 2,
        y: USB_Y + USB_H + 8,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
        'font-weight': '700',
      });
      usbLabel.textContent = 'USB';
      children.push(usbLabel);

      // DC 电源 jack — 左下角,黑色圆桶(AI 图实物是圆桶,不是梯形!)
      const DC_X = px2x(150);
      const DC_Y = px2y(1000);
      const DC_R = px2w(80);
      children.push(
        svg('circle', {
          cx: DC_X,
          cy: DC_Y,
          r: DC_R,
          fill: '#1a1a1a',
          stroke: '#000',
          'stroke-width': 1,
        }),
      );
      // DC jack 中心圆孔
      children.push(
        svg('circle', {
          cx: DC_X,
          cy: DC_Y,
          r: DC_R * 0.45,
          fill: '#0a0a0a',
          stroke: '#444',
          'stroke-width': 0.5,
        }),
      );

      // 2 个 DC 圆桶电容器(AI 图实物标 "17 6.3V" 100uF 6.3V)
      const DC_CAP_R = px2w(60);
      [
        { cx: px2x(520), cy: px2y(1030) },
        { cx: px2x(640), cy: px2y(1030) },
      ].forEach((p) => {
        // 外圆(银色顶)
        children.push(
          svg('circle', {
            cx: p.cx,
            cy: p.cy,
            r: DC_CAP_R,
            fill: '#888',
            stroke: '#444',
            'stroke-width': 0.5,
          }),
        );
        // 内圆(深色)
        children.push(
          svg('circle', {
            cx: p.cx,
            cy: p.cy,
            r: DC_CAP_R * 0.85,
            fill: '#222',
            stroke: '#666',
            'stroke-width': 0.3,
          }),
        );
        // 十字凹槽
        children.push(
          svg('path', {
            d: `M ${p.cx - DC_CAP_R * 0.5} ${p.cy} L ${p.cx + DC_CAP_R * 0.5} ${p.cy} M ${p.cx} ${p.cy - DC_CAP_R * 0.5} L ${p.cx} ${p.cy + DC_CAP_R * 0.5}`,
            stroke: '#666',
            'stroke-width': 0.4,
            fill: 'none',
          }),
        );
        // "17 6.3V" silkscreen 文字
        const capLabel = svg('text', {
          x: p.cx,
          y: p.cy + DC_CAP_R + 5,
          'text-anchor': 'middle',
          fill: '#ffffff',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.2,
          'font-weight': '700',
        });
        capLabel.textContent = '17 6.3V';
        children.push(capLabel);
      });

      // 复位按钮 — 顶部左侧,圆角矩形金属外壳 + 棕红按钮
      const RST_X = px2x(310);
      const RST_Y = px2y(110);
      const RST_W = px2w(90);
      const RST_H = px2h(110);
      children.push(
        svg('rect', {
          x: RST_X,
          y: RST_Y,
          width: RST_W,
          height: RST_H,
          rx: 4,
          fill: '#ccc',
          stroke: '#888',
          'stroke-width': 0.5,
        }),
      );
      children.push(
        svg('circle', {
          cx: RST_X + RST_W / 2,
          cy: RST_Y + RST_H / 2,
          r: Math.min(RST_W, RST_H) / 3,
          fill: '#d9534f',
        }),
      );
      // "RESET" silkscreen 文字
      const rstLabel = svg('text', {
        x: RST_X + RST_W / 2,
        y: RST_Y + RST_H + 6,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.8,
        'font-weight': '700',
      });
      rstLabel.textContent = 'RESET';
      children.push(rstLabel);

      // 16MHz 晶振 — 左中(USB 下方),银色金属壳卧式 + "16MHz" silkscreen
      const XTAL_X = px2x(550);
      const XTAL_Y = px2y(770);
      const XTAL_W = px2w(180);
      const XTAL_H = px2h(60);
      children.push(
        svg('rect', {
          x: XTAL_X,
          y: XTAL_Y,
          width: XTAL_W,
          height: XTAL_H,
          rx: 12,
          fill: '#888',
          stroke: '#555',
          'stroke-width': 0.5,
        }),
      );
      // 16MHz silkscreen 文字
      const xtalLabel = svg('text', {
        x: XTAL_X + XTAL_W / 2,
        y: XTAL_Y + XTAL_H / 2 + 2,
        'text-anchor': 'middle',
        fill: '#222',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.5,
        'font-weight': '700',
      });
      xtalLabel.textContent = '16MHz';
      children.push(xtalLabel);

      // ICSP 1 — 左下 USB 旁(2x3 6 pin 黑色塑料座)
      const icspPinR = 1.1;
      const icspPinGap = px2w(20);
      const icspRectW = icspPinGap * 2 + 6;
      const icspRectH = icspPinGap * 2 + 6;
      // 黑色塑料 rect 底座
      children.push(
        svg('rect', {
          x: ICSP1_X - 3,
          y: ICSP1_Y - 3,
          width: icspRectW,
          height: icspRectH,
          rx: 1,
          fill: '#0a0a0a',
          stroke: '#000',
          'stroke-width': 0.3,
        }),
      );
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          children.push(
            svg('circle', {
              cx: ICSP1_X + col * icspPinGap,
              cy: ICSP1_Y + row * icspPinGap,
              r: icspPinR,
              fill: '#ffd700',
              stroke: '#222',
              'stroke-width': 0.2,
            }),
          );
        }
      }
      // ICSP 1 文字
      const icsp1Label = svg('text', {
        x: ICSP1_X + icspRectW / 2,
        y: ICSP1_Y + icspRectH + 5,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.5,
        'font-weight': '700',
      });
      icsp1Label.textContent = 'ICSP';
      children.push(icsp1Label);

      // ICSP 2 — 右侧 ON LED 旁(2x3 6 pin 黑色塑料座)
      children.push(
        svg('rect', {
          x: ICSP2_X - 3,
          y: ICSP2_Y - 3,
          width: icspRectW,
          height: icspRectH,
          rx: 1,
          fill: '#0a0a0a',
          stroke: '#000',
          'stroke-width': 0.3,
        }),
      );
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          children.push(
            svg('circle', {
              cx: ICSP2_X + col * icspPinGap,
              cy: ICSP2_Y + row * icspPinGap,
              r: icspPinR,
              fill: '#ffd700',
              stroke: '#222',
              'stroke-width': 0.2,
            }),
          );
        }
      }
      const icsp2Label = svg('text', {
        x: ICSP2_X + icspRectW / 2,
        y: ICSP2_Y + icspRectH + 5,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.5,
        'font-weight': '700',
      });
      icsp2Label.textContent = 'ICSP';
      children.push(icsp2Label);

      // SCL/SDA/AREF/GND 2x3 黑色塑料座(顶部左半,AI 图实物 6 pin)
      children.push(
        svg('rect', {
          x: SCL_SDA_X - 3,
          y: SCL_SDA_Y - 3,
          width: icspRectW,
          height: icspRectH,
          rx: 1,
          fill: '#0a0a0a',
          stroke: '#000',
          'stroke-width': 0.3,
        }),
      );
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          children.push(
            svg('circle', {
              cx: SCL_SDA_X + col * icspPinGap,
              cy: SCL_SDA_Y + row * icspPinGap,
              r: icspPinR,
              fill: '#ffd700',
              stroke: '#222',
              'stroke-width': 0.2,
            }),
          );
        }
      }
      // SCL SDA AREF GND 标号(2x3 座 上排 3 pin,下排 3 pin,标号在外面)
      // 上排 SCL SDA (R3 实际 SCL/SDA 是 analog header 上复用,但 view-only 简化标 SCL SDA)
      // 下排 AREF GND (同样 view-only)
      // 实际 UNO R3 这个位置是 6 pin POWER 头 (IOREF RESET GND GND + 2),不是 SCL/SDA
      // 决策 12 拍板 SCL/SDA/AREF/GND 是 view-only 视觉装饰,放在这里
      // 注:AI 图实物这里也是 6 pin 头但标号是 SCL/SDA/AREF/GND + 2 (复用)
      // 简化:标号 SCL SDA AREF GND + 2个空(用真图标注风格)
      const sclLabel = svg('text', {
        x: SCL_SDA_X - 1,
        y: SCL_SDA_Y - 5,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.2,
        'font-weight': '700',
      });
      sclLabel.textContent = 'SCL';
      const sdaLabel = svg('text', {
        x: SCL_SDA_X + icspPinGap - 1,
        y: SCL_SDA_Y - 5,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.2,
        'font-weight': '700',
      });
      sdaLabel.textContent = 'SDA';
      children.push(sclLabel, sdaLabel);

      // DIGITAL header 14 pin 单排(AI 图实物是单排 14 针长 header)
      DIGITAL_PINS.forEach((i) => {
        const x = DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X;
        children.push(
          svg('rect', {
            x: x - 2.5,
            y: DIG_Y - 2.5,
            width: 5,
            height: 2.5,
            fill: '#0a0a0a',
          }),
        );
        // 金圆 pin
        children.push(
          svg('circle', {
            cx: x,
            cy: DIG_Y - 1.3,
            r: 0.9,
            fill: '#ffd700',
            stroke: '#222',
            'stroke-width': 0.2,
          }),
        );
      });
      // DIGITAL header 黑色塑料底座
      children.push(
        svg('rect', {
          x: DIG_X_START - 3,
          y: DIG_Y - 4,
          width: DIG_X_END - DIG_X_START + 6,
          height: 5,
          rx: 0.5,
          fill: '#0a0a0a',
          stroke: '#000',
          'stroke-width': 0.3,
        }),
      );

      // L LED — 顶部中右(AI 图实物 L 在 SCL/SDA 座下方 + DIGITAL 旁)
      const lLedX = px2x(720);
      const lLedY = px2y(290);
      children.push(
        svg('circle', { cx: lLedX, cy: lLedY, r: 1.8, fill: '#fbbf24' }),
      );
      const lLabel = svg('text', {
        x: lLedX + 4,
        y: lLedY + 1,
        'text-anchor': 'start',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.8,
        'font-weight': '700',
      });
      lLabel.textContent = 'L';
      children.push(lLabel);

      // TX/RX LED — 中央偏左,两个绿色 LED
      const txLedX = px2x(700);
      const rxLedX = px2x(770);
      const txRy = px2y(490);
      children.push(
        svg('circle', { cx: txLedX, cy: txRy, r: 2, fill: '#3f8c6a' }),
        svg('circle', { cx: rxLedX, cy: txRy, r: 2, fill: '#3f8c6a' }),
      );
      const txLabel = svg('text', {
        x: txLedX,
        y: txRy + 8,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.8,
        'font-weight': '700',
      });
      txLabel.textContent = 'TX';
      children.push(txLabel);
      const rxLabel = svg('text', {
        x: rxLedX,
        y: txRy + 8,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.8,
        'font-weight': '700',
      });
      rxLabel.textContent = 'RX';
      children.push(rxLabel);

      // ON LED — 右侧
      const onLedX = px2x(1500);
      const onLedY = px2y(330);
      children.push(
        svg('circle', { cx: onLedX, cy: onLedY, r: 1.8, fill: '#3f8c6a' }),
      );
      const onLabel = svg('text', {
        x: onLedX - 4,
        y: onLedY + 1,
        'text-anchor': 'end',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 2.8,
        'font-weight': '700',
      });
      onLabel.textContent = 'ON';
      children.push(onLabel);

      // ATmega328P-AU — 右中,水平 SMD 长条(AI 图实物)
      const ATM_X = px2x(990);
      const ATM_Y = px2y(770);
      const ATM_W = px2w(600);
      const ATM_H = px2h(110);
      children.push(
        svg('rect', {
          x: ATM_X,
          y: ATM_Y,
          width: ATM_W,
          height: ATM_H,
          rx: 1.5,
          fill: '#1a1a1a',
          stroke: '#000',
          'stroke-width': 1,
        }),
      );
      // ATmega 标号
      const atmegaLabel = svg('text', {
        x: ATM_X + ATM_W / 2,
        y: ATM_Y + ATM_H / 2 + 3,
        'text-anchor': 'middle',
        fill: '#fff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 6,
        'font-weight': '700',
      });
      atmegaLabel.textContent = 'ATMEGA328P-AU';
      children.push(atmegaLabel);

      // "∞ UNO Arduino®" 标牌 — 中央右(AI 图实物)
      const INF_X = px2x(1100);
      const INF_Y = px2y(420);
      const infinityLabel = svg('text', {
        x: INF_X,
        y: INF_Y,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 24,
        'font-weight': '700',
      });
      infinityLabel.textContent = '∞';
      children.push(infinityLabel);
      const unoLabel = svg('text', {
        x: INF_X + 18,
        y: INF_Y + 2,
        'text-anchor': 'start',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 18,
        'font-weight': '700',
        'letter-spacing': '1',
      });
      unoLabel.textContent = 'UNO';
      children.push(unoLabel);
      const arduinoLabel = svg('text', {
        x: INF_X,
        y: INF_Y + 22,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 11,
        'font-weight': '700',
        'letter-spacing': '0.5',
      });
      arduinoLabel.textContent = 'Arduino®';
      children.push(arduinoLabel);

      // POWER header 黑色塑料 + 金圆 pin
      children.push(
        svg('rect', {
          x: POW_X_START - 3,
          y: POW_Y - 4,
          width: POW_X_END - POW_X_START + 6,
          height: 5,
          rx: 0.5,
          fill: '#0a0a0a',
          stroke: '#000',
          'stroke-width': 0.3,
        }),
      );
      POWER_PINS.forEach((_, i) => {
        children.push(
          svg('circle', {
            cx: POW_X_START + i * POW_GAP_X,
            cy: POW_Y - 1.5,
            r: 1.2,
            fill: '#ffd700',
            stroke: '#222',
            'stroke-width': 0.3,
          }),
        );
      });
      // "POWER" 文字横标
      const powerLabel = svg('text', {
        x: POW_X_START + (POW_X_END - POW_X_START) / 2,
        y: POW_Y - 8,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.2,
        'font-weight': '700',
        'letter-spacing': '0.4',
      });
      powerLabel.textContent = 'POWER';
      children.push(powerLabel);

      // ANALOG header 黑色塑料 + 金圆 pin
      children.push(
        svg('rect', {
          x: ANA_X_START - 3,
          y: ANA_Y - 4,
          width: ANA_X_END - ANA_X_START + 6,
          height: 5,
          rx: 0.5,
          fill: '#0a0a0a',
          stroke: '#000',
          'stroke-width': 0.3,
        }),
      );
      ANALOG_PINS.forEach((_, i) => {
        children.push(
          svg('circle', {
            cx: ANA_X_START + i * ANA_GAP_X,
            cy: ANA_Y - 1.5,
            r: 1.2,
            fill: '#ffd700',
            stroke: '#222',
            'stroke-width': 0.3,
          }),
        );
      });
      const analogLabel = svg('text', {
        x: ANA_X_START + (ANA_X_END - ANA_X_START) / 2,
        y: ANA_Y - 8,
        'text-anchor': 'middle',
        fill: '#ffffff',
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 3.2,
        'font-weight': '700',
        'letter-spacing': '0.4',
      });
      analogLabel.textContent = 'ANALOG IN';
      children.push(analogLabel);

      // DIGITAL pin 标号(AI 图实物是单排 14 针,标号 "13 12 11 10 9 8 7 6 5 4 3 2 TX 1 RX 0")
      DIGITAL_PINS.forEach((i) => {
        const x = DIG_X_END - (DIGITAL_PINS.length - 1 - i) * DIG_GAP_X;
        const t = svg('text', {
          x,
          y: DIG_Y - 7,
          'text-anchor': 'middle',
          fill: '#ffffff',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.6,
          'font-weight': '700',
        });
        if (i === 0) t.textContent = 'RX←0';
        else if (i === 1) t.textContent = '1→TX';
        else t.textContent = `${i}`;
        children.push(t);
      });

      // POWER pin 标号
      POWER_PINS.forEach((p, i) => {
        const t = svg('text', {
          x: POW_X_START + i * POW_GAP_X,
          y: POW_Y + 8,
          'text-anchor': 'middle',
          fill: '#ffffff',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.5,
          'font-weight': '700',
        });
        t.textContent = p.label;
        children.push(t);
      });

      // ANALOG pin 标号
      ANALOG_PINS.forEach((i) => {
        const t = svg('text', {
          x: ANA_X_START + i * ANA_GAP_X,
          y: ANA_Y + 8,
          'text-anchor': 'middle',
          fill: '#ffffff',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 2.5,
          'font-weight': '700',
        });
        t.textContent = `A${i}`;
        children.push(t);
      });

      appendAll(g, children);
    },
  };
}

export const arduinoUno = makeArduinoUno();