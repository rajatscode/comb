import { circuit } from './runtime/index.js';
import { renderCircuitGraph } from './visualizer.js';

const app = document.getElementById('app')!;

// Navigation
const nav = document.createElement('nav');
nav.className = 'demo-nav';
nav.innerHTML = `
  <a href="#registration" class="nav-link active" data-demo="registration">Registration Form</a>
  <a href="#ticker" class="nav-link" data-demo="ticker">Stock Ticker</a>
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
  }
}

async function loadRegistration() {
  const { RegistrationForm, __graph } = await import('./generated/registration.js');

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

  renderCircuitGraph(paneCircuit, __graph as any, circuit);

  currentDispose = () => { result.dispose(); };
}

async function loadTicker() {
  const { mountStockTicker } = await import('./demos/stock-ticker.js');
  const result = mountStockTicker(content);
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
