import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate, validateTemplate } from './templates';
import { fromWiringJSON } from '../canvas/wiring';

describe('TEMPLATES', () => {
  it('exports exactly 3 templates', () => {
    expect(TEMPLATES).toHaveLength(3);
  });

  it('every template has non-empty name, description, code, wiring', () => {
    for (const t of TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.code).toBeTruthy();
      expect(t.wiring).toBeTruthy();
    }
  });

  it('every template wiring parses and converts back to valid CanvasState', () => {
    for (const t of TEMPLATES) {
      const parsed = JSON.parse(t.wiring);
      const state = fromWiringJSON(parsed);
      expect(Array.isArray(state.parts)).toBe(true);
      expect(Array.isArray(state.wires)).toBe(true);
      expect(state.parts.length).toBeGreaterThan(0);
      expect(state.wires.length).toBeGreaterThan(0);
    }
  });

  it('validateTemplate returns true for all templates', () => {
    for (const t of TEMPLATES) {
      expect(validateTemplate(t), `template ${t.id} should be valid`).toBe(true);
    }
  });

  it('LED blink template contains UNO + resistor + LED', () => {
    const t = getTemplate('led-blink')!;
    const state = fromWiringJSON(JSON.parse(t.wiring));
    const types = state.parts.map((p) => p.type);
    expect(types).toContain('arduino-uno');
    expect(types).toContain('resistor');
    expect(types).toContain('led');
  });

  it('button LED template contains UNO + button + resistor + LED', () => {
    const t = getTemplate('button-led')!;
    const state = fromWiringJSON(JSON.parse(t.wiring));
    const types = state.parts.map((p) => p.type);
    expect(types).toContain('arduino-uno');
    expect(types).toContain('button');
    expect(types).toContain('resistor');
    expect(types).toContain('led');
  });

  it('PWM dimmer template uses D9 for LED control', () => {
    const t = getTemplate('pwm-dim')!;
    const state = fromWiringJSON(JSON.parse(t.wiring));
    // Find the wire from UNO to resistor
    const uno = state.parts.find((p) => p.type === 'arduino-uno')!;
    const resistor = state.parts.find((p) => p.type === 'resistor')!;
    const wireToResistor = state.wires.find(
      (w) => w.from.partId === uno.id && w.to.partId === resistor.id,
    );
    expect(wireToResistor).toBeDefined();
    expect(wireToResistor!.from.pinId).toBe('D9');
  });

  it('getTemplate returns undefined for unknown id', () => {
    expect(getTemplate('does-not-exist')).toBeUndefined();
  });

  it('each template has different id', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
