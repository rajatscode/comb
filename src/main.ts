import { circuit } from './runtime/index.js';
import { batch } from './runtime/index.js';
import { renderCircuitGraph } from './visualizer.js';
import { renderWaveform } from './waveform.js';
import monitorSrc from '../examples/monitor.comb?raw';

const app = document.getElementById('app')!;

// --- Framework code snippets (edge-detection only, no comments) ---
const COMB_SNIPPET = `comb cpuHigh = cpuAvg > cpuThreshold;
comb memHigh = memAvg > memThreshold;
comb diskHigh = disk > diskThreshold;

always @(posedge cpuHigh) {
  alertCount <= alertCount + 1;
  lastAlert <= "CPU crossed " + cpuThreshDisplay;
}
always @(negedge cpuHigh) {
  lastAlert <= "CPU recovered";
}
always @(posedge memHigh) {
  alertCount <= alertCount + 1;
  lastAlert <= "Memory exceeded " + memThreshDisplay;
}
always @(negedge memHigh) {
  lastAlert <= "Memory recovered";
}
always @(posedge diskHigh) {
  alertCount <= alertCount + 1;
  lastAlert <= "Disk exceeded " + diskThreshDisplay;
}
always @(negedge diskHigh) {
  lastAlert <= "Disk recovered";
}`;

const REACT_SNIPPET = `const [cpuThresh, setCpuThresh] = useState(80);
const [memThresh, setMemThresh] = useState(85);
const [diskThresh, setDiskThresh] = useState(90);

const cpuHigh = cpuAvg > cpuThresh;
const memHigh = memAvg > memThresh;
const diskHigh = disk > diskThresh;

const prevCpu = useRef(false);
const prevMem = useRef(false);
const prevDisk = useRef(false);

useEffect(() => {
  if (cpuHigh && !prevCpu.current) {
    setAlertCount(c => c + 1);
    setLastAlert(\`CPU crossed \${cpuThresh}%\`);
  }
  if (!cpuHigh && prevCpu.current)
    setLastAlert("CPU recovered");
  prevCpu.current = cpuHigh;
}, [cpuHigh, cpuThresh]);

useEffect(() => {
  if (memHigh && !prevMem.current) {
    setAlertCount(c => c + 1);
    setLastAlert(\`Memory exceeded \${memThresh}%\`);
  }
  if (!memHigh && prevMem.current)
    setLastAlert("Memory recovered");
  prevMem.current = memHigh;
}, [memHigh, memThresh]);

useEffect(() => {
  if (diskHigh && !prevDisk.current) {
    setAlertCount(c => c + 1);
    setLastAlert(\`Disk exceeded \${diskThresh}%\`);
  }
  if (!diskHigh && prevDisk.current)
    setLastAlert("Disk recovered");
  prevDisk.current = diskHigh;
}, [diskHigh, diskThresh]);`;

const SVELTE_SNIPPET = `let cpuThresh = $state(80);
let memThresh = $state(85);
let diskThresh = $state(90);

let cpuHigh = $derived(cpuAvg > cpuThresh);
let memHigh = $derived(memAvg > memThresh);
let diskHigh = $derived(disk > diskThresh);

let prevCpu = false, prevMem = false, prevDisk = false;

$effect(() => {
  if (cpuHigh && !prevCpu) {
    alertCount++;
    lastAlert = \`CPU crossed \${cpuThresh}%\`;
  }
  if (!cpuHigh && prevCpu) lastAlert = "CPU recovered";
  prevCpu = cpuHigh;
});
$effect(() => {
  if (memHigh && !prevMem) {
    alertCount++;
    lastAlert = \`Memory exceeded \${memThresh}%\`;
  }
  if (!memHigh && prevMem) lastAlert = "Memory recovered";
  prevMem = memHigh;
});
$effect(() => {
  if (diskHigh && !prevDisk) {
    alertCount++;
    lastAlert = \`Disk exceeded \${diskThresh}%\`;
  }
  if (!diskHigh && prevDisk) lastAlert = "Disk recovered";
  prevDisk = diskHigh;
});`;

