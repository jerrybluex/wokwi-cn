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
  wireMode?: boolean;
  onToggleWireMode?: () => void;
  onWireCreate?: (from: { partId: string; pinId: string }, to: { partId: string; pinId: string }) => void;
  pendingWireFrom?: { partId: string; pinId: string } | null;
  width?: number;
  height?: number;
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
    wireMode = false,
    onToggleWireMode,
    onWireCreate,
    pendingWireFrom = null,
    width = 800,
    height = 500,
  } = props;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragPartId, setDragPartId] = useState<string | null>(null);

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
      if (e.key === 'Escape' && wireMode) {
        e.preventDefault();
        onToggleWireMode?.();
        return;
      }
      if (e.key.toLowerCase() === 'r' && selectedId && !wireMode) {
        e.preventDefault();
        onChange({ type: 'rotate-part', id: selectedId });
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChange, onSelect, onUndo, onRedo, selectedId, wireMode, onToggleWireMode]);

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
        viewBox={`0 0 ${width} ${height}`}
        className="block select-none"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onSvgClick}
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
        <g>
          {state.parts.map((p) => (
            <PartNode
              key={p.id}
              part={p}
              selected={selectedId === p.id}
              dragging={dragPartId === p.id}
              wireMode={wireMode}
              pendingFrom={pendingWireFrom}
              onMouseDown={(e) => onPartMouseDown(e, p.id)}
              onPinClick={(pinId) => {
                if (!wireMode || !onWireCreate) return;
                if (!pendingWireFrom) {
                  // start wire from this pin
                  onWireCreate({ partId: p.id, pinId }, { partId: p.id, pinId });
                } else if (pendingWireFrom.partId === p.id && pendingWireFrom.pinId === pinId) {
                  // same pin: cancel
                  onWireCreate({ partId: '', pinId: '' }, { partId: '', pinId: '' });
                } else {
                  onWireCreate(pendingWireFrom, { partId: p.id, pinId });
                }
              }}
            />
          ))}
        </g>
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
        wireMode={wireMode}
        onToggleWireMode={onToggleWireMode}
        pendingWireFrom={pendingWireFrom}
      />
    </div>
  );
}

// ---- Sub-components ---------------------------------------------------------

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
  onMouseDown,
  onPinClick,
}: {
  part: CanvasPart;
  selected: boolean;
  dragging: boolean;
  wireMode: boolean;
  pendingFrom: { partId: string; pinId: string } | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onPinClick: (pinId: string) => void;
}) {
  const spec = getPartSpec(part.type);
  if (!spec) return null;
  return (
    <g
      data-testid={`canvas-part-${part.id}`}
      onMouseDown={onMouseDown}
      style={{ cursor: dragging ? 'grabbing' : wireMode ? 'crosshair' : 'grab' }}
    >
      <PartBody spec={spec} part={part} />
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
      {/* Pin dots — always rendered so wire mode is discoverable */}
      {spec.pins.map((pin) => {
        const pos = pinPosition(part, pin.id);
        if (!pos) return null;
        const isPending = pendingFrom?.partId === part.id && pendingFrom.pinId === pin.id;
        const radius = wireMode ? 6 : 4;
        return (
          <g key={pin.id}>
            <circle
              data-testid={`pin-${part.id}-${pin.id}`}
              cx={pos.x}
              cy={pos.y}
              r={radius}
              fill={isPending ? '#ffb300' : wireMode ? '#ff5252' : '#1a2028'}
              stroke={wireMode || isPending ? '#fff' : '#888'}
              strokeWidth={1}
              style={{ cursor: wireMode ? 'crosshair' : 'default' }}
              onClick={(e) => {
                e.stopPropagation();
                onPinClick(pin.id);
              }}
            />
            {wireMode && (
              <text
                x={pos.x}
                y={pos.y - 10}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize={9}
                fill="#ff8585"
                pointerEvents="none"
              >
                {pin.id}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function PartBody({ spec, part }: { spec: PartSpec; part: CanvasPart }) {
  // Re-render the part's body inside an SVG <g> by calling spec.render.
  // We attach a ref to that <g> and let PartBodyView re-render it on each
  // pin update. Since canvas parts don't get state for the MVP, we render
  // once via a small wrapper.
  return (
    <g
      transform={`translate(${part.x} ${part.y}) rotate(${part.rotation} ${spec.width / 2} ${spec.height / 2})`}
    >
      <PartBodyView spec={spec} part={part} />
    </g>
  );
}

function PartBodyView({ spec, part }: { spec: PartSpec; part: CanvasPart }) {
  const ref = useRef<SVGGElement | null>(null);
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    spec.render(g, { pins: {} });
  }, [spec, part.id, part.rotation]);
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
  // Orthogonal-ish curve: straight line + midpoint offset
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
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
        stroke={selected ? '#ffb300' : wire.color ?? '#ff5252'}
        strokeWidth={selected ? 3 : 2}
      />
    </g>
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
  wireMode,
  onToggleWireMode,
  pendingWireFrom,
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
  wireMode: boolean;
  onToggleWireMode?: () => void;
  pendingWireFrom: { partId: string; pinId: string } | null;
}) {
  return (
    <div className="absolute top-2 left-2 right-2 flex items-center gap-1 text-xs pointer-events-none">
      <div className="bg-base-200/90 rounded-md border border-base-300 px-1 py-0.5 flex gap-1 pointer-events-auto">
        <button
          onClick={onToggleWireMode}
          className={`btn btn-ghost btn-xs px-2 ${wireMode ? 'text-warning' : ''}`}
          title="连线模式 (按 ESC 退出)"
        >
          🔗 连线
        </button>
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
            className="btn btn-ghost btn-xs px-2 text-error"
            title="删除 (Delete)"
          >
            ✕ 删除
          </button>
        </div>
      )}
      {wireMode && (
        <div className="ml-auto bg-warning/20 rounded-md border border-warning px-2 py-0.5 pointer-events-auto text-warning text-[10px] font-mono">
          {pendingWireFrom
            ? `已选 ${pendingWireFrom.partId}.${pendingWireFrom.pinId} — 再点一个 pin`
            : '点两个 pin 起点 → 终点  •  ESC 取消'}
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
