import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * SG90 servo — Wokwi 1:1 真图 (决策 32a, 来源 github.com/wokwi/wokwi-elements
 * src/servo-element.ts renderSVG). 视觉结构:
 *   - 蓝色 PCB body (rect rx=5.33 fill=#666)
 *   - 中心 horn (圆形 r=18.6 fill=#999)
 *   - horn arm (path fill=hornColor 通过 transform rotate(angle) 旋转 0..180°)
 *   - 中心螺丝十字 (path)
 *   - 3 根底部引脚 (GND/V+/PWM)
 *   - 数据线 path (橙/红渐变, wokwi decoration)
 *
 * Model: maps SIG pin PWM value (0..255 from analogWrite) to angle 0–180°.
 */
function makeServo(): PartSpec {
  return {
    type: 'servo',
    displayName: 'Servo Motor (SG90)',
    width: 170,
    height: 120,
    pins: [
      { id: 'SIG', x: 0, y: 50, label: 'PWM', pinType: 'pwm' },
      { id: 'VCC', x: 0, y: 70, label: 'V+', pinType: 'vcc' },
      { id: 'GND', x: 0, y: 90, label: 'GND', pinType: 'gnd' },
    ],
    defaultPinValues: { GND: 0 },
    render(g, state) {
      const sig = state.pins['SIG'] ?? 0;
      // PWM 0..255 → 0..180° (SG90 spec: 1ms..2ms pulse over 50Hz, mapped to 0..180)
      const angle = Math.round((sig / 255) * 180);
      // wokwi single horn path (simplified, 我的比例尺)
      const hornPath =
        'm40 0-7-22.6c0-1.2-1.1-2.2-2.4-2.2s-2.4 1-2.4 2.2l-7 22.6a3.5 3.5 0 0 0-0.1 0.5c0 2.1 1.9 3.8 4.3 3.8s4.3-1.7 4.3-3.8a3.5 3.5 0 0 0-0.1-0.5z';

      appendAll(g, [
        // 引脚 (3 根底左)
        pinPad('SIG', 0, 50),
        pinPad('VCC', 0, 70),
        pinPad('GND', 0, 90),
        // Axial leads 银 (3 根短线从 pad 到 body)
        svg('line', { x1: 0, y1: 50, x2: 25, y2: 50, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 70, x2: 25, y2: 70, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 90, x2: 25, y2: 90, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        // 数据线装饰 (wokwi 橙红渐变 path,简化)
        svg('path', {
          d: 'M 25 50 C 50 30, 80 50, 110 30',
          stroke: '#ff6b35',
          'stroke-width': 2.5,
          fill: 'none',
        }),
        svg('path', {
          d: 'M 25 70 C 60 60, 90 80, 120 50',
          stroke: '#e74c3c',
          'stroke-width': 2.5,
          fill: 'none',
        }),
        // 左侧 pin header (wokwi rect fill=#666 y=45.5 width=25.71 height=28)
        svg('rect', { x: 0, y: 45, width: 25, height: 50, fill: '#666', rx: 1 }),
        // 主体蓝色 PCB body (wokwi rect x=64.255 y=37.911 width=90.241 height=43.725 rx=5.33)
        svg('rect', { x: 64, y: 38, width: 90, height: 44, rx: 5, fill: '#666' }),
        // PCB 顶部高亮条 (wokwi path fill=gray,简化)
        svg('rect', { x: 64, y: 38, width: 90, height: 6, fill: 'gray' }),
        // 中心 hub (wokwi circle fill=#999 cx=91.467 cy=59.773 r=18.606)
        svg('circle', { cx: 109, cy: 60, r: 19, fill: '#999' }),
        // horn (wokwi single horn path 通过 transform rotate)
        svg('path', {
          d: hornPath,
          fill: '#cccccc',
          transform: `translate(109 60) rotate(${angle}) translate(-30.6 -10)`,
          'pointer-events': 'none',
        }),
        // 中心螺丝 (wokwi circle fill=#666 cx=91.467 cy=59.773 r=8.3729 + 十字)
        svg('circle', { cx: 109, cy: 60, r: 8, fill: '#666' }),
        svg('circle', { cx: 109, cy: 60, r: 6, fill: '#ccc' }),
        // 十字螺丝 path (wokwi style, 简化 4 条线)
        svg('line', { x1: 105, y1: 60, x2: 113, y2: 60, stroke: '#222', 'stroke-width': 1.5 }),
        svg('line', { x1: 109, y1: 56, x2: 109, y2: 64, stroke: '#222', 'stroke-width': 1.5 }),
        // 4 角黑色螺丝
        svg('circle', { cx: 68, cy: 42, r: 1.5, fill: '#1a1a1a' }),
        svg('circle', { cx: 150, cy: 42, r: 1.5, fill: '#1a1a1a' }),
        svg('circle', { cx: 68, cy: 78, r: 1.5, fill: '#1a1a1a' }),
        svg('circle', { cx: 150, cy: 78, r: 1.5, fill: '#1a1a1a' }),
        // Label (角度 + servo)
        svg('text', {
          x: 109, y: 100,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 8,
        }),
      ]);
      (g.querySelector('text') as SVGTextElement)!.textContent = `${angle}°`;
    },
  };
}

export const servo: PartSpec = (() => {
  const spec = makeServo();
  spec.model = ((ctx) => {
    // 用 ctx.pins['SIG'] 直接读 (full PWM 0-255), 不用 digitalRead (0/1 截断)
    const sig = ctx.pins['SIG'] ?? 0;
    return [{ pinId: 'SIG', value: sig }] as PinWrite[];
  }) as PartModel;
  return spec;
})();