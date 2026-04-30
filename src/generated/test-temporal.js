import { createSignal, createComb, createEffect, batch, createScope, circuit, createTemporalAssert } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "trigger",
      "name": "trigger",
      "type": "signal"
    },
    {
      "id": "prop",
      "name": "prop",
      "type": "signal"
    },
    {
      "id": "temporal:0",
      "name": "temporal:0",
      "type": "assert"
    }
  ],
  "edges": [
    {
      "from": "trigger",
      "to": "temporal:0",
      "type": "data"
    },
    {
      "from": "prop",
      "to": "temporal:0",
      "type": "data"
    }
  ]
};

export function TestTemporal(root) {
  const $m = 'TestTemporal';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [trigger, setTrigger] = createSignal(false, { name: 'trigger', module: $m, type: 'bool' });

  const [prop, setProp] = createSignal(false, { name: 'prop', module: $m, type: 'bool' });

  createTemporalAssert(
    () => trigger(),
    'eventually',
    () => prop(),
    { name: 'temporal:0', module: $m, duration: 3000 }
  );

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'TestTemporal';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [trigger, setTrigger] = createSignal(false, { name: 'trigger', module: $m, type: 'bool' });

  const [prop, setProp] = createSignal(false, { name: 'prop', module: $m, type: 'bool' });

  createTemporalAssert(
    () => trigger(),
    'eventually',
    () => prop(),
    { name: 'temporal:1', module: $m, duration: 3000 }
  );

  return {
    signals: { trigger: { get: trigger, set: setTrigger }, prop: { get: prop, set: setProp } },
    combs: {  },
    dispose: __scope.dispose,
  };
}