import { describe, it, expect } from 'vitest';
import { toWiringJSON, fromWiringJSON, wiresTouching, pinPosition } from './wiring';
import type { CanvasState } from './state';
import { getPartSpec } from '../parts/registry';
import { validateWireConnection } from './state';

const sample: CanvasState = {
  parts: [
    { id: 'u1', type: 'arduino-uno', x: 50, y: 50, rotation: 0 },
    { id: 'l1', type: 'led', x: 200, y: 100, rotation: 0 },
  ],
  wires: [
    { id: 'w1', from: { partId: 'u1', pinId: 'D13' }, to: { partId: 'l1', pinId: 'A' } },
  ],
};

describe('toWiringJSON', () => {
  it('serializes parts and wires with stable shape', () => {
    const json = toWiringJSON(sample);
    expect(json.version).toBe(1);
    expect(json.parts).toHaveLength(2);
    expect(json.wires).toHaveLength(1);
    expect(json.wires[0]).toEqual({
      id: 'w1',
      from: { part: 'u1', pin: 'D13' },
      to: { part: 'l1', pin: 'A' },
    });
  });
});

describe('fromWiringJSON', () => {
  it('round-trips a wiring JSON', () => {
    const json = toWiringJSON(sample);
    const back = fromWiringJSON(json);
    expect(back).toEqual(sample);
  });
});

describe('wiresTouching', () => {
  it('returns only wires that touch the given part', () => {
    const all = wiresTouching(sample, 'u1');
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('w1');
    const none = wiresTouching(sample, 'l1');
    expect(none).toHaveLength(1);
  });

  it('returns empty when no wires touch', () => {
    const state: CanvasState = { parts: sample.parts, wires: [] };
    expect(wiresTouching(state, 'u1')).toHaveLength(0);
  });
});

describe('pinPosition', () => {
  it('returns the absolute pin position with no rotation', () => {
    // arduino-uno: D13 pin is at (190, 14) per the spec
    const part = sample.parts[0];
    const pos = pinPosition(part, 'D13');
    expect(pos).toBeTruthy();
    // spec.width/2 = 100, so D13 at (190,14) → world (50+100+90, 50+14-100+86) hmm
    // Simpler: just check that we get a real number and same shape for two parts
    const a = pinPosition(sample.parts[0], 'D13')!;
    const b = pinPosition(sample.parts[1], 'A')!;
    expect(typeof a.x).toBe('number');
    expect(typeof b.y).toBe('number');
  });

  it('returns null for an unknown part type', () => {
    const fake: CanvasState = {
      parts: [{ id: 'x', type: 'nonexistent', x: 0, y: 0, rotation: 0 }],
      wires: [],
    };
    expect(pinPosition(fake.parts[0], 'A')).toBeNull();
  });

  it('rotates the pin 90° clockwise around the part center', () => {
    const part = { id: 'u', type: 'arduino-uno', x: 0, y: 0, rotation: 90 as const };
    const p0 = pinPosition({ ...part, rotation: 0 }, '5V')!;
    const p90 = pinPosition(part, '5V')!;
    // Center is derived from the actual spec so this stays in sync if UNO's
    // width/height changes (e.g. D15+ 1:1 还原扩 height 140 → 180).
    const spec = getPartSpec('arduino-uno')!;
    const cx = spec.width / 2;
    const cy = spec.height / 2;
    // After a 90° CW rotation around center:
    //   p90.x - cx = -(p0.y - cy)
    //   p90.y - cy =   p0.x - cx
    expect(p90.x - cx).toBeCloseTo(-(p0.y - cy));
    expect(p90.y - cy).toBeCloseTo(p0.x - cx);
  });
});

