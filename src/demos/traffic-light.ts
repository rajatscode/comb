// Traffic Light demo — FSM-driven state machine with clock, pedestrian walk, and emergency mode
import { createSignal, createComb, createEffect, batch, createFSM, createClock, circuit } from '../runtime/index';
import { SignalInspector } from '../inspector';
import { CircuitVisualizer } from '../visualizer';
import { highlightComb } from '../highlight';

const TRAFFIC_LIGHT_SOURCE = `module TrafficLight {
  enum Phase { Red, Green, Yellow }

  signal phase: Phase = Phase.Red;
  signal walk_requested: bool = false;
  signal emergency: bool = false;

  comb color = phase == Phase.Red ? "red" :
               phase == Phase.Green ? "green" :
               "yellow";

  comb can_walk = phase == Phase.Red && walk_requested;

  always @(next_phase) {
    @if emergency {
      phase <= Phase.Red;
    } @else {
      phase <= phase == Phase.Red ? Phase.Green :
              phase == Phase.Green ? Phase.Yellow :
              Phase.Red;
    }
    walk_requested <= false;
  }

  always @(request_walk) {
    walk_requested <= true;
  }

  always @(toggle_emergency) {
    emergency <= !emergency;
  }

  view {
    <div class="traffic-light">
      <h1>Comb Traffic Light</h1>
      <div class="light-housing">
        <div class={"lamp red " + (color == "red" ? "active" : "")}></div>
        <div class={"lamp yellow " + (color == "yellow" ? "active" : "")}></div>
        <div class={"lamp green " + (color == "green" ? "active" : "")}></div>
      </div>
      <div class="status">
        <p>Phase: {color}</p>
        @if can_walk {
          <p class="walk-signal">WALK</p>
        }
        @if emergency {
          <p class="emergency">EMERGENCY MODE</p>
        }
      </div>
      <div class="controls">
        <button @click=next_phase>next clock</button>
        <button @click=request_walk>request walk</button>
        <button @click=toggle_emergency>
          {emergency ? "clear emergency" : "emergency"}
        </button>
      </div>
    </div>
  }
}`;

const MODULE_ID = 'TrafficLight';

