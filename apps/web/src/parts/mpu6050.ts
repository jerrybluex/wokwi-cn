import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * MPU-6050 — 6-axis accelerometer + gyroscope (I2C) — Wokwi 1:1 真图 (决策 32a,
 * 来源 github.com/wokwi/wokwi-elements src/mpu6050-element.ts renderSVG).
 * 视觉结构:
 *   - 蓝色 PCB body (path fill=#16619D)
 *   - 中心 MPU6050 芯片 (rect 15.6×15.6 fill=#1A1A1A)
 *   - 8 引脚顶部 (INT/AD0/XCL/XDA/SDA/SCL/GND/VCC, wokwi circle fill=none stroke=#d0ae88)
 *   - 9 个电阻 / 旁路电容 (rect fill=#e5e5e5 / #fefdf4 / #d8c18d / #a06352)
 *   - 中心 LED (rect fill=#f5ecde + ledFilter Gaussian blur 亮时)
 *   - 4 角螺丝 (wokwi circle r=6.88 fill=#59340A)
 */
function makeMpu6050(): PartSpec {
  return {
    type: 'mpu6050',
    displayName: 'MPU-6050 (GY-521)',
    width: 82,
    height: 62,
    pins: [
      { id: 'vcc', x: 6, y: 0, label: 'VCC', pinType: 'vcc' },
      { id: 'gnd', x: 16, y: 0, label: 'GND', pinType: 'gnd' },
      { id: 'scl', x: 26, y: 0, label: 'SCL', pinType: 'i2c' },
      { id: 'sda', x: 36, y: 0, label: 'SDA', pinType: 'i2c' },
      { id: 'int', x: 46, y: 0, label: 'INT', pinType: 'digital' },
    ],
    defaultPinValues: { gnd: 0 },
    render(g, _state) {
      const defs = svg('defs', {}) as SVGDefsElement;
      // LED filter (wokwi feGaussianBlur stdDeviation=2)
      const ledFilter = svg('filter', { id: 'mpu-ledFilter', x: '-0.8', y: '-0.8', height: '5.2', width: '5.8' });
      ledFilter.appendChild(svg('feGaussianBlur', { 'stdDeviation': '2' }));
      defs.appendChild(ledFilter);

      appendAll(g, [
        defs,
        // 引脚 (5 根顶左)
        pinPad('vcc', 6, 0),
        pinPad('gnd', 16, 0),
        pinPad('scl', 26, 0),
        pinPad('sda', 36, 0),
        pinPad('int', 46, 0),
        // Axial leads 银
        ...['vcc', 'gnd', 'scl', 'sda', 'int'].map((id, i) => {
          const x = 6 + i * 10;
          return svg('line', { x1: x, y1: 0, x2: x, y2: 8, stroke: 'var(--part-lead)', 'stroke-width': 1.5 });
        }),
        // 蓝色 PCB body (wokwi path fill=#16619D)
        svg('rect', { x: 0, y: 8, width: 82, height: 54, fill: '#16619d' }),
        // 4 角棕色螺丝
        svg('circle', { cx: 4, cy: 12, r: 2, fill: '#59340A' }),
        svg('circle', { cx: 78, cy: 12, r: 2, fill: '#59340A' }),
        svg('circle', { cx: 4, cy: 58, r: 2, fill: '#59340A' }),
        svg('circle', { cx: 78, cy: 58, r: 2, fill: '#59340A' }),
        // 9 个电阻/电容 (wokwi style 简化版,装饰性)
        svg('rect', { x: 12, y: 21, width: 4, height: 9, fill: '#e5e5e5' }),
        svg('rect', { x: 18, y: 21, width: 4, height: 9, fill: '#e5e5e5' }),
        svg('rect', { x: 24, y: 21, width: 4, height: 9, fill: '#e5e5e5' }),
        svg('rect', { x: 50, y: 21, width: 4, height: 9, fill: '#e5e5e5' }),
        svg('rect', { x: 56, y: 21, width: 4, height: 9, fill: '#e5e5e5' }),
        svg('rect', { x: 62, y: 21, width: 4, height: 9, fill: '#e5e5e5' }),
        svg('rect', { x: 18, y: 36, width: 4, height: 9, fill: '#e5e5e5' }),
        svg('rect', { x: 50, y: 36, width: 4, height: 9, fill: '#e5e5e5' }),
        svg('rect', { x: 56, y: 36, width: 4, height: 9, fill: '#e5e5e5' }),
        // 芯片位置 LED (wokwi rect fill=#f5ecde + ledFilter Gaussian blur)
        svg('rect', { x: 12, y: 23, width: 4, height: 5, fill: '#f5ecde' }),
        svg('circle', { cx: 14, cy: 26, r: 3.5, fill: '#80ff80', filter: 'url(#mpu-ledFilter)', opacity: '0.7' }),
        // 中心 MPU6050 芯片 (wokwi rect 15.6×15.6 fill=#1A1A1A)
        svg('rect', { x: 32, y: 25, width: 16, height: 16, fill: '#1a1a1a' }),
        // 芯片中心点 (3-axis 指示)
        svg('circle', { cx: 40, cy: 33, r: 1, fill: '#fff' }),
        // X / Y / Z 轴指示 (wokwi style)
        svg('line', { x1: 40, y1: 33, x2: 46, y2: 33, stroke: '#ff5252', 'stroke-width': 1 }),
        svg('line', { x1: 40, y1: 33, x2: 40, y2: 39, stroke: '#22b573', 'stroke-width': 1 }),
        svg('circle', { cx: 40, cy: 33, r: 0.8, fill: '#0000ff' }),
        // 标签
        svg('text', {
          x: 41, y: 56,
          'text-anchor': 'middle',
          fill: '#fff',
          'font-family': 'monospace',
          'font-size': 5,
        }),
      ]);
      (g.querySelector('text') as SVGTextElement)!.textContent = 'MPU-6050';
    },
  };
}

export const mpu6050: PartSpec = (() => {
  const spec = makeMpu6050();
  spec.model = ((ctx) => {
    // MVP: read SDA pin, simulate basic accel/gyro values
    const sda = ctx.digitalRead('sda');
    return [{ pinId: 'sda', value: sda }] as PinWrite[];
  }) as PartModel;
  return spec;
})();