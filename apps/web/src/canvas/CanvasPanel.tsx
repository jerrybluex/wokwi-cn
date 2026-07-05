/**
 * CanvasPanel — main SVG canvas. Receives drag from the library, renders
 * every part via its PartSpec, supports click-select, drag-move, delete,
 * rotate, and undo/redo. Wires (D5c) are rendered but the connection
 * builder is added in wiring-toolbar.tsx.
 */
import { useEffect, useRef, useState } from 'react';
import { getPartSpec } from '../parts/registry';
import type { PartSpec } from '../parts/types';
import {
  applyChange,
  genId,
  redo,
  undo,
  type CanvasPart,
  type CanvasState,
  type Change,
  type History,
  type Rotation,
  type Wire,
} from './state';
  import { pinPosition, wiresTouching, manhattanRoute, waypointsToPath } from './wiring';
import { PART_DRAG_MIME } from './PartLibraryPanel';

export interface CanvasPanelProps {
  state: CanvasState;
  history: History;
  onChange: (change: Change) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelect?: (partId: string | null) => void;
  selectedId: string | null;
  onSelectWire?: (wireId: string | null) => void;
  selectedWireId: string | null;
  /** Called ONLY when a wire is completed (both pins selected) */
  onWireCreate?: (from: { partId: string; pinId: string }, to: { partId: string; pinId: string }) => void;
  /** Runtime pin values from the simulator runner (pin number → 0/1 or 0..255). */
  pins?: Record<number, number>;
  width?: number;
  height?: number;
  /** Visual zoom — viewBox shrinks by 1/zoom, parts render larger. Default 1. */
  zoom?: number;
}

