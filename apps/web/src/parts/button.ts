import type { PartModel, PartSpec, PinWrite } from './types';
import { svg, appendAll, pinPad } from './svg';

/**
 * Push button — momentary contact.
 *   Pin 'A' — output (reports pressed state to anything wired to it)
 *   Pin 'B' — input ground reference
 *
 * Model: reads the current A pin value (set by canvas click handler) and
 * propagates it through the wire graph. Canvas mousedown sets pins['A']=1,
 * mouseup sets pins['A']=0. Model reads it and writes it back so the value
 * flows to connected parts.
 *
 * The actual click→pin wiring lives in CanvasPanel; model ensures the pin
 * value is visible to other components via the BFS propagation.
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
      const pressed = state.pins['A'] === 1;
      const capClass = pressed ? '#ff5252' : 'var(--part-stroke-soft)';

      appendAll(g, [
        pinPad('A', 0, 14),
        pinPad('B', 0, 36),
        svg('line', { x1: 0, y1: 14, x2: 18, y2: 14, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('line', { x1: 0, y1: 36, x2: 18, y2: 36, stroke: 'var(--part-lead)', 'stroke-width': 1.5 }),
        svg('rect', {
          x: 16,
          y: 8,
          width: 32,
          height: 34,
          rx: 3,
          fill: 'var(--part-body)',
          stroke: 'var(--part-stroke)',
          'stroke-width': 1.5,
        }),
        svg('circle', { cx: 32, cy: 25, r: 9, fill: capClass }),
        svg('text', {
          x: 32,
          y: 50,
          'text-anchor': 'middle',
          fill: 'var(--canvas-text)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 9,
        }),
      ]);
      g.lastElementChild!.textContent = pressed ? 'PRESSED' : 'BUTTON';
    },
  };
}

export const button: PartSpec = (() => {
  const spec = makeButton();
  spec.model = ((_ctx) => {
    // Canvas click handler sets pins['A']=1/0 directly. Model is a no-op —
    // the pin value is already propagated through the BFS pass. No write needed.
    return [] as PinWrite[];
  }) as PartModel;
  return spec;
})();
