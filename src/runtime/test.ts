// test.ts — Manual integration test: counter app using the raw runtime

import { createSignal, createComb, createEffect, createFSM, createClock, batch, circuit } from './index.js';
import { createElement, bindText, renderConditional } from './index.js';

// --- Counter with derived state and FSM ---

const moduleId = 'test-counter';

// Signals
const [count, setCount] = createSignal(0, 'count', moduleId);
const [step, setStep] = createSignal(1, 'step', moduleId);

// Derived (comb)
const doubled = createComb(() => count() * 2, 'doubled', moduleId);
const label = createComb(
  () => `Count: ${count()} | Doubled: ${doubled()} | Step: ${step()}`,
  'label',
  moduleId
);

// FSM for counter mode
const mode = createFSM('counter-mode', moduleId, [
  {
    name: 'counting',
    transitions: [
      { event: 'pause', target: 'paused' },
      { event: 'reset', target: 'counting', action: () => setCount(0) },
    ],
  },
  {
    name: 'paused',
    transitions: [
      { event: 'resume', target: 'counting' },
      { event: 'reset', target: 'counting', action: () => setCount(0) },
    ],
  },
], 'counting');

// Clock for auto-increment
const clock = createClock('auto-tick', moduleId, { type: 'interval', interval: 1000 });
clock.onTick(() => {
  if (mode.state() === 'counting') {
    setCount(c => c + step());
  }
});

// --- Build DOM ---

function mount(root: HTMLElement): void {
  const container = createElement('div', { style: { fontFamily: 'monospace', padding: '24px' } });

  // Title
  container.appendChild(createElement('h2', {}, ['Comb Runtime Test']));

  // Reactive label
  const labelP = createElement('p', { id: 'label' });
  bindText(label, labelP);
  container.appendChild(labelP);

  // FSM state display
  const modeP = createElement('p', {});
  bindText(() => `Mode: ${mode.state()}`, modeP);
  container.appendChild(modeP);

  // Buttons
  const btnRow = createElement('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } });

  btnRow.appendChild(createElement('button', {
    onClick: () => setCount(c => c + step()),
  }, ['+']));

  btnRow.appendChild(createElement('button', {
    onClick: () => setCount(c => c - step()),
  }, ['-']));

  btnRow.appendChild(createElement('button', {
    onClick: () => setStep(s => s === 1 ? 5 : 1),
  }, ['Toggle Step (1/5)']));

  btnRow.appendChild(createElement('button', {
    onClick: () => mode.send('pause'),
  }, ['Pause']));

  btnRow.appendChild(createElement('button', {
    onClick: () => mode.send('resume'),
  }, ['Resume']));

  btnRow.appendChild(createElement('button', {
    onClick: () => mode.send('reset'),
  }, ['Reset']));

  container.appendChild(btnRow);

  // Auto-tick toggle
  const tickRow = createElement('div', { style: { marginTop: '12px' } });
  tickRow.appendChild(createElement('button', {
    onClick: () => clock.running ? clock.stop() : clock.start(),
  }, ['Toggle Auto-Tick (1s)']));
  container.appendChild(tickRow);

  // Conditional rendering test
  const condDiv = createElement('div', { style: { marginTop: '12px' } });
  renderConditional(
    condDiv,
    () => count() > 10,
    () => createElement('p', { style: { color: 'green' } }, ['Count is over 10!']),
    () => createElement('p', { style: { color: 'gray' } }, ['Count is 10 or less.'])
  );
  container.appendChild(condDiv);

  // Circuit graph debug info
  const debugBtn = createElement('button', {
    style: { marginTop: '16px' },
    onClick: () => {
      console.log('Circuit Snapshot:', circuit.snapshot());
      console.log('Nodes:', circuit.getNodes().map(n => `${n.type}:${n.name}`));
      console.log('Wires:', circuit.getWires().map(w => `${w.from} -> ${w.to}`));
    },
  }, ['Dump Circuit to Console']);
  container.appendChild(debugBtn);

  root.appendChild(container);
}

// Mount when DOM is ready
const root = document.getElementById('app');
if (root) {
  mount(root);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const r = document.getElementById('app') || document.body;
    mount(r);
  });
}
