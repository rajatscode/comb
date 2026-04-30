// playground.ts — Live compile → preview loop for .comb files

import { compile } from '../core/compiler.js';
import { renderCircuitGraph } from '../visualizer.js';
import counterSrc from '../../examples/counter.comb?raw';
import registrationSrc from '../../examples/registration.comb?raw';

const EXAMPLES: Record<string, string> = {
  counter: counterSrc,
  registration: registrationSrc,
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
</style>
<script type="importmap">
{ "imports": { "../runtime/index.js": "/src/runtime/index.ts" } }
</script>
</head>
<body>
<div id="root"></div>
<script type="module">
${lastJs}

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

// --- Init: load counter example ---
editor.value = EXAMPLES.counter;
runCompile();
