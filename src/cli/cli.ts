// cli.ts — Node.js CLI wrapper for the Comb compiler

import { compile } from '../core/compiler.js';
import { readFileSync } from 'fs';

const input = process.argv[2] || 'examples/counter.comb';

let source: string;
try {
  source = readFileSync(input, 'utf-8');
} catch (e: any) {
  console.error(`Error reading file: ${input}`);
  console.error(e.message);
  process.exit(1);
}

console.log(`Compiling ${input}...`);

const result = compile(source);

if (result.errors.length > 0) {
  for (const err of result.errors) {
    console.error(`Error at ${err.line}:${err.column}: ${err.message}`);
  }
  process.exit(1);
}

const graph = result.graph!;
const signals = graph.nodes.filter(n => n.type === 'signal');
const combs = graph.nodes.filter(n => n.type === 'comb');
const events = graph.nodes.filter(n => n.type === 'event');

console.log(`✓ Verified successfully — ${result.ast!.name}`);
console.log(`  Signals: ${signals.map(s => s.name).join(', ') || 'none'}`);
console.log(`  Combs: ${combs.map(c => c.name).join(', ') || 'none'}`);
console.log(`  Events: ${events.map(e => e.name).join(', ') || 'none'}`);
console.log(`  Edges: ${graph.edges.length}`);

if (result.warnings.length > 0) {
  for (const w of result.warnings) {
    console.warn(`Warning at ${w.line}:${w.column}: ${w.message}`);
  }
}
