import type { PartModel, PartSpec } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * HC-SR04 ultrasonic distance sensor — Wokwi 1:1 真图 (决策 32a,
 * 来源 github.com/wokwi/wokwi-elements src/hc-sr04-element.ts renderSVG).
 * 视觉结构:
 *   - 蓝色 PCB body (wokwi path fill=#456f93 圆角矩形 0..45×25)
 *   - 2 圆形 sensor (wokwi #sensor-unit, 眼 = 直径 8.61 银/黑同心圆)
 *   - 顶部芯片 rectangle (wokwi rect fill=#878787 stroke=#424242)
 *   - 4 根底部引脚 (VCC/TRIG/ECHO/GND, wokwi 黑色 rect)
 *   - 4 角螺丝 (wokwi circle fill=none stroke=#505132)
 *   - 文字标签 HC-SR04 + 引脚名
 */
function makeHcsr04(): PartSpec {
  return {
    type: 'hcsr04',
    displayName: 'HC-SR04 Ultrasonic',
    width: 90,
    height: 50,
    pins: [
      { id: 'VCC', x: 0, y: 50, label: 'VCC', pinType: 'vcc' },
      { id: 'TRIG', x: 30, y: 50, label: 'TRIG', pinType: 'digital' },
      { id: 'ECHO', x: 60, y: 50, label: 'ECHO', pinType: 'digital' },
      { id: 'GND', x: 90, y: 50, label: 'GND', pinType: 'gnd' },
    ],
    defaultPinValues: { GND: 0 },
    render(g, _state) {
      const defs = svg('defs', {}) as SVGDefsElement;
      // 渐变 defs (wokwi radialGradient grad1 银/黑圆心)
      const grad = svg('radialGradient', { id: 'hcsr04-grad1', cx: '17.92', cy: '20.08', r: '7.16' });
      grad.appendChild(svg('stop', { 'stop-color': '#777', offset: '0' }));
      grad.appendChild(svg('stop', { 'stop-color': '#b9b9b9', offset: '1' }));
      defs.appendChild(grad);

      appendAll(g, [
        defs,
        // 引脚 (4 根底左)
        pinPad('VCC', 0, 50),
        pinPad('TRIG', 30, 50),
        pinPad('ECHO', 60, 50),
        pinPad('GND', 90, 50),
        // Axial leads 银
        svg('line', { x1: 0, y1: 50, x2: 5, y2: 42, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 30, y1: 50, x2: 30, y2: 42, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 60, y1: 50, x2: 60, y2: 42, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 90, y1: 50, x2: 85, y2: 42, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        // 蓝色 PCB body (wokwi path d="M0 0v20.948h45V0zm1.422.464..." fill=#456f93)
        svg('rect', {
          x: 2, y: 4,
          width: 86, height: 38,
          rx: 2,
          fill: '#456f93',
          stroke: '#355a7c',
          'stroke-width': 0.5,
        }),
        // 4 角螺丝 (wokwi circle fill=none stroke=#505132)
        svg('circle', { cx: 4, cy: 6, r: 1.5, fill: 'none', stroke: '#505132', 'stroke-width': 0.3 }),
        svg('circle', { cx: 86, cy: 6, r: 1.5, fill: 'none', stroke: '#505132', 'stroke-width': 0.3 }),
        svg('circle', { cx: 4, cy: 40, r: 1.5, fill: 'none', stroke: '#505132', 'stroke-width': 0.3 }),
        svg('circle', { cx: 86, cy: 40, r: 1.5, fill: 'none', stroke: '#505132', 'stroke-width': 0.3 }),
        // 顶部芯片 (wokwi rect fill=#878787 stroke=#424242 y=0.626 height=4.139)
        svg('rect', {
          x: 34, y: 6,
          width: 22, height: 8,
          rx: 1,
          fill: '#878787',
          stroke: '#424242',
          'stroke-width': 0.3,
        }),
        // 2 眼 sensor (wokwi #sensor-unit = circle r=8.61 fill=#dcdcdc + 内圈)
        // 左眼 (cx=22 cy=22)
        svg('circle', { cx: 22, cy: 24, r: 8, fill: '#dcdcdc' }),
        svg('circle', { cx: 22, cy: 24, r: 6.7, fill: '#222' }),
        svg('circle', { cx: 22, cy: 24, r: 5.2, fill: '#777' }),
        svg('circle', { cx: 22, cy: 24, r: 3.4, fill: 'url(#hcsr04-grad1)' }),
        svg('circle', { cx: 22, cy: 24, r: 0.3, fill: '#777' }),
        // 右眼
        svg('circle', { cx: 68, cy: 24, r: 8, fill: '#dcdcdc' }),
        svg('circle', { cx: 68, cy: 24, r: 6.7, fill: '#222' }),
        svg('circle', { cx: 68, cy: 24, r: 5.2, fill: '#777' }),
        svg('circle', { cx: 68, cy: 24, r: 3.4, fill: 'url(#hcsr04-grad1)' }),
        svg('circle', { cx: 68, cy: 24, r: 0.3, fill: '#777' }),
        // 文字标签 HC-SR04
        svg('text', {
          x: 45, y: 44,
          'text-anchor': 'middle',
          fill: '#e6e6e6',
          'font-family': 'monospace',
          'font-size': 4,
        }),
      ]);
      (g.querySelector('text') as SVGTextElement)!.textContent = 'HC-SR04';
    },
  };
}

export const hcsr04: PartSpec = (() => {
  const spec = makeHcsr04();
  spec.model = ((_ctx) => {
    // HC-SR04 model: TRIG pulse → ECHO pulse width → distance
    // For MVP, return empty (UI shows only view, distance not simulated)
    return [];
  }) as PartModel;
  return spec;
})();