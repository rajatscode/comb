import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "count",
      "name": "count",
      "type": "signal"
    },
    {
      "id": "doubled",
      "name": "doubled",
      "type": "comb"
    },
    {
      "id": "assert:0",
      "name": "assert:0",
      "type": "assert"
    },
    {
      "id": "assert:1",
      "name": "assert:1",
      "type": "assert"
    },
    {
      "id": "event:increment",
      "name": "increment",
      "type": "event"
    },
    {
      "id": "view:count",
      "name": "view:count",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:doubled",
      "name": "view:doubled",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "count",
      "to": "doubled",
      "type": "data"
    },
    {
      "from": "count",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "doubled",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "count",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "event:increment",
      "to": "count",
      "type": "write"
    },
    {
      "from": "count",
      "to": "view:count",
      "type": "data"
    },
    {
      "from": "doubled",
      "to": "view:doubled",
      "type": "data"
    }
  ]
};

export function SafeCounter(root) {
  const $m = 'SafeCounter';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [count, setCount] = createSignal(0, { name: 'count', module: $m, type: 'int' });

  const doubled = createComb(() => (count() * 2), { name: 'doubled', module: $m, deps: ["count"] });

  createEffect(() => {
    const __ok = (count() >= 0);
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(count >= 0)',
        module: $m,
        values: { count: count() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createEffect(() => {
    const __ok = (doubled() == (count() * 2));
    if (!__ok) {
      circuit.assertionFailed('assert:1', {
        expr: '(doubled == (count * 2))',
        module: $m,
        values: { doubled: doubled(), count: count() },
      });
    }
  }, { name: 'assert:1', module: $m });

  function increment() {
    batch(() => {
      setCount((count() + 1));
    });
  }

  const el0 = document.createElement('div');
  const el1 = document.createElement('p');
  const txt0 = document.createTextNode('Count:');
  el1.appendChild(txt0);
  const txt1 = document.createTextNode('');
  createEffect(() => { txt1.data = String(count()); }, { name: 'view:count', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el1.appendChild(txt1);
  const txt2 = document.createTextNode(', Doubled:');
  el1.appendChild(txt2);
  const txt3 = document.createTextNode('');
  createEffect(() => { txt3.data = String(doubled()); }, { name: 'view:doubled', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el1.appendChild(txt3);
  el0.appendChild(el1);
  const el2 = document.createElement('button');
  el2.addEventListener('click', increment);
  const txt4 = document.createTextNode('+');
  el2.appendChild(txt4);
  el0.appendChild(el2);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'SafeCounter';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [count, setCount] = createSignal(0, { name: 'count', module: $m, type: 'int' });

  const doubled = createComb(() => (count() * 2), { name: 'doubled', module: $m, deps: ["count"] });

  createEffect(() => {
    const __ok = (count() >= 0);
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(count >= 0)',
        module: $m,
        values: { count: count() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createEffect(() => {
    const __ok = (doubled() == (count() * 2));
    if (!__ok) {
      circuit.assertionFailed('assert:1', {
        expr: '(doubled == (count * 2))',
        module: $m,
        values: { doubled: doubled(), count: count() },
      });
    }
  }, { name: 'assert:1', module: $m });

  return {
    signals: { count: { get: count, set: setCount } },
    combs: { doubled },
    dispose: __scope.dispose,
  };
}