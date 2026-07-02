import { describe, it, expect } from 'vitest';
import { getPartSpec, listPartTypes } from './registry';
import type { PartSpec } from './types';
import { arduinoUno } from './arduino-uno';
import { led } from './led';
import { button } from './button';
import { potentiometer } from './potentiometer';
import { resistor } from './resistor';
import { hcsr04 } from './hcsr04';
import { servo } from './servo';
import { buzzer } from './buzzer';
import { ssd1306 } from './oled';
import { mpu6050 } from './mpu6050';
import { rgbLed } from './rgb-led';
import { sevenSegment } from './seven-segment';

const SPECS: PartSpec[] = [
  arduinoUno,
  led,
  button,
  potentiometer,
  resistor,
  hcsr04,
  servo,
  buzzer,
  ssd1306,
  mpu6050,
  sevenSegment,
  rgbLed,
];

function makeSvgGroup(): SVGGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', 'g');
}

describe('part registry', () => {
  it('every part is reachable via getPartSpec(type)', () => {
    for (const s of SPECS) {
      expect(getPartSpec(s.type)?.type).toBe(s.type);
    }
  });

  it('listPartTypes returns all parts (no duplicates by type)', () => {
    const list = listPartTypes();
    const ids = list.map((p: PartSpec) => p.type);
    const uniq = new Set(ids);
    expect(uniq.size).toBe(ids.length);
  });

  it('covers the 12 parts (UNO + 11 standard)', () => {
    const required = [
      'arduino-uno',
      'led',
      'button',
      'potentiometer',
      'resistor',
      'hcsr04',
      'servo',
      'buzzer',
      'ssd1306',
      'mpu6050',
      'seven-segment',
      'rgb-led',
    ];
    const list = listPartTypes();
    for (const type of required) {
      expect(list.find((p) => p.type === type), `missing ${type}`).toBeTruthy();
    }
  });
});

describe.each(SPECS)('$displayName ($type)', (spec) => {
  it('has at least one pin', () => {
    expect(spec.pins.length).toBeGreaterThan(0);
  });

  it('has unique pin IDs', () => {
    const ids = spec.pins.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders into an empty <g> without throwing', () => {
    const g = makeSvgGroup();
    expect(() => spec.render(g, { pins: {} })).not.toThrow();
    expect(g.children.length).toBeGreaterThan(0);
  });

  it('renders cleanly with state.pins full of zeros', () => {
    const pins = Object.fromEntries(spec.pins.map((p) => [p.id, 0]));
    const g = makeSvgGroup();
    expect(() => spec.render(g, { pins })).not.toThrow();
  });

  it('renders cleanly with all pins HIGH if applicable', () => {
    const pins = Object.fromEntries(spec.pins.map((p) => [p.id, 1]));
    const g = makeSvgGroup();
    expect(() => spec.render(g, { pins })).not.toThrow();
  });
});

describe('LED brightness from PWM-style state', () => {
  it('updates its on-screen percent label as pin A goes 0→255', () => {
    const captureLabel = (a: number): string => {
      const g = makeSvgGroup();
      led.render(g, { pins: { A: a } });
      const texts = Array.from(g.querySelectorAll('text'));
      return texts.map((t) => t.textContent ?? '').join(' ');
    };
    expect(captureLabel(0)).toContain('LED');
    expect(captureLabel(1)).toMatch(/%/);
    expect(captureLabel(128)).toMatch(/%/);
  });
});

describe('parts with models expose a callable function', () => {
  it('hc-sr04 model returns without errors', () => {
    const ctx = { now: 0, digitalRead: () => 0, pins: {} };
    expect(() => hcsr04.model?.(ctx)).not.toThrow();
  });

  it('servo model propagates PWM 0-255 through SIG pin (not truncated)', () => {
    const ctx = { now: 0, digitalRead: () => 0, pins: { SIG: 90 } };
    const writes = servo.model?.(ctx);
    expect(writes).toHaveLength(1);
    expect(writes![0].pinId).toBe('SIG');
    expect(writes![0].value).toBe(90); // full PWM, not 1
  });

  it('buzzer model returns without errors', () => {
    const ctx = { now: 0, digitalRead: () => 0, pins: { SIG: 1 } };
    expect(() => buzzer.model?.(ctx)).not.toThrow();
  });

  it('mpu6050 model returns without errors', () => {
    const ctx = { now: 0, digitalRead: () => 0, pins: {} };
    expect(() => mpu6050.model?.(ctx)).not.toThrow();
  });
});

