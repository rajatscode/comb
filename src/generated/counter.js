import { createSignal, createComb, createEffect, batch } from '../runtime/signals.js';
import { circuit } from '../runtime/circuit.js';

export function Counter(root) {
  const moduleId = 'Counter';

  // Signal: count
  const [count, setCount] = createSignal(0, 'count', moduleId);

  // Combinational: label
  const label = createComb(() => ("Count: " + String(count())), 'label', moduleId);

  // Combinational: doubled
  const doubled = createComb(() => (count() * 2), 'doubled', moduleId);

  // Event handler: increment
  function increment() {
    batch(() => {
      setCount((count() + 1));
    });
  }

  // Event handler: decrement
  function decrement() {
    batch(() => {
      setCount((count() - 1));
    });
  }

  // Event handler: reset
  function reset() {
    batch(() => {
      setCount(0);
    });
  }

  // View
  function render() {
    const el1 = document.createElement('div');
    el1.setAttribute('class', 'counter');
    const el2 = document.createElement('h1');
    const txt3 = document.createTextNode('Comb Counter');
    el2.appendChild(txt3);
    el1.appendChild(el2);
    const el4 = document.createElement('p');
    el4.setAttribute('class', 'display');
    const txt5 = document.createTextNode('');
    createEffect(() => { txt5.textContent = String(label()); }, 'text_txt5', moduleId);
    el4.appendChild(txt5);
    el1.appendChild(el4);
    const el6 = document.createElement('p');
    el6.setAttribute('class', 'detail');
    const txt7 = document.createTextNode('doubled =');
    el6.appendChild(txt7);
    const txt8 = document.createTextNode('');
    createEffect(() => { txt8.textContent = String(doubled()); }, 'text_txt8', moduleId);
    el6.appendChild(txt8);
    el1.appendChild(el6);
    const el9 = document.createElement('div');
    el9.setAttribute('class', 'controls');
    const el10 = document.createElement('button');
    el10.addEventListener('click', decrement);
    const txt11 = document.createTextNode('-');
    el10.appendChild(txt11);
    el9.appendChild(el10);
    const el12 = document.createElement('button');
    el12.addEventListener('click', reset);
    const txt13 = document.createTextNode('reset');
    el12.appendChild(txt13);
    el9.appendChild(el12);
    const el14 = document.createElement('button');
    el14.addEventListener('click', increment);
    const txt15 = document.createTextNode('+');
    el14.appendChild(txt15);
    el9.appendChild(el14);
    el1.appendChild(el9);
    root.appendChild(el1);
  }

  render();

}
