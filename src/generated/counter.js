import { createSignal, createComb, createEffect, batch, createScope, circuit } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "count",
      "name": "count",
      "type": "signal"
    },
    {
      "id": "label",
      "name": "label",
      "type": "comb"
    },
    {
      "id": "doubled",
      "name": "doubled",
      "type": "comb"
    },
    {
      "id": "event:increment",
      "name": "increment",
      "type": "event"
    },
    {
      "id": "event:decrement",
      "name": "decrement",
      "type": "event"
    },
    {
      "id": "event:reset",
      "name": "reset",
      "type": "event"
    },
    {
      "id": "view",
      "name": "view",
      "type": "view-binding"
    }
  ],
  "edges": [
    {
      "from": "count",
      "to": "label",
      "type": "data"
    },
    {
      "from": "count",
      "to": "doubled",
      "type": "data"
    },
    {
      "from": "event:increment",
      "to": "count",
      "type": "write"
    },
    {
      "from": "event:decrement",
      "to": "count",
      "type": "write"
    },
    {
      "from": "event:reset",
      "to": "count",
      "type": "write"
    },
    {
      "from": "label",
      "to": "view",
      "type": "data"
    },
    {
      "from": "doubled",
      "to": "view",
      "type": "data"
    }
  ]
};

export function Counter(root) {
  const $m = 'Counter';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [count, setCount] = createSignal(0, { name: 'count', module: $m, type: 'int' });

  const label = createComb(() => ("Count: " + String(count())), { name: 'label', module: $m, deps: ["count"] });

  const doubled = createComb(() => (count() * 2), { name: 'doubled', module: $m, deps: ["count"] });

  function increment() {
    batch(() => {
      setCount((count() + 1));
    });
  }

  function decrement() {
    batch(() => {
      setCount((count() - 1));
    });
  }

  function reset() {
    batch(() => {
      setCount(0);
    });
  }

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'counter');
  const el1 = document.createElement('h1');
  const txt0 = document.createTextNode('Comb Counter');
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('p');
  el2.setAttribute('class', 'display');
  const txt1 = document.createTextNode('');
  createEffect(() => { txt1.data = String(label()); }, { name: 'view:txt1', module: $m });
  el2.appendChild(txt1);
  el0.appendChild(el2);
  const el3 = document.createElement('p');
  el3.setAttribute('class', 'detail');
  const txt2 = document.createTextNode('doubled =');
  el3.appendChild(txt2);
  const txt3 = document.createTextNode('');
  createEffect(() => { txt3.data = String(doubled()); }, { name: 'view:txt3', module: $m });
  el3.appendChild(txt3);
  el0.appendChild(el3);
  const el4 = document.createElement('div');
  el4.setAttribute('class', 'controls');
  const el5 = document.createElement('button');
  el5.addEventListener('click', decrement);
  const txt4 = document.createTextNode('-');
  el5.appendChild(txt4);
  el4.appendChild(el5);
  const el6 = document.createElement('button');
  el6.addEventListener('click', reset);
  const txt5 = document.createTextNode('reset');
  el6.appendChild(txt5);
  el4.appendChild(el6);
  const el7 = document.createElement('button');
  el7.addEventListener('click', increment);
  const txt6 = document.createTextNode('+');
  el7.appendChild(txt6);
  el4.appendChild(el7);
  el0.appendChild(el4);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}