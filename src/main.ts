import { circuit } from './runtime/index.js';
import { batch } from './runtime/index.js';
import { renderCircuitGraph } from './visualizer.js';

const app = document.getElementById('app')!;

// Navigation
const nav = document.createElement('nav');
nav.className = 'demo-nav';
nav.innerHTML = `
  <a href="#registration" class="nav-link active" data-demo="registration">Registration Form</a>
  <a href="#ticker" class="nav-link" data-demo="ticker">Stock Ticker</a>
  <a href="#diff" class="nav-link" data-demo="diff">Circuit Diff</a>
  <a href="#color" class="nav-link" data-demo="color">Color Picker</a>
`;
app.appendChild(nav);

const content = document.createElement('div');
content.id = 'demo-content';
app.appendChild(content);

let currentDispose: (() => void) | null = null;

function loadDemo(name: string) {
  // Clean up previous demo
  if (currentDispose) { currentDispose(); currentDispose = null; }
  circuit.reset();
  content.innerHTML = '';
  content.removeAttribute('style');

  // Update nav active state
  nav.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', (el as HTMLElement).dataset.demo === name);
  });

  if (name === 'registration') {
    loadRegistration();
  } else if (name === 'ticker') {
    loadTicker();
  } else if (name === 'diff') {
    loadDiff();
  } else if (name === 'color') {
    loadColor();
  }
}

async function loadRegistration() {
  const { RegistrationForm, __graph, __test } = await import('./generated/registration.js');

  // Split layout
  const paneApp = document.createElement('div');
  paneApp.className = 'pane pane-app';
  const paneCircuit = document.createElement('div');
  paneCircuit.className = 'pane pane-circuit';
  content.appendChild(paneApp);
  content.appendChild(paneCircuit);

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

  // Heatmap grid
  const heatmapContainer = document.createElement('div');
  heatmapContainer.className = 'heatmap-container';

  // Labels
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

  // Subscribe to circuit events to record combinations
  const unsub = circuit.subscribe(() => { recordCombination(); });
  // Record initial state
  setTimeout(recordCombination, 100);

  // Auto-test button
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
        // Record from test circuit
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

async function loadTicker() {
  const { mountStockTicker } = await import('./demos/stock-ticker.js');
  const result = mountStockTicker(content);
  currentDispose = result.dispose;
}

async function loadDiff() {
  const { mountCircuitDiff } = await import('./demos/circuit-diff.js');
  const result = mountCircuitDiff(content);
  currentDispose = result.dispose;
}

async function loadColor() {
  const { mountColorPicker } = await import('./demos/color-picker.js');
  const result = mountColorPicker(content);
  currentDispose = result.dispose;
}

// Route based on hash
function route() {
  const hash = location.hash.replace('#', '') || 'registration';
  loadDemo(hash);
}

nav.addEventListener('click', (e) => {
  const link = (e.target as HTMLElement).closest('.nav-link') as HTMLAnchorElement;
  if (link) {
    e.preventDefault();
    const demo = link.dataset.demo!;
    location.hash = demo;
  }
});

window.addEventListener('hashchange', route);
route();
