import { Counter, __graph } from './generated/counter.js';
import { circuit } from './runtime/index.js';
import { renderCircuitGraph } from './visualizer.js';

const app = document.getElementById('app')!;

// Split layout: counter on left, circuit on right
const paneApp = document.createElement('div');
paneApp.className = 'pane pane-app';

const paneCircuit = document.createElement('div');
paneCircuit.className = 'pane pane-circuit';

app.appendChild(paneApp);
app.appendChild(paneCircuit);

// Mount counter
Counter(paneApp);

// Mount circuit visualizer
renderCircuitGraph(paneCircuit, __graph as any, circuit);
