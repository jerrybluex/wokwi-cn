/**
 * Public entrypoint for parts — single import gives you everything you need.
 *
 *   import { led, arduinoUno, registerPart, getPartSpec, listPartTypes } from '../parts';
 */

export * from './types';
export * from './registry';
export * from './svg';

import { arduinoUno } from './arduino-uno';
import { led } from './led';
import { button } from './button';
import { potentiometer } from './potentiometer';
import { resistor } from './resistor';
import { hcsr04 } from './hcsr04';
import { servo } from './servo';
import { buzzer } from './buzzer';

export {
  arduinoUno,
  led,
  button,
  potentiometer,
  resistor,
  hcsr04,
  servo,
  buzzer,
};
