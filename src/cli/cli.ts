#!/usr/bin/env node
// cli.ts — Node.js CLI wrapper for the Comb compiler

import { compile } from '../core/compiler.js';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, basename, resolve } from 'path';
import { execSync } from 'child_process';

const VERSION = '0.1.0';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
  comb v${VERSION} — SystemVerilog-inspired reactive web framework

  Usage:
    comb compile <file.comb>     Compile a single .comb file
    comb compile --all           Compile all .comb files in examples/
    comb init <project-name>     Scaffold a new Comb project
    comb dev                     Start Vite dev server
    comb test <file.comb>        Run fuzz tests on a .comb file
    comb --help                  Show this help message
    comb --version               Show version
  `);
}

<<<<<<< HEAD
console.log(`Compiling ${input}...`);

const sourceFile = basename(input);
const result = compile(source, { sourceFile });

if (result.errors.length > 0) {
  for (const err of result.errors) {
    console.error(`Error at ${err.line}:${err.column}: ${err.message}`);
||||||| b68c2e9
console.log(`Compiling ${input}...`);

const result = compile(source);

if (result.errors.length > 0) {
  for (const err of result.errors) {
    console.error(`Error at ${err.line}:${err.column}: ${err.message}`);
=======
function compileFile(input: string): boolean {
  let source: string;
  try {
    source = readFileSync(input, 'utf-8');
  } catch (e: any) {
    console.error(`Error reading file: ${input}`);
    console.error(e.message);
    return false;
>>>>>>> worktree-agent-ae5d93b0
  }

  console.log(`Compiling ${input}...`);

  const result = compile(source);

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.error(`Error at ${err.line}:${err.column}: ${err.message}`);
    }
    return false;
  }

  const outDir = 'src/generated';
  mkdirSync(outDir, { recursive: true });

  const outFile = basename(input, '.comb') + '.js';
  writeFileSync(join(outDir, outFile), result.js!);

  const graph = result.graph!;
  const signals = graph.nodes.filter(n => n.type === 'signal');
  const combs = graph.nodes.filter(n => n.type === 'comb');
  const events = graph.nodes.filter(n => n.type === 'event');

  console.log(`  Compiled -> ${join(outDir, outFile)}`);
  console.log(`  Module: ${result.ast!.name}`);
  console.log(`  Signals: ${signals.map(s => s.name).join(', ') || 'none'}`);
  console.log(`  Combs: ${combs.map(c => c.name).join(', ') || 'none'}`);
  console.log(`  Events: ${events.map(e => e.name).join(', ') || 'none'}`);
  console.log(`  Edges: ${graph.edges.length}`);

  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      console.warn(`Warning at ${w.line}:${w.column}: ${w.message}`);
    }
  }

  return true;
}

function compileAll() {
  const examplesDir = 'examples';
  if (!existsSync(examplesDir)) {
    console.error(`Error: examples/ directory not found`);
    process.exit(1);
  }

<<<<<<< HEAD
const outFile = basename(input, '.comb') + '.js';
const mapFile = outFile + '.map';

// Append source map reference and write JS
let jsOutput = result.js!;
if (result.sourceMap) {
  jsOutput += `\n//# sourceMappingURL=${mapFile}\n`;
  writeFileSync(join(outDir, mapFile), result.sourceMap);
}
writeFileSync(join(outDir, outFile), jsOutput);
||||||| b68c2e9
const outFile = basename(input, '.comb') + '.js';
writeFileSync(join(outDir, outFile), result.js!);
=======
  const files = readdirSync(examplesDir).filter(f => f.endsWith('.comb'));
  if (files.length === 0) {
    console.log('No .comb files found in examples/');
    return;
  }
>>>>>>> worktree-agent-ae5d93b0

  let success = 0;
  let failed = 0;

<<<<<<< HEAD
console.log(`✓ Compiled successfully → ${join(outDir, outFile)}`);
if (result.sourceMap) {
  console.log(`  Source map → ${join(outDir, mapFile)}`);
}
console.log(`  Module: ${result.ast!.name}`);
console.log(`  Signals: ${signals.map(s => s.name).join(', ') || 'none'}`);
console.log(`  Combs: ${combs.map(c => c.name).join(', ') || 'none'}`);
console.log(`  Events: ${events.map(e => e.name).join(', ') || 'none'}`);
console.log(`  Edges: ${graph.edges.length}`);
||||||| b68c2e9
console.log(`✓ Compiled successfully → ${join(outDir, outFile)}`);
console.log(`  Module: ${result.ast!.name}`);
console.log(`  Signals: ${signals.map(s => s.name).join(', ') || 'none'}`);
console.log(`  Combs: ${combs.map(c => c.name).join(', ') || 'none'}`);
console.log(`  Events: ${events.map(e => e.name).join(', ') || 'none'}`);
console.log(`  Edges: ${graph.edges.length}`);
=======
  for (const file of files) {
    const ok = compileFile(join(examplesDir, file));
    if (ok) success++;
    else failed++;
    console.log('');
  }
>>>>>>> worktree-agent-ae5d93b0

  console.log(`Done: ${success} compiled, ${failed} failed out of ${files.length} files.`);
  if (failed > 0) process.exit(1);
}

function initProject(name: string) {
  const dir = resolve(name);
  if (existsSync(dir)) {
    console.error(`Error: directory '${name}' already exists`);
    process.exit(1);
  }

  mkdirSync(join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'examples'), { recursive: true });

  // package.json
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'npx vite',
      compile: 'comb compile',
      build: 'npx vite build',
    },
    dependencies: {
      comb: '*',
    },
  }, null, 2) + '\n');

  // index.html
  writeFileSync(join(dir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
`);

  // starter app.comb
  writeFileSync(join(dir, 'src', 'app.comb'), `module App {
  signal count: int = 0;

  comb doubled = count * 2;

  always @(increment) {
    count <= count + 1;
  }

  always @(decrement) {
    count <= count - 1;
  }

  view {
    <div class="app">
      <h1>Hello from Comb</h1>
      <p>Count: {count} (doubled: {doubled})</p>
      <button @click={increment}>+</button>
      <button @click={decrement}>-</button>
    </div>
  }
}
`);

  console.log(`
  Project '${name}' created!

  Next steps:
    cd ${name}
    npm install
    comb compile src/app.comb
    npm run dev
  `);
}

function runDev() {
  console.log('Starting Vite dev server...');
  try {
    execSync('npx vite', { stdio: 'inherit' });
  } catch {
    // User killed the server, that's fine
  }
}

// --- Main dispatch ---

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  console.log(`comb v${VERSION}`);
  process.exit(0);
}

if (command === 'compile') {
  const target = args[1];
  if (target === '--all') {
    compileAll();
  } else if (target) {
    const ok = compileFile(target);
    if (!ok) process.exit(1);
  } else {
    console.error('Usage: comb compile <file.comb> | comb compile --all');
    process.exit(1);
  }
} else if (command === 'init') {
  const name = args[1];
  if (!name) {
    console.error('Usage: comb init <project-name>');
    process.exit(1);
  }
  initProject(name);
} else if (command === 'dev') {
  runDev();
} else if (command === 'test') {
  // Delegate to the existing test runner
  const testArgs = args.slice(1).join(' ');
  try {
    execSync(`npx tsx src/cli/test.ts ${testArgs}`, { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
} else {
  // Legacy mode: treat first arg as a file to compile (backward compat)
  if (command.endsWith('.comb')) {
    const ok = compileFile(command);
    if (!ok) process.exit(1);
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}