describe('OLED (ssd1306)', () => {
  it('has exactly 4 pins', () => {
    expect(ssd1306.pins.length).toBe(4);
  });

  it('pin IDs are vcc/gnd/scl/sda', () => {
    const ids = ssd1306.pins.map((p) => p.id);
    expect(ids).toContain('vcc');
    expect(ids).toContain('gnd');
    expect(ids).toContain('scl');
    expect(ids).toContain('sda');
  });

  it('render produces elements with data-pin attributes', () => {
    const g = makeSvgGroup();
    ssd1306.render(g, { pins: {} });
    const pads = Array.from(g.querySelectorAll('[data-pin]'));
    expect(pads.length).toBeGreaterThanOrEqual(4);
  });
});

describe('MPU-6050 (mpu6050)', () => {
  it('has exactly 5 pins', () => {
    expect(mpu6050.pins.length).toBe(5);
  });

  it('pin IDs include vcc/gnd/scl/sda/int', () => {
    const ids = mpu6050.pins.map((p) => p.id);
    expect(ids).toContain('vcc');
    expect(ids).toContain('gnd');
    expect(ids).toContain('scl');
    expect(ids).toContain('sda');
    expect(ids).toContain('int');
  });
});

describe('RGB LED (rgb-led)', () => {
  it('has exactly 4 pins', () => {
    expect(rgbLed.pins.length).toBe(4);
  });

  it('pin IDs are r/common/g/b', () => {
    const ids = rgbLed.pins.map((p) => p.id);
    expect(ids).toContain('r');
    expect(ids).toContain('common');
    expect(ids).toContain('g');
    expect(ids).toContain('b');
  });

  it('render produces elements with data-pin attributes (wiring support)', () => {
    const g = makeSvgGroup();
    rgbLed.render(g, { pins: { r: 0, g: 0, b: 0, common: 0 } });
    const pads = Array.from(g.querySelectorAll('[data-pin]'));
    expect(pads.length).toBeGreaterThanOrEqual(4);
  });

  it('renders without throwing at all-zero state', () => {
    const g = makeSvgGroup();
    expect(() => rgbLed.render(g, { pins: { r: 0, g: 0, b: 0, common: 0 } })).not.toThrow();
  });

  it('renders without throwing at full-bright state', () => {
    const g = makeSvgGroup();
    expect(() => rgbLed.render(g, { pins: { r: 255, g: 255, b: 255, common: 0 } })).not.toThrow();
  });

  it('shows RGB label when off', () => {
    const g = makeSvgGroup();
    rgbLed.render(g, { pins: { r: 0, g: 0, b: 0, common: 0 } });
    const texts = Array.from(g.querySelectorAll('text'));
    const combined = texts.map((t) => t.textContent ?? '').join(' ');
    expect(combined).toContain('RGB');
  });
});

describe('7-segment display (seven-segment)', () => {
  it('has exactly 9 pins', () => {
    expect(sevenSegment.pins.length).toBe(9);
  });

  it('pin IDs include a-g, dp, common', () => {
    const ids = sevenSegment.pins.map((p) => p.id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).toContain('c');
    expect(ids).toContain('d');
    expect(ids).toContain('e');
    expect(ids).toContain('f');
    expect(ids).toContain('g');
    expect(ids).toContain('dp');
    expect(ids).toContain('common');
  });

  it('render produces elements with data-pin attributes (wiring support)', () => {
    const g = makeSvgGroup();
    const pins = Object.fromEntries(sevenSegment.pins.map((p) => [p.id, 0]));
    sevenSegment.render(g, { pins });
    const pads = Array.from(g.querySelectorAll('[data-pin]'));
    expect(pads.length).toBeGreaterThanOrEqual(9);
  });

  it('renders without throwing at all-off state', () => {
    const g = makeSvgGroup();
    const pins = Object.fromEntries(sevenSegment.pins.map((p) => [p.id, 0]));
    expect(() => sevenSegment.render(g, { pins })).not.toThrow();
  });

  it('renders without throwing at all-on state', () => {
    const g = makeSvgGroup();
    const pins = Object.fromEntries(sevenSegment.pins.map((p) => [p.id, 1]));
    expect(() => sevenSegment.render(g, { pins })).not.toThrow();
  });
});
