// playground.ts — Live compile → preview loop for .comb files

import { compile } from '../core/compiler.js';
import { renderCircuitGraph } from '../visualizer.js';
import counterSrc from '../../examples/counter.comb?raw';
import registrationSrc from '../../examples/registration.comb?raw';
import colorPickerSrc from '../../examples/color-picker.comb?raw';
import compositionSrc from '../../examples/composition.comb?raw';
import assertionsSrc from '../../examples/assertions.comb?raw';
import dashboardSrc from '../../examples/dashboard.comb?raw';

const EXAMPLES: Record<string, string> = {
  counter: counterSrc,
  registration: registrationSrc,
  'color-picker': colorPickerSrc,
  composition: compositionSrc,
  dashboard: dashboardSrc,
  assertions: assertionsSrc,
  blank: `module App {\n  signal count: int = 0;\n\n  comb label = "Count: " + str(count);\n\n  always @(click) {\n    count <= count + 1;\n  }\n\n  view {\n    <div>\n      <p>{label}</p>\n      <button @click=click>+1</button>\n    </div>\n  }\n}\n`,
};

// --- DOM refs ---
const editor = document.getElementById('editor') as HTMLTextAreaElement;
const preview = document.getElementById('preview') as HTMLIFrameElement;
const circuitViz = document.getElementById('circuit-viz') as HTMLDivElement;
const output = document.getElementById('output') as HTMLPreElement;
const exampleSelect = document.getElementById('example-select') as HTMLSelectElement;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
const tabs = document.querySelectorAll<HTMLSpanElement>('.output-panel .tab');
const fileLabel = document.querySelector('.editor-pane .file-label') as HTMLElement | null;

let currentTab: 'js' | 'errors' = 'js';
let lastJs = '';
let lastErrors: string[] = [];

// --- Tab switching ---
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const label = tab.textContent?.trim().toLowerCase() ?? '';
    if (label.includes('error')) {
      currentTab = 'errors';
      showErrors();
    } else {
      currentTab = 'js';
      showJs();
    }
  });
});

function showJs() {
  output.textContent = lastJs || '// No compiled output yet';
  output.style.color = '#ccc';
}

function showErrors() {
  if (lastErrors.length === 0) {
    output.textContent = '// No errors';
    output.style.color = '#4ae04a';
  } else {
    output.textContent = lastErrors.join('\n');
    output.style.color = '#ff6b6b';
  }
}

function updateOutput() {
  if (currentTab === 'errors') showErrors();
  else showJs();
}

