import { RegistrationForm, __graph } from './generated/registration.js';
import { circuit } from './runtime/index.js';
import { renderCircuitGraph } from './visualizer.js';

const app = document.getElementById('app')!;

// Split layout: form on left, circuit on right
const paneApp = document.createElement('div');
paneApp.className = 'pane pane-app';

const paneCircuit = document.createElement('div');
paneCircuit.className = 'pane pane-circuit';

app.appendChild(paneApp);
app.appendChild(paneCircuit);

// Mount registration form
const formWrapper = document.createElement('div');
formWrapper.className = 'form-wrapper';
paneApp.appendChild(formWrapper);
RegistrationForm(formWrapper);

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

// Mount circuit visualizer
renderCircuitGraph(paneCircuit, __graph as any, circuit);
