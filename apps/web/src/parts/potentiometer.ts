import type { PartModel, PartSpec } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Potentiometer — three-pin variable resistor.
 *   Pin 'A' = one end
 *   Pin 'B' = other end
 *   Pin 'W' = wiper (variable output, 0–1023)
 *
 * Canvas drag sets pins.W to 0–100 (UI dial position).
 * Model reads that value and writes it back as 0–1023 (Arduino analogRead range).
 *
 * View: Wokwi 1:1 真图 (决策 31b, 来源 github.com/wokwi/wokwi-elements
 * src/potentiometer-element.ts renderSVG). 视觉结构:
 *   - 圆形 pot body (深色)
 *   - PCB 顶部高亮条 (wokwi rect fill=#ccdae3)
 *   - 椭圆 knob (cx=30 cy=30 rx=20 ry=20, 浅灰)
 *   - 旋转指示 (rect 通过 .pot-dial-rotating class CSS rotate, coder 5dcd054 决策 31f)
 *   - 4 角白色螺丝 ellipse (wokwi g fill=#fff)
 *   - 底部 3 引脚标签 GND/SIG/VCC
 *   - 引脚位置保留 A x=0 y=18 / B x=60 y=18 / W x=30 y=80
 */
function makePotentiometer(): PartSpec {
  return {
    type: 'potentiometer',
    displayName: 'Potentiometer',
    width: 60,
    height: 80,
    pins: [
      { id: 'A', x: 0, y: 18, label: 'A', pinType: 'digital' },
      { id: 'B', x: 60, y: 18, label: 'B', pinType: 'digital' },
      { id: 'W', x: 30, y: 80, label: 'W', pinType: 'analog' },
    ],
    render(g, state) {
      const raw = state.pins['W'] ?? 50; // canvas gives 0..100
      const v = Math.max(0, Math.min(100, raw));
      const angle = -135 + (v / 100) * 270;
      const rad = (angle * Math.PI) / 180;
      const x2 = 30 + Math.sin(rad) * 14;
      const y2 = 30 - Math.cos(rad) * 14;

      appendAll(g, [
        pinPad('A', 0, 18),
        pinPad('B', 60, 18),
        pinPad('W', 30, 80),
        // Axial leads — 3 根 (A 灰 / B 灰 / W 灰) 从 pad 接到 pot 底部
        svg('line', { x1: 0, y1: 18, x2: 18, y2: 18, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 60, y1: 18, x2: 42, y2: 18, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 30, y1: 80, x2: 30, y2: 60, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        // 圆形 pot body (深色, wokwi fill=#045881 蓝色 → 我用深色 PCB 风格)
        svg('circle', {
          cx: 30, cy: 30, r: 24,
          fill: '#045881',
          stroke: '#034a6b',
          'stroke-width': 1.5,
        }),
        // PCB 顶部高亮条 (wokwi rect 9.1×1.9 fill=#ccdae3 在 mm-scale 20×20)
        svg('rect', {
          x: 19.5, y: 8, width: 21, height: 3,
          fill: '#ccdae3',
          'fill-opacity': '0.6',
        }),
        // 椭圆 knob (wokwi ellipse cx=9.91 cy=8.18 rx=7.27 ry=7.43, 我 r=20)
        svg('ellipse', {
          cx: 30, cy: 30, rx: 20, ry: 20,
          fill: '#e4e8eb',
          stroke: '#888',
          'stroke-width': 1,
        }),
        // 内圆 (wokwi ellipse cx=9.95 cy=8.06 rx=6.60 ry=6.58 fill=#c3c2c3)
        svg('ellipse', {
          cx: 30, cy: 30, rx: 18, ry: 18,
          fill: '#c3c2c3',
        }),
        // 4 角白色螺丝 (wokwi g fill=#fff ellipse)
        svg('ellipse', { cx: 9, cy: 9, rx: 2.5, ry: 2.5, fill: '#ffffff' }),
        svg('ellipse', { cx: 51, cy: 9, rx: 2.5, ry: 2.5, fill: '#ffffff' }),
        svg('ellipse', { cx: 9, cy: 51, rx: 2.5, ry: 2.5, fill: '#ffffff' }),
        svg('ellipse', { cx: 51, cy: 51, rx: 2.5, ry: 2.5, fill: '#ffffff' }),
        // 4 角螺丝阴影
        svg('circle', { cx: 9, cy: 9, r: 1, fill: '#888' }),
        svg('circle', { cx: 51, cy: 9, r: 1, fill: '#888' }),
        svg('circle', { cx: 9, cy: 51, r: 1, fill: '#888' }),
        svg('circle', { cx: 51, cy: 51, r: 1, fill: '#888' }),
        // 旋转指示 (wokwi rect 0.42×3.1 通过 #rotating 旋转)
        // 决策 31f coder 5dcd054 加 .pot-dial-rotating class (CSS transition: transform 0.1s)
        svg('line', {
          x1: 30, y1: 30, x2: x2, y2: y2,
          stroke: '#2c3e50',
          'stroke-width': 3,
          'stroke-linecap': 'round',
          class: 'pot-dial-rotating',
        }),
        // 中心圆 (wokwi knob 中心)
        svg('circle', { cx: 30, cy: 30, r: 3, fill: '#2c3e50' }),
        svg('circle', { cx: 30, cy: 30, r: 1.5, fill: '#fff' }),
        // 底部 3 引脚标签 (wokwi text GND/SIG/VCC)
        svg('text', {
          x: 10, y: 74,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 6,
        }),
        svg('text', {
          x: 30, y: 74,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 6,
        }),
        svg('text', {
          x: 50, y: 74,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 6,
        }),
      ]);
      const labels = g.querySelectorAll('text');
      if (labels.length >= 3) {
        labels[0].textContent = 'A';
        labels[1].textContent = 'W';
        labels[2].textContent = 'B';
      }
    },
  };
}

export const potentiometer: PartSpec = (() => {
  const spec = makePotentiometer();
  spec.model = ((ctx) => {
    // Canvas drag writes pins.W as 0–100 (UI position).
    // Model maps it to 0–1023 for Arduino analogRead.
    const dial = ctx.digitalRead('W'); // 0–100 from canvas
    const raw = Math.round((dial / 100) * 1023);
    return [{ pinId: 'W', value: Math.max(0, Math.min(1023, raw)) }];
  }) as PartModel;
  return spec;
})();