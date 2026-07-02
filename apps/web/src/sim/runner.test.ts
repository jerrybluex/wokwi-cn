import { describe, it, expect } from 'vitest';
import { ArduinoRunner, type PinEvent } from './runner';

const BLINK = `
void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(50);
  digitalWrite(13, LOW);
  delay(50);
}
`;

describe('preprocessor + runner', () => {
  it('runs a blink and emits pin events on D13', async () => {
    const runner = new ArduinoRunner();
    const events: PinEvent[] = [];
    runner.onPin((ev) => events.push(ev));

    const runPromise = runner.run(BLINK);
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 250));
    await Promise.race([runPromise, timeout]);
    runner.abort();
    await runPromise.catch(() => undefined);

    const d13 = events.filter((e) => e.pin === 13);
    expect(d13.length).toBeGreaterThanOrEqual(2);
    expect(d13[0].value).toBe(1);
    expect(d13[1].value).toBe(0);
  });

  it('reports compile error for bad source', async () => {
    const runner = new ArduinoRunner();
    const result = await runner.run('this is :: @@@ not arduino');
    expect(result.compileError ?? result.runtimeError).toBeDefined();
  });

  it('aborts a long-running simulation without throwing', async () => {
    const runner = new ArduinoRunner();
    const events: PinEvent[] = [];
    runner.onPin((ev) => events.push(ev));

    const longCode = `
void setup() { pinMode(9, OUTPUT); }
void loop() { digitalWrite(9, HIGH); delay(30000); digitalWrite(9, LOW); delay(30000); }
`;
    const runPromise = runner.run(longCode);
    // Let setup() finish then mid-loop abort (200 ms is plenty for setup + entry into loop)
    await new Promise((resolve) => setTimeout(resolve, 200));
    runner.abort();
    await runPromise.catch(() => undefined);

    expect(events.some((e) => e.pin === 9 && e.value === 1)).toBe(true);
  });

  it('analogWrite(9, 90) yields and emits one event (servo PWM)', async () => {
    const runner = new ArduinoRunner();
    const events: PinEvent[] = [];
    runner.onPin((ev) => events.push(ev));

    const servoCode = `
void setup() {}
void loop() { analogWrite(9, 90); }
`;
    const runPromise = runner.run(servoCode);
    // Wait for first analogWrite to emit (needs a few ms due to async yield)
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    runner.abort();
    await runPromise.catch(() => undefined);

    // analogWrite(9, 90) should emit one analog event with pin=9, value=90
    const analogEvents = events.filter((e) => e.pin === 9 && e.mode === 'analog');
    expect(analogEvents.length).toBeGreaterThanOrEqual(1);
    expect(analogEvents[0].value).toBe(90);
  });

  it('analogWrite skips unchanged values (no duplicate emissions)', async () => {
    const runner = new ArduinoRunner();
    const events: PinEvent[] = [];
    runner.onPin((ev) => events.push(ev));

    const code = `
void setup() {}
void loop() { analogWrite(9, 90); analogWrite(9, 90); analogWrite(9, 90); }
`;
    const runPromise = runner.run(code);
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    runner.abort();
    await runPromise.catch(() => undefined);

    const analogEvents = events.filter((e) => e.pin === 9 && e.mode === 'analog');
    // Only the FIRST analogWrite(9, 90) should emit; subsequent same-value calls are no-ops
    expect(analogEvents.length).toBe(1);
    expect(analogEvents[0].value).toBe(90);
  });
});

