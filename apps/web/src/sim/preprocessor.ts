/**
 * Preprocess Arduino C++ code into a JS string that can be wrapped in an
 * AsyncFunction. Strips comments, converts `void setup/loop()` signatures,
 * relaxes type declarations to `let`, and auto-prefixes `delay()` calls
 * with `await`.
 *
 * Returns the full program source, including arduino constants (HIGH/LOW/...)
 * and a runtime entry that runs `setup()` once then `loop()` forever.
 *
 * Front-end equivalent of devplan §7.1 "minimal subset" for MVP.
 */
export function preprocessArduino(src: string): string {
  let code = src;

  // 1. Strip comments (single + multi-line)
  code = code.replace(/\/\/[^\n]*/g, '');
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. void setup() → async function setup()
  code = code.replace(/\bvoid\s+setup\s*\(/g, 'async function setup(');
  code = code.replace(/\bvoid\s+loop\s*\(/g, 'async function loop(');

  // 3. int / long / etc → let (loose enough for MVP student code)
  code = code.replace(
    /\b(int|float|double|long|short|byte|char|boolean|unsigned\s+long|unsigned\s+int)\s+([a-zA-Z_][\w]*)/g,
    'let $2',
  );

  // 4. delay() → await delay() (so callers don't have to write await)
  code = code.replace(/(^|[^a-zA-Z_])delay\s*\(/g, '$1await delay(');
  // analogWrite() → await analogWrite() (yield to event loop on every PWM write)
  code = code.replace(/(^|[^a-zA-Z_])analogWrite\s*\(/g, '$1await analogWrite(');

  // 5. Serial.print/println — works as long as Serial provides print/println

  return [
    '"use strict";',
    'const HIGH = 1, LOW = 0;',
    'const INPUT = 0, OUTPUT = 1, INPUT_PULLUP = 2;',
    'const BIN = 2, OCT = 8, DEC = 10, HEX = 16;',
    'const A0 = 14, A1 = 15, A2 = 16, A3 = 17, A4 = 18, A5 = 19;',
    '',
    '// === Abort flag — always reset on each run (runner.abort() writes true) ===',
    'globalThis.__wokwi_aborted = false;',
    '',
    '// === User code ===',
    code,
    '',
    '// === Entry point ===',
    'try {',
    '  if (typeof setup === "function") await setup();',
    '} catch (e) { if (e.message !== "aborted") throw e; }',
    'while (!globalThis.__wokwi_aborted) {',
    '  try {',
    '    if (typeof loop === "function") await loop();',
    '  } catch (e) { if (e.message === "aborted" || globalThis.__wokwi_aborted) break; throw e; }',
    '}',
  ].join('\n');
}
