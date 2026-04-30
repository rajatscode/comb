// test.ts — Fuzz-test runner for .comb modules

import { compile } from '../core/compiler.js';
import { circuit } from '../runtime/circuit.js';
import { batch } from '../runtime/signals.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, resolve } from 'path';
import { pathToFileURL } from 'url';

// --- Deterministic PRNG (mulberry32) ---
function mulberry32(a: number) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// --- CLI arg parsing ---
const args = process.argv.slice(2);
const flags: Record<string, string> = {};
let inputFile = '';

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    flags[args[i].slice(2)] = args[i + 1] ?? '';
    i++;
  } else {
    inputFile = args[i];
  }
}

if (!inputFile) {
  console.error('Usage: comb test <file.comb> [--iterations N] [--seed N] [--verbose]');
  process.exit(1);
}

const iterations = parseInt(flags.iterations ?? '1000', 10);
const seed = parseInt(flags.seed ?? String(Date.now()), 10);
const verbose = 'verbose' in flags;

// --- Compile ---
let source: string;
try {
  source = readFileSync(inputFile, 'utf-8');
} catch {
  console.error(`Error: cannot read ${inputFile}`);
  process.exit(1);
}

const result = compile(source);
if (result.errors.length > 0) {
  for (const err of result.errors) console.error(`  Error ${err.line}:${err.column}: ${err.message}`);
  process.exit(1);
}

// --- Write temp file with corrected import path ---
const tmpDir = resolve('.comb-test');
mkdirSync(tmpDir, { recursive: true });

const runtimePath = pathToFileURL(resolve('src/runtime/index.js')).href;
const js = result.js!.replace(
  /from\s+['"]\.\.\/runtime\/index\.js['"]/g,
  `from '${runtimePath}'`
);

const tmpFile = join(tmpDir, basename(inputFile, '.comb') + '.test.mjs');
writeFileSync(tmpFile, js);

// --- Dynamic import and run ---
async function run() {
  circuit.reset();

  const mod = await import(pathToFileURL(tmpFile).href);
  const { __test, __graph } = mod;

  if (typeof __test !== 'function') {
    console.error('Error: compiled module has no __test() export');
    process.exit(1);
  }

  const instance = __test();
  const { signals, combs, dispose } = instance;

  // Build type map from circuit nodes (runtime has valueType from createSignal meta)
  const signalTypes: Record<string, string> = {};
  for (const node of circuit.getNodes()) {
    if (node.type === 'signal' && node.valueType) {
      signalTypes[node.name] = node.valueType;
    }
  }

  // Fallback: infer from __graph static nodes
  for (const name of Object.keys(signals)) {
    if (!signalTypes[name]) signalTypes[name] = 'string';
  }

  const rand = mulberry32(seed);
  const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789@.';

  function randomString(): string {
    const len = Math.floor(rand() * 16);
    let s = '';
    for (let i = 0; i < len; i++) s += CHARS[Math.floor(rand() * CHARS.length)];
    return s;
  }

  function randomValue(type: string): any {
    switch (type) {
      case 'string': return randomString();
      case 'int': return Math.floor(rand() * 300) - 100;
      case 'float': return rand() * 300 - 100;
      case 'bool': return rand() < 0.5;
      default: return randomString();
    }
  }

  // Track assertion failures
  let assertionFailures: Array<{ expr: string; values: Record<string, any> }> = [];
  const unsub = circuit.subscribe((event) => {
    if (event.type === 'assertion-failed' && event.assertInfo) {
      assertionFailures.push({ expr: event.assertInfo.expr, values: event.assertInfo.values });
    }
  });

  // Track comb coverage (distinct values)
  const combCoverage = new Map<string, Set<string>>();
  for (const name of Object.keys(combs)) {
    combCoverage.set(name, new Set());
  }

  // --- Run iterations ---
  for (let i = 0; i < iterations; i++) {
    batch(() => {
      for (const [name, sig] of Object.entries(signals) as [string, { get: () => any; set: (v: any) => void }][]) {
        sig.set(randomValue(signalTypes[name]));
      }
    });

    // Read all combs to track coverage
    for (const [name, getter] of Object.entries(combs) as [string, () => any][]) {
      const val = getter();
      combCoverage.get(name)!.add(String(val));
    }
  }

  unsub();

  // --- Report ---
  const fileName = basename(inputFile);
  console.log(`\n  comb test — ${fileName}`);
  console.log(`  seed: ${seed}  iterations: ${iterations}\n`);

  if (assertionFailures.length === 0) {
    console.log('  assertions: ✓ all passed');
  } else {
    console.log(`  assertions: ✗ ${assertionFailures.length} failures`);
    const unique = new Set(assertionFailures.map(f => f.expr));
    for (const expr of unique) {
      console.log(`    FAIL: ${expr}`);
    }
  }

  // Boolean coverage: combs that only produced true/false values
  const boolCombs: string[] = [];
  for (const [name, values] of combCoverage) {
    const strs = [...values];
    const isBool = strs.every(v => v === 'true' || v === 'false');
    if (isBool) boolCombs.push(name);
  }

  const coveredBoth = boolCombs.filter(name => {
    const vals = combCoverage.get(name)!;
    return vals.has('true') && vals.has('false');
  });

  if (boolCombs.length > 0) {
    const pct = Math.round((coveredBoth.length / boolCombs.length) * 100);
    console.log(`  coverage:   ${pct}% (${coveredBoth.length}/${boolCombs.length} boolean combs hit both branches)`);
  } else {
    console.log('  coverage:   no boolean combs');
  }

  if (verbose) {
    console.log('\n  per-comb detail:');
    for (const [name, values] of combCoverage) {
      const strs = [...values];
      const isBool = strs.every(v => v === 'true' || v === 'false');
      const covered = isBool ? (values.has('true') && values.has('false') ? '✓' : '✗') : '-';
      console.log(`    ${covered} ${name}: ${strs.length} distinct values [${strs.slice(0, 5).join(', ')}${strs.length > 5 ? ', ...' : ''}]`);
    }
  }

  dispose();
  console.log('');

  process.exit(assertionFailures.length > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
