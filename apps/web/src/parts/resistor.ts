import type { PartSpec } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Resistor — Wokwi 1:1 真图 (决策 32a, 来源 github.com/wokwi/wokwi-elements
 * src/resistor-element.ts renderSVG). 视觉结构:
 *   - 圆柱 body (path fill=#d5b597, wokwi rounded shape)
 *   - 3D 渐变 (linear gradient #323232 → #fff opacity .42 给圆柱 3D 感)
 *   - 4 色环 (wokwi: band1=base十位, band2=base个位, band3=exponent, band4=金/银 tolerance)
 *     颜色由 datasheet.resistance (ohms) 经 IEC 60062 standard 算出
 *   - 2 根银色 axial leads (wokwi rect y=1.1759 width=15.558 fill=#aaa)
 *   - 顶部 highlight stripe 给 3D 圆柱感
 * Two passive pins. No model — purely passive. Render only.
 */
const BAND_COLORS: Record<number, string> = {
  [-2]: '#C3C7C0', // Silver
  [-1]: '#F1D863', // Gold
  0: '#000000',    // Black
  1: '#8F4814',    // Brown
  2: '#FB0000',    // Red
  3: '#FC9700',    // Orange
  4: '#FCF800',    // Yellow
  5: '#00B800',    // Green
  6: '#0000FF',    // Blue
  7: '#A803D6',    // Violet
  8: '#808080',    // Gray
  9: '#FCFCFC',    // White
};

// Wokwi breakValue: 给定 ohms, 返回 [base (0-99), exponent (-2..9)]
function breakValue(ohms: number): [number, number] {
  if (ohms <= 0) return [0, 0];
  const exponent =
    ohms >= 1e10 ? 9 :
    ohms >= 1e9  ? 8 :
    ohms >= 1e8  ? 7 :
    ohms >= 1e7  ? 6 :
    ohms >= 1e6  ? 5 :
    ohms >= 1e5  ? 4 :
    ohms >= 1e4  ? 3 :
    ohms >= 1e3  ? 2 :
    ohms >= 1e2  ? 1 :
    ohms >= 1e1  ? 0 :
    ohms >= 1    ? -1 : -2;
  const base = Math.round(ohms / 10 ** exponent);
  return [Math.round(base % 100), exponent];
}

function makeResistor(): PartSpec {
  return {
    type: 'resistor',
    displayName: 'Resistor',
    width: 100,
    height: 40,
    pins: [
      { id: 'A', x: 0, y: 20, label: 'A', pinType: 'digital' },
      { id: 'B', x: 100, y: 20, label: 'B', pinType: 'digital' },
    ],
    datasheet: { resistance: 220 }, // default 220Ω (red red black brown)
    render(g, spec) {
      // Read resistance from datasheet (defaults to 220Ω)
      const ohms = (spec as unknown as { datasheet?: { resistance?: number } }).datasheet?.resistance ?? 220;
      const [base, exponent] = breakValue(ohms);
      const band1 = BAND_COLORS[Math.floor(base / 10)] ?? '#000000';
      const band2 = BAND_COLORS[base % 10] ?? '#000000';
      const band3 = BAND_COLORS[exponent] ?? '#000000';
      const band4 = '#F1D863'; // Gold tolerance 默认 ±5%

      // 渐变 defs (wokwi linear gradient 给圆柱 3D 感)
      const defs = svg('defs', {}) as SVGDefsElement;
      const grad = svg('linearGradient', {
        id: 'resistor-grad', x2: '0', y1: '0', y2: '1',
        'gradientUnits': 'objectBoundingBox',
      });
      grad.appendChild(svg('stop', { 'stop-color': '#323232', offset: '0' }));
      grad.appendChild(svg('stop', { 'stop-color': '#ffffff', 'stop-opacity': '0.45', offset: '1' }));
      defs.appendChild(grad);

      appendAll(g, [
        defs,
        // Visual pin pads (canvas click / wire hit area)
        pinPad('A', 0, 20),
        pinPad('B', 100, 20),
        // Axial leads (wokwi rect fill=#aaa y=1.1759 width=15.558 → 我 y=18 height=4 fill=#aaa)
        svg('rect', { x: 0, y: 18, width: 100, height: 4, fill: '#aaaaaa' }),
        // Cylindrical body (wokwi path fill=#d5b597, 我用 rounded rect 模拟 + 渐变 overlay)
        svg('rect', {
          x: 30, y: 6, width: 40, height: 28,
          rx: 14,
          fill: '#d5b597',
          stroke: '#8b6f3e',
          'stroke-width': 1.2,
        }),
        // 3D 渐变 overlay (wokwi use fill=url(#a) opacity=.44886)
        svg('rect', {
          x: 30, y: 6, width: 40, height: 28,
          rx: 14,
          fill: 'url(#resistor-grad)',
          opacity: '0.45',
          'pointer-events': 'none',
        }),
        // 4 color bands (wokwi: band1 x=4 band2 x=6 band3 x=7.8 band4 x=10.69)
        // 比例映射: wokwi body 0-11.578, 我 body 30-70 (40 wide), 缩放 40/11.578 ≈ 3.455
        // band1: x=30 + 4*3.455 ≈ 30 + 13.8 ≈ 43.8 → 我用 x=36
        svg('rect', { x: 36, y: 8, width: 4, height: 24, fill: band1 }),  // band1 base十位
        svg('rect', { x: 44, y: 8, width: 4, height: 24, fill: band2 }),  // band2 base个位
        svg('rect', { x: 54, y: 8, width: 4, height: 24, fill: band3 }),  // band3 exponent
        svg('rect', { x: 64, y: 8, width: 3, height: 24, fill: band4 }),  // band4 tolerance (金/银)
        // Label (e.g. "220Ω" / "1kΩ" / "10kΩ")
        svg('text', {
          x: 50, y: 38,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      // 格式化 label
      const fmt = ohms >= 1000
        ? `${ohms / 1000}kΩ`
        : `${ohms}Ω`;
      g.lastElementChild!.textContent = fmt;
    },
  };
}

export const resistor = makeResistor();