import { createSignal, createComb, createEffect, batch, createScope, circuit } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "input",
      "name": "input",
      "type": "signal"
    },
    {
      "id": "items",
      "name": "items",
      "type": "signal"
    },
    {
      "id": "filter",
      "name": "filter",
      "type": "signal"
    },
    {
      "id": "count",
      "name": "count",
      "type": "comb"
    },
    {
      "id": "label",
      "name": "label",
      "type": "comb"
    },
    {
      "id": "visible",
      "name": "visible",
      "type": "comb"
    },
    {
      "id": "event:add",
      "name": "add",
      "type": "event"
    },
    {
      "id": "event:clear",
      "name": "clear",
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
      "from": "items",
      "to": "count",
      "type": "data"
    },
    {
      "from": "count",
      "to": "label",
      "type": "data"
    },
    {
      "from": "filter",
      "to": "visible",
      "type": "data"
    },
    {
      "from": "items",
      "to": "visible",
      "type": "data"
    },
    {
      "from": "event:add",
      "to": "items",
      "type": "write"
    },
    {
      "from": "event:add",
      "to": "input",
      "type": "write"
    },
    {
      "from": "event:clear",
      "to": "items",
      "type": "write"
    },
    {
      "from": "label",
      "to": "view",
      "type": "data"
    },
    {
      "from": "input",
      "to": "view",
      "type": "data"
    }
  ]
};

export function TodoApp(root) {
  const $m = 'TodoApp';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [input, setInput] = createSignal("", { name: 'input', module: $m, type: 'string' });

  const [items, setItems] = createSignal("", { name: 'items', module: $m, type: 'string' });

  const [filter, setFilter] = createSignal("all", { name: 'filter', module: $m, type: 'string' });

  const count = createComb(() => items().length, { name: 'count', module: $m, deps: ["items"] });

  const label = createComb(() => (String(count()) + " items"), { name: 'label', module: $m, deps: ["count"] });

  const visible = createComb(() => ((filter() == "all") ? items() : ((filter() == "done") ? items() : items())), { name: 'visible', module: $m, deps: ["filter","items"] });

  function add() {
    batch(() => {
      setItems([...items(), input()]);
      setInput("");
    });
  }

  function clear() {
    batch(() => {
      setItems("");
    });
  }

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'todo');
  const el1 = document.createElement('h2');
  const txt0 = document.createTextNode('');
  createEffect(() => { txt0.data = String(label()); }, { name: 'view:txt0', module: $m });
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('input');
  el2.value = input();
  createEffect(() => { el2.value = input(); }, { name: 'bind:input', module: $m });
  el2.addEventListener('input', (e) => { setInput(e.target.value); });
  el2.setAttribute('placeholder', 'Add todo');
  el0.appendChild(el2);
  const el3 = document.createElement('button');
  el3.addEventListener('click', add);
  const txt1 = document.createTextNode('Add');
  el3.appendChild(txt1);
  el0.appendChild(el3);
  const el4 = document.createElement('button');
  el4.addEventListener('click', clear);
  const txt2 = document.createTextNode('Clear All');
  el4.appendChild(txt2);
  el0.appendChild(el4);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'TodoApp';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [input, setInput] = createSignal("", { name: 'input', module: $m, type: 'string' });

  const [items, setItems] = createSignal("", { name: 'items', module: $m, type: 'string' });

  const [filter, setFilter] = createSignal("all", { name: 'filter', module: $m, type: 'string' });

  const count = createComb(() => items().length, { name: 'count', module: $m, deps: ["items"] });

  const label = createComb(() => (String(count()) + " items"), { name: 'label', module: $m, deps: ["count"] });

  const visible = createComb(() => ((filter() == "all") ? items() : ((filter() == "done") ? items() : items())), { name: 'visible', module: $m, deps: ["filter","items"] });

  return {
    signals: { input: { get: input, set: setInput }, items: { get: items, set: setItems }, filter: { get: filter, set: setFilter } },
    combs: { count, label, visible },
    dispose: __scope.dispose,
  };
}