const SOLID_SNIPPET = `const [cpuThresh, setCpuThresh] = createSignal(80);
const [memThresh, setMemThresh] = createSignal(85);
const [diskThresh, setDiskThresh] = createSignal(90);

const cpuHigh = () => cpuAvg() > cpuThresh();
const memHigh = () => memAvg() > memThresh();
const diskHigh = () => disk() > diskThresh();

let prevCpu = false, prevMem = false, prevDisk = false;

createEffect(() => {
  const h = cpuHigh();
  if (h && !prevCpu) {
    setAlertCount(c => c + 1);
    setLastAlert(\`CPU crossed \${cpuThresh()}%\`);
  }
  if (!h && prevCpu) setLastAlert("CPU recovered");
  prevCpu = h;
});
createEffect(() => {
  const h = memHigh();
  if (h && !prevMem) {
    setAlertCount(c => c + 1);
    setLastAlert(\`Memory exceeded \${memThresh()}%\`);
  }
  if (!h && prevMem) setLastAlert("Memory recovered");
  prevMem = h;
});
createEffect(() => {
  const h = diskHigh();
  if (h && !prevDisk) {
    setAlertCount(c => c + 1);
    setLastAlert(\`Disk exceeded \${diskThresh()}%\`);
  }
  if (!h && prevDisk) setLastAlert("Disk recovered");
  prevDisk = h;
});`;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Landing page HTML ---
function createLanding(): HTMLElement {
  const landing = document.createElement('div');
  landing.className = 'landing';
  landing.innerHTML = `
    <section class="landing-hero">
      <h1 class="hero-title">Comb</h1>
      <p class="hero-subtitle">A compiled UI framework where your reactive dependencies are visible, verified, and debuggable.</p>
    </section>

    <section class="live-demo-section">
      <div id="live-preview" class="live-demo-container"></div>
    </section>

    <section class="code-editor-section">
      <div class="code-comparison-row">
        <div class="code-pane">
          <div class="code-pane-header">Comb</div>
          <textarea id="comb-editor" class="comb-editor" spellcheck="false">${escapeHtml(COMB_SNIPPET)}</textarea>
          <div id="comb-errors" class="comb-errors"></div>
        </div>
        <div class="code-pane">
          <div class="showcase-tabs" id="framework-tabs">
            <button class="tab active" data-tab="react">React</button>
            <button class="tab" data-tab="svelte">Svelte</button>
            <button class="tab" data-tab="solid">Solid</button>
          </div>
          <div class="showcase-panels" id="framework-panels">
            <div class="panel active" data-panel="react">
              <pre><code>${escapeHtml(REACT_SNIPPET)}</code></pre>
            </div>
            <div class="panel" data-panel="svelte">
              <pre><code>${escapeHtml(SVELTE_SNIPPET)}</code></pre>
            </div>
            <div class="panel" data-panel="solid">
              <pre><code>${escapeHtml(SOLID_SNIPPET)}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="tooling-callout">
      <p>Everything below is <strong>free</strong> — generated automatically from your .comb source. No setup, no plugins, no config.</p>
    </section>

    <section class="circuit-graph-section">
      <h2 class="section-title">Circuit Graph</h2>
      <p style="text-align:center; color:#888; font-size:0.85rem; margin-bottom:1rem;">Every signal, derived value, edge trigger, and DOM binding — extracted at compile time.</p>
      <div id="circuit-graph" class="circuit-graph-container"></div>
    </section>

    <section class="waveform-section">
      <div id="waveform-container" class="waveform-landing-container"></div>
    </section>

    <section class="autotest-section">
      <h2 class="section-title">Auto-Test</h2>
      <p style="text-align:center; color:#888; font-size:0.85rem; margin-bottom:1rem;">
        __test() gives headless access to all signals. Fuzz random inputs, verify every boolean comb.
      </p>
      <div id="autotest-grid" class="autotest-grid"></div>
      <div style="text-align:center; margin-top:1rem;">
        <button id="run-autotest" class="auto-test-btn">Run Auto-Test (50 random inputs)</button>
        <span id="autotest-result" style="margin-left:1rem; font-family:monospace; font-size:0.85rem;"></span>
      </div>
    </section>

    <section class="features-section">
      <h2 class="section-title">What you get</h2>
      <div class="feature-cards">
        <div class="feature-card">
          <h3 class="feature-card-title">Edge-Triggered Sensitivity</h3>
          <code class="feature-code">@(posedge x)</code>
          <p class="feature-card-desc">
            Fires once when <code>x</code> transitions false&rarr;true. Not every render.
            Not while true. Once. The mechanism exists in MobX/RxJS &mdash; Comb makes it
            a compiled language construct.
          </p>
        </div>
        <div class="feature-card feature-card-prominent">
          <h3 class="feature-card-title">Auto-Derived Testing</h3>
          <code class="feature-code">__test()</code>
          <p class="feature-card-desc">
            Every <code>comb</code> declaration IS a testable spec. <code>__test()</code>
            gives headless access to all signals and combs. The compiler knows your
            dependencies &mdash; it auto-generates what to test.
          </p>
        </div>
        <div class="feature-card">
          <h3 class="feature-card-title">Static Circuit Graph</h3>
          <code class="feature-code">__graph</code>
          <p class="feature-card-desc">
            The compiler emits a JSON dependency graph alongside your JS. Visualize it,
            diff it between versions, run CI checks on it. No other framework does this.
          </p>
        </div>
        <div class="feature-card">
          <h3 class="feature-card-title">Temporal Assertions</h3>
          <code class="feature-code">assert temporal @(posedge submit) eventually(showResult) within 5s;</code>
          <p class="feature-card-desc">
            Embedded time-bounded invariants. If <code>submit</code> fires but no result
            appears within 5 seconds, the assertion fails. Try expressing that in React.
          </p>
        </div>
        <div class="feature-card">
          <h3 class="feature-card-title">DES Execution Model</h3>
          <code class="feature-code">batch(() =&gt; { a.set(1); b.set(2); })</code>
          <p class="feature-card-desc">
            Delta cycles guarantee your UI never shows inconsistent state. Combs settle
            before DOM updates. Multiple signal writes in one handler are atomic.
            No glitch frames, ever.
          </p>
        </div>
      </div>
    </section>

    <section class="demos-section" id="demos-section">
      <h2 class="section-title">Demos</h2>
      <div class="demo-cards">
        <a href="#monitor" class="demo-card">
          <h3>System Monitor</h3>
          <p>Edge-triggered alerts with @(posedge) and @(negedge). Fires once on threshold crossing, not every tick.</p>
        </a>
        <a href="#registration" class="demo-card">
          <h3>Dependency Debugger</h3>
          <p>Compiler-verified deps, live circuit diagram, auto-test with 16/16 coverage in &lt;1s</p>
        </a>
        <a href="#ticker" class="demo-card">
          <h3>Waveform Debugger</h3>
          <p>Signal traces over time, like a hardware logic analyzer for your UI</p>
        </a>
        <a href="#diff" class="demo-card">
          <h3>Circuit Diff</h3>
          <p>Diff reactive topology across refactors. Zero prior art.</p>
        </a>
        <a href="#color" class="demo-card">
          <h3>Color Picker</h3>
          <p>Bidirectional constraints via propagator networks. Try doing this in React.</p>
        </a>
        <a href="#layout" class="demo-card">
          <h3>Constraint Layout</h3>
          <p>Cassowary solver (kiwi.js) enforces min/max constraints on a resizable three-pane layout.</p>
        </a>
        <a href="/playground.html" class="demo-card demo-card-highlight">
          <h3>Playground</h3>
          <p>Write .comb code in the browser. Live compile, preview, and circuit visualization.</p>
        </a>
      </div>
    </section>

    <section class="demos-section">
      <h2 class="section-title">Documentation</h2>
      <div class="demo-cards">
        <a href="/docs.html" class="demo-card demo-card-highlight">
          <h3>Language Reference</h3>
          <p>Complete syntax guide: signals, combs, always blocks, view bindings, cells, constraints, and more.</p>
        </a>
      </div>
    </section>

    <footer class="landing-footer">
      Built with the Comb compiler. 52 tests. Open source.
    </footer>
  `;
  return landing;
}