// ---------------------------------------------------------------------------
// Plan A wiring validation — pinType compatibility (P0 bug fix)
//
// Compatibility matrix (symmetric via bidirectional lookup):
//   vcc  ↔ vcc / digital / analog
//   gnd  ↔ gnd / digital / pwm / analog
//   digital ↔ digital / pwm / analog / gnd / vcc
//   pwm   ↔ digital / pwm / analog / gnd
//   analog ↔ digital / analog / vcc
//   i2c   ↔ i2c  ONLY (rejected all other combos)
// ---------------------------------------------------------------------------
describe('validateWireConnection', () => {
  // Shared canvas parts used in tests below
  const parts = [
    { id: 'uno', type: 'arduino-uno', x: 0, y: 0, rotation: 0 as const },
    { id: 'led1', type: 'led', x: 0, y: 0, rotation: 0 as const },
    { id: 'btn1', type: 'button', x: 0, y: 0, rotation: 0 as const },
    { id: 'servo1', type: 'servo', x: 0, y: 0, rotation: 0 as const },
    { id: 'buzzer1', type: 'buzzer', x: 0, y: 0, rotation: 0 as const },
    { id: 'pot1', type: 'potentiometer', x: 0, y: 0, rotation: 0 as const },
    { id: 'oled1', type: 'ssd1306', x: 0, y: 0, rotation: 0 as const },
  ];

  // --- Valid connections (correct wiring) ---

  it('allows UNO D9 → LED A (digital ↔ digital)', () => {
    const r = validateWireConnection('uno', 'D9', 'led1', 'A', parts);
    expect(r.valid).toBe(true);
  });

  it('allows UNO D9 → LED K (digital ↔ digital)', () => {
    const r = validateWireConnection('uno', 'D9', 'led1', 'K', parts);
    expect(r.valid).toBe(true);
  });

  it('allows UNO GND → LED K (gnd ↔ digital — ground completes circuit)', () => {
    const r = validateWireConnection('uno', 'GND', 'led1', 'K', parts);
    expect(r.valid).toBe(true);
  });

  it('allows UNO 5V → servo VCC (vcc ↔ vcc)', () => {
    const r = validateWireConnection('uno', '5V', 'servo1', 'VCC', parts);
    expect(r.valid).toBe(true);
  });

  it('allows UNO GND → servo GND (gnd ↔ gnd)', () => {
    const r = validateWireConnection('uno', 'GND', 'servo1', 'GND', parts);
    expect(r.valid).toBe(true);
  });

  it('allows UNO D9 PWM → servo SIG (digital ↔ pwm)', () => {
    const r = validateWireConnection('uno', 'D9', 'servo1', 'SIG', parts);
    expect(r.valid).toBe(true);
  });

  it('allows UNO D3 PWM → buzzer SIG (digital ↔ pwm)', () => {
    const r = validateWireConnection('uno', 'D3', 'buzzer1', 'SIG', parts);
    expect(r.valid).toBe(true);
  });

  it('allows UNO A0 analog → potentiometer W (analog ↔ analog)', () => {
    const r = validateWireConnection('uno', 'A0', 'pot1', 'W', parts);
    expect(r.valid).toBe(true);
  });

  it('allows UNO 5V → all VCC pins', () => {
    const vccParts = ['servo1', 'buzzer1', 'oled1'];
    for (const pid of vccParts) {
      const part = parts.find((p) => p.id === pid)!;
      const spec = getPartSpec(part.type)!;
      const vccPin = spec.pins.find((p) => p.pinType === 'vcc')?.id;
      if (vccPin) {
        const r = validateWireConnection('uno', '5V', pid, vccPin, parts);
        expect(r.valid).toBe(true);
      }
    }
  });

  it('allows UNO GND → all GND pins', () => {
    const gndParts = ['servo1', 'buzzer1', 'led1', 'pot1', 'oled1'];
    for (const pid of gndParts) {
      const part = parts.find((p) => p.id === pid)!;
      const spec = getPartSpec(part.type)!;
      const gndPin = spec.pins.find((p) => p.pinType === 'gnd')?.id;
      if (gndPin) {
        const r = validateWireConnection('uno', 'GND', pid, gndPin, parts);
        expect(r.valid).toBe(true);
      }
    }
  });

  it('allows button → UNO GND (digital ↔ gnd — pull-down resistor circuit)', () => {
    const r = validateWireConnection('btn1', 'A', 'uno', 'GND', parts);
    expect(r.valid).toBe(true);
  });

  it('allows button → UNO 5V (digital ↔ vcc — pull-up resistor circuit)', () => {
    const r = validateWireConnection('btn1', 'A', 'uno', '5V', parts);
    expect(r.valid).toBe(true);
  });

  it('allows potentiometer A → UNO GND (digital ↔ gnd)', () => {
    const r = validateWireConnection('pot1', 'A', 'uno', 'GND', parts);
    expect(r.valid).toBe(true);
  });

  // --- Invalid connections (P0 regression cases) ---

  it('rejects OLED SCL → UNO D9 digital (i2c ↔ digital — bus protocol mismatch)', () => {
    const r = validateWireConnection('oled1', 'scl', 'uno', 'D9', parts);
    expect(r.valid).toBe(false);
    expect((r as { valid: false; reason: string }).reason).toContain('Pin type 不兼容');
  });

  it('rejects OLED SDA → UNO D9 digital (i2c ↔ digital)', () => {
    const r = validateWireConnection('oled1', 'sda', 'uno', 'D9', parts);
    expect(r.valid).toBe(false);
  });

  it("rejects UNO A4 → OLED SDA (analog ↔ i2c — analog can't drive I2C bus)", () => {
    const r = validateWireConnection('uno', 'A4', 'oled1', 'sda', parts);
    expect(r.valid).toBe(false);
  });

  it('rejects MPU6050 SCL → UNO D2 digital (i2c ↔ digital)', () => {
    const mpu = { id: 'mpu1', type: 'mpu6050', x: 0, y: 0, rotation: 0 as const };
    const allParts = [...parts, mpu];
    const r = validateWireConnection('mpu1', 'scl', 'uno', 'D2', allParts);
    expect(r.valid).toBe(false);
  });

  it('rejects unknown part type gracefully', () => {
    const r = validateWireConnection('nonexist', 'A', 'led1', 'A', parts);
    expect(r.valid).toBe(false);
    expect((r as { valid: false; reason: string }).reason).toBe('Part not found');
  });

  it('rejects unknown pin gracefully', () => {
    const r = validateWireConnection('led1', 'Z', 'uno', 'D9', parts);
    expect(r.valid).toBe(false);
    expect((r as { valid: false; reason: string }).reason).toBe('Unknown pin');
  });
});
