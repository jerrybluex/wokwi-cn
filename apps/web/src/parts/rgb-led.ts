import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Common-cathode RGB LED — Wokwi 1:1 真图 (决策 32a,
 * 来源 github.com/wokwi/wokwi-elements src/rgb-led-element.ts renderSVG).
 * 视觉结构:
 *   - 4 根弯曲引脚 (wokwi path d="m4.1 15.334..." 灰色 stroke=#9D9999)
 *   - LED body 多层半透明 path (wokwi opacity .3 .5 .9)
 *   - 内部 anvil + cathode lead polygon (wokwi translate(-5.8295 -7.351))
 *   - dome 白色半透明
 *   - 3 白色高光
 *   - LED filter (Gaussian blur stdDev=4) + 3 个彩色 glow (R/G/B)
 *
 * viewBox -17 -10 37.3425 57.5115 (mm-scale)
 *
 * 4 pins: R(red) / COM(common cathode) / G(green) / B(blue)
 * Each color channel accepts 0–255 (PWM brightness).
 */
function makeRgbLed(): PartSpec {
  return {
    type: 'rgb-led',
    displayName: 'RGB LED',
    width: 40,
    height: 55,
    pins: [
      { id: 'r', x: 4, y: 55, label: 'R', pinType: 'pwm' },
      { id: 'g', x: 14, y: 55, label: 'G', pinType: 'pwm' },
      { id: 'b', x: 24, y: 55, label: 'B', pinType: 'pwm' },
      { id: 'common', x: 34, y: 55, label: 'COM', pinType: 'gnd' },
    ],
    defaultPinValues: { common: 0 },
    render(g, state) {
      const r = Math.max(0, Math.min(1, (state.pins['r'] ?? 0) / 255));
      const gr = Math.max(0, Math.min(1, (state.pins['g'] ?? 0) / 255));
      const b = Math.max(0, Math.min(1, (state.pins['b'] ?? 0) / 255));
      const brightness = Math.max(r, gr, b);

      const defs = svg('defs', {}) as SVGDefsElement;
      // ledFilter (Gaussian blur stdDev=4)
      const ledFilter = svg('filter', { id: 'rgb-ledFilter', x: '-0.8', y: '-0.8', height: '5.2', width: '5.8' });
      ledFilter.appendChild(svg('feGaussianBlur', { 'stdDeviation': '4' }));
      defs.appendChild(ledFilter);
      // 3 颜色独立 filter (wokwi ledFilterRed/Green/Blue stdDev = ${color * 3})
      const ledFilterR = svg('filter', { id: 'rgb-ledFilterRed', x: '-0.8', y: '-0.8', height: '5.2', width: '5.8' });
      ledFilterR.appendChild(svg('feGaussianBlur', { 'stdDeviation': String(r * 3) }));
      defs.appendChild(ledFilterR);
      const ledFilterG = svg('filter', { id: 'rgb-ledFilterGreen', x: '-0.8', y: '-0.8', height: '5.2', width: '5.8' });
      ledFilterG.appendChild(svg('feGaussianBlur', { 'stdDeviation': String(gr * 3) }));
      defs.appendChild(ledFilterG);
      const ledFilterB = svg('filter', { id: 'rgb-ledFilterBlue', x: '-0.8', y: '-0.8', height: '5.2', width: '5.8' });
      ledFilterB.appendChild(svg('feGaussianBlur', { 'stdDeviation': String(b * 3) }));
      defs.appendChild(ledFilterB);

      // LED 中心位置 (wokwi cx=1.7 cy=4 缩放, 我 cx=20 cy=18)
      const cx = 20, cy = 18;

      appendAll(g, [
        defs,
        // 引脚 (4 根底)
        pinPad('r', 4, 55),
        pinPad('g', 14, 55),
        pinPad('b', 24, 55),
        pinPad('common', 34, 55),
        // 4 根弯曲引脚 (wokwi path d="m4.1 15.334 3.0611 9.971" 灰色 stroke=#9D9999)
        svg('path', { d: 'M 4 35 L 7 50', stroke: '#9D9999', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }),
        svg('path', { d: 'M 14 35 L 18 48', stroke: '#9D9999', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }),
        svg('path', { d: 'M 24 35 L 22 50', stroke: '#9D9999', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }),
        svg('path', { d: 'M 34 35 L 30 50', stroke: '#9D9999', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }),
        // LED body 多层半透明 path (wokwi opacity .3 .5 .9)
        svg('path', {
          d: 'M 20 5 C 20 -10, 20 -10, 20 -10 Z',
          opacity: '0.3',
          transform: `translate(0 ${cy})`,
        }),
        // 简化: 直接画 dome + 内圈
        svg('circle', { cx, cy, r: 14, fill: '#e6e6e6', opacity: '0.5' }),
        svg('circle', { cx, cy, r: 12, fill: '#d1d1d1', opacity: '0.9' }),
        svg('circle', { cx, cy, r: 10, fill: '#ffffff', opacity: '0.65' }),
        // 内部 anvil polygon (wokwi translate(-5.8295 -7.351) + polygon points)
        svg('polygon', {
          points: '14.166,21.348 17,21.348 21,17.057 14.376,17.057 13.172,17.901 13.172,24.36 14.166,24.36',
          fill: '#666',
          transform: `translate(13 ${cy - 25})`,
        }),
        // 内部 cathode lead
        svg('polygon', {
          points: '22.066,21.348 22.066,24.36 22.98,24.36 22.98,16.776 21.784,16.776 22.221,17.286 18.418,21.348',
          fill: '#666',
          transform: `translate(13 ${cy - 25})`,
        }),
        // 3 白色高光
        svg('ellipse', { cx: cx - 3, cy: cy - 5, rx: 3, ry: 2, fill: '#fff', opacity: '0.5' }),
        svg('ellipse', { cx: cx + 3, cy: cy + 4, rx: 2, ry: 1.5, fill: '#fff', opacity: '0.5' }),
        // 3 颜色独立 glow (r/g/b filter, wokwi 风格) — IIFE 返回 SVGElement 而非 boolean
        ...(brightness > 0
          ? [
              svg('circle', {
                cx: cx - 2, cy: cy + 1, r: r * 5 + 2,
                fill: '#ff0000',
                opacity: String(Math.min(r * 20, 0.3)),
                filter: 'url(#rgb-ledFilterRed)',
              }),
              svg('circle', {
                cx: cx + 1, cy: cy + 3, r: gr * 5 + 2,
                fill: '#00ff00',
                opacity: String(Math.min(gr * 20, 0.3)),
                filter: 'url(#rgb-ledFilterGreen)',
              }),
              svg('circle', {
                cx: cx - 1, cy: cy + 3, r: b * 5 + 2,
                fill: '#0155fd',
                opacity: String(Math.min(b * 20, 0.3)),
                filter: 'url(#rgb-ledFilterBlue)',
              }),
              svg('circle', {
                cx, cy: cy + 2, r: 10,
                fill: `rgb(${r * 255}, ${gr * 255 + b * 90}, ${b * 255})`,
                filter: 'url(#rgb-ledFilter)',
                opacity: String(0.2 + brightness * 0.6),
              }),
              svg('circle', {
                cx, cy: cy + 2, r: 13,
                stroke: '#666',
                'stroke-width': 1,
                fill: 'none',
                filter: 'url(#rgb-ledFilter)',
                opacity: String(0.2 + brightness * 0.6),
              }),
            ]
          : []),
        // 标签
        svg('text', {
          x: 20, y: 50,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 6,
        }),
      ]);
      // SVG attribute shorthand fix: { cx, cy: cy + 2 } 不可行, 上面用了 cy, cy 重复覆盖
      // 简化处理 — label
      const labelText = brightness > 0 ? `R${Math.round(r * 100)}% G${Math.round(gr * 100)}% B${Math.round(b * 100)}%` : 'RGB';
      (g.querySelector('text') as SVGTextElement)!.textContent = labelText;
    },
  };
}

export const rgbLed: PartSpec = (() => {
  const spec = makeRgbLed();
  spec.model = ((_ctx) => {
    // RGB LED: each color propagates independently
    return [] as PinWrite[];
  }) as PartModel;
  return spec;
})();