/**
 * Component model — every part in wokwi has pins + a render + an optional
 * simulation model hook. This is the contract for /apps/web/src/parts/*.ts.
 *
 * 设计原则(参考 devplan §7.1):
 *  - 每个元件独立文件
 *  - 每件至少有 model + view + pin 定义
 *  - model 可选(很多基础元件不需要)
 *  - view 是纯渲染函数: caller pre-translates, view draws
 */

export interface PinDef {
  /** Unique within a part. e.g. 'D13' for Arduino, 'A' for LED anode. */
  id: string;
  /** Local x in SVG units (relative to part origin). */
  x: number;
  /** Local y in SVG units. */
  y: number;
  /** Display label rendered next to the pin. */
  label: string;
}

/** Render-time pin state collected by canvas + runner. */
export interface PartRenderState {
  selected?: boolean;
  /** Pin values keyed by PinDef.id. 0/1 for digital, 0..255 for analog. */
  pins: Record<string, number>;
}

/** Runtime context for PartModel — see types. */
export interface PartContext {
  /** Simulated time, ms since start. */
  now: number;
  /** Last digitalRead by id (digital 0/1 only). */
  digitalRead: (pinId: string) => number;
  /** Full resolved pin values for this part (after BFS propagation), 0..255. */
  pins: Record<string, number>;
}

/** A model can request that the runner write a value to a wire. */
export interface PinWrite {
  pinId: string;
  value: number;
}

/** Optional — runs every tick when this part is on the canvas. */
export type PartModel = (ctx: PartContext) => PinWrite[] | void;

export interface PartSpec {
  /** Unique stable id matching PartRegistry keys ('led', 'arduino-uno', ...). */
  type: string;
  displayName: string;
  width: number;
  height: number;
  pins: PinDef[];
  /** Default pin values; digitalRead returns 0 by default. */
  defaultPinValues?: Record<string, number>;
  /**
   * Render into <g>. Caller MUST set `transform="translate(x,y)"` BEFORE calling.
   * Visual pin pads (Wokwi-style dots) are rendered here — every pad element
   * MUST carry `data-pin="${PinDef.id}"` so the canvas can locate it for
   * click / hover / wire. (See `pinPad()` helper in ./svg).
   */
  render(g: SVGGElement, state: PartRenderState): void;
  /** Optional simulation logic. */
  model?: PartModel;
}

/** Component instance placed on the canvas. */
export interface ComponentInstance {
  /** Unique within a wiring. */
  id: string;
  /** Matches PartSpec.type */
  type: string;
  /** Position in canvas coordinates (top-left). */
  x: number;
  y: number;
}

export interface WireRef {
  compId: string;
  pinId: string;
}

export interface Wire {
  id: string;
  from: WireRef;
  to: WireRef;
}

/** Canvas + project serialization format. D5 也用这个存 wiring. */
export interface WiringJSON {
  components: ComponentInstance[];
  wires: Wire[];
}
