// Counter demo wrapper — mounts the compiled counter with source display + signal inspector
import { circuit } from '../runtime/circuit';
import { highlightComb } from '../highlight';
import { SignalInspector } from '../inspector';
import { CircuitVisualizer } from '../visualizer';

// Import the compiled counter module
// @ts-ignore - generated file
import { Counter } from '../generated/counter.js';

const COUNTER_SOURCE = `module Counter {
  signal count: int = 0;

  comb label = "Count: " + str(count);
  comb doubled = count * 2;

  always @(increment) {
    count <= count + 1;
  }

  always @(decrement) {
    count <= count - 1;
  }

  always @(reset) {
    count <= 0;
  }

  view {
    <div class="counter">
      <h1>Comb Counter</h1>
      <p class="display">{label}</p>
      <p class="detail">doubled = {doubled}</p>
      <div class="controls">
        <button @click=decrement>-</button>
        <button @click=reset>reset</button>
        <button @click=increment>+</button>
      </div>
    </div>
  }
}`;

export function mount(container: HTMLElement) {
  circuit.reset();

  container.innerHTML = '';
  container.className = 'split-view three-pane';

  // Source panel
  const sourcePanel = document.createElement('div');
  sourcePanel.className = 'source-panel';
  sourcePanel.innerHTML = `
    <div class="panel-header">counter.comb</div>
    <pre>${highlightComb(COUNTER_SOURCE)}</pre>
  `;
  container.appendChild(sourcePanel);

  // App panel
  const appPanel = document.createElement('div');
  appPanel.className = 'app-panel';
  container.appendChild(appPanel);

  // Right panel: circuit viz + signal inspector
  const rightPanel = document.createElement('div');
  rightPanel.style.display = 'flex';
  rightPanel.style.flexDirection = 'column';
  rightPanel.style.gap = '1rem';

  const circuitContainer = document.createElement('div');
  circuitContainer.className = 'circuit-panel';
  circuitContainer.style.flex = '1';
  rightPanel.appendChild(circuitContainer);

  const inspectorContainer = document.createElement('div');
  rightPanel.appendChild(inspectorContainer);

  container.appendChild(rightPanel);

  // Mount the compiled counter
  Counter(appPanel);

  // Attach inspector to live circuit
  const inspector = new SignalInspector(inspectorContainer);
  inspector.attach(circuit);

  // Build circuit visualization from live graph
  const viz = new CircuitVisualizer(circuitContainer);
  const graphData = circuit.getModule('Counter');
  if (graphData.nodes.length > 0) {
    viz.renderStatic({
      modules: [{
        name: 'Counter',
        nodes: graphData.nodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          deps: Array.from(n.dependencies),
        })),
        wires: graphData.wires.map(w => ({ from: w.from, to: w.to })),
      }],
    });

    // Subscribe to live events for wire pulses
    circuit.subscribe((event) => {
      if (event.type === 'signal-change' || event.type === 'comb-recompute') {
        viz.onSignalChange(event.nodeId, event.newValue);
      }
    });
  }
}
