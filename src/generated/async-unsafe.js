import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "data",
      "name": "data",
      "type": "signal",
      "valueType": "string"
    },
    {
      "id": "result",
      "name": "result",
      "type": "signal",
      "valueType": "string"
    },
    {
      "id": "loading",
      "name": "loading",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "display",
      "name": "display",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "event:fetchData",
      "name": "fetchData",
      "type": "event"
    },
    {
      "id": "event:search",
      "name": "search",
      "type": "event"
    },
    {
      "id": "event:autoComplete",
      "name": "autoComplete",
      "type": "event"
    },
    {
      "id": "view:display",
      "name": "view:display",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "data",
      "to": "display",
      "type": "data"
    },
    {
      "from": "event:fetchData",
      "to": "loading",
      "type": "write"
    },
    {
      "from": "event:fetchData",
      "to": "data",
      "type": "write"
    },
    {
      "from": "event:search",
      "to": "result",
      "type": "write"
    },
    {
      "from": "event:autoComplete",
      "to": "result",
      "type": "write"
    },
    {
      "from": "display",
      "to": "view:display",
      "type": "data"
    }
  ]
};

export function AsyncUnsafe(root) {
  const $m = 'AsyncUnsafe';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [data, setData] = createSignal("", { name: 'data', module: $m, type: 'string' });

  const [result, setResult] = createSignal("", { name: 'result', module: $m, type: 'string' });

  const [loading, setLoading] = createSignal(false, { name: 'loading', module: $m, type: 'bool' });

  const display = createComb(() => data(), { name: 'display', module: $m, deps: ["data"] });

  function fetchData() {
    batch(() => {
      setLoading(true);
      (async () => {
        batch(() => {
          setData("fetched");
        });
      })();
      setLoading(false);
    });
  }

  function search() {
    batch(() => {
      (async () => {
        batch(() => {
          setResult("search result");
        });
      })();
    });
  }

  function autoComplete() {
    batch(() => {
      (async () => {
        batch(() => {
          setResult("auto result");
        });
      })();
    });
  }

  const el0 = document.createElement('div');
  const txt0 = document.createTextNode('');
  createEffect(() => { txt0.data = String(display()); }, { name: 'view:display', module: $m, viewTarget: { element: 'div', binding: 'text' } });
  el0.appendChild(txt0);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'AsyncUnsafe';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [data, setData] = createSignal("", { name: 'data', module: $m, type: 'string' });

  const [result, setResult] = createSignal("", { name: 'result', module: $m, type: 'string' });

  const [loading, setLoading] = createSignal(false, { name: 'loading', module: $m, type: 'bool' });

  const display = createComb(() => data(), { name: 'display', module: $m, deps: ["data"] });

  return {
    signals: { data: { get: data, set: setData }, result: { get: result, set: setResult }, loading: { get: loading, set: setLoading } },
    combs: { display },
    dispose: __scope.dispose,
  };
}