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
import { pinPosition, wiresTouching } from './wiring';
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
  const [dragOver, setDragOver] = useState(false);
  const [dragPartId, setDragPartId] = useState<string | null>(null);
  const [pendingWireFrom, setPendingWireFrom] = useState<{ partId: string; pinId: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
  for (const part of state.parts) {
    for (const pin of getPartSpec(part.type)?.pins ?? []) {
      pinValue.set(`${part.id}:${pin.id}`, 0);
    }
  }

  // Source pins: named D<num> (Arduino digital pins) with a runner value
  const sourcePins: Array<{ key: string; value: number }> = [];
  for (const part of state.parts) {
    for (const pin of getPartSpec(part.type)?.pins ?? []) {
      const num = parseInt(pin.id.replace(/\D/g, ''), 10);
      if (!isNaN(num) && pin.id.toUpperCase().startsWith('D')) {
        const runnerVal = pins[num];
        if (runnerVal !== undefined) {
          sourcePins.push({ key: `${part.id}:${pin.id}`, value: runnerVal });
        }
      }
    }
  }

  // BFS: propagate values from sources through the wire graph
  const visited = new Set<string>();
  const queue: Array<{ key: string; value: number }> = [...sourcePins];
  for (const s of sourcePins) pinValue.set(s.key, s.value);

  while (queue.length > 0) {
    const { key, value } = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);
    const neighbors = adj.get(key) ?? [];
    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        // If this neighbor hasn't been assigned a source value yet, assign ours
        if (!pinValue.has(nb) || pinValue.get(nb) === 0) {
          pinValue.set(nb, value);
        }
        queue.push({ key: nb, value });
      }
    }
  }

  // Pack into per-part maps
  for (const part of state.parts) {
    const partMap: Record<string, number> = {};
    for (const pin of getPartSpec(part.type)?.pins ?? []) {
      partMap[pin.id] = pinValue.get(`${part.id}:${pin.id}`) ?? 0;
    }
    partPins[part.id] = partMap;
  }

  // ── Run part models (they may write to their own pins) ─────────────────
  // digitalRead reads the current resolved pin value (after BFS propagation).
  const digitalRead = (partId: string, pinId: string): number =>
    pinValue.get(`${partId}:${pinId}`) ?? 0;

  for (const part of state.parts) {
    const spec = getPartSpec(part.type);
    if (!spec?.model) continue;
    const ctx = {
      now: Date.now(),
      digitalRead: (pinId: string) => digitalRead(part.id, pinId),
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
  for (const part of state.parts) {
    const partMap: Record<string, number> = {};
    for (const pin of getPartSpec(part.type)?.pins ?? []) {
      partMap[pin.id] = pinValue.get(`${part.id}:${pin.id}`) ?? 0;
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        onChange({ type: 'remove-part', id: selectedId });
        onSelect?.(null);
        return;
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
  }, [onChange, onSelect, onUndo, onRedo, selectedId, pendingWireFrom]);

  // ----- Drop from library → add a part at the drop point -----
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(PART_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDragOver(true);
    }
  };
  const onDragLeave = () => setDragOver(false);
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
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onSvgClick}
        onMouseUp={onSvgMouseUp}
        onMouseMove={(e) => {
          const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
          setMousePos(pt);
        }}
        role="img"
        aria-label="电路画布"
      >
        <GridBackground width={width} height={height} />
        {/* wires drawn first so they sit under the parts */}
        <g>
          {state.wires.map((w) => (
            <WireLine
              key={w.id}
              wire={w}
              state={state}
              selected={selectedWireId === w.id}
              onClick={() => onSelectWire?.(w.id)}
            />
          ))}
        </g>
        {pendingWireFrom && (
          <PendingWire
            pendingFrom={pendingWireFrom}
            mousePos={mousePos}
            state={state}
          />
        )}
        <g>
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
                onMouseDown={(e) => onPartMouseDown(e, p.id)}
                onPinMouseDown={(pinId, e) => {
                  // Decision 20: click-and-drag wire interaction.
                  // mousedown on [data-pin] starts the wire (or completes if the
                  // user clicked a different pin with NO drag). mouseup on a
                  // different pin while dragging completes the wire.
                  e.stopPropagation();
                  if (!pendingWireFrom) {
                    setPendingWireFrom({ partId: p.id, pinId });
                  } else if (
                    pendingWireFrom.partId !== p.id ||
                    pendingWireFrom.pinId !== pinId
                  ) {
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
    </div>
  );
}

// ---- Sub-components ---------------------------------------------------------

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
  return <g aria-hidden="true">{lines}</g>;
}

