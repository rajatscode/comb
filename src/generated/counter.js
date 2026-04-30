import { createSignal, createComb, createEffect, batch, createScope, circuit } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "accent",
      "name": "accent",
      "type": "signal",
      "isToken": true
    },
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
      "id": "view:label",
      "name": "view:label",
      "type": "view-effect",
      "viewTarget": {
        "element": "p.display",
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
      "to": "view:label",
      "type": "data"
    },
    {
      "from": "doubled",
      "to": "view:doubled",
      "type": "data"
    }
  ]
};

export function Counter(root) {
  const $m = 'Counter';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [accent, setAccent] = createSignal("#4a9eff", { name: 'accent', module: $m, type: 'color' });
  createEffect(() => {
    document.documentElement.style.setProperty('--accent', String(accent()));
  }, { name: 'token:accent', module: $m });

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

  const __style = document.createElement('style');
  __style.textContent = '.counter_rnr4f { text-align: center; padding: 2rem; }\n    .display_rnr4f { font-size: 2rem; font-weight: bold; color: var(--accent); }\n    .controls_rnr4f { display: flex; gap: 0.5rem; justify-content: center; margin-top: 1rem; }';
  document.head.appendChild(__style);

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'counter_rnr4f');
  const el1 = document.createElement('h1');
  const txt0 = document.createTextNode('Comb Counter');
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('p');
  el2.setAttribute('class', 'display_rnr4f');
  const txt1 = document.createTextNode('');
  createEffect(() => { txt1.data = String(label()); }, { name: 'view:label', module: $m, viewTarget: { element: 'p.display', binding: 'text' } });
  el2.appendChild(txt1);
  el0.appendChild(el2);
  const el3 = document.createElement('p');
  const txt2 = document.createTextNode('doubled =');
  el3.appendChild(txt2);
  const txt3 = document.createTextNode('');
  createEffect(() => { txt3.data = String(doubled()); }, { name: 'view:doubled', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el3.appendChild(txt3);
  el0.appendChild(el3);
  const el4 = document.createElement('div');
  el4.setAttribute('class', 'controls_rnr4f');
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

export function __test() {
  const $m = 'Counter';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [accent, setAccent] = createSignal("#4a9eff", { name: 'accent', module: $m, type: 'color' });
  createEffect(() => {
    document.documentElement.style.setProperty('--accent', String(accent()));
  }, { name: 'token:accent', module: $m });

  const [count, setCount] = createSignal(0, { name: 'count', module: $m, type: 'int' });

  const label = createComb(() => ("Count: " + String(count())), { name: 'label', module: $m, deps: ["count"] });

  const doubled = createComb(() => (count() * 2), { name: 'doubled', module: $m, deps: ["count"] });

  return {
    signals: { accent: { get: accent, set: setAccent }, count: { get: count, set: setCount } },
    combs: { label, doubled },
    dispose: __scope.dispose,
  };
}