// --- Navigation ---
const nav = document.createElement('nav');
nav.className = 'demo-nav';
nav.innerHTML = `
  <a href="#" class="nav-link nav-home" data-demo="home">Comb</a>
  <a href="#monitor" class="nav-link" data-demo="monitor">System Monitor</a>
  <a href="#registration" class="nav-link" data-demo="registration">Dependency Debugger</a>
  <a href="#ticker" class="nav-link" data-demo="ticker">Waveform Debugger</a>
  <a href="#diff" class="nav-link" data-demo="diff">Circuit Diff</a>
  <a href="#color" class="nav-link" data-demo="color">Color Picker</a>
  <a href="#layout" class="nav-link" data-demo="layout">Constraint Layout</a>
`;
app.appendChild(nav);

const content = document.createElement('div');
content.id = 'demo-content';
app.appendChild(content);

let currentDispose: (() => void) | null = null;
let currentView: string = '';

let livePreviewDispose: (() => void) | null = null;

// Track disposables for circuit graph and waveform to re-render on recompile
let circuitGraphDispose: (() => void) | null = null;
let waveformDispose: (() => void) | null = null;

function showLanding() {
  if (currentDispose) { currentDispose(); currentDispose = null; }
  if (livePreviewDispose) { livePreviewDispose(); livePreviewDispose = null; }
  if (circuitGraphDispose) { circuitGraphDispose(); circuitGraphDispose = null; }
  if (waveformDispose) { waveformDispose(); waveformDispose = null; }
  circuit.reset();
  content.innerHTML = '';
  content.removeAttribute('style');
  content.className = 'landing-mode';
  const landingEl = createLanding();
  content.appendChild(landingEl);
  currentView = 'home';

  nav.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', (el as HTMLElement).dataset.demo === 'home');
  });

  // Wire up framework tab switching (right pane only)
  const tabsContainer = landingEl.querySelector('#framework-tabs');
  const panelsContainer = landingEl.querySelector('#framework-panels');
  if (tabsContainer && panelsContainer) {
    tabsContainer.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        panelsContainer.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        panelsContainer.querySelector(`[data-panel="${(tab as HTMLElement).dataset.tab}"]`)?.classList.add('active');
      });
    });
  }

  // Auto-test button handler — fuzz all boolean combs
  document.getElementById('run-autotest')?.addEventListener('click', async () => {
    const btn = document.getElementById('run-autotest') as HTMLButtonElement;
    const resultEl = document.getElementById('autotest-result')!;
    const gridEl = document.getElementById('autotest-grid')!;
    btn.disabled = true;
    btn.textContent = 'Running...';

    const { __test } = await import('./generated/monitor.js');
    const NUM_TESTS = 50;
    let pass = 0;
    let fail = 0;

    // Build table — randomize ALL inputs including all 3 thresholds
    let html = '<table><thead><tr>';
    html += '<th>#</th><th>cpuAvg</th><th>cpuThr</th><th>memAvg</th><th>memThr</th><th>disk</th><th>diskThr</th>';
    html += '<th>cpuHigh</th><th>memHigh</th><th>diskHigh</th><th>anyAlert</th>';
    html += '</tr></thead><tbody>';

    for (let i = 0; i < NUM_TESTS; i++) {
      const t = __test();
      const r = () => Math.round(Math.random() * 100 * 10) / 10;
      const cpuAvg = r(), cpuThr = r(), memAvg = r(), memThr = r(), disk = r(), diskThr = r();

      batch(() => {
        t.signals.cpuAvg.set(cpuAvg);
        t.signals.cpuThreshold.set(cpuThr);
        t.signals.memAvg.set(memAvg);
        t.signals.memThreshold.set(memThr);
        t.signals.disk.set(disk);
        t.signals.diskThreshold.set(diskThr);
      });

      const expectedCpuHigh = cpuAvg > cpuThr;
      const expectedMemHigh = memAvg > memThr;
      const expectedDiskHigh = disk > diskThr;
      const expectedAnyAlert = expectedCpuHigh || expectedMemHigh || expectedDiskHigh;

      const actualCpuHigh = t.combs.cpuHigh();
      const actualMemHigh = t.combs.memHigh();
      const actualDiskHigh = t.combs.diskHigh();
      const actualAnyAlert = t.combs.anyAlert();

      const cpuOk = actualCpuHigh === expectedCpuHigh;
      const memOk = actualMemHigh === expectedMemHigh;
      const diskOk = actualDiskHigh === expectedDiskHigh;
      const alertOk = actualAnyAlert === expectedAnyAlert;

      const rowPass = cpuOk && memOk && diskOk && alertOk;
      if (rowPass) pass++; else fail++;

      const cell = (ok: boolean, val: boolean) =>
        `<td class="${ok ? 'pass' : 'fail'}">${val ? '\u2713' : '\u2717'}</td>`;

      html += `<tr>`;
      html += `<td>${i + 1}</td>`;
      html += `<td>${cpuAvg}</td><td>${cpuThr}</td><td>${memAvg}</td><td>${memThr}</td><td>${disk}</td><td>${diskThr}</td>`;
      html += cell(cpuOk, actualCpuHigh);
      html += cell(memOk, actualMemHigh);
      html += cell(diskOk, actualDiskHigh);
      html += cell(alertOk, actualAnyAlert);
      html += `</tr>`;

      t.dispose();
    }

    html += '</tbody></table>';
    gridEl.innerHTML = html;

    resultEl.style.color = fail === 0 ? '#44ff44' : '#ff4444';
    resultEl.textContent = `${pass}/${pass + fail} passed` + (fail > 0 ? ` (${fail} failed)` : '');
    btn.textContent = 'Run Again';
    btn.disabled = false;
  });

  // Mount live monitor preview + circuit graph + waveform
  setTimeout(async () => {
    const previewEl = document.getElementById('live-preview');
    if (!previewEl) return;

    const { Monitor, __graph } = await import('./generated/monitor.js');

    const component = Monitor(previewEl);

    const M = 'Monitor';
    const set = (name: string, v: any) => circuit.getNode(`${M}.${name}`)?.setValue?.(v);

    // Start threshold at 40 so alerts fire quickly
    set('cpuThreshold', 40);

    // Simulation — spike CPU early, vary all 4 metrics
    const cpuHist: number[] = [];
    const memHist: number[] = [];
    let tick = 0;
    const iv = setInterval(() => {
      tick++;
      const cpuSpike = (tick % 20 > 4 && tick % 20 < 12);
      const cpu = cpuSpike ? 40 + Math.random() * 30 : 15 + Math.random() * 20;
      const mem = 40 + 25 * Math.sin(tick / 40) + Math.random() * 10;
      const disk = 30 + 20 * Math.sin(tick / 80) + Math.random() * 5;
      const net = 5 + Math.random() * 50;
      cpuHist.push(cpu);
      memHist.push(mem);
      if (cpuHist.length > 10) cpuHist.shift();
      if (memHist.length > 10) memHist.shift();
      const cpuAvg = cpuHist.reduce((a, b) => a + b) / cpuHist.length;
      const memAvg = memHist.reduce((a, b) => a + b) / memHist.length;
      batch(() => {
        set('cpu', Math.round(cpu * 10) / 10);
        set('mem', Math.round(mem * 10) / 10);
        set('disk', Math.round(disk * 10) / 10);
        set('net', Math.round(net * 10) / 10);
        set('cpuAvg', Math.round(cpuAvg * 10) / 10);
        set('memAvg', Math.round(memAvg * 10) / 10);
      });
    }, 500);

    // Render circuit graph
    const circuitGraphEl = document.getElementById('circuit-graph');
    if (circuitGraphEl) {
      const cgResult = renderCircuitGraph(circuitGraphEl, __graph as any, circuit);
      circuitGraphDispose = cgResult.dispose;
    }

    // Render waveform — must start recording first
    circuit.startRecording();
    const waveformEl = document.getElementById('waveform-container');
    if (waveformEl) {
      const wfResult = renderWaveform(waveformEl, circuit, [
        `${M}.cpu`,
        `${M}.cpuAvg`,
        `${M}.cpuHigh`,
        `${M}.mem`,
        `${M}.memHigh`,
        `${M}.anyAlert`,
      ]);
      waveformDispose = wfResult.dispose;
    }

    // Set up live recompilation from the Comb editor
    setupLiveCompilation(previewEl, iv, component);

    livePreviewDispose = () => {
      clearInterval(iv);
      circuit.stopRecording();
      component.dispose();
      if (circuitGraphDispose) { circuitGraphDispose(); circuitGraphDispose = null; }
      if (waveformDispose) { waveformDispose(); waveformDispose = null; }
    };
  }, 100);
}

