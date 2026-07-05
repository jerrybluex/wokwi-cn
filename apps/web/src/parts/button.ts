import type { PartModel, PartSpec, PartDatasheet, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Push button — momentary contact.
 *   Pin 'A' — output (reports pressed state to anything wired to it)
 *   Pin 'B' — input ground reference
 *
 * Model: reads the current A pin value (set by canvas click handler) and
 * propagates it through the wire graph. Canvas mousedown sets pins['A']=1,
 * mouseup sets pins['A']=0. Model reads it and writes it back so the value
 * flows to connected parts.
 *
 * View: Wokwi 1:1 真图 (决策 31b, 来源 github.com/wokwi/wokwi-elements
 * src/pushbutton-element.ts renderSVG). 视觉结构:
 *   - 灰色方形 body (wokwi rect 12×12 fill=#464646)
 *   - 浅灰内框 (wokwi rect 10.5×10.5 fill=#eaeaea)
 *   - 4 角黑色固定螺丝 (wokwi g fill=#1b1b1)
 *   - 4 边灰色 PCB 焊盘 path (wokwi g fill=#999)
 *   - 中心圆 button cap (coder 5dcd054 加 .pin-button-pressed class, 决策 31f)
 */
function makeButton(): PartSpec & { datasheet?: PartDatasheet } {
  return {
    type: 'button',
    displayName: 'Push Button',
    width: 60,
    height: 50,
    pins: [
      { id: 'A', x: 0, y: 14, label: 'A', pinType: 'digital' },
      { id: 'B', x: 0, y: 36, label: 'B', pinType: 'digital' },
    ],
    render(g, state) {
      const pressed = state.pins['A'] === 1;
      const colorHex = '#ff5252'; // MVP: 固定红色 cap,跟 wokwi default 一致

      appendAll(g, [
        pinPad('A', 0, 14),
        pinPad('B', 0, 36),
        // Axial leads — 银色,2 根从 pad 接到 button body 左侧
        svg('line', { x1: 0, y1: 14, x2: 16, y2: 14, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 36, x2: 16, y2: 36, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        // 灰色方形 body (wokwi rect 12×12 fill=#464646)
        svg('rect', {
          x: 16, y: 8, width: 32, height: 34,
          rx: 1, ry: 1,
          fill: '#464646',
        }),
        // 浅灰内框 (wokwi rect 10.5×10.5 fill=#eaeaea)
        svg('rect', {
          x: 17.5, y: 9.5, width: 29, height: 31,
          rx: 0.7, ry: 0.7,
          fill: '#eaeaea',
        }),
        // 4 角黑色固定螺丝 (wokwi g fill=#1b1b1, cx 在 4 个角)
        svg('circle', { cx: 17, cy: 9, r: 1.2, fill: '#1b1b1b' }),
        svg('circle', { cx: 47, cy: 9, r: 1.2, fill: '#1b1b1b' }),
        svg('circle', { cx: 17, cy: 41, r: 1.2, fill: '#1b1b1b' }),
        svg('circle', { cx: 47, cy: 41, r: 1.2, fill: '#1b1b1b' }),
        // 4 边灰色 PCB 焊盘 path (wokwi g fill=#999 简化版,小三角形)
        svg('rect', { x: 28, y: 6, width: 8, height: 2, rx: 0.5, fill: '#999' }),
        svg('rect', { x: 28, y: 42, width: 8, height: 2, rx: 0.5, fill: '#999' }),
        svg('rect', { x: 14, y: 22, width: 2, height: 6, rx: 0.5, fill: '#999' }),
        svg('rect', { x: 48, y: 22, width: 2, height: 6, rx: 0.5, fill: '#999' }),
        // 中心圆 button cap (wokwi r=3.822 in mm-scale, 我的比例 r=11)
        // 决策 31f: 按时 cap 变暗 + drop-shadow (coder CSS .pin-button-pressed)
        (() => {
          const cap = svg('circle', {
            cx: 32, cy: 25, r: 11,
            fill: pressed ? colorHex : colorHex,
            'fill-opacity': pressed ? '0.85' : '1',
            stroke: '#2f2f2f',
            'stroke-opacity': '0.47',
            'stroke-width': 0.3,
          });
          if (pressed) cap.setAttribute('class', 'pin-button-pressed');
          return cap;
        })(),
        // 中心 cap 高光 (wokwi 内层 highlight)
        svg('circle', {
          cx: 29, cy: 22, r: 3.5,
          fill: '#ffffff',
          'fill-opacity': '0.4',
        }),
        svg('text', {
          x: 32,
          y: 50,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      (g.querySelector('text') as SVGTextElement)!.textContent = pressed ? 'PRESSED' : 'BUTTON';
    },
    // Decision 31f: real electrical datasheet
    datasheet: {
      maxCurrent: 10,       // mA contact rating
      description: '方形轻触按键,最大10mA,机械寿命>10000次',
    },
  };
}

export const button: PartSpec = (() => {
  const spec = makeButton();
  spec.model = ((_ctx) => {
    // Canvas click handler sets pins['A']=1/0 directly. Model is a no-op —
    // the pin value is already propagated through the BFS pass. No write needed.
    return [] as PinWrite[];
  }) as PartModel;
  return spec;
})();