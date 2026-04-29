// Comb Playground — Live editor + compiler + preview + circuit visualizer
// This file wires together the browser-portable compiler with the preview iframe

import '../styles.css';

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const preview = document.getElementById('preview') as HTMLIFrameElement;
const output = document.getElementById('output') as HTMLPreElement;
const circuitViz = document.getElementById('circuit-viz') as HTMLDivElement;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
const exampleSelect = document.getElementById('example-select') as HTMLSelectElement;

// Example sources will be loaded dynamically
const examples: Record<string, string> = {};

// Load example .comb files
async function loadExamples() {
  const names = ['counter', 'traffic-light', 'minesweeper', 'chat'];
  for (const name of names) {
    try {
      const resp = await fetch(`/examples/${name}.comb`);
      if (resp.ok) {
        examples[name] = await resp.text();
      }
    } catch (e) {
      // Will be populated once examples exist
    }
  }
  // Load initial example
  if (examples['counter']) {
    editor.value = examples['counter'];
  }
}

// Compile and run
let compileTimeout: number;

function scheduleCompile() {
  clearTimeout(compileTimeout);
  compileTimeout = window.setTimeout(compileAndRun, 300);
}

async function compileAndRun() {
  const source = editor.value;
  if (!source.trim()) {
    output.textContent = '// No source';
    return;
  }

  try {
    // Import the compiler dynamically (browser-portable)
    const { compile } = await import('../core/compiler');
    const result = compile(source);

    if (result.errors.length > 0) {
      output.textContent = result.errors.map(e =>
        `Error at ${e.line}:${e.column}: ${e.message}`
      ).join('\n');
      output.style.color = 'var(--signal-red)';
      return;
    }

    output.textContent = result.js;
    output.style.color = 'var(--text-muted)';

    // Render circuit graph from static metadata
    if (result.graphMetadata) {
      renderCircuitGraph(result.graphMetadata);
    }

    // Inject into iframe
    injectPreview(result.js);
  } catch (e: any) {
    output.textContent = `Compile error: ${e.message}`;
    output.style.color = 'var(--signal-red)';
  }
}

