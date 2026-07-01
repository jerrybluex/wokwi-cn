/**
 * Part registry — single source of truth for available components.
 * Adding a new part requires:
 *   1. Write the PartSpec in its own file under src/parts/
 *   2. Import + register it here
 *
 * D3 list: 8 必备件 — UNO / LED / button / POT / resistor / HC-SR04 / servo / buzzer.
 * D3+ 后续追加(放 Phase 2 / 3): OLED / MPU6050 / RGB LED / 7 段 / etc.
 */
import type { PartSpec } from './types';
import { arduinoUno } from './arduino-uno';
import { led } from './led';
import { button } from './button';
import { potentiometer } from './potentiometer';
import { resistor } from './resistor';
import { hcsr04 } from './hcsr04';
import { servo } from './servo';
import { buzzer } from './buzzer';

const REGISTRY: Record<string, PartSpec> = {};

export function registerPart(spec: PartSpec): void {
  if (REGISTRY[spec.type]) {
    throw new Error(`Duplicate part type: ${spec.type}`);
  }
  REGISTRY[spec.type] = spec;
}

export function getPartSpec(type: string): PartSpec | undefined {
  return REGISTRY[type];
}

export function listPartTypes(): PartSpec[] {
  return Object.values(REGISTRY);
}

// Register all parts eagerly so consumers (canvas / sidebar) can list them.
[
  arduinoUno,
  led,
  button,
  potentiometer,
  resistor,
  hcsr04,
  servo,
  buzzer,
].forEach(registerPart);
