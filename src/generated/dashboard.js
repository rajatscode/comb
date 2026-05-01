import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "value",
      "name": "value",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "label",
      "name": "label",
      "type": "signal",
      "valueType": "string"
    },
    {
      "id": "event:tick",
      "name": "tick",
      "type": "event"
    },
    {
      "id": "view:label",
      "name": "view:label",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:value",
      "name": "view:value",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "event:tick",
      "to": "value",
      "type": "write"
    },
    {
      "from": "label",
      "to": "view:label",
      "type": "data"
    },
    {
      "from": "value",
      "to": "view:value",
      "type": "data"
    }
  ]
};

export function DataSource(__props, root) {
  if (!__props) __props = {};
  const $m = 'DataSource';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [value, setValue] = createSignal(__props.value ?? 0, { name: 'value', module: $m });

  const [label, setLabel] = createSignal(__props.label ?? "Sensor A", { name: 'label', module: $m });

  function tick() {
    batch(() => {
      setValue((value() + 1));
    });
  }

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'source');
  const el1 = document.createElement('span');
  const txt0 = document.createTextNode('');
  createEffect(() => { txt0.data = String(label()); }, { name: 'view:label', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el1.appendChild(txt0);
  const txt1 = document.createTextNode(':');
  el1.appendChild(txt1);
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String(value()); }, { name: 'view:value', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el1.appendChild(txt2);
  el0.appendChild(el1);
  const el2 = document.createElement('button');
  el2.addEventListener('click', tick);
  const txt3 = document.createTextNode('Tick');
  el2.appendChild(txt3);
  el0.appendChild(el2);
  root.appendChild(el0);

  return { dispose: __scope.dispose, __ports: { value: { get: value, set: setValue }, label: { get: label, set: setLabel } } };
}

export function __test() {
  const $m = 'DataSource';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [value, setValue] = createSignal(__props.value ?? 0, { name: 'value', module: $m });

  const [label, setLabel] = createSignal(__props.label ?? "Sensor A", { name: 'label', module: $m });

  return {
    signals: { value: { get: value, set: setValue }, label: { get: label, set: setLabel } },
    combs: {  },
    dispose: __scope.dispose,
  };
}

import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "value",
      "name": "value",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "title",
      "name": "title",
      "type": "signal",
      "valueType": "string"
    },
    {
      "id": "doubled",
      "name": "doubled",
      "type": "comb",
      "valueType": "int"
    },
    {
      "id": "status",
      "name": "status",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "assert:0",
      "name": "assert:0",
      "type": "assert",
      "expr": "doubled == value * 2"
    },
    {
      "id": "view:title",
      "name": "view:title",
      "type": "view-effect",
      "viewTarget": {
        "element": "h3",
        "binding": "text"
      }
    },
    {
      "id": "view:value",
      "name": "view:value",
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
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:status",
      "name": "view:status",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "value",
      "to": "doubled",
      "type": "data"
    },
    {
      "from": "value",
      "to": "status",
      "type": "data"
    },
    {
      "from": "doubled",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "value",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "title",
      "to": "view:title",
      "type": "data"
    },
    {
      "from": "value",
      "to": "view:value",
      "type": "data"
    },
    {
      "from": "doubled",
      "to": "view:doubled",
      "type": "data"
    },
    {
      "from": "status",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "status",
      "to": "view:status",
      "type": "data"
    }
  ]
};

export function Display(__props, root) {
  if (!__props) __props = {};
  const $m = 'Display';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [value, setValue] = createSignal(__props.value ?? 0, { name: 'value', module: $m });

  const [title, setTitle] = createSignal(__props.title ?? "Display", { name: 'title', module: $m });

  const doubled = createComb(() => (value() * 2), { name: 'doubled', module: $m, deps: ["value"] });

  const status = createComb(() => ((value() > 10) ? "high" : "normal"), { name: 'status', module: $m, deps: ["value"] });

  createEffect(() => {
    const __ok = (doubled() == (value() * 2));
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(doubled == (value * 2))',
        module: $m,
        values: { doubled: doubled(), value: value() },
      });
    }
  }, { name: 'assert:0', module: $m });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'display');
  const el1 = document.createElement('h3');
  const txt0 = document.createTextNode('');
  createEffect(() => { txt0.data = String(title()); }, { name: 'view:title', module: $m, viewTarget: { element: 'h3', binding: 'text' } });
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('p');
  const txt1 = document.createTextNode('Value:');
  el2.appendChild(txt1);
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String(value()); }, { name: 'view:value', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el2.appendChild(txt2);
  el0.appendChild(el2);
  const el3 = document.createElement('p');
  const txt3 = document.createTextNode('Doubled:');
  el3.appendChild(txt3);
  const txt4 = document.createTextNode('');
  createEffect(() => { txt4.data = String(doubled()); }, { name: 'view:doubled', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el3.appendChild(txt4);
  el0.appendChild(el3);
  const el4 = document.createElement('p');
  createEffect(() => { el4.setAttribute('class', status()); }, { name: 'view:attr:status', module: $m, viewTarget: { element: 'p', binding: 'attr:class' } });
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String(status()); }, { name: 'view:status', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el4.appendChild(txt5);
  el0.appendChild(el4);
  root.appendChild(el0);

  return { dispose: __scope.dispose, __ports: { value: { set: setValue }, title: { set: setTitle } } };
}

export function __test() {
  const $m = 'Display';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [value, setValue] = createSignal(__props.value ?? 0, { name: 'value', module: $m });

  const [title, setTitle] = createSignal(__props.title ?? "Display", { name: 'title', module: $m });

  const doubled = createComb(() => (value() * 2), { name: 'doubled', module: $m, deps: ["value"] });

  const status = createComb(() => ((value() > 10) ? "high" : "normal"), { name: 'status', module: $m, deps: ["value"] });

  createEffect(() => {
    const __ok = (doubled() == (value() * 2));
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(doubled == (value * 2))',
        module: $m,
        values: { doubled: doubled(), value: value() },
      });
    }
  }, { name: 'assert:0', module: $m });

  return {
    signals: { value: { get: value, set: setValue }, title: { get: title, set: setTitle } },
    combs: { doubled, status },
    dispose: __scope.dispose,
  };
}

import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "sensorValue",
      "name": "sensorValue",
      "type": "signal",
      "valueType": "int"
    }
  ],
  "edges": []
};

export function Dashboard(root) {
  const $m = 'Dashboard';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [sensorValue, setSensorValue] = createSignal(0, { name: 'sensorValue', module: $m, type: 'int' });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'dashboard');
  const el1 = document.createElement('h2');
  const txt0 = document.createTextNode('Multi-Module Dashboard');
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('div');
  el2.style.display = 'contents';
  const __child3 = DataSource({ value: sensorValue() }, el2);
  createEffect(() => {
    if (__child3.__ports && __child3.__ports.value) setSensorValue(__child3.__ports.value.get());
  }, { name: 'bind:value', module: $m });
  el0.appendChild(el2);
  const el3 = document.createElement('div');
  el3.style.display = 'contents';
  const __child4 = Display({ value: sensorValue(), title: "Monitor" }, el3);
  createEffect(() => {
    if (__child4.__ports && __child4.__ports.value) __child4.__ports.value.set(sensorValue());
  }, { name: 'wire:value', module: $m });
  el0.appendChild(el3);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'Dashboard';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [sensorValue, setSensorValue] = createSignal(0, { name: 'sensorValue', module: $m, type: 'int' });

  return {
    signals: { sensorValue: { get: sensorValue, set: setSensorValue } },
    combs: {  },
    dispose: __scope.dispose,
  };
}