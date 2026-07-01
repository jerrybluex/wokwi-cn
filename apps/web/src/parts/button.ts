import type { PartSpec } from './types';
import { svg, appendAll } from './svg';

/**
 * Push button — momentary contact, no internal state.
 * Pin 'A' and 'B' are normally open; the simulator treats this part as
 * input, so its `model` reads digitalRead on 'B' and writes the state to 'A'.
 *
 * For D3 we don't yet wire the canvas-side click → model; that lands in D5.
 */
function makeButton(): PartSpec {
  return {
    type: 'button',
    displayName: 'Push Button',
    width: 60,
    height: 50,
    pins: [
      { id: 'A', x: 0, y: 14, label: 'A' },
      { id: 'B', x: 0, y: 36, label: 'B' },
    ],
    render(g, state) {
      // state.pins['A'] could be 1 if model reports pressed — for now we
      // assume canvas-side pressed flag will be on state later.
      const pressed = state.pins['A'] === 1;
      const capClass = pressed ? '#ff5252' : '#555';

      appendAll(g, [
        svg('line', { x1: 0, y1: 14, x2: 18, y2: 14, stroke: '#888', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 36, x2: 18, y2: 36, stroke: '#888', 'stroke-width': 1.5 }),
        svg('rect', {
          x: 16,
          y: 8,
          width: 32,
          height: 34,
          rx: 3,
          fill: '#262c37',
          stroke: '#3a4250',
          'stroke-width': 1.5,
        }),
        svg('circle', { cx: 32, cy: 25, r: 9, fill: capClass }),
        svg('text', {
          x: 32,
          y: 50,
          'text-anchor': 'middle',
          fill: '#d8dee9',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      g.lastElementChild!.textContent = pressed ? 'PRESSED' : 'BUTTON';
    },
  };
}

export const button = makeButton();
