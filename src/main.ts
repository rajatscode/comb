import { circuit } from './runtime/index.js';
import { batch } from './runtime/index.js';
import { renderCircuitGraph } from './visualizer.js';

const app = document.getElementById('app')!;

// --- Landing page HTML ---
function createLanding(): HTMLElement {
  const landing = document.createElement('div');
  landing.className = 'landing';
  landing.innerHTML = `
    <section class="landing-hero">
      <h1 class="hero-title">Stop hand-tracking your reactive dependencies.</h1>
      <p class="hero-subtitle">Comb is a compiled reactive framework with edge-triggered sensitivity, temporal assertions, and a static circuit graph.</p>

      <p class="hero-problem-label">The problem: fire an alert <strong>once</strong> when a value crosses a threshold.</p>

      <div class="code-comparison">
        <div class="code-panel">
          <div class="code-panel-header">React</div>
          <pre><code><span class="hl-keyword">const</span> [val, setVal] = <span class="hl-type">useState</span>(0);
<span class="hl-keyword">const</span> prev = <span class="hl-type">useRef</span>(<span class="hl-keyword">false</span>);

<span class="hl-type">useEffect</span>(() =&gt; {
  <span class="hl-keyword">const</span> isHigh = val &gt; threshold;
  <span class="hl-keyword">if</span> (isHigh &amp;&amp; !prev.current) {
    fireAlert();  <span class="hl-comment">// posedge</span>
  }
  prev.current = isHigh;
}, [val, threshold]);</code></pre>
        </div>
        <div class="code-panel">
          <div class="code-panel-header">Svelte</div>
          <pre><code><span class="hl-keyword">let</span> prev = <span class="hl-keyword">false</span>;
$: isHigh = val &gt; threshold;
$: {
  <span class="hl-keyword">if</span> (isHigh &amp;&amp; !prev) fireAlert();
  prev = isHigh;
}</code></pre>
        </div>
        <div class="code-panel code-panel-comb">
          <div class="code-panel-header">Comb</div>
          <pre><code><span class="hl-keyword">always</span> @(<span class="hl-type">posedge</span> val &gt; threshold) {
  fireAlert();
}</code></pre>
        </div>
      </div>

      <p class="hero-desc">
        Comb eliminates entire classes of bugs that plague React, Svelte, Vue, and SolidJS.
        Edge triggers, temporal assertions, and a compiler-emitted dependency graph
        mean you stop guessing and start proving.
      </p>
      <a href="#demos-section" class="hero-cta" onclick="document.getElementById('demos-section').scrollIntoView({behavior:'smooth'});return false;">Try the Demos &#8595;</a>
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

        <div class="feature-card">
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

    <section class="pipeline-section">
      <h2 class="section-title">The __graph Pipeline</h2>
      <div class="pipeline-diagram">
        <div class="pipeline-node pipeline-source">.comb source</div>
        <div class="pipeline-arrow">&rarr;</div>
        <div class="pipeline-node pipeline-compiler">Compiler</div>
        <div class="pipeline-arrow">&rarr;</div>
        <div class="pipeline-node pipeline-graph">__graph</div>
        <div class="pipeline-arrow">&rarr;</div>
        <div class="pipeline-outputs">
          <div class="pipeline-output">Circuit Visualizer</div>
          <div class="pipeline-output">Waveform Debugger</div>
          <div class="pipeline-output">Circuit Diff</div>
          <div class="pipeline-output">Coverage Testing</div>
          <div class="pipeline-output">Runtime <span class="pipeline-small">(signals, combs, effects)</span></div>
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

function showLanding() {
  if (currentDispose) { currentDispose(); currentDispose = null; }
  circuit.reset();
  content.innerHTML = '';
  content.removeAttribute('style');
  content.className = 'landing-mode';
  content.appendChild(createLanding());
  currentView = 'home';

  nav.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', (el as HTMLElement).dataset.demo === 'home');
  });
}

function loadDemo(name: string) {
  if (currentDispose) { currentDispose(); currentDispose = null; }
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
