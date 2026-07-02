/**
 * Browser-side JS "soft" Arduino simulator — MVP substitute for simavr WASM.
 *
 * Trade-offs vs real simavr:
 *   ✓ Instant, no WASM download (relevant on exFAT-China-CDN)
 *   ✓ Deterministic timing via setTimeout, abortable mid-delay
 *   ✗ Not cycle-accurate (delay() is best-effort, not AVR timer-accurate)
 *   ✗ No real peripherals — only pinMode/digitalWrite/analogWrite reach UI
 *   ✗ No real AVR memory model (sketch keeps state via plain JS closures)
 *
 * Subscription model: callers register a PinListener and receive every
 * `digitalWrite` and `analogWrite` event as a typed PinEvent. The MVP frontend
 * updates components (LED / button / potentiometer) from this stream.
 */
import { preprocessArduino } from './preprocessor';

export interface PinEvent {
  pin: number;
  value: number; // 0 | 1 for digital; 0..255 for analog
  mode: 'digital' | 'analog';
  time: number; // ms since runner started
}

export type PinListener = (ev: PinEvent) => void;

export interface RunResult {
  compileError?: string;
  runtimeError?: string;
}

export class ArduinoRunner {
  private aborted = false;
  private readonly listeners = new Set<PinListener>();
  private startTime = 0;

  /** Returns the PinListener so caller can .off() it later. */
  onPin(listener: PinListener): PinListener {
    this.listeners.add(listener);
    return listener;
  }
  offPin(listener: PinListener): void {
    this.listeners.delete(listener);
  }

  abort(): void {
    this.aborted = true;
    // Tell the while-loop in preprocessed code to exit on next iteration.
    (globalThis as Record<string, unknown>).__wokwi_aborted = true;
  }

  async run(code: string): Promise<RunResult> {
    this.aborted = false;
    this.startTime = Date.now();
    const t = () => Date.now() - this.startTime;
    const emit = (pin: number, value: number, mode: 'digital' | 'analog') => {
      const event: PinEvent = { pin, value, mode, time: t() };
      for (const l of this.listeners) l(event);
    };

    const pinMode = (_pin: number, _mode: number | string): void => {
      // MVP stub: store mode if you want; UI doesn't need it yet
    };

    const digitalWrite = (pin: number, value: number | boolean): void => {
      const v = value ? 1 : 0;
      if (pinState[pin] === v) return; // no-op: value unchanged
      pinState[pin] = v;
      emit(pin, v, 'digital');
    };

    // Track last written value per pin so digitalRead can reflect analogWrite/digitalWrite.
    const pinState: Record<number, number> = {};
    const digitalRead = (pin: number): number => pinState[pin] ?? 0;
    const analogRead = (_pin: number): number => 0;

    const analogWrite = async (_pin: number, _value: number): Promise<void> => {
      const v = Math.max(0, Math.min(255, _value | 0));
      if (pinState[_pin] !== v) {
        pinState[_pin] = v;
        emit(_pin, v, 'analog');
      }
      // Always yield so the loop() body yields (preprocessor adds await before delay).
      // Without this, analogWrite is fire-and-forget and delays never fire.
      await delay(1);
    };

    const delay = (ms: number): Promise<void> =>
      new Promise((resolve) => {
        if (this.aborted) return resolve();
        const startedAt = Date.now();
        const tick = () => {
          if (this.aborted) return resolve();
          const remain = ms - (Date.now() - startedAt);
          if (remain <= 0) return resolve();
          setTimeout(tick, Math.min(remain, 50));
        };
        tick();
      });

    const millis = (): number => t();
    const micros = (): number => t() * 1000;

    const Serial = {
      _baud: 0,
      begin(baud: number): void {
        this._baud = baud;
      },
      print(...args: unknown[]): void {
        if (import.meta.env.DEV) console.log('[serial]', ...args);
      },
      println(...args: unknown[]): void {
        if (import.meta.env.DEV) console.log('[serial]', ...args, '\n');
      },
      available(): number {
        return 0;
      },
      read(): number {
        return -1;
      },
    };

    let processed: string;
    try {
      processed = preprocessArduino(code);
    } catch (e) {
      return { compileError: (e as Error).message };
    }

    // D2 简化:不做真编译检查,只确保 AsyncFunction 能 new 出来。
    let fn: (...args: unknown[]) => Promise<void>;
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {
        /* baseline */
      }).constructor;
      fn = new AsyncFunction(
        'pinMode',
        'digitalWrite',
        'digitalRead',
        'analogRead',
        'analogWrite',
        'delay',
        'millis',
        'micros',
        'Serial',
        processed,
      ) as (...args: unknown[]) => Promise<void>;
    } catch (e) {
      return { compileError: (e as Error).message };
    }

    try {
      await fn(
        pinMode,
        digitalWrite,
        digitalRead,
        analogRead,
        analogWrite,
        delay,
        millis,
        micros,
        Serial,
      );
      return {};
    } catch (e) {
      const err = e as Error;
      if (err.message === 'aborted') return {};
      return { runtimeError: err.message };
    }
  }
}
