// Counter demo — compiled from counter.comb + mounted with shared demo layout
import { createDemoLayout } from '../demo-layout';
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
  createDemoLayout(container, {
    title: 'counter',
    moduleId: 'Counter',
    source: COUNTER_SOURCE,
    mount: (appEl) => Counter(appEl),
  });
}