// --- Compile and render ---
function runCompile() {
  const source = editor.value;
  const result = compile(source);

  if (result.errors.length > 0) {
    lastErrors = result.errors.map(e => `Line ${e.line}:${e.column} — ${e.message}`);
    lastJs = '';
    preview.srcdoc = `<body style="background:#1a1a2e;color:#ff6b6b;font-family:monospace;padding:1rem;font-size:0.85rem;"><pre>${lastErrors.join('\n')}</pre></body>`;
    circuitViz.innerHTML = '';
    updateOutput();
    return;
  }

  lastJs = result.js ?? '';
  lastErrors = [];

  // Render preview via iframe with import map
  const moduleName = result.ast?.name ?? 'App';
  // For multi-module output: strip exports, deduplicate imports
  const seenImports = new Set<string>();
  const previewJs = lastJs.split('\n').filter(line => {
    if (line.startsWith('import ')) {
      if (seenImports.has(line)) return false;
      seenImports.add(line);
      return true;
    }
    return true;
  }).join('\n').replace(/^export /gm, '');
  const previewHtml = `<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 0; padding: 1rem; }
  button { background: #2a2a3e; color: #e0e0e0; border: 1px solid #3a3a5a; border-radius: 4px; padding: 0.4rem 0.8rem; cursor: pointer; font-family: inherit; }
  button:hover { background: #3a3a5e; }
  input { background: #2a2a3e; color: #e0e0e0; border: 1px solid #3a3a5a; border-radius: 4px; padding: 0.4rem 0.6rem; font-family: inherit; }
  input:focus { outline: none; border-color: #4a9eff; }
  .counter { text-align: center; }
  .counter h1 { margin-top: 0; }
  .counter button { font-size: 1.5rem; padding: 0.5rem 1.5rem; margin: 0 0.5rem; }
  .display { font-size: 2rem; font-weight: bold; margin: 1rem 0; }
  .detail { color: #888; }
  .valid { color: #4ae04a; font-size: 0.8rem; font-weight: 600; }
  .invalid { color: #ff6b6b; font-size: 0.8rem; font-weight: 600; }
  .field { margin-bottom: 0.6rem; }
  .field label { font-size: 0.8rem; color: #aaa; }
  .field input { display: block; width: 100%; margin-top: 0.2rem; }
  .reg-form h2 { margin-top: 0; }
  form { display: flex; flex-direction: column; gap: 0.5rem; }
  .color-picker { display: flex; flex-direction: column; gap: 0.8rem; }
  .color-preview { width: 100%; height: 60px; border-radius: 6px; border: 1px solid #3a3a5a; }
  .hex-display { font-family: monospace; font-size: 1.2rem; text-align: center; }
  .slider-group h3 { font-size: 0.75rem; color: #888; margin: 0 0 0.4rem; text-transform: uppercase; }
  .slider-group label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
  .slider-group input[type="range"] { flex: 1; }
  .dashboard { display: flex; flex-direction: column; gap: 0.8rem; }
  .source, .display { padding: 0.6rem; border: 1px solid #3a3a5a; border-radius: 6px; }
  .source span { margin-right: 0.5rem; }
  .display h3 { margin: 0 0 0.3rem; font-size: 0.95rem; }
  .display p { margin: 0.2rem 0; }
  .high { color: #ff6b6b; font-weight: 600; }
  .normal { color: #4ae04a; }
</style>
<script type="importmap">
{ "imports": { "../runtime/index.js": "/src/runtime/index.ts", "../runtime/color.js": "/src/runtime/color.ts" } }
</script>
</head>
<body>
<div id="root"></div>
<script type="module">
${previewJs}

// Expose circuit for parent page animation
import { circuit } from '../runtime/index.js';
window.__comb_circuit = circuit;

// Boot: find the module factory and call it
if (typeof ${moduleName} === 'function') {
  ${moduleName}(document.getElementById('root'));
}
</script>
</body>
</html>`;
  preview.srcdoc = previewHtml;

  // Render circuit graph (static, no live circuit)
  if (result.graph) {
    circuitViz.innerHTML = '';
    renderCircuitGraph(circuitViz, result.graph);
  }

  updateOutput();
}

// --- Debounced compile on edit ---
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

editor.addEventListener('input', () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runCompile, 300);
});

runBtn.addEventListener('click', () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  runCompile();
});

// --- Example selector ---
exampleSelect.addEventListener('change', () => {
  const name = exampleSelect.value;
  const src = EXAMPLES[name];
  if (src) {
    editor.value = src;
    if (fileLabel) fileLabel.textContent = `${name}.comb`;
    runCompile();
  }
});

// --- Live circuit animation from iframe ---
let circuitUnsub: (() => void) | null = null;

preview.addEventListener('load', () => {
  if (circuitUnsub) { circuitUnsub(); circuitUnsub = null; }
  // Wait for module script to execute
  setTimeout(() => {
    try {
      const iframeCircuit = (preview.contentWindow as any)?.__comb_circuit;
      if (!iframeCircuit || !iframeCircuit.subscribe) return;

      const unsub = iframeCircuit.subscribe((event: any) => {
        const name = event.nodeId?.split('.').pop() ?? '';
        const nodeEl = circuitViz.querySelector(`[data-node-id="${name}"]`) as HTMLElement | null;
        if (nodeEl) {
          // Update value display
          const valueEl = nodeEl.querySelector('.circuit-node-value') as HTMLElement | null;
          if (valueEl && event.newValue !== undefined) {
            const v = event.newValue;
            valueEl.textContent = typeof v === 'string' ? (v.length > 15 ? v.slice(0, 12) + '...' : v) : String(v);
          }
          // Flash animation
          nodeEl.classList.add('active');
          setTimeout(() => nodeEl.classList.remove('active'), 300);
        }
      });
      circuitUnsub = unsub;
    } catch {}
  }, 300);
});

// --- Init: load counter example ---
editor.value = EXAMPLES.counter;
runCompile();

// Prevent full page reload on HMR — playground manages its own state
if (import.meta.hot) {
  import.meta.hot.accept();
}
