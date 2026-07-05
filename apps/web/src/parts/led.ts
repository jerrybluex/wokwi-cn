import type { PartSpec, PartContext, PartDatasheet } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * LED model: computes brightness from A/K pin state.
 *
 * LED is ON when:
 *   - A (anode) driven high (>0)
 *   - K (cathode) at GND (=0)
 *   - No electrical conflict on either A or K pin
 *
 * LED is OFF (short/reverse-bias condition) when:
 *   - K is driven high (VCC or signal=1) while A is low → reverse bias
 *   - Any electrical conflict detected on A or K pin
 *   - A=K short circuit (both on same net with conflicting sources)
 */
function ledModel(ctx: PartContext): { pinId: string; value: number }[] {
  const aVal = ctx.pins['A'] ?? 0;
  const kVal = ctx.pins['K'] ?? 0;
  const aConflict = ctx.isPinConflict('A');
  const kConflict = ctx.isPinConflict('K');

  // Short or conflict: LED disabled
  if (aConflict || kConflict) return [];
  // Reverse bias: K driven high while A not higher → LED off
  if (kVal > 0 && aVal <= kVal) return [];
  // Normal forward bias: pass A value through (LED brightness from anode)
  if (aVal > 0) return [{ pinId: 'A', value: aVal }];
  return [];
}

/**
 * LED — Wokwi 1:1 真图 (决策 31b, 来源 github.com/wokwi/wokwi-elements
 * src/led-element.ts renderSVG). 视觉结构:
 *   - 阴极扁平边 + 弯曲脚 (灰色)
 *   - 圆柱 body (多层半透明 path 模拟圆柱感)
 *   - 内部 anvil (polygon + ellipse, LED 内部阳极支撑)
 *   - dome (color fill + opacity .65 半透明玻璃感)
 *   - 3 处白色高光 (左上/底部/中央) 模拟塑料反射
 *   - 亮时: 中心高斯模糊光晕 (.pin-led-emissive, coder 5dcd054 决策 31f 加的 pulse)
 *
 * viewBox 35×50, 引脚 A x=25 y=42 / K x=15 y=42 (wokwi 1:1).
 * Pin 'A' is anode (positive), 'K' is cathode. Brightness from PartRenderState.pins['A']
 * (0 = off, 1 = full on, or 0..255 from analogWrite in PWM-bright mode).
 */
