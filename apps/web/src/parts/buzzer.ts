import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Active buzzer — emits sound when SIG is HIGH.
 *   Pin 'VCC' — power
 *   Pin 'GND' — ground
 *   Pin 'SIG' — drive HIGH to buzz
 *
 * Model: reads SIG pin. When SIG=1 the view shows buzzing state (glow + wave ring).
 * The model propagates the SIG value so other parts can read it.
 *
 * View: Wokwi 1:1 真图 (决策 31b, 来源 github.com/wokwi/wokwi-elements
 * src/buzzer-element.ts renderSVG). 视觉结构:
 *   - 黑色 body 椭圆 (wokwi ellipse fill=#1a1a1a)
 *   - 2 同心内圆 (sound hole, wokwi circle r=6.35/4.35 fill=none stroke=.3)
 *   - 中心银色发射点 (wokwi circle r=1.37 fill=#ccc)
 *   - 3 根底部引脚 (VCC 灰 / GND 红 / SIG 灰, 对应 wokwi 2 pin 风格延伸)
 *   - 亮时: 内圆变黄 (wokwi fill #f1c40f) + 波纹 (.buzzer-playing coder 5dcd054 决策 31f)
 */
function makeBuzzer(): PartSpec {
  return {
    type: 'buzzer',
    displayName: 'Active Buzzer',
    width: 60,
    height: 56,
    pins: [
      { id: 'VCC', x: 10, y: 56, label: 'VCC', pinType: 'vcc' },
      { id: 'GND', x: 30, y: 56, label: 'GND', pinType: 'gnd' },
      { id: 'SIG', x: 50, y: 56, label: 'SIG', pinType: 'pwm' },
    ],
    defaultPinValues: { GND: 0 },
    render(g, state) {
      const sig = state.pins['SIG'] ?? 0;
      const buzzing = sig >= 1;
      appendAll(g, [
        // 引脚 — 3 根底部
        pinPad('VCC', 10, 56),
        pinPad('GND', 30, 56),
        pinPad('SIG', 50, 56),
        // Axial leads — VCC 灰 / GND 红 (wokwi 红色 path d="m9.77 16.5v3.5") / SIG 灰
        svg('line', { x1: 10, y1: 56, x2: 14, y2: 48, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 30, y1: 56, x2: 30, y2: 50, stroke: '#e74c3c', 'stroke-width': 1.5 }),
        svg('line', { x1: 50, y1: 56, x2: 46, y2: 48, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        // 外圆 body (黑色) — wokwi ellipse cx=8.5 cy=8.5 rx=8.15 ry=8.15 fill=#1a1a1a
        svg('ellipse', {
          cx: 30, cy: 28, rx: 22, ry: 22,
          fill: 'var(--part-body-deep)',
          stroke: 'var(--part-chip-edge)',
          'stroke-width': 1.5,
        }),
        // 内圆 1 — sound hole (wokwi circle r=6.35 fill=none stroke=.3)
        svg('circle', {
          cx: 30, cy: 28, r: 16,
          fill: buzzing ? '#f1c40f' : '#1a1a1a',
          'fill-opacity': buzzing ? '0.9' : '1',
          stroke: '#000000',
          'stroke-width': '0.5',
        }),
        // 内圆 2 — sound hole (wokwi circle r=4.35 fill=none stroke=.3)
        svg('circle', {
          cx: 30, cy: 28, r: 11,
          fill: 'none',
          stroke: '#000000',
          'stroke-width': '0.3',
        }),
        // 中心发射点 — wokwi circle r=1.37 fill=#ccc (银色金属)
        svg('circle', {
          cx: 30, cy: 28, r: 4,
          fill: buzzing ? '#ffffff' : '#888888',
          stroke: '#000000',
          'stroke-width': '0.25',
        }),
        // 中心银色高光点 (wokwi small bright dot)
        svg('circle', {
          cx: 30, cy: 28, r: 1.5,
          fill: '#ffffff',
          opacity: '0.7',
        }),
        // 决策 31f wave ring — coder 5dcd054 加的波纹动画 (CSS .buzzer-playing)
        buzzing && (() => {
          const ring = svg('circle', {
            cx: 30, cy: 28, r: 12,
            fill: 'none',
            stroke: '#f39c12',
            'stroke-width': 2,
            class: 'buzzer-playing',
          });
          return ring;
        })(),
        // Label — 极性标识 (红色 '+' VCC / 黑色 '−' GND)
        svg('text', {
          x: 10,
          y: 53,
          'text-anchor': 'middle',
          fill: '#e74c3c',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 5,
        }),
        svg('text', {
          x: 50,
          y: 53,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 5,
        }),
      ].filter(Boolean) as SVGElement[]);
      const labels = g.querySelectorAll('text');
      if (labels.length >= 2) {
        labels[0].textContent = '+';
        labels[1].textContent = '−';
      }
    },
  };
}

export const buzzer: PartSpec = (() => {
  const spec = makeBuzzer();
  spec.model = ((ctx) => {
    // SIG pin value (after BFS propagation). Reads full resolved value
    // (not truncated to 0/1) so the view reflects the actual driven state.
    const sig = ctx.pins['SIG'] ?? 0;
    return [{ pinId: 'SIG', value: sig }] as PinWrite[];
  }) as PartModel;
  return spec;
})();