function PartNode({
  part,
  selected,
  dragging,
  wireMode,
  pendingFrom,
  pinValues,
  onMouseDown,
  onPinMouseDown,
  onPinMouseUp,
}: {
  part: CanvasPart;
  selected: boolean;
  dragging: boolean;
  wireMode: boolean;
  pendingFrom: { partId: string; pinId: string } | null;
  pinValues: Record<string, number>;
  onMouseDown: (e: React.MouseEvent) => void;
  onPinMouseDown: (pinId: string, e: React.MouseEvent) => void;
  onPinMouseUp: (pinId: string, e: React.MouseEvent) => void;
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
  const handleMouseDown = (e: React.MouseEvent) => {
    const pinEl = (e.target as Element | null)?.closest('[data-pin]') as Element | null;
    if (pinEl?.hasAttribute('data-pin')) {
      onPinMouseDown(pinEl.getAttribute('data-pin')!, e);
      return;
    }
    onMouseDown(e);
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    const pinEl = (e.target as Element | null)?.closest('[data-pin]') as Element | null;
    if (pinEl?.hasAttribute('data-pin')) {
      onPinMouseUp(pinEl.getAttribute('data-pin')!, e);
    }
  };
  return (
    <g
      data-testid={`canvas-part-${part.id}`}
      data-part-id={part.id}
      data-wire-mode={wireMode ? 'true' : 'false'}
      data-pending-from={pendingFrom?.partId === part.id ? pendingFrom.pinId : undefined}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ cursor: dragging ? 'grabbing' : wireMode ? 'crosshair' : 'grab' }}
    >
      <PartBody spec={spec} part={part} pinValues={pinValues} />
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

function PartBody({ spec, part, pinValues }: { spec: PartSpec; part: CanvasPart; pinValues: Record<string, number> }) {
  // Re-render the part's body inside an SVG <g> by calling spec.render.
  // We attach a ref to that <g> and let PartBodyView re-render it on each
  // pin update.
  return (
    <g
      transform={`translate(${part.x} ${part.y}) rotate(${part.rotation} ${spec.width / 2} ${spec.height / 2})`}
    >
      <PartBodyView spec={spec} part={part} pinValues={pinValues} />
    </g>
  );
}

function PartBodyView({ spec, part, pinValues }: { spec: PartSpec; part: CanvasPart; pinValues: Record<string, number> }) {
  const ref = useRef<SVGGElement | null>(null);
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    spec.render(g, { pins: pinValues });
  }, [spec, part.id, part.rotation, pinValues]);
  return <g ref={ref} />;
}

function WireLine({
  wire,
  state,
  selected,
  onClick,
}: {
  wire: Wire;
  state: CanvasState;
  selected: boolean;
  onClick: () => void;
}) {
  const fromPart = state.parts.find((p) => p.id === wire.from.partId);
  const toPart = state.parts.find((p) => p.id === wire.to.partId);
  if (!fromPart || !toPart) return null;
  const a = pinPosition(fromPart, wire.from.pinId);
  const b = pinPosition(toPart, wire.to.pinId);
  if (!a || !b) return null;
  // Bezier: use midpoint-x as control point offset
  const mx = (a.x + b.x) / 2;
  const path = `M ${a.x} ${a.y} C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
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
  // Bezier: straight mid-point offset curve
  const mx = (a.x + mousePos.x) / 2;
  const path = `M ${a.x} ${a.y} C ${mx} ${a.y} ${mx} ${mousePos.y} ${mousePos.x} ${mousePos.y}`;
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

// re-export for tests
export { applyChange, undo, redo, genId, wiresTouching };
export type { Rotation, CanvasState, History, Change, Wire };
