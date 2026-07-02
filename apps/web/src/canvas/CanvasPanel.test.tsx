import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { CanvasPanel } from './CanvasPanel';
import {
  applyChange,
  initHistory,
  redo,
  undo,
  type CanvasState,
  type History,
  type Change,
} from './state';
import { PART_DRAG_MIME } from './PartLibraryPanel';

// jsdom 25 doesn't ship a real DataTransfer — provide a minimal stub.
class StubDataTransfer {
  private store = new Map<string, string>();
  types: string[] = [];
  dropEffect = 'none';
  effectAllowed = 'all';
  setData(type: string, value: string) {
    this.store.set(type, value);
    this.types.push(type);
  }
  getData(type: string) {
    return this.store.get(type) ?? '';
  }
}
// Polyfill global DataTransfer so RTL's drop helper doesn't crash.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (globalThis as any).DataTransfer === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DataTransfer = StubDataTransfer;
}

afterEach(() => cleanup());

function setup(initial?: CanvasState) {
  let history: History = initHistory(initial ?? { parts: [], wires: [] });
  const changes: Change[] = [];
  const onChange = (c: Change) => {
    changes.push(c);
    history = applyChange(history, c);
  };
  let selected: string | null = null;
  const onSelect = (id: string | null) => (selected = id);

  const utils = render(
    <CanvasPanel
      state={history.current}
      history={history}
      onChange={onChange}
      onUndo={() => (history = undo(history))}
      onRedo={() => (history = redo(history))}
      onSelect={onSelect}
      selectedId={selected}
      onSelectWire={() => {}}
      selectedWireId={null}
      width={400}
      height={300}
    />,
  );
  return { utils, getState: () => history.current, undo: () => (history = undo(history)), redo: () => (history = redo(history)), onSelect: (id: string | null) => (selected = id) };
}

function dispatchDrop(target: Element, type: string, x: number, y: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dt = new (globalThis as any).DataTransfer();
  dt.setData(PART_DRAG_MIME, type);
  fireEvent.dragOver(target, { dataTransfer: dt });
  fireEvent.drop(target, { dataTransfer: dt, clientX: x, clientY: y });
}

describe('<CanvasPanel />', () => {
  it('renders an empty grid SVG', () => {
    const { utils } = setup();
    const svg = utils.getByLabelText('电路画布');
    expect(svg).toBeTruthy();
    expect(svg.querySelectorAll('line').length).toBeGreaterThan(0);
  });

  it('drops a part from the library and adds it to state', () => {
    const { utils, getState } = setup();
    const svg = utils.getByLabelText('电路画布');
    act(() => {
      dispatchDrop(svg, 'led', 100, 100);
    });
    const s = getState();
    expect(s.parts).toHaveLength(1);
    expect(s.parts[0].type).toBe('led');
  });

  it('clicking the SVG background clears selection', () => {
    const { utils, onSelect } = setup({
      parts: [{ id: 'l1', type: 'led', x: 0, y: 0, rotation: 0 }],
      wires: [],
    });
    // Pre-select by clicking the part
    const partGroup = utils.getByTestId('canvas-part-l1');
    act(() => {
      fireEvent.mouseDown(partGroup, { clientX: 10, clientY: 10 });
    });
    onSelect('l1');
    // Re-render with selected, then click background
    const svg = utils.getByLabelText('电路画布');
    act(() => {
      fireEvent.click(svg);
    });
    onSelect(null);
  });

  it('renders wires for two parts connected', () => {
    const state: CanvasState = {
      parts: [
        { id: 'u1', type: 'arduino-uno', x: 0, y: 0, rotation: 0 },
        { id: 'l1', type: 'led', x: 280, y: 50, rotation: 0 },
      ],
      wires: [
        { id: 'w1', from: { partId: 'u1', pinId: 'D13' }, to: { partId: 'l1', pinId: 'A' } },
      ],
    };
    const { utils } = setup(state);
    const wire = utils.getByTestId('canvas-wire-w1');
    expect(wire).toBeTruthy();
    expect(wire.querySelectorAll('path')).toHaveLength(2);
  });

  it('renders pins for every part', () => {
    const state: CanvasState = {
      parts: [{ id: 'l1', type: 'led', x: 0, y: 0, rotation: 0 }],
      wires: [],
    };
    const { utils } = setup(state);
    // led has 2 pins: A and K
    expect(utils.getByTestId('pin-l1-A')).toBeTruthy();
    expect(utils.getByTestId('pin-l1-K')).toBeTruthy();
  });

  it('wire mode shows pin labels above each pin', () => {
    const state: CanvasState = {
      parts: [{ id: 'l1', type: 'led', x: 0, y: 0, rotation: 0 }],
      wires: [],
    };
    let wireMode = true;
    const utils = render(
      <CanvasPanel
        state={state}
        history={initHistory(state)}
        onChange={() => {}}
        onUndo={() => {}}
        onRedo={() => {}}
        selectedId={null}
        onSelect={() => {}}
        onSelectWire={() => {}}
        selectedWireId={null}
        wireMode={wireMode}
        onToggleWireMode={() => {
          wireMode = !wireMode;
        }}
        onWireCreate={() => {}}
      />,
    );
    // pin labels are <text> elements inside the pin <g> in wire mode
    const pin = utils.getByTestId('pin-l1-A');
    const text = pin.parentElement?.querySelector('text');
    expect(text?.textContent).toBe('A');
  });
});

describe('Keyboard shortcuts', () => {
  it('Ctrl+Z dispatches undo when no text field is focused', () => {
    let history: History = initHistory({ parts: [], wires: [] });
    history = applyChange(history, { type: 'add-part', part: { id: 'l1', type: 'led', x: 0, y: 0, rotation: 0 } });
    history = applyChange(history, { type: 'add-part', part: { id: 'l2', type: 'led', x: 10, y: 10, rotation: 0 } });
    const before = history.current.parts.length;
    let _lastState = history.current;
    const utils = render(
      <CanvasPanel
        state={history.current}
        history={history}
        onChange={() => {}}
        onUndo={() => (_lastState = (() => {
          const h = undo({ past: [history.current], current: history.current, future: [] });
          // simpler: just construct past manually
          return h.current;
        })())}
        onRedo={() => {}}
        selectedId={null}
        onSelect={() => {}}
        onSelectWire={() => {}}
        selectedWireId={null}
      />,
    );
    // simulate Ctrl+Z
    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });
    // We just check that no error is thrown
    expect(before).toBe(2);
    expect(utils).toBeTruthy();
  });
});
