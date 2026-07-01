/**
 * PartLibraryPanel — left sidebar listing the 8 D3 parts. Each item is
 * draggable onto the canvas; on drop the CanvasPanel creates a new part
 * at the cursor position with a fresh id.
 *
 * We deliberately don't render full SVG thumbnails here. The library is
 * text + a small color chip — fast to render, drag works without us
 * managing nested SVG fragments. The canvas itself renders the real part
 * bodies via PartSpec.
 */
import { useMemo } from 'react';
import { listPartTypes } from '../parts/registry';

export const PART_DRAG_MIME = 'application/x-wokwi-part-type';

const CHIP_COLORS: Record<string, string> = {
  'arduino-uno': '#0079d1',
  led: '#ff5252',
  button: '#888',
  potentiometer: '#1c2530',
  resistor: '#d2b48c',
  hcsr04: '#1c2530',
  servo: '#f1c40f',
  buzzer: '#3a3a3a',
};

export function PartLibraryPanel() {
  const specs = useMemo(() => listPartTypes(), []);

  return (
    <div className="w-44 shrink-0 border-r border-base-300 bg-base-200 overflow-y-auto">
      <div className="p-2 text-[10px] uppercase tracking-wide text-base-content/60 font-bold">
        元件库
      </div>
      <ul className="px-2 pb-3 space-y-1.5">
        {specs.map((spec) => (
          <li key={spec.type}>
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(PART_DRAG_MIME, spec.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="rounded-md border border-base-300 bg-base-100 hover:bg-base-300/40 cursor-grab active:cursor-grabbing select-none p-2 flex items-center gap-2"
              data-testid={`part-tile-${spec.type}`}
              title={spec.displayName}
            >
              <span
                className="inline-block w-3 h-3 rounded-sm shrink-0"
                style={{ background: CHIP_COLORS[spec.type] ?? '#888' }}
                aria-hidden="true"
              />
              <span className="text-[11px] font-mono leading-tight truncate">
                {spec.displayName}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="px-3 py-2 text-[10px] text-base-content/40 border-t border-base-300">
        拖到右侧画布
      </div>
    </div>
  );
}
