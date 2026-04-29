import './styles.css';
import { highlightComb } from './highlight';
import { circuit } from './runtime/index';

const app = document.getElementById('app')!;

const COUNTER_SOURCE = `module Counter {
  signal count: int = 0;

  comb label = "Count: " + str(count);
  comb doubled = count * 2;

  always @(increment) {
    count <= count + 1;
  }

  always @(reset) {
    count <= 0;
  }

  view {
    <div class="counter">
      <h1>Comb Counter</h1>
      <p class="display">{label}</p>
      <button @click=increment>+</button>
      <button @click=reset>reset</button>
    </div>
  }
}`;

function renderLanding() {
  app.innerHTML = `
    <nav class="top-nav">
      <a href="#" class="nav-logo" id="nav-home">Comb</a>
      <div class="nav-links">
        <a href="#" data-nav="counter">Counter</a>
        <a href="#" data-nav="traffic-light">Traffic Light</a>
        <a href="#" data-nav="minesweeper">Minesweeper</a>
        <a href="#" data-nav="chat">Chat</a>
        <a href="/playground.html" class="nav-playground">Playground</a>
      </div>
    </nav>
    <div class="demo-page">
      <div class="demo-header">
        <h1>Comb</h1>
        <p class="tagline">Write circuits. Ship apps.</p>
        <p style="margin-top: 1rem; color: var(--text-muted); max-width: 600px; margin-left: auto; margin-right: auto;">
          A SystemVerilog-inspired reactive web framework. Your UI is a circuit —
          signals flow through wires, combinational logic derives state,
          and events clock transitions forward.
        </p>
      </div>

      <div class="demo-grid">
        <div class="demo-card featured" data-demo="counter">
          <span class="badge">Start here</span>
          <h3>Counter</h3>
          <p class="description">Signals, combinational logic, and event-triggered state transitions. The "hello world" of reactive circuits.</p>
        </div>
        <div class="demo-card" data-demo="traffic-light">
          <h3>Traffic Light</h3>
          <p class="description">First-class state machines with guarded transitions. Emergency override shows signal priority.</p>
        </div>
        <div class="demo-card" data-demo="minesweeper">
          <h3>Minesweeper</h3>
          <p class="description">A full game proving arrays, module composition, and signal propagation through a grid of 256 instances.</p>
        </div>
        <div class="demo-card" data-demo="chat">
          <h3>Chat</h3>
          <p class="description">Dynamic lists, input binding, and signals crossing the wire boundary. Messages as data pulses.</p>
        </div>
      </div>

      <div class="code-preview">
        <div class="source-panel">
          <div class="panel-header">counter.comb</div>
          <pre>${highlightComb(COUNTER_SOURCE)}</pre>
        </div>
      </div>

      <div id="demo-container"></div>
    </div>
  `;

  // Nav links
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const demo = (link as HTMLElement).dataset.nav!;
      loadDemo(demo);
    });
  });

  document.getElementById('nav-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    renderLanding();
  });

  // Demo cards
  document.querySelectorAll('.demo-card').forEach(card => {
    card.addEventListener('click', () => {
      const demo = (card as HTMLElement).dataset.demo!;
      loadDemo(demo);
    });
  });
}

async function loadDemo(name: string) {
  const container = document.getElementById('demo-container')!;
  // Hide cards and code preview when loading demo
  const grid = document.querySelector('.demo-grid') as HTMLElement;
  const codePreview = document.querySelector('.code-preview') as HTMLElement;
  const header = document.querySelector('.demo-header') as HTMLElement;
  if (grid) grid.style.display = 'none';
  if (codePreview) codePreview.style.display = 'none';
  if (header) header.style.display = 'none';

  container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading...</p>';
  circuit.reset(); // Clear stale circuit graph data from previous demo

  try {
    const module = await import(`./demos/${name}.ts`);
    container.innerHTML = '';
    module.mount(container);
  } catch (e: any) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color: var(--signal-red); margin-bottom: 1rem;">Demo "${name}" failed to load.</p>
        <p style="color: var(--text-muted); font-size: 0.85rem;">${e.message}</p>
      </div>
    `;
  }
}

// Boot
renderLanding();