export function CanvasPanel(props: CanvasPanelProps) {
  const {
    state,
    history,
    onChange,
    onUndo,
    onRedo,
    onSelect,
    selectedId,
    onSelectWire,
    selectedWireId,
    onWireCreate,
    pins = {},
    width = 800,
    height = 500,
    zoom = 1,
  } = props;
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Screen-relative mouse position for tooltip (updated on mousemove)
  const [screenMousePos, setScreenMousePos] = useState({ x: 0, y: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [dragPartId, setDragPartId] = useState<string | null>(null);
  const [pendingWireFrom, setPendingWireFrom] = useState<{ partId: string; pinId: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Decision 31e: pin tooltip hover state
  const [hoveredPin, setHoveredPin] = useState<{ partId: string; pinId: string } | null>(null);
  // Decision 31f: button pressed state — tracks {partId: pinId → value}
  // Updated on PartNode mousedown/mouseup for 'button' type parts
  const [buttonPinOverrides, setButtonPinOverrides] = useState<Record<string, number>>({});

  const handlePinHover = (partId: string, pinId: string | null) => {
    setHoveredPin(pinId ? { partId, pinId } : null);
  };
  // Decision 31f: button pressed — update buttonPinOverrides state
  const handleButtonPress = (partId: string, pressed: boolean) => {
    setButtonPinOverrides((prev) => ({ ...prev, [`${partId}:A`]: pressed ? 1 : 0 }));
  };

  // Wire interaction (decision 20) is event-driven — no wireMode button any more:
  //   mousedown on [data-pin] → set pendingWireFrom
  //   mousemove over svg       → mousePos updates (PendingWire re-renders the curve)
  //   mouseup on [data-pin]    → onWireCreate + clear pending
  //   mouseup on empty space   → just clear pending (cancel)
  //   ESC                      → clear pending
  // part wrapper `g[data-wire-mode]` is replaced by `g[data-pending-from]`
  // (set when this part holds the in-progress wire's start pin).

  // Map runner pin values to each parts's pins via wire topology.

  // Map runner pin values to each parts's pins via wire topology.
  // Wire electrically connects two pins — they share the same voltage/current.
  // Algorithm:
  //  1. Build adjacency list: (partId, pinId) → [connected (partId, pinId)...]
  //  2. Find "source pins" — pins named D<num> that have a runner value (e.g. u1.D13)
  //  3. BFS from all sources, propagating values through wires
  //  4. Each pin gets the value of whichever source it connects to
  const partPins: Record<string, Record<string, number>> = {};

  // Build adjacency list from wires
  const adj = new Map<string, string[]>();
  const addEdge = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  };
  for (const wire of state.wires) {
    const a = `${wire.from.partId}:${wire.from.pinId}`;
    const b = `${wire.to.partId}:${wire.to.pinId}`;
    addEdge(a, b);
  }

  // Internal pin connections: for passive 2-pin parts (resistor, LED), both pins
  // are on the same electrical net so they share the same voltage level.
  // We add an internal edge between every pair of pins on the same part.
  for (const part of state.parts) {
    const spec = getPartSpec(part.type);
    if (!spec || spec.pins.length < 2) continue;
    const pinKeys = spec.pins.map((p) => `${part.id}:${p.id}`);
    for (let i = 0; i < pinKeys.length; i++) {
      for (let j = i + 1; j < pinKeys.length; j++) {
        addEdge(pinKeys[i], pinKeys[j]);
      }
    }
  }

  // Init every pin with default 0
  const pinValue = new Map<string, number>();
  // Tracks pins that are in electrical conflict (multiple sources driving different values)
  const pinConflict = new Set<string>();

  for (const part of state.parts) {
    for (const pin of getPartSpec(part.type)?.pins ?? []) {
      pinValue.set(`${part.id}:${pin.id}`, 0);
    }
  }

  // Source pins: D<num> from runner, plus GND=0 and VCC=1 implicit sources
  const sourcePins: Array<{ key: string; value: number }> = [];
  for (const part of state.parts) {
    const spec = getPartSpec(part.type);
    if (!spec) continue;
    for (const pin of spec.pins) {
      // D<num> pins driven by runner
      const num = parseInt(pin.id.replace(/\D/g, ''), 10);
      if (!isNaN(num) && pin.id.toUpperCase().startsWith('D')) {
        const runnerVal = pins[num];
        if (runnerVal !== undefined) {
          sourcePins.push({ key: `${part.id}:${pin.id}`, value: runnerVal });
        }
      }
      // GND pins → 0 source
      if (pin.pinType === 'gnd') {
        sourcePins.push({ key: `${part.id}:${pin.id}`, value: 0 });
      }
      // VCC pins → 1 source
      if (pin.pinType === 'vcc') {
        sourcePins.push({ key: `${part.id}:${pin.id}`, value: 1 });
      }
    }
  }

  // BFS: propagate from all sources simultaneously.
  // Track per-pin source count to detect conflicts (multiple different sources).
  const pinSourceCount = new Map<string, number>(); // key → number of sources assigned
  const visited = new Set<string>();
  const queue: Array<{ key: string; value: number }> = [...sourcePins];

  for (const s of sourcePins) {
    pinValue.set(s.key, s.value);
    pinSourceCount.set(s.key, 1);
  }

  while (queue.length > 0) {
    const { key, value } = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);
    const neighbors = adj.get(key) ?? [];
    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        const prev = pinValue.get(nb);
        if (prev === undefined || prev === 0) {
          // First source to reach this pin
          pinValue.set(nb, value);
          pinSourceCount.set(nb, 1);
        } else if (prev !== value) {
          // Conflict: another source already set this pin to a different value
          pinConflict.add(nb);
          pinSourceCount.set(nb, (pinSourceCount.get(nb) ?? 1) + 1);
        } else {
          // Same value — increment source count but no conflict
          pinSourceCount.set(nb, (pinSourceCount.get(nb) ?? 1) + 1);
        }
        queue.push({ key: nb, value });
      }
    }
  }

  // Pack conflict map per part (used by render + model)
  const partConflict: Record<string, Record<string, boolean>> = {};
  for (const part of state.parts) {
    const m: Record<string, boolean> = {};
    for (const pin of getPartSpec(part.type)?.pins ?? []) {
      m[pin.id] = pinConflict.has(`${part.id}:${pin.id}`);
    }
    partConflict[part.id] = m;
  }

  // Pack numeric values
  for (const part of state.parts) {
    const partMap: Record<string, number> = {};
    for (const pin of getPartSpec(part.type)?.pins ?? []) {
      partMap[pin.id] = pinValue.get(`${part.id}:${pin.id}`) ?? 0;
    }
    partPins[part.id] = partMap;
  }

  // ── Run part models (they may write to their own pins) ─────────────────
  const digitalRead = (partId: string, pinId: string): number =>
    pinValue.get(`${partId}:${pinId}`) ?? 0;
  const isPinConflict = (partId: string, pinId: string): boolean =>
    pinConflict.has(`${partId}:${pinId}`);

  for (const part of state.parts) {
    const spec = getPartSpec(part.type);
    if (!spec?.model) continue;
    const ctx = {
      now: Date.now(),
      digitalRead: (pinId: string) => digitalRead(part.id, pinId),
      isPinConflict: (pinId: string) => isPinConflict(part.id, pinId),
      pins: partPins[part.id] ?? {},
    };
    try {
      const writes = spec.model(ctx) ?? [];
      for (const w of writes) {
        pinValue.set(`${part.id}:${w.pinId}`, w.value);
      }
    } catch {
      // model errors are non-fatal in MVP
    }
  }

  // Rebuild partPins with model-updated values
  // Decision 31f: button pressed state — inject buttonPinOverrides on top
  for (const part of state.parts) {
    const partMap: Record<string, number> = {};
    for (const pin of getPartSpec(part.type)?.pins ?? []) {
      partMap[pin.id] = pinValue.get(`${part.id}:${pin.id}`) ?? 0;
    }
    // Button pressed: canvas mousedown/mouseup writes pins['A']=1/0
    // Keyed as `${partId}:A`
    if (part.type === 'button') {
      const override = buttonPinOverrides[`${part.id}:A`];
      if (override !== undefined) partMap['A'] = override;
    }
    partPins[part.id] = partMap;
  }

  // ----- Keyboard shortcuts: Delete, R, Ctrl+Z, Ctrl+Shift+Z, ESC -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingInTextField(e.target)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }
      if (meta && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        onRedo();
        return;
      }
      // 决策 28 (主理人 10:47 P0): Delete/Backspace 优先删 wire (selectedWireId), 再删 part (selectedId)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWireId) {
          e.preventDefault();
          onChange({ type: 'remove-wire', id: selectedWireId });
          onSelectWire?.(null);
          return;
        }
        if (selectedId) {
          e.preventDefault();
          onChange({ type: 'remove-part', id: selectedId });
          onSelect?.(null);
          return;
        }
      }
      if (e.key === 'Escape' && pendingWireFrom) {
        e.preventDefault();
        setPendingWireFrom(null);
        return;
      }
      if (e.key.toLowerCase() === 'r' && selectedId && !pendingWireFrom) {
        e.preventDefault();
        onChange({ type: 'rotate-part', id: selectedId });
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChange, onSelect, onSelectWire, onUndo, onRedo, selectedId, selectedWireId, pendingWireFrom]);

  // ----- Drop from library → add a part at the drop point -----
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(PART_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDragOver(true);
    }
  };
  const _onDragLeave = () => setDragOver(false);
  // 决策 35 (verifier 20:08 BUG): dragLeave 时必须 setDragOver(false) 让蓝色虚线框消失,
  // 之前 onDragLeave={onDragOver} 错误重用 onDragOver (setDragOver(true)) 导致虚线框残留.
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false);
    const type = e.dataTransfer.getData(PART_DRAG_MIME);
    if (!type) return;
    e.preventDefault();
    const spec = getPartSpec(type);
    if (!spec) return;
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
    const newPart: CanvasPart = {
      id: genId(type),
      type,
      x: pt.x - spec.width / 2,
      y: pt.y - spec.height / 2,
      rotation: 0,
    };
    onChange({ type: 'add-part', part: newPart });
    onSelect?.(newPart.id);
  };

  // ----- Click on background → clear selection -----
  const onSvgClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      onSelect?.(null);
      onSelectWire?.(null);
    }
  };

  // ----- mouseup on empty canvas → cancel wire (decision 20) -----
  // If the user released the mouse outside any [data-pin], there is no valid
  // drop target. Part-level mouseup handles the "dropped on a pin" case.
  const onSvgMouseUp = (e: React.MouseEvent) => {
    const target = e.target as Element | null;
    const pinEl = target?.closest('[data-pin]') as Element | null;
    if (pinEl?.hasAttribute('data-pin')) return; // handled by PartNode
    if (pendingWireFrom) setPendingWireFrom(null);
  };

  // ----- Move a part by dragging its body -----
  const onPartMouseDown = (e: React.MouseEvent, partId: string) => {
    e.stopPropagation();
    onSelect?.(partId);
    const part = state.parts.find((p) => p.id === partId);
    if (!part) return;
    setDragPartId(partId);
    const start = clientToSvg(svgRef.current, e.clientX, e.clientY);
    const offsetX = start.x - part.x;
    const offsetY = start.y - part.y;

    const onMove = (ev: MouseEvent) => {
      const cur = clientToSvg(svgRef.current, ev.clientX, ev.clientY);
      onChange({ type: 'move-part', id: partId, x: cur.x - offsetX, y: cur.y - offsetY });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDragPartId(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="flex-1 relative bg-base-100" data-testid="canvas-panel">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        // xMidYMin meet (default) center-anchors the viewBox; switch to
        // xMinYMin meet so the SVG element sticks to the container's top
        // edge when the container is taller than the viewBox aspect — no
        // "white space on top" when the canvas column is wider than tall.
        preserveAspectRatio="xMinYMin meet"
        viewBox={`0 0 ${width / zoom} ${height / zoom}`}
        className="block select-none"
        // pointer-events:auto (决策 36 主理人 20:06 P0 修复): SVG 自己接收 mousedown
        // + 让子元素 (parts/wires) 通过 closest('[data-part-id]') 找到目标 part
        // 之前 pointer-events:none + 子装饰 element 也 none → click 穿透 SVG 到外层 div → mousedown 没 handler → part 无法移动
        pointerEvents="auto"
        // 决策 36: SVG onMouseDown 转发给最近 part (e.target.closest('[data-part-id]')),
        // 让 part body 空白处能拖动 part (不只是 pin pad)
        onMouseDown={(e) => {
          if (pendingWireFrom) return; // wire mode 时不处理 part drag
          const partEl = (e.target as Element | null)?.closest('[data-part-id]');
          if (partEl) {
            const partId = partEl.getAttribute('data-part-id');
            if (partId) onPartMouseDown(e, partId);
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={_onDragLeave}
        onDrop={onDrop}
        onClick={onSvgClick}
        onMouseUp={onSvgMouseUp}
        onMouseMove={(e) => {
          const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
          setMousePos(pt);
          setScreenMousePos({ x: e.clientX, y: e.clientY });
        }}
        role="img"
        aria-label="电路画布"
      >
        <GridBackground width={width} height={height} />
        {/* Render order matters for visual stacking (later = on top):
         *   parts (with their full body shapes) draw FIRST, then wires draw
         *   OVER them so the wire is never occluded by a board / chip body.
         *   PendingWire is the last layer (in-progress routing sits on top
         *   of every committed wire too). */}
        {/* pointer-events:auto 让 part / wire 可点击；pointer-events:none
         *  让 canvas SVG 本身不拦截点击，让装饰元素透传给 pad */}
        <g className="pointer-events-auto">
          {state.parts.map((p) => {
            const spec = getPartSpec(p.type);
            if (!spec) return null;
            return (
              <PartNode
                key={p.id}
                part={p}
                selected={selectedId === p.id}
                dragging={dragPartId === p.id}
                wireMode={!!pendingWireFrom}
                pendingFrom={pendingWireFrom}
                pinValues={partPins[p.id] ?? {}}
                pinConflict={partConflict[p.id] ?? {}}
                // 决策 36: PartNode 不再 onMouseDown prop (SVG 层接管 part drag 转发)
                onPinHover={(pinId) => handlePinHover(p.id, pinId)}
                onButtonPress={handleButtonPress}
                onPinMouseDown={(pinId, e) => {
                  console.log('[WIRE MD] pin=' + pinId + ' part=' + p.id + ' pending=' + JSON.stringify(pendingWireFrom));
                  e.stopPropagation();
                  if (!pendingWireFrom) {
                    setPendingWireFrom({ partId: p.id, pinId });
                  } else if (
                    pendingWireFrom.partId !== p.id ||
                    pendingWireFrom.pinId !== pinId
                  ) {
                    console.log('[WIRE MD] creating wire from=' + JSON.stringify(pendingWireFrom) + ' to=' + p.id + '/' + pinId);
                    onWireCreate?.(pendingWireFrom, { partId: p.id, pinId });
                    setPendingWireFrom(null);
                  }
                  // same pin click while pending → no-op (cancel happens via ESC
                  // or mouseup on empty canvas)
                }}
                onPinMouseUp={(pinId, e) => {
                  e.stopPropagation();
                  if (
                    pendingWireFrom &&
                    (pendingWireFrom.partId !== p.id ||
                      pendingWireFrom.pinId !== pinId)
                  ) {
                    // Drop on a different pin while a wire is in progress.
                    onWireCreate?.(pendingWireFrom, { partId: p.id, pinId });
                    setPendingWireFrom(null);
                  }
                }}
              />
            );
          })}
        </g>
        <g className="pointer-events-auto">
          {state.wires.map((w) => (
            <WireLine
              key={w.id}
              wire={w}
              state={state}
              selected={selectedWireId === w.id}
              onClick={() => onSelectWire?.(w.id)}
              onDelete={() => {
                onChange({ type: 'remove-wire', id: w.id });
                onSelectWire?.(null);
              }}
            />
          ))}
        </g>
        {pendingWireFrom && (
          <g className="pointer-events-auto">
            <PendingWire
              pendingFrom={pendingWireFrom}
              mousePos={mousePos}
              state={state}
            />
          </g>
        )}
        {/* Wire-in-progress pin labels overlay (decision 19). Lives outside
         * PartNode because pin pads now live INSIDE the part body render;
         * labels are decorative / mode-only — pointerEvents none so they
         * don't intercept the click on the underlying pad. */}
        {pendingWireFrom && (
          <g pointerEvents="none">
            {state.parts.map((p) => {
              const spec = getPartSpec(p.type);
              if (!spec) return null;
              return (
                <PartWireLabels key={p.id} part={p} spec={spec} />
              );
            })}
          </g>
        )}
        {dragOver && (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="rgba(0, 121, 209, 0.08)"
            stroke="#0079d1"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            pointerEvents="none"
          />
        )}
      </svg>
      <CanvasToolbar
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        pastCount={history.past.length}
        futureCount={history.future.length}
        selectedId={selectedId}
        onRotate={() => selectedId && onChange({ type: 'rotate-part', id: selectedId })}
        onDelete={() => {
          if (!selectedId) return;
          onChange({ type: 'remove-part', id: selectedId });
          onSelect?.(null);
        }}
        wiring={!!pendingWireFrom}
      />
      {/* 决策 22 (主理人 9:48): 元件库 = 浮动 FAB + 弹窗,0 常驻空间
       *   - 位置:画布右上角 (避开 UNO 板左上区域)
       *   - '+' 圆形按钮 (btn-circle btn-primary)
       *   - 点击 → 弹 popover ul 12 件 (同 dropdown 选项)
       *   - 选中 → onChange({ type: 'add-part', part: {x:60, y:60} })
       *   - 点击外部 / 选中选项 → 自动关闭
       */}
      <PartLibraryFab
        onAdd={(type) =>
          onChange({
            type: 'add-part',
            part: {
              id: genId(type),
              type,
              x: 60,
              y: 60,
              rotation: 0,
            },
          })
        }
      />
      {/* 决策 31e: pin tooltip follows cursor */}
      <PinTooltip hoveredPin={hoveredPin} screenMousePos={screenMousePos} state={state} />
    </div>
  );
}

// ---- Sub-components ---------------------------------------------------------

/**
 * PartLibraryFab — 浮动元件库按钮 (决策 22)
 *   - 画布右上角圆形 '+' 按钮 (btn-circle btn-primary)
 *   - 点击 → 弹 popover 列出 12 件选项
 *   - 选中 → onAdd(type) 通知 parent 添加元件 + 自动关闭
 *   - 点击外部 → 关闭 (useEffect mousedown listener)
 *   - 0 常驻空间,主理人反馈"元件库不要占空间"
 */
function PartLibraryFab({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <div ref={ref} className="absolute top-2 right-2 z-20" data-testid="part-library-fab-root">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn btn-circle btn-primary btn-sm shadow-lg"
        aria-label="添加元件"
        title="添加元件 (FAB)"
        data-testid="part-library-fab"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {open && (
        <ul
          className="absolute right-0 mt-2 menu bg-base-200 rounded-box w-52 p-2 shadow-lg border border-base-300 z-30"
          data-testid="part-library-popover"
        >
          {[
            'arduino-uno',
            'led',
            'rgb-led',
            'button',
            'potentiometer',
            'resistor',
            'hcsr04',
            'servo',
            'buzzer',
            'ssd1306',
            'mpu6050',
            'seven-segment',
          ].map((t) => (
            <li key={t}>
              {/* 决策 33 (主理人 19:45 P0): 拖不动 — 改成 draggable div 双模式
                  (drag-drop + click 保留). canvas drop handler (line 309-323) 已支持
                  PART_DRAG_MIME 通过 e.dataTransfer.getData 取 type. */}
              <div
                draggable
                onDragStart={(e) => {
                  // drag-drop: 把 part type 放进 dataTransfer,canvas drop handler 接
                  e.dataTransfer.setData(PART_DRAG_MIME, t);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => {
                  // click 保留 (双模式): 之前 <a onClick> 直接添加,现在 <div onClick> 一样
                  onAdd(t);
                  setOpen(false);
                }}
                data-testid={`part-tile-${t}`}
                className="text-xs font-mono cursor-grab active:cursor-grabbing select-none px-3 py-2 hover:bg-base-300 rounded"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAdd(t);
                    setOpen(false);
                  }
                }}
              >
                {t}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PartWireLabels({ part, spec }: { part: CanvasPart; spec: PartSpec }) {
  return (
    <>
      {spec.pins.map((pin) => {
        const pos = pinPosition(part, pin.id);
        if (!pos) return null;
        return (
          <text
            key={pin.id}
            x={pos.x}
            y={pos.y - 8}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize={9}
            fill="#ff8585"
          >
            {pin.label ?? pin.id}
          </text>
        );
      })}
    </>
  );
}

function GridBackground({ width, height }: { width: number; height: number }) {
  const step = 20;
  const lines: React.ReactElement[] = [];
  for (let x = 0; x <= width; x += step) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#1a2028" strokeWidth={x % 100 === 0 ? 0.7 : 0.3} />,
    );
  }
  for (let y = 0; y <= height; y += step) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#1a2028" strokeWidth={y % 100 === 0 ? 0.7 : 0.3} />,
    );
  }
  return <g aria-hidden="true" pointerEvents="none">{lines}</g>;
}

function PartNode({
  part,
  selected,
  dragging,
  wireMode,
  pendingFrom,
  pinValues,
  pinConflict,
  onPinMouseDown,
  onPinMouseUp,
  onPinHover,
  onButtonPress,
}: {
  part: CanvasPart;
  selected: boolean;
  dragging: boolean;
  wireMode: boolean;
  pendingFrom: { partId: string; pinId: string } | null;
  pinValues: Record<string, number>;
  pinConflict: Record<string, boolean>;
  onPinMouseDown: (pinId: string, e: React.MouseEvent) => void;
  onPinMouseUp: (pinId: string, e: React.MouseEvent) => void;
  onPinHover: (pinId: string | null) => void;
  onButtonPress: (partId: string, pressed: boolean) => void;
}) {
  const spec = getPartSpec(part.type);
  if (!spec) return null;
  // Architecture (decision 19): every part renders its OWN visual pin pads
  // (circles carrying `data-pin="${PinDef.id}"`) inside spec.render(). The
  // canvas layer no longer draws an independent overlay — click / hover /
  // wire all read the SVG visual directly.
  //
  // Decision 20: wire interaction is click-and-drag, so we listen for
  // mousedown AND mouseup on the part wrapper. mousedown picks the start
  // pin (or starts a part drag if the click landed outside a pad);
  // mouseup picks the target pin or falls through to cancel.
  //
  // 决策 36 (主理人 20:06 P0): part 拖拽逻辑已移到 CanvasPanel SVG 层 (line 394 onMouseDown
  // 通过 closest('[data-part-id]') 找 part + 调用 onPartMouseDown). PartNode 这里只
  // 负责 pin pad 事件 (handleMouseDown 通过 closest('[data-pin]') 区分 pin/空白), 让
  // SVG 层 + PartNode 层各自处理不同 event target 路径。
  const handleMouseDown = (e: React.MouseEvent) => {
    const pinEl = (e.target as Element | null)?.closest('[data-pin]') as Element | null;
    if (pinEl?.hasAttribute('data-pin')) {
      onPinMouseDown(pinEl.getAttribute('data-pin')!, e);
      // Decision 31f: button pressed — set pins['A']=1 on mousedown
      if (part.type === 'button') onButtonPress(part.id, true);
      return;
    }
    // 决策 36 (主理人 20:06 P0): 非 pin pad 的 click 由 CanvasPanel SVG 层 onMouseDown 处理
    // (closest('[data-part-id]') 找 part + 调用 onPartMouseDown). PartNode 不再处理 part drag.
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    const pinEl = (e.target as Element | null)?.closest('[data-pin]') as Element | null;
    if (pinEl?.hasAttribute('data-pin')) {
      onPinMouseUp(pinEl.getAttribute('data-pin')!, e);
      // Decision 31f: button released — set pins['A']=0 on mouseup
      if (part.type === 'button') onButtonPress(part.id, false);
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    const pinEl = (e.target as Element | null)?.closest('[data-pin]') as Element | null;
    const hoveredPin = pinEl?.getAttribute('data-pin') ?? null;
    onPinHover(hoveredPin);
  };
  return (
    <g
      data-testid={`canvas-part-${part.id}`}
      data-part-id={part.id}
      data-wire-mode={wireMode ? 'true' : 'false'}
      data-pending-from={pendingFrom?.partId === part.id ? pendingFrom.pinId : undefined}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      style={{ cursor: dragging ? 'grabbing' : wireMode ? 'crosshair' : 'grab' }}
    >
      <PartBody spec={spec} part={part} pinValues={pinValues} pinConflict={pinConflict} />
      {selected && (
        <rect
          x={part.x - 4}
          y={part.y - 4}
          width={spec.width + 8}
          height={spec.height + 8}
          fill="none"
          stroke="#0079d1"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
    </g>
  );
}

function PartBody({ spec, part, pinValues, pinConflict }: {
  spec: PartSpec; part: CanvasPart; pinValues: Record<string, number>; pinConflict: Record<string, boolean>;
}) {
  return (
    <g
      transform={`translate(${part.x} ${part.y}) rotate(${part.rotation} ${spec.width / 2} ${spec.height / 2})`}
    >
      <PartBodyView spec={spec} part={part} pinValues={pinValues} pinConflict={pinConflict} />
    </g>
  );
}

function PartBodyView({ spec, part, pinValues, pinConflict }: {
  spec: PartSpec; part: CanvasPart; pinValues: Record<string, number>; pinConflict: Record<string, boolean>;
}) {
  const ref = useRef<SVGGElement | null>(null);
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    spec.render(g, { pins: pinValues, pinConflict });
  }, [spec, part.id, part.rotation, pinValues, pinConflict]);
  return <g ref={ref} />;
}

function WireLine({
  wire,
  state,
  selected,
  onClick,
  onDelete,
}: {
  wire: Wire;
  state: CanvasState;
  selected: boolean;
  onClick: () => void;
  /** 决策 28 (主理人 10:47 P0): 选中态显示 X 删除按钮, 触发删除回调 */
  onDelete?: () => void;
}) {
  const fromPart = state.parts.find((p) => p.id === wire.from.partId);
  const toPart = state.parts.find((p) => p.id === wire.to.partId);
  if (!fromPart || !toPart) return null;
  const a = pinPosition(fromPart, wire.from.pinId);
  const b = pinPosition(toPart, wire.to.pinId);
  if (!a || !b) return null;
  // PCB-style Manhattan routing: L-shape orthogonal path
  const waypoints = manhattanRoute(a, b);
  const path = waypointsToPath(waypoints);
  // Delete button at bounding-box center (consistent regardless of route shape)
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      data-testid={`canvas-wire-${wire.id}`}
    >
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />
      <path
        d={path}
        fill="none"
        stroke={selected ? 'var(--canvas-pin-active)' : wire.color ?? 'var(--canvas-wire)'}
        strokeWidth={selected ? 3 : 2}
      />
      {/* 决策 28 (主理人 10:47 P0): 选中态显示红圈 X 删除按钮 (线段中点) */}
      {selected && (
        <g
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          style={{ cursor: 'pointer' }}
          data-testid={`wire-delete-${wire.id}`}
        >
          {/* 透明 hit area (扩大点击区) */}
          <circle cx={midX} cy={midY} r={12} fill="transparent" />
          {/* 红圈背景 */}
          <circle cx={midX} cy={midY} r={9} fill="#dc2626" stroke="white" strokeWidth={1.5} />
          {/* X 字符 */}
          <text
            x={midX}
            y={midY + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontFamily="sans-serif"
            fontSize={11}
            fontWeight="bold"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            ✕
          </text>
        </g>
      )}
    </g>
  );
}

function PendingWire({
  pendingFrom,
  mousePos,
  state,
}: {
  pendingFrom: { partId: string; pinId: string };
  mousePos: { x: number; y: number };
  state: CanvasState;
}) {
  const fromPart = state.parts.find((p) => p.id === pendingFrom.partId);
  if (!fromPart) return null;
  const a = pinPosition(fromPart, pendingFrom.pinId);
  if (!a) return null;
  // PCB-style pending wire: Manhattan L-route to cursor
  const waypoints = manhattanRoute(a, mousePos);
  const path = waypointsToPath(waypoints);
  return (
    <path
      d={path}
      fill="none"
      stroke="#ffb300"
      strokeWidth={2}
      strokeDasharray="6 4"
      pointerEvents="none"
    />
  );
}

function CanvasToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  pastCount,
  futureCount,
  selectedId,
  onRotate,
  onDelete,
  wiring,
}: {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pastCount: number;
  futureCount: number;
  selectedId: string | null;
  onRotate: () => void;
  onDelete: () => void;
  wiring: boolean;
}) {
  return (
    <div className="absolute top-2 left-2 right-2 flex items-center gap-1 text-xs pointer-events-none">
      <div className="bg-base-200/90 rounded-md border border-base-300 px-1 py-0.5 flex gap-1 pointer-events-auto">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="btn btn-ghost btn-xs px-2"
          title="撤销 (Ctrl+Z)"
        >
          ↶ 撤销
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="btn btn-ghost btn-xs px-2"
          title="重做 (Ctrl+Shift+Z)"
        >
          ↷ 重做
        </button>
        <span className="self-center text-[10px] font-mono text-base-content/50 px-1">
          {pastCount}/{futureCount}
        </span>
      </div>
      {selectedId && (
        <div className="bg-base-200/90 rounded-md border border-base-300 px-1 py-0.5 flex gap-1 pointer-events-auto">
          <button
            onClick={onRotate}
            className="btn btn-ghost btn-xs px-2"
            title="旋转 90° (R)"
          >
            ⟳ 旋转
          </button>
          <button
            onClick={onDelete}
            className="btn btn-ghost btn-xs px-2 text-error gap-1"
            title="删除 (Delete)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
            删除
          </button>
        </div>
      )}
      {wiring && (
        <div className="ml-auto bg-warning/20 rounded-md border border-warning px-2 py-0.5 pointer-events-auto text-warning text-[10px] font-mono">
          连线中 — 拖到目标 pin 松开完成 · ESC 取消
        </div>
      )}
    </div>
  );
}

// ---- Utilities --------------------------------------------------------------

function isTypingInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function clientToSvg(
  svg: SVGSVGElement | null,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  if (!svg) return { x: clientX, y: clientY };
  const rect = svg.getBoundingClientRect();
  // jsdom doesn't populate viewBox.baseVal reliably — fall back to width/height
  let vbW = rect.width;
  let vbH = rect.height;
  let vbX = 0;
  let vbY = 0;
  const vb = (svg as unknown as { viewBox?: { baseVal?: { x: number; y: number; width: number; height: number } } }).viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    vbX = vb.x;
    vbY = vb.y;
    vbW = vb.width;
    vbH = vb.height;
  }
  if (rect.width === 0 || rect.height === 0) {
    return { x: clientX, y: clientY };
  }
  const sx = (clientX - rect.left) / rect.width;
  const sy = (clientY - rect.top) / rect.height;
  return { x: vbX + sx * vbW, y: vbY + sy * vbH };
}

/**
 * PinTooltip — decision 31e: floating HTML tooltip following the cursor,
 * showing pin.id and pin type when the user hovers over a pin pad.
 *
 * Displayed only when hoveredPin is set; positioned at mousePos with a
 * small offset so the cursor doesn't cover the text.
 */
function PinTooltip({
  hoveredPin,
  screenMousePos,
  state,
}: {
  hoveredPin: { partId: string; pinId: string } | null;
  screenMousePos: { x: number; y: number };
  state: CanvasState;
}) {
  if (!hoveredPin) return null;

  // Look up the pin type from the registry
  const part = state.parts.find((p) => p.id === hoveredPin.partId);
  const spec = part ? getPartSpec(part.type) : null;
  const pinDef = spec?.pins.find((p) => p.id === hoveredPin.pinId);
  const pinLabel = pinDef?.label ?? hoveredPin.pinId;
  const pinType = pinDef?.pinType ?? 'digital';
  const partLabel = spec?.displayName ?? hoveredPin.partId;

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: screenMousePos.x,
        top: screenMousePos.y - 36,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-slate-800 text-white text-xs font-mono rounded px-2 py-1 shadow-lg border border-slate-600 whitespace-nowrap">
        <span className="text-slate-300">{partLabel}</span>
        <span className="text-white mx-1">·</span>
        <span className="text-yellow-300 font-semibold">{pinLabel}</span>
        <span className="text-slate-400 ml-1">({pinType})</span>
      </div>
      {/* Arrow pointing down */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: '100%' }}
      >
        <div
          className="border-4 border-transparent"
          style={{ borderTopColor: '#1e293b' }}
        />
      </div>
    </div>
  );
}

// re-export for tests
export { applyChange, undo, redo, genId, wiresTouching };
export type { Rotation, CanvasState, History, Change, Wire };