export function mount(container: HTMLElement) {
  circuit.reset();

  container.innerHTML = '';
  container.className = 'split-view three-pane';

  // ── Left: Source Panel ──
  const sourcePanel = document.createElement('div');
  sourcePanel.className = 'source-panel';
  sourcePanel.innerHTML = `
    <div class="panel-header">traffic-light.comb</div>
    <pre>${highlightComb(TRAFFIC_LIGHT_SOURCE)}</pre>
  `;
  container.appendChild(sourcePanel);

  // ── Center: App Panel ──
  const appPanel = document.createElement('div');
  appPanel.className = 'app-panel';
  container.appendChild(appPanel);

  // ── Right: Circuit Viz + Signal Inspector ──
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

  // ── Signals ──
  const [walkRequested, setWalkRequested] = createSignal(false, 'walk_requested', MODULE_ID);
  const [emergency, setEmergency] = createSignal(false, 'emergency', MODULE_ID);

  // ── FSM ──
  const fsm = createFSM('phase', MODULE_ID, [
    {
      name: 'Red',
      transitions: [
        {
          event: 'next',
          guard: () => !emergency(),
          target: 'Green',
          action: () => setWalkRequested(false),
        },
        {
          event: 'next',
          guard: () => emergency(),
          target: 'Red',
          action: () => setWalkRequested(false),
        },
      ],
    },
    {
      name: 'Green',
      transitions: [
        {
          event: 'next',
          guard: () => !emergency(),
          target: 'Yellow',
          action: () => setWalkRequested(false),
        },
        {
          event: 'next',
          guard: () => emergency(),
          target: 'Red',
          action: () => setWalkRequested(false),
        },
      ],
    },
    {
      name: 'Yellow',
      transitions: [
        {
          event: 'next',
          target: 'Red',
          action: () => setWalkRequested(false),
        },
      ],
    },
  ], 'Red');

  // ── Derived signals ──
  const color = createComb(() => {
    const s = fsm.state();
    return s === 'Red' ? 'red' : s === 'Green' ? 'green' : 'yellow';
  }, 'color', MODULE_ID);

  const canWalk = createComb(() => {
    return fsm.state() === 'Red' && walkRequested();
  }, 'can_walk', MODULE_ID);

  // ── Clock (1s auto-cycle) ──
  const clock = createClock('cycle_clock', MODULE_ID, { type: 'interval', interval: 1000 });
  clock.onTick(() => fsm.send('next'));

  // ── DOM refs for reactive updates ──
  const lampRed = document.createElement('div');
  const lampYellow = document.createElement('div');
  const lampGreen = document.createElement('div');

  lampRed.className = 'lamp red active';
  lampYellow.className = 'lamp yellow';
  lampGreen.className = 'lamp green';

  // Status elements
  const phaseLabel = document.createElement('p');
  phaseLabel.style.fontFamily = 'var(--font-mono)';
  phaseLabel.style.fontSize = '0.9rem';
  phaseLabel.style.color = 'var(--text-secondary)';
  phaseLabel.style.marginTop = '0.75rem';

  const walkSignal = document.createElement('p');
  walkSignal.style.fontFamily = 'var(--font-mono)';
  walkSignal.style.fontWeight = '700';
  walkSignal.style.fontSize = '1.1rem';
  walkSignal.style.color = '#22c55e';
  walkSignal.style.textShadow = '0 0 12px #22c55e';
  walkSignal.style.marginTop = '0.5rem';
  walkSignal.style.display = 'none';
  walkSignal.textContent = 'WALK';

  const emergencyBadge = document.createElement('p');
  emergencyBadge.style.fontFamily = 'var(--font-mono)';
  emergencyBadge.style.fontWeight = '700';
  emergencyBadge.style.fontSize = '0.85rem';
  emergencyBadge.style.color = '#ef4444';
  emergencyBadge.style.textShadow = '0 0 12px #ef4444';
  emergencyBadge.style.marginTop = '0.5rem';
  emergencyBadge.style.display = 'none';
  emergencyBadge.textContent = 'EMERGENCY MODE';

  const tickLabel = document.createElement('p');
  tickLabel.style.fontFamily = 'var(--font-mono)';
  tickLabel.style.fontSize = '0.75rem';
  tickLabel.style.color = 'var(--text-muted)';
  tickLabel.style.marginTop = '0.25rem';

  // ── Effects for reactive DOM updates ──
  createEffect(() => {
    const c = color();
    lampRed.className = `lamp red${c === 'red' ? ' active' : ''}`;
    lampYellow.className = `lamp yellow${c === 'yellow' ? ' active' : ''}`;
    lampGreen.className = `lamp green${c === 'green' ? ' active' : ''}`;
    phaseLabel.textContent = `Phase: ${c.toUpperCase()}`;
  }, 'updateLamps', MODULE_ID);

  createEffect(() => {
    walkSignal.style.display = canWalk() ? 'block' : 'none';
  }, 'updateWalk', MODULE_ID);

  createEffect(() => {
    const em = emergency();
    emergencyBadge.style.display = em ? 'block' : 'none';
    emergencyBtn.textContent = em ? 'clear emergency' : 'emergency';
  }, 'updateEmergency', MODULE_ID);

  createEffect(() => {
    tickLabel.textContent = `tick #${clock.tickCount()}`;
  }, 'updateTick', MODULE_ID);

  // ── Build the app UI ──
  const wrapper = document.createElement('div');
  wrapper.className = 'traffic-light';

  const title = document.createElement('h2');
  title.textContent = 'Traffic Light';
  title.style.marginBottom = '0.5rem';
  wrapper.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.style.fontFamily = 'var(--font-mono)';
  subtitle.style.fontSize = '0.75rem';
  subtitle.style.color = 'var(--text-muted)';
  subtitle.style.marginBottom = '1rem';
  subtitle.textContent = 'FSM + Clock domain';
  wrapper.appendChild(subtitle);

  // Light housing
  const housing = document.createElement('div');
  housing.className = 'light-housing';
  housing.appendChild(lampRed);
  housing.appendChild(lampYellow);
  housing.appendChild(lampGreen);
  wrapper.appendChild(housing);

  // Status
  const status = document.createElement('div');
  status.appendChild(phaseLabel);
  status.appendChild(walkSignal);
  status.appendChild(emergencyBadge);
  status.appendChild(tickLabel);
  wrapper.appendChild(status);

  // Controls
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '0.5rem';
  controls.style.justifyContent = 'center';
  controls.style.marginTop = '1.25rem';
  controls.style.flexWrap = 'wrap';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'next clock';
  nextBtn.addEventListener('click', () => fsm.send('next'));
  controls.appendChild(nextBtn);

  const walkBtn = document.createElement('button');
  walkBtn.textContent = 'request walk';
  walkBtn.addEventListener('click', () => setWalkRequested(true));
  controls.appendChild(walkBtn);

  const emergencyBtn = document.createElement('button');
  emergencyBtn.textContent = 'emergency';
  emergencyBtn.style.borderColor = '#ef4444';
  emergencyBtn.style.color = '#ef4444';
  emergencyBtn.addEventListener('click', () => setEmergency(e => !e));
  controls.appendChild(emergencyBtn);

  wrapper.appendChild(controls);

  // Clock controls
  const clockControls = document.createElement('div');
  clockControls.style.display = 'flex';
  clockControls.style.gap = '0.5rem';
  clockControls.style.justifyContent = 'center';
  clockControls.style.marginTop = '0.75rem';

  const startBtn = document.createElement('button');
  startBtn.className = 'primary';
  startBtn.textContent = 'start auto';
  startBtn.addEventListener('click', () => {
    clock.start();
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
  });
  clockControls.appendChild(startBtn);

  const stopBtn = document.createElement('button');
  stopBtn.textContent = 'stop auto';
  stopBtn.style.display = 'none';
  stopBtn.addEventListener('click', () => {
    clock.stop();
    stopBtn.style.display = 'none';
    startBtn.style.display = 'inline-block';
  });
  clockControls.appendChild(stopBtn);

  wrapper.appendChild(clockControls);
  appPanel.appendChild(wrapper);

  // ── Signal Inspector ──
  const inspector = new SignalInspector(inspectorContainer);
  inspector.attach(circuit);

  // ── Circuit Visualizer ──
  const viz = new CircuitVisualizer(circuitContainer);
  const graphData = circuit.getModule(MODULE_ID);
  if (graphData.nodes.length > 0) {
    viz.renderStatic({
      modules: [{
        name: MODULE_ID,
        nodes: graphData.nodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          deps: Array.from(n.dependencies),
        })),
        wires: graphData.wires.map(w => ({ from: w.from, to: w.to })),
      }],
    });

    circuit.subscribe((event) => {
      if (event.type === 'signal-change' || event.type === 'comb-recompute') {
        viz.onSignalChange(event.nodeId, event.newValue);
      }
    });
  }
}
