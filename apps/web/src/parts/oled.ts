import type { PartModel, PartSpec } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * SSD1306 0.96" OLED display — Wokwi 1:1 真图 (决策 32a,
 * 来源 github.com/wokwi/wokwi-elements src/ssd1306-element.ts renderSVG).
 * 视觉结构:
 *   - 蓝色 PCB body (rect x=0.5 y=0.5 width=148 height=114 rx=13 fill=#025CAF stroke=#BE9B72)
 *   - 4 角棕色螺丝 (circle fill=#59340A r=5.5)
 *   - 128×64 OLED 屏幕 (rect fill=#1A1A1A)
 *   - 8 引脚顶部 (Data/Clk/DC/Rst/CS/3V3/Vin/GND, 银色圆)
 *   - 文字标签 (Data/SA0/CS/Vin/Clk/DC/Rst/3v3/Gnd)
 *
 * 注: wokwi 用 LitElement canvas pixelated, MVP 用简化版 — OLED 屏幕画
 * 一个静态 "Hello" 文字或测试 pattern 表示屏幕有内容.
 */
function makeOled(): PartSpec {
  return {
    type: 'ssd1306',
    displayName: 'OLED 128×64',
    width: 100,
    height: 76,
    pins: [
      { id: 'vcc', x: 5, y: 76, label: 'VIN', pinType: 'vcc' },
      { id: 'gnd', x: 20, y: 76, label: 'GND', pinType: 'gnd' },
      { id: 'scl', x: 35, y: 76, label: 'SCL', pinType: 'i2c' },
      { id: 'sda', x: 50, y: 76, label: 'SDA', pinType: 'i2c' },
    ],
    defaultPinValues: { gnd: 0 },
    render(g, _state) {
      appendAll(g, [
        // 引脚
        pinPad('vcc', 5, 76),
        pinPad('gnd', 20, 76),
        pinPad('scl', 35, 76),
        pinPad('sda', 50, 76),
        // Axial leads 银
        svg('line', { x1: 5, y1: 76, x2: 5, y2: 70, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 20, y1: 76, x2: 20, y2: 70, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 35, y1: 76, x2: 35, y2: 70, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 50, y1: 76, x2: 50, y2: 70, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        // 蓝色 PCB body (wokwi fill=#025CAF stroke=#BE9B72 rx=13)
        svg('rect', { x: 0, y: 0, width: 100, height: 64, rx: 5, fill: '#025caf', stroke: '#be9b72', 'stroke-width': 1 }),
        // 4 角棕色螺丝 (wokwi circle fill=#59340A)
        svg('circle', { cx: 4, cy: 4, r: 2, fill: '#59340A' }),
        svg('circle', { cx: 96, cy: 4, r: 2, fill: '#59340A' }),
        svg('circle', { cx: 4, cy: 60, r: 2, fill: '#59340A' }),
        svg('circle', { cx: 96, cy: 60, r: 2, fill: '#59340A' }),
        // OLED 屏幕 (wokwi fill=#1A1A1A)
        svg('rect', { x: 8, y: 12, width: 84, height: 42, fill: '#1a1a1a' }),
        // 屏幕内容 (静态模拟, wokwi 用 canvas pixelated,MVP 用文字 + 像素 grid)
        svg('text', {
          x: 50, y: 30,
          'text-anchor': 'middle',
          fill: '#ffffff',
          'font-family': 'monospace',
          'font-size': 8,
        }),
        svg('text', {
          x: 50, y: 42,
          'text-anchor': 'middle',
          fill: '#ffffff',
          'font-family': 'monospace',
          'font-size': 6,
        }),
        // 像素 grid (decoration, 表示 128×64 像素)
        ...Array.from({ length: 6 }, (_, i) =>
          svg('line', {
            x1: 8 + i * 14, y1: 12, x2: 8 + i * 14, y2: 54,
            stroke: '#333',
            'stroke-width': 0.3,
          }),
        ),
        ...Array.from({ length: 3 }, (_, i) =>
          svg('line', {
            x1: 8, y1: 12 + i * 14, x2: 92, y2: 12 + i * 14,
            stroke: '#333',
            'stroke-width': 0.3,
          }),
        ),
        // 引脚标签 (顶部)
        svg('text', { x: 5, y: 70, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'monospace', 'font-size': 3 }),
        svg('text', { x: 20, y: 70, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'monospace', 'font-size': 3 }),
        svg('text', { x: 35, y: 70, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'monospace', 'font-size': 3 }),
        svg('text', { x: 50, y: 70, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'monospace', 'font-size': 3 }),
      ]);
      const texts = g.querySelectorAll('text');
      texts[0].textContent = 'Hello';
      texts[1].textContent = 'OLED 128×64';
      texts[2].textContent = 'VIN';
      texts[3].textContent = 'GND';
      texts[4].textContent = 'SCL';
      texts[5].textContent = 'SDA';
    },
  };
}

export const ssd1306: PartSpec = (() => {
  const spec = makeOled();
  spec.model = ((_ctx) => []);
  return spec;
})() as PartSpec;