async function setupLiveCompilation(
  previewEl: HTMLElement,
  simulationInterval: ReturnType<typeof setInterval>,
  initialComponent: { dispose: () => void },
) {
  const { compile } = await import('./core/compiler.js');
  const editor = document.getElementById('comb-editor') as HTMLTextAreaElement | null;
  const errorsEl = document.getElementById('comb-errors');
  if (!editor || !errorsEl) return;

  // Replace the snippet with the full source for editing
  editor.value = monitorSrc;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let currentComponent = initialComponent;
  let currentInterval = simulationInterval;

  editor.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => recompile(), 300);
  });

  async function recompile() {
    const source = editor!.value;
    const result = compile(source);

    if (result.errors.length > 0) {
      errorsEl!.textContent = result.errors.map(e => `Line ${e.line}:${e.column} - ${e.message}`).join('\n');
      errorsEl!.style.display = 'block';
      return;
    }

    errorsEl!.style.display = 'none';

    try {
      // Dispose old component
      clearInterval(currentInterval);
      currentComponent.dispose();
      if (circuitGraphDispose) { circuitGraphDispose(); circuitGraphDispose = null; }
      if (waveformDispose) { waveformDispose(); waveformDispose = null; }
      circuit.reset();

      // Eval the new module — fix import paths for Blob URL context
      // Blob URLs can't resolve relative or absolute paths, need full origin URLs
      let js = result.js!;
      const origin = window.location.origin;
      js = js.replace(/from\s+['"]\.\.\/runtime\/index\.js['"]/g, `from '${origin}/src/runtime/index.ts'`);
      js = js.replace(/from\s+['"]\.\.\/runtime\/circuit\.js['"]/g, `from '${origin}/src/runtime/circuit.ts'`);
      js = js.replace(/from\s+['"]\.\.\/runtime\/color\.js['"]/g, `from '${origin}/src/runtime/color.ts'`);
      const blob = new Blob([js], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const mod = await import(/* @vite-ignore */ url);
      URL.revokeObjectURL(url);

      // Find the module factory (first exported function that isn't __test or __graph)
      const factoryName = Object.keys(mod).find(k => typeof mod[k] === 'function' && k !== '__test');
      if (!factoryName) return;

      previewEl.innerHTML = '';
      const component = mod[factoryName](previewEl);
      currentComponent = component;

      const moduleName = factoryName;
      const set = (name: string, v: any) => circuit.getNode(`${moduleName}.${name}`)?.setValue?.(v);

      // Restart simulation
      set('cpuThreshold', 40);
      const cpuHist: number[] = [];
      let tick = 0;
      currentInterval = setInterval(() => {
        tick++;
        const spike = (tick % 20 > 4 && tick % 20 < 12);
        const cpu = spike ? 40 + Math.random() * 30 : 15 + Math.random() * 20;
        const mem = 40 + 20 * Math.sin(tick / 40) + Math.random() * 10;
        cpuHist.push(cpu);
        if (cpuHist.length > 10) cpuHist.shift();
        const avg = cpuHist.reduce((a, b) => a + b) / cpuHist.length;
        batch(() => {
          set('cpu', Math.round(cpu * 10) / 10);
          set('mem', Math.round(mem * 10) / 10);
          set('cpuAvg', Math.round(avg * 10) / 10);
        });
      }, 500);

      // Re-render circuit graph
      const circuitGraphEl = document.getElementById('circuit-graph');
      if (circuitGraphEl && mod.__graph) {
        circuitGraphEl.innerHTML = '';
        const cgResult = renderCircuitGraph(circuitGraphEl, mod.__graph as any, circuit);
        circuitGraphDispose = cgResult.dispose;
      }

      // Re-render waveform
      circuit.startRecording();
      const waveformEl = document.getElementById('waveform-container');
      if (waveformEl) {
        waveformEl.innerHTML = '';
        const wfResult = renderWaveform(waveformEl, circuit, [
          `${moduleName}.cpu`,
          `${moduleName}.cpuAvg`,
          `${moduleName}.cpuHigh`,
        ]);
        waveformDispose = wfResult.dispose;
      }

      // Update the livePreviewDispose to clean up the new resources
      livePreviewDispose = () => {
        clearInterval(currentInterval);
        currentComponent.dispose();
        if (circuitGraphDispose) { circuitGraphDispose(); circuitGraphDispose = null; }
        if (waveformDispose) { waveformDispose(); waveformDispose = null; }
      };
    } catch (err: any) {
      errorsEl!.textContent = `Runtime error: ${err.message}`;
      errorsEl!.style.display = 'block';
    }
  }
}

function loadDemo(name: string) {
  if (currentDispose) { currentDispose(); currentDispose = null; }
  if (livePreviewDispose) { livePreviewDispose(); livePreviewDispose = null; }
  if (circuitGraphDispose) { circuitGraphDispose(); circuitGraphDispose = null; }
  if (waveformDispose) { waveformDispose(); waveformDispose = null; }
  circuit.reset();
  content.innerHTML = '';
  content.removeAttribute('style');
  content.className = '';
  currentView = name;

  // Back link
  const backLink = document.createElement('a');
  backLink.href = '#';
  backLink.className = 'back-link';
  backLink.textContent = '\u2190 Back to overview';
  content.appendChild(backLink);

  // Demo wrapper
  const demoWrap = document.createElement('div');
  demoWrap.id = 'demo-wrap';
  content.appendChild(demoWrap);

  nav.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', (el as HTMLElement).dataset.demo === name);
  });

  if (name === 'monitor') {
    loadMonitor(demoWrap);
  } else if (name === 'registration') {
    loadRegistration(demoWrap);
  } else if (name === 'ticker') {
    loadTicker(demoWrap);
  } else if (name === 'diff') {
    loadDiff(demoWrap);
  } else if (name === 'color') {
    loadColor(demoWrap);
  } else if (name === 'layout') {
    loadLayout(demoWrap);
  }
}

async function loadMonitor(container: HTMLElement) {
  const { mountMonitor } = await import('./demos/monitor-mount.js');
  const result = mountMonitor(container);
  currentDispose = result.dispose;
}

async function loadRegistration(container: HTMLElement) {
  const { RegistrationForm, __graph, __test } = await import('./generated/registration.js');

  const paneApp = document.createElement('div');
  paneApp.className = 'pane pane-app';
  const paneCircuit = document.createElement('div');
  paneCircuit.className = 'pane pane-circuit';
  container.appendChild(paneApp);
  container.appendChild(paneCircuit);

  const formWrapper = document.createElement('div');
  formWrapper.className = 'form-wrapper';
  paneApp.appendChild(formWrapper);
  const result = RegistrationForm(formWrapper);

  // Compiler error examples
  const errorPanel = document.createElement('div');
  errorPanel.className = 'error-examples';
  errorPanel.innerHTML = `
    <h3>Compiler-Caught Bugs</h3>
    <div class="error-example">
      <code>comb canSubmit = usernameValid && emailValid && paswordStrong;</code>
      <div class="error-msg">Error: Undefined reference 'paswordStrong' in comb 'canSubmit'</div>
    </div>
    <div class="error-example">
      <code>always @(submit) { emailValid <= false; }</code>
      <div class="error-msg">Error: Cannot write to 'emailValid' (comb) — only signals can be assigned</div>
    </div>
    <div class="error-example">
      <code>comb a = b * 2;  comb b = a + 1;</code>
      <div class="error-msg">Error: Circular dependency detected: a → b → a</div>
    </div>
  `;
  formWrapper.appendChild(errorPanel);

  // Coverage heatmap
  const coveragePanel = document.createElement('div');
  coveragePanel.className = 'coverage-panel';
  const coverageTitle = document.createElement('h3');
  coverageTitle.textContent = 'Validation Coverage Heatmap';
  coveragePanel.appendChild(coverageTitle);

  const boolCombs = ['usernameValid', 'emailValid', 'passwordStrong', 'passwordsMatch'];
  const hitSet = new Set<number>();

  const heatmapContainer = document.createElement('div');
  heatmapContainer.className = 'heatmap-container';

  const labelRow = document.createElement('div');
  labelRow.className = 'heatmap-labels';
  labelRow.innerHTML = boolCombs.map(n => `<span>${n.replace('Valid', 'V').replace('Strong', 'S').replace('Match', 'M').replace('password', 'pw').replace('username', 'user').replace('email', 'em')}</span>`).join('');
  heatmapContainer.appendChild(labelRow);

  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';
  const cells: HTMLDivElement[] = [];
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.title = boolCombs.map((n, bit) => `${n}: ${(i >> (3 - bit)) & 1 ? 'T' : 'F'}`).join('\n');
    cells.push(cell);
    grid.appendChild(cell);
  }
  heatmapContainer.appendChild(grid);

  const countLabel = document.createElement('div');
  countLabel.className = 'heatmap-count';
  countLabel.textContent = '0 / 16 combinations hit';
  heatmapContainer.appendChild(countLabel);

  coveragePanel.appendChild(heatmapContainer);

  function updateHeatmap() {
    for (let i = 0; i < 16; i++) {
      cells[i].className = `heatmap-cell ${hitSet.has(i) ? 'hit' : ''}`;
    }
    countLabel.textContent = `${hitSet.size} / 16 combinations hit`;
  }

  function recordCombination() {
    const moduleNodes = circuit.getNodes().filter(n => n.module === 'RegistrationForm');
    let combo = 0;
    for (let bit = 0; bit < boolCombs.length; bit++) {
      const node = moduleNodes.find(n => n.name === boolCombs[bit]);
      if (node?.getValue && node.getValue()) combo |= (1 << (3 - bit));
    }
    hitSet.add(combo);
    updateHeatmap();
  }

  const unsub = circuit.subscribe(() => { recordCombination(); });
  setTimeout(recordCombination, 100);

  const autoBtn = document.createElement('button');
  autoBtn.className = 'auto-test-btn';
  autoBtn.textContent = 'Auto-Test (1000 random inputs)';
  autoBtn.addEventListener('click', () => {
    autoBtn.disabled = true;
    autoBtn.textContent = 'Running...';
    setTimeout(() => {
      const t = __test();
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789@.!#';
      function randomString(len: number): string {
        let s = '';
        for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
      }
      for (let i = 0; i < 1000; i++) {
        batch(() => {
          t.signals.username.set(randomString(Math.floor(Math.random() * 10)));
          t.signals.email.set(randomString(Math.floor(Math.random() * 20)));
          const pw = randomString(Math.floor(Math.random() * 12));
          t.signals.password.set(pw);
          t.signals.confirm.set(Math.random() > 0.5 ? pw : randomString(8));
        });
        let combo = 0;
        if (t.combs.usernameValid()) combo |= 8;
        if (t.combs.emailValid()) combo |= 4;
        if (t.combs.passwordStrong()) combo |= 2;
        if (t.combs.passwordsMatch()) combo |= 1;
        hitSet.add(combo);
      }
      t.dispose();
      updateHeatmap();
      autoBtn.textContent = `Done — ${hitSet.size}/16 hit`;
      autoBtn.disabled = false;
    }, 10);
  });
  coveragePanel.appendChild(autoBtn);
  formWrapper.appendChild(coveragePanel);

  renderCircuitGraph(paneCircuit, __graph as any, circuit);

  currentDispose = () => {
    unsub();
    result.dispose();
  };
}

async function loadTicker(container: HTMLElement) {
  const { mountStockTicker } = await import('./demos/stock-ticker-mount.js');
  const result = mountStockTicker(container);
  currentDispose = result.dispose;
}

async function loadDiff(container: HTMLElement) {
  const { mountCircuitDiff } = await import('./demos/circuit-diff.js');
  const result = mountCircuitDiff(container);
  currentDispose = result.dispose;
}

async function loadColor(container: HTMLElement) {
  const { mountColorPicker } = await import('./demos/color-picker-mount.js');
  const result = mountColorPicker(container);
  currentDispose = result.dispose;
}

async function loadLayout(container: HTMLElement) {
  const { mountResizableLayout } = await import('./demos/resizable-layout-mount.js');
  const result = mountResizableLayout(container);
  currentDispose = result.dispose;
}

// Route based on hash
function route() {
  const hash = location.hash.replace('#', '');
  if (!hash || hash === 'demos-section') {
    showLanding();
  } else {
    loadDemo(hash);
  }
}

nav.addEventListener('click', (e) => {
  const link = (e.target as HTMLElement).closest('.nav-link') as HTMLAnchorElement;
  if (link) {
    e.preventDefault();
    const demo = link.dataset.demo!;
    if (demo === 'home') {
      location.hash = '';
    } else {
      location.hash = demo;
    }
  }
});

window.addEventListener('hashchange', route);
route();

// --- HMR: hot-reload generated .comb modules with state preservation ---
if (import.meta.hot) {
  // Snapshot signal values from the circuit before dispose
  function snapshotSignals(): Map<string, any> {
    const snapshot = new Map<string, any>();
    for (const node of circuit.getNodes()) {
      if (node.getValue) {
        snapshot.set(node.id, node.getValue());
      }
    }
    return snapshot;
  }

  // Restore signal values after remount
  function restoreSignals(snapshot: Map<string, any>) {
    for (const node of circuit.getNodes()) {
      const saved = snapshot.get(node.id);
      if (saved !== undefined && node.setValue) {
        try { node.setValue(saved); } catch (_) { /* signal shape may have changed */ }
      }
    }
  }

  // Registration demo HMR
  import.meta.hot.accept('./generated/registration.js', (newModule) => {
    if (!newModule || currentView !== 'registration') return;
    const snapshot = snapshotSignals();
    if (currentDispose) { currentDispose(); currentDispose = null; }
    circuit.reset();
    const demoWrap = document.getElementById('demo-wrap');
    if (demoWrap) {
      demoWrap.innerHTML = '';
      const { RegistrationForm, __graph } = newModule;
      const result = RegistrationForm(demoWrap);
      restoreSignals(snapshot);
      currentDispose = result.dispose;
      console.log('[comb HMR] Registration reloaded, signals restored');
    }
  });

  // Counter demo HMR (if wired up in future)
  import.meta.hot.accept('./generated/counter.js', (newModule) => {
    if (!newModule) return;
    console.log('[comb HMR] counter.js updated');
  });

  // Traffic-light HMR
  import.meta.hot.accept('./generated/traffic-light.js', (newModule) => {
    if (!newModule) return;
    console.log('[comb HMR] traffic-light.js updated');
  });
}
