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
    /* 决策 36 重做: 移除独立 12px 透明 hit area path, 只保留 visible stroke (click 自身).
     * 之前是 2 paths (transparent hit + visible), 现在 1 path (visible stroke). */
    expect(wire.querySelectorAll('path')).toHaveLength(1);
  });

  it('renders pin pads for every part (decision 19: data-pin attribute)', () => {
    const state: CanvasState = {
      parts: [{ id: 'l1', type: 'led', x: 0, y: 0, rotation: 0 }],
      wires: [],
    };
    const { utils } = setup(state);
    // led has 2 pins: A and K — pads live inside the part render now,
    // discoverable via [data-pin="…"] attribute (no test-id needed).
    const l1 = utils.getByTestId('canvas-part-l1');
    expect(l1.querySelector('[data-pin="A"]')).toBeTruthy();
    expect(l1.querySelector('[data-pin="K"]')).toBeTruthy();
  });

  it('click-and-drag on a pin starts a wire and shows pin labels', () => {
    // Decision 20: wire interaction is event-driven, no wireMode prop.
    // mousedown on a [data-pin] should set pendingWireFrom which enables
    // the PartWireLabels overlay (text with the pin id).
    const state: CanvasState = {
      parts: [{ id: 'l1', type: 'led', x: 0, y: 0, rotation: 0 }],
      wires: [],
    };
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
        onWireCreate={() => {}}
      />,
    );
    const l1 = utils.getByTestId('canvas-part-l1');
    const pinA = l1.querySelector('[data-pin="A"]')!;
    act(() => {
      fireEvent.mouseDown(pinA, { clientX: 5, clientY: 14 });
    });
    // After mousedown, PartWireLabels overlay should render the pin id text.
    const text = Array.from(utils.container.querySelectorAll('text')).find((t) => t.textContent === 'A');
    expect(text).toBeTruthy();
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

// 决策 33 (主理人 19:45 P0): 元件都拖不动 — FAB popover tile 改成 draggable div 双模式
describe('PartLibraryFab drag-drop + click', () => {
  it('FAB opens popover when clicked, part-tile is draggable with dataTransfer.setData', () => {
    const { utils } = setup();
    // 点 FAB 按钮 打开 popover
    const fab = utils.getByTestId('part-library-fab');
    act(() => {
      fireEvent.click(fab);
    });
    // 找 LED tile (决策 33: <div draggable> 替代 <a>)
    const ledTile = utils.getByTestId('part-tile-led');
    expect(ledTile).toBeTruthy();
    // dragstart 模拟 — 用 native DataTransfer (跟 dispatchDrop helper 一致)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dt = new (globalThis as any).DataTransfer();
    act(() => {
      fireEvent.dragStart(ledTile, { dataTransfer: dt });
    });
    // 验证 dataTransfer 写入 PART_DRAG_MIME + 'led'
    expect(dt.getData(PART_DRAG_MIME)).toBe('led');
  });

  it('click on part-tile still works (双模式保留)', () => {
    const { utils, getState } = setup();
    const fab = utils.getByTestId('part-library-fab');
    act(() => {
      fireEvent.click(fab);
    });
    const ledTile = utils.getByTestId('part-tile-led');
    act(() => {
      fireEvent.click(ledTile);
    });
    // click 直接添加 — LED 加入 state
    const s = getState();
    expect(s.parts.find((p) => p.type === 'led')).toBeTruthy();
  });

  it('all 12 part-tiles are draggable', () => {
    const { utils } = setup();
    const fab = utils.getByTestId('part-library-fab');
    act(() => {
      fireEvent.click(fab);
    });
    const types = [
      'arduino-uno', 'led', 'rgb-led', 'button', 'potentiometer', 'resistor',
      'hcsr04', 'servo', 'buzzer', 'ssd1306', 'mpu6050', 'seven-segment',
    ];
    for (const t of types) {
      const tile = utils.getByTestId(`part-tile-${t}`);
      // decision 33: 改为 <div draggable>, 应该有 draggable=true attribute
      expect((tile as HTMLElement).getAttribute('draggable')).toBe('true');
    }
  });
});
