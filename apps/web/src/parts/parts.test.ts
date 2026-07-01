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

const SPECS: PartSpec[] = [
  arduinoUno,
  led,
  button,
  potentiometer,
  resistor,
  hcsr04,
  servo,
  buzzer,
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

  it('covers the 8 D3 parts (UNO + 7 standard)', () => {
    const required = [
      'arduino-uno',
      'led',
      'button',
      'potentiometer',
      'resistor',
      'hcsr04',
      'servo',
      'buzzer',
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
    const ctx = { now: 0, digitalRead: () => 0 };
    expect(() => hcsr04.model?.(ctx)).not.toThrow();
  });

  it('servo model returns without errors', () => {
    const ctx = { now: 0, digitalRead: () => 0 };
    expect(() => servo.model?.(ctx)).not.toThrow();
  });

  it('buzzer model returns without errors', () => {
    const ctx = { now: 0, digitalRead: () => 0 };
    expect(() => buzzer.model?.(ctx)).not.toThrow();
  });
});
