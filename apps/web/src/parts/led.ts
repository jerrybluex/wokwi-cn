import type { PartSpec, PartContext } from './types';
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
 * LED — 真 LED 外观 (Wokwi 风格):
 *   - 红色圆柱 body (rect, 实心) + 半球 dome (semicircle, 半透明)
 *   - 阴极侧 flat edge 标记 (K)
 *   - 内部 anvil (三角形) 透过 dome 可见
 *   - 2 根银色 axial leads 接到 pin pad
 *   - 亮时:dome 高光 + 圆光晕
 * Pin 'A' is anode (positive), 'K' is cathode. Brightness from PartRenderState.pins['A']
 * (0 = off, 1 = full on, or 0..255 from analogWrite in PWM-bright mode).
 *
 * Model: detects reverse-bias (K driven high) and conflict/short conditions
 * to correctly turn the LED off.
 */
function makeLed(): PartSpec {
  return {
    type: 'led',
    displayName: 'LED',
    width: 60,
    height: 50,
    pins: [
      { id: 'A', x: 0, y: 16, label: 'A', pinType: 'digital' },
      { id: 'K', x: 0, y: 34, label: 'K', pinType: 'digital' },
    ],
    defaultPinValues: { K: 0 },
    model: ledModel,
    render(g, state) {
      const anode = state.pins['A'] ?? 0;
      const hasConflict = state.pinConflict?.['A'] || state.pinConflict?.['K'];
      // PWM-aware: brighten if analog value > 0; off if conflict or reverse bias
      const brightness = hasConflict ? 0 : (anode > 0 ? Math.max(0.15, Math.min(1, anode)) : 0);
      const colorHex = '#ff5252'; // MVP: 固定红色,颜色由 canvas 状态切换
      const lit = brightness > 0;

      appendAll(g, [
        // Visual pin pads — hover/click hit area + Wokwi-style dark dots
        pinPad('A', 0, 16),
        pinPad('K', 0, 34),
        // Axial leads (银色,实心) 从 pad 接到 LED body 边缘
        svg('line', { x1: 0, y1: 16, x2: 20, y2: 16, stroke: '#a0a0a0', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 34, x2: 20, y2: 34, stroke: '#a0a0a0', 'stroke-width': 1.5 }),
        // Cylindrical body (实心 rect,LED 下半身,圆柱感)
        svg('rect', {
          x: 20,
          y: 20,
          width: 24,
          height: 14,
          fill: lit ? colorHex : '#5a1010',
          stroke: '#222',
          'stroke-width': 1.2,
        }),
        // Dome (半球 semicircle,半透明玻璃感)
        svg('path', {
          d: 'M 20 20 A 12 12 0 0 1 44 20 Z',
          fill: lit ? colorHex : '#5a1010',
          'fill-opacity': lit ? 0.85 : 0.95,
          stroke: '#222',
          'stroke-width': 1.2,
        }),
        // Cathode flat edge (右侧 K 标记 — 真 LED 阴极有平面边)
        svg('line', { x1: 44, y1: 20, x2: 44, y2: 30, stroke: '#000', 'stroke-width': 2.5 }),
        // Internal anvil (三角形,透过 dome 可见,模拟 LED 内部 anvil 结构)
        svg('polygon', {
          points: '26,18 32,12 38,18',
          fill: '#222',
          opacity: 0.7,
        }),
        // Dome 高光 (亮时显示,3D 效果 — 左上小白点)
        lit && svg('ellipse', {
          cx: 26,
          cy: 14,
          rx: 3.5,
          ry: 1.5,
          fill: '#fff',
          'fill-opacity': 0.7 * brightness,
        }),
        // Glow halo when lit
        lit && svg('circle', {
          cx: 32,
          cy: 24,
          r: 17,
          fill: colorHex,
          'fill-opacity': brightness * 0.3,
        }),
        // Label
        svg('text', {
          x: 32,
          y: 47,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 8,
        }),
      ].filter(Boolean) as SVGElement[]);
      g.lastElementChild!.textContent = lit ? `${Math.round(brightness * 100)}%` : 'LED';
    },
  };
}

export const led = makeLed();