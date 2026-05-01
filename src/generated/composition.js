import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "label",
      "name": "label",
      "type": "signal",
      "valueType": "string"
    },
    {
      "id": "clicks",
      "name": "clicks",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "event:click",
      "name": "click",
      "type": "event"
    },
    {
      "id": "view:label",
      "name": "view:label",
      "type": "view-effect",
      "viewTarget": {
        "element": "button",
        "binding": "text"
      }
    },
    {
      "id": "view:clicks",
      "name": "view:clicks",
      "type": "view-effect",
      "viewTarget": {
        "element": "button",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "event:click",
      "to": "clicks",
      "type": "write"
    },
    {
      "from": "label",
      "to": "view:label",
      "type": "data"
    },
    {
      "from": "clicks",
      "to": "view:clicks",
      "type": "data"
    }
  ]
};

export function ClickCounter(__props, root) {
  if (!__props) __props = {};
  const $m = 'ClickCounter';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [label, setLabel] = createSignal(__props.label ?? "Click", { name: 'label', module: $m });

  const [clicks, setClicks] = createSignal(__props.clicks ?? 0, { name: 'clicks', module: $m });

  function click() {
    batch(() => {
      setClicks((clicks() + 1));
    });
  }

  const el0 = document.createElement('button');
  el0.addEventListener('click', click);
  const txt0 = document.createTextNode('');
  createEffect(() => { txt0.data = String(label()); }, { name: 'view:label', module: $m, viewTarget: { element: 'button', binding: 'text' } });
  el0.appendChild(txt0);
  const txt1 = document.createTextNode('(');
  el0.appendChild(txt1);
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String(clicks()); }, { name: 'view:clicks', module: $m, viewTarget: { element: 'button', binding: 'text' } });
  el0.appendChild(txt2);
  const txt3 = document.createTextNode(')');
  el0.appendChild(txt3);
  root.appendChild(el0);

  return { dispose: __scope.dispose, __ports: { label: { set: setLabel }, clicks: { get: clicks, set: setClicks } } };
}

export function __test() {
  const $m = 'ClickCounter';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [label, setLabel] = createSignal(__props.label ?? "Click", { name: 'label', module: $m });

  const [clicks, setClicks] = createSignal(__props.clicks ?? 0, { name: 'clicks', module: $m });

  return {
    signals: { label: { get: label, set: setLabel }, clicks: { get: clicks, set: setClicks } },
    combs: {  },
    dispose: __scope.dispose,
  };
}

import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "totalClicks",
      "name": "totalClicks",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "view:totalClicks",
      "name": "view:totalClicks",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "totalClicks",
      "to": "view:totalClicks",
      "type": "data"
    }
  ]
};

export function App(root) {
  const $m = 'App';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [totalClicks, setTotalClicks] = createSignal(0, { name: 'totalClicks', module: $m, type: 'int' });

  const el0 = document.createElement('div');
  const el1 = document.createElement('div');
  el1.style.display = 'contents';
  const __child2 = ClickCounter({ label: "Button A", clicks: totalClicks() }, el1);
  createEffect(() => {
    if (__child2.__ports && __child2.__ports.clicks) setTotalClicks(__child2.__ports.clicks.get());
  }, { name: 'bind:clicks', module: $m });
  el0.appendChild(el1);
  const el2 = document.createElement('p');
  const txt0 = document.createTextNode('Total:');
  el2.appendChild(txt0);
  const txt1 = document.createTextNode('');
  createEffect(() => { txt1.data = String(totalClicks()); }, { name: 'view:totalClicks', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el2.appendChild(txt1);
  el0.appendChild(el2);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'App';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [totalClicks, setTotalClicks] = createSignal(0, { name: 'totalClicks', module: $m, type: 'int' });

  return {
    signals: { totalClicks: { get: totalClicks, set: setTotalClicks } },
    combs: {  },
    dispose: __scope.dispose,
  };
}