function makeLed(): PartSpec & { datasheet?: PartDatasheet } {
  return {
    type: 'led',
    displayName: 'LED',
    width: 35,
    height: 50,
    pins: [
      { id: 'A', x: 25, y: 42, label: 'A', pinType: 'digital' },
      { id: 'K', x: 15, y: 42, label: 'K', pinType: 'digital' },
    ],
    defaultPinValues: { K: 0 },
    model: ledModel,
    render(g, state) {
      const anode = state.pins['A'] ?? 0;
      const hasConflict = state.pinConflict?.['A'] || state.pinConflict?.['K'];
      const brightness = hasConflict ? 0 : (anode > 0 ? Math.max(0.15, Math.min(1, anode)) : 0);
      const colorHex = '#ff5252'; // MVP: 固定红色,颜色由 canvas 状态切换
      const lit = brightness > 0;
      // wokwi light opacity: 0.3 + brightness*0.7 (capped 0..1)
      const lightOpacity = lit ? 0.3 + brightness * 0.7 : 0;

      // LED defs — Gaussian blur filters (决策 31b wokwi 1:1)
      const defs = svg('defs', {}) as SVGDefsElement;
      const light1 = svg('filter', { id: 'led-light1', x: '-0.8', y: '-0.8', height: '2.2', width: '2.8' });
      light1.appendChild(svg('feGaussianBlur', { 'stdDeviation': '2' }));
      defs.appendChild(light1);
      const light2 = svg('filter', { id: 'led-light2', x: '-0.8', y: '-0.8', height: '2.2', width: '2.8' });
      light2.appendChild(svg('feGaussianBlur', { 'stdDeviation': '4' }));
      defs.appendChild(light2);

      appendAll(g, [
        defs,
        // Visual pin pads — hover/click hit area + Wokwi-style dark dots
        pinPad('A', 25, 42),
        pinPad('K', 15, 42),
        // 阴极扁平边 (cathode flat edge) — 灰色 rect (wokwi 1:1)
        svg('rect', {
          x: 2.51, y: 20.38, width: 2.15, height: 9.83,
          fill: '#8c8c8c',
        }),
        // 阴极弯曲引脚 (curved cathode lead) — 灰色 path (wokwi 1:1)
        svg('path', {
          d: 'm12.977 30.269c0-1.1736-0.86844-2.5132-1.8916-3.4024-0.41616-0.3672-1.1995-1.0015-1.1995-1.4249v-5.4706h-2.1614v5.7802c0 1.0584 0.94752 1.8785 1.9462 2.7482 0.44424 0.37584 1.3486 1.2496 1.3486 1.7694',
          fill: '#8c8c8c',
        }),
        // LED body — 多层半透明 path 模拟圆柱感 (wokwi opacity .3 + .5)
        svg('path', {
          d: 'm14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z',
          opacity: '0.3',
        }),
        svg('path', {
          d: 'm14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z',
          fill: lit ? colorHex : '#e6e6e6',
          opacity: '0.5',
        }),
        // LED 内部 body (lower half, brighter — opacity .9)
        svg('path', {
          d: 'm14.173 13.001v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v4.6296c1.4738 1.6517 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586l-4e-5 -1.5235c-7e-4 -1.1419-0.4744-2.2032-1.283-3.1054z',
          fill: lit ? colorHex : '#d1d1d1',
          opacity: lit ? '0.85' : '0.9',
        }),
        // 内部 anvil — 阳极支撑 (wokwi polygon)
        svg('polygon', {
          points: '2.2032,16.107 3.1961,16.107 3.1961,13.095 6.0156,13.095 10.012,8.8049 3.407,8.8049 2.2032,9.648',
          fill: '#666666',
        }),
        // 内部 cathode lead — 阴极引线 (wokwi polygon)
        svg('polygon', {
          points: '11.215,9.0338 7.4117,13.095 11.06,13.095 11.06,16.107 11.974,16.107 11.974,8.5241 10.778,8.5241',
          fill: '#666666',
        }),
        // dome — 整体 dome (wokwi fill=color opacity .65 半透明玻璃感)
        svg('path', {
          d: 'm14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z',
          fill: colorHex,
          opacity: '0.65',
        }),
        // 高光 1 — 左上白色 (wokwi path opacity .5)
        svg('path', {
          d: 'm10.388 3.7541 1.4364-0.2736c-0.84168-1.1318-2.0822-1.9577-3.5417-2.2385l0.25416 1.0807c0.76388 0.27072 1.4068 0.78048 1.8511 1.4314z',
          fill: '#ffffff',
          opacity: '0.5',
        }),
        // 高光 2 — 底部反光 (wokwi path opacity .5)
        svg('path', {
          d: 'm0.76824 19.926v1.5199c0.64872 0.5292 1.4335 0.97632 2.3076 1.3169v-1.525c-0.8784-0.33624-1.6567-0.78194-2.3076-1.3118z',
          fill: '#ffffff',
          opacity: '0.5',
        }),
        // 高光 3 — 中央反光 (wokwi path opacity .5)
        svg('path', {
          d: 'm11.073 20.21c-0.2556 0.1224-0.52992 0.22968-0.80568 0.32976-0.05832 0.01944-0.11736 0.04032-0.17784 0.05832-0.56376 0.17928-1.1614 0.31896-1.795 0.39456-0.07488 0.0094-0.1512 0.01872-0.22464 0.01944-0.3204 0.03024-0.64368 0.05832-0.97056 0.05832-0.14832 0-0.30744-0.01512-0.4716-0.02376-1.2002-0.05688-2.3306-0.31464-3.2976-0.73944l-2e-5 -8.3895v-4.8254c0-1.471 0.84816-2.7295 2.0736-3.3494l-0.02232-0.05328-1.2478-1.512c-1.6697 1.003-2.79 2.8224-2.79 4.9118v11.905c-0.04968-0.04968-0.30816-0.30888-0.48024-0.52992l-0.30744 0.6876c1.4011 1.4818 3.8088 2.4617 6.5426 2.4617 1.6798 0 3.2371-0.37368 4.5115-1.0022l-0.52704-0.40896-0.01006 0.0072z',
          fill: '#ffffff',
          opacity: '0.5',
        }),
        // 发光晕 — wokwi 3 ellipse + filter (decision 31b LED 真实发光感, 决策 31f pulse class)
        lit && (() => {
          const lightGroup = svg('g', {}) as SVGGElement;
          lightGroup.appendChild(svg('ellipse', {
            cx: 8, cy: 10, rx: 10, ry: 10,
            fill: colorHex,
            filter: 'url(#led-light2)',
            opacity: String(lightOpacity),
            class: 'pin-led-emissive',
          }));
          lightGroup.appendChild(svg('ellipse', {
            cx: 8, cy: 10, rx: 2, ry: 2,
            fill: '#ffffff',
            filter: 'url(#led-light1)',
          }));
          lightGroup.appendChild(svg('ellipse', {
            cx: 8, cy: 10, rx: 3, ry: 3,
            fill: '#ffffff',
            filter: 'url(#led-light1)',
            opacity: String(lightOpacity),
          }));
          return lightGroup;
        })(),
        // Label
        svg('text', {
          x: 20,
          y: 50,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 6,
        }),
      ].filter(Boolean) as SVGElement[]);
      const labelEl = g.querySelector('text');
      if (labelEl) labelEl.textContent = lit ? `${Math.round(brightness * 100)}%` : 'LED';
    },
    // Decision 31f: real electrical datasheet
    datasheet: {
      voltage: 2.0,       // Vf forward voltage @ 20mA (red LED)
      maxCurrent: 20,      // mA absolute max
      description: '红色Through-Hole LED,Vf=2.0V,If=20mA max',
    },
  };
}

export const led = makeLed();