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

function injectPreview(code: string) {
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
    }
    button:hover { background: #22222e; border-color: #4a4a6a; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    ${code}
  </script>
</body>
</html>`;

  preview.srcdoc = html;
}

function renderCircuitGraph(graph: any) {
  // SVG circuit visualization from static graph metadata
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    circuitViz.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">No circuit data</p>';
    return;
  }

  const width = circuitViz.clientWidth || 280;
  const height = circuitViz.clientHeight || 400;
  const nodeSpacing = height / (graph.nodes.length + 1);

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Position nodes vertically
  const positions: Record<string, { x: number; y: number }> = {};
  graph.nodes.forEach((node: any, i: number) => {
    const x = node.type === 'signal' ? 60 : node.type === 'comb' ? 180 : 120;
    const y = nodeSpacing * (i + 1);
    positions[node.name] = { x, y };

    // Node shape
    const color = node.type === 'signal' ? '#60a5fa' :
                  node.type === 'comb' ? '#4ade80' : '#fbbf24';
    svg += `<rect x="${x - 30}" y="${y - 12}" width="60" height="24" rx="4"
                  class="circuit-node" style="fill: #1a1a26; stroke: ${color};"/>`;
    svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" class="circuit-label"
                  style="fill: ${color};">${node.name}</text>`;
  });

  // Draw wires
  if (graph.wires) {
    for (const wire of graph.wires) {
      const from = positions[wire.from];
      const to = positions[wire.to];
      if (from && to) {
        svg += `<line x1="${from.x + 30}" y1="${from.y}" x2="${to.x - 30}" y2="${to.y}"
                      class="circuit-wire" style="stroke: #3a3a4a;"/>`;
      }
    }
  }

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