async function injectPreview(code: string) {
  // Strip import statements from generated code — we'll provide the runtime globally
  const strippedCode = code.replace(/^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '');

  // Load runtime source to inline in the iframe
  const runtimeModules = await Promise.all([
    fetch('/src/runtime/circuit.ts').then(r => r.text()),
    fetch('/src/runtime/signals.ts').then(r => r.text()),
    fetch('/src/runtime/dom.ts').then(r => r.text()),
  ]);

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0; padding: 1rem;
      background: #0a0a0f; color: #e8e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    }
    button {
      font-size: 0.875rem; padding: 0.5rem 1rem;
      border-radius: 4px; border: 1px solid #2a2a3a;
      background: #1a1a26; color: #e8e8f0; cursor: pointer;
      margin: 0.25rem;
    }
    button:hover { background: #22222e; border-color: #4a4a6a; }
    .counter .display { font-family: monospace; font-size: 2rem; margin: 1rem 0; }
    .counter .controls { display: flex; gap: 0.5rem; justify-content: center; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    // Inline runtime (simplified for playground)
    const circuit = { registerSignal() { return 'sig'; }, registerComb() { return 'comb'; }, registerEffect() { return 'eff'; }, notifyChange() {}, addWire() {} };

    let _currentComputation = null;
    let _batchDepth = 0;
    let _pendingEffects = [];

    function createSignal(initial, name, moduleId) {
      let value = initial;
      const subs = new Set();
      const id = circuit.registerSignal(name, moduleId, () => value);
      const read = () => {
        if (_currentComputation) subs.add(_currentComputation);
        return value;
      };
      const write = (next) => {
        const v = typeof next === 'function' ? next(value) : next;
        if (v === value) return;
        value = v;
        for (const sub of [...subs]) {
          if (_batchDepth > 0) _pendingEffects.push(sub);
          else sub();
        }
      };
      return [read, write];
    }

    function createComb(fn, name, moduleId) {
      let value, dirty = true;
      const subs = new Set();
      const recompute = () => {
        const prev = _currentComputation;
        _currentComputation = () => { dirty = true; flushIfNeeded(); };
        value = fn();
        _currentComputation = prev;
        dirty = false;
      };
      recompute();
      return () => {
        if (dirty) recompute();
        if (_currentComputation) subs.add(_currentComputation);
        return value;
      };
    }

    function createEffect(fn, name, moduleId) {
      const run = () => {
        const prev = _currentComputation;
        _currentComputation = run;
        fn();
        _currentComputation = prev;
      };
      run();
    }

    function batch(fn) {
      _batchDepth++;
      fn();
      _batchDepth--;
      if (_batchDepth === 0) {
        const effects = [..._pendingEffects];
        _pendingEffects = [];
        for (const eff of effects) eff();
      }
    }

    function flushIfNeeded() {
      if (_batchDepth === 0 && _pendingEffects.length > 0) {
        const effects = [..._pendingEffects];
        _pendingEffects = [];
        for (const eff of effects) eff();
      }
    }

    // Run the compiled module
    const root = document.getElementById('app');
    ${strippedCode}

    // Try to find and call the module's mount function
    const moduleMatch = \`${strippedCode}\`.match(/function (\\w+)\\(root\\)/);
    if (moduleMatch) {
      window[moduleMatch[1]]?.(root) || eval(moduleMatch[1] + '(root)');
    }
  </script>
</body>
</html>`;

  preview.srcdoc = html;
}

function renderCircuitGraph(graph: any) {
  // Convert GraphMetadata (signals/combs/events) to a node+wire graph for visualization
  const nodes: { name: string; type: string }[] = [];
  const wires: { from: string; to: string }[] = [];

  if (graph.signals) {
    for (const sig of graph.signals) {
      nodes.push({ name: sig.name, type: 'signal' });
    }
  }
  if (graph.combs) {
    for (const comb of graph.combs) {
      nodes.push({ name: comb.name, type: 'comb' });
      for (const dep of comb.deps) {
        wires.push({ from: dep, to: comb.name });
      }
    }
  }
  if (graph.events) {
    for (const evt of graph.events) {
      nodes.push({ name: evt.name, type: 'event' });
      for (const w of evt.writes) {
        wires.push({ from: evt.name, to: w });
      }
    }
  }

  if (nodes.length === 0) {
    circuitViz.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">No circuit data</p>';
    return;
  }

  const width = circuitViz.clientWidth || 280;
  const height = Math.max(400, nodes.length * 48 + 80);
  const nodeSpacing = height / (nodes.length + 1);

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Position nodes vertically, grouped by type
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node, i) => {
    const x = node.type === 'signal' ? 60 : node.type === 'comb' ? 180 : 120;
    const y = nodeSpacing * (i + 1);
    positions[node.name] = { x, y };

    const color = node.type === 'signal' ? '#60a5fa' :
                  node.type === 'comb' ? '#4ade80' : '#fbbf24';
    svg += `<rect x="${x - 35}" y="${y - 12}" width="70" height="24" rx="4"
                  style="fill: #12121a; stroke: ${color}; stroke-width: 1.5;"/>`;
    svg += `<text x="${x}" y="${y + 4}" text-anchor="middle"
                  style="fill: ${color}; font-family: monospace; font-size: 9px;">${node.name}</text>`;
  });

  // Draw wires
  for (const wire of wires) {
    const from = positions[wire.from];
    const to = positions[wire.to];
    if (from && to) {
      svg += `<line x1="${from.x + 35}" y1="${from.y}" x2="${to.x - 35}" y2="${to.y}"
                    style="stroke: #3a3a4a; stroke-width: 1.5;" marker-end="url(#arrow)"/>`;
    }
  }

  // Arrow marker
  svg += `<defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    <polygon points="0 0, 8 3, 0 6" fill="#3a3a4a"/></marker></defs>`;

  svg += '</svg>';
  circuitViz.innerHTML = svg;
}

// Event listeners
editor.addEventListener('input', scheduleCompile);
runBtn.addEventListener('click', compileAndRun);
exampleSelect.addEventListener('change', () => {
  const name = exampleSelect.value;
  if (examples[name]) {
    editor.value = examples[name];
    compileAndRun();
  }
});

// Listen for circuit events from iframe
window.addEventListener('message', (event) => {
  if (event.data?.type === 'circuit-event') {
    // Animate wire pulses in the SVG
    // TODO: implement live wire animation
  }
});

// Initialize
loadExamples().then(() => {
  if (editor.value) {
    compileAndRun();
  }
});
