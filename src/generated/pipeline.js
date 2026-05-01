import { createSignal, createComb, createEffect, batch, createScope, circuit, X, createEdgeEffect, deferredBatch, createEdgeCounter, createChangeCounter } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "clk",
      "name": "clk",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "cycle",
      "name": "cycle",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "fetch_out",
      "name": "fetch_out",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "decode_out",
      "name": "decode_out",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "execute_out",
      "name": "execute_out",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "writeback_out",
      "name": "writeback_out",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "next_instr",
      "name": "next_instr",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "completed",
      "name": "completed",
      "type": "comb"
    },
    {
      "id": "posedge:clk",
      "name": "posedge(clk)",
      "type": "sensitivity"
    },
    {
      "id": "posedge:clk",
      "name": "posedge(clk)",
      "type": "sensitivity"
    },
    {
      "id": "posedge:clk",
      "name": "posedge(clk)",
      "type": "sensitivity"
    },
    {
      "id": "posedge:clk",
      "name": "posedge(clk)",
      "type": "sensitivity"
    },
    {
      "id": "view:str",
      "name": "view:str",
      "type": "view-effect",
      "viewTarget": {
        "element": "p.pipeline-info",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:fetch_out",
      "name": "view:fetch_out",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:decode_out",
      "name": "view:decode_out",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:execute_out",
      "name": "view:execute_out",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:writeback_out",
      "name": "view:writeback_out",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "writeback_out",
      "to": "completed",
      "type": "data"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "fetch_out",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "next_instr",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "decode_out",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "execute_out",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "writeback_out",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "cycle",
      "type": "write"
    },
    {
      "from": "cycle",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "completed",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "fetch_out",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "fetch_out",
      "to": "view:fetch_out",
      "type": "data"
    },
    {
      "from": "decode_out",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "decode_out",
      "to": "view:decode_out",
      "type": "data"
    },
    {
      "from": "execute_out",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "execute_out",
      "to": "view:execute_out",
      "type": "data"
    },
    {
      "from": "writeback_out",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "writeback_out",
      "to": "view:writeback_out",
      "type": "data"
    }
  ]
};

export function Pipeline(root) {
  const $m = 'Pipeline';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [clk, setClk] = createSignal(false, { name: 'clk', module: $m, type: 'bool' });

  const [cycle, setCycle] = createSignal(0, { name: 'cycle', module: $m, type: 'int' });

  const [fetch_out, setFetch_out] = createSignal(0, { name: 'fetch_out', module: $m, type: 'int' });

  const [decode_out, setDecode_out] = createSignal(0, { name: 'decode_out', module: $m, type: 'int' });

  const [execute_out, setExecute_out] = createSignal(0, { name: 'execute_out', module: $m, type: 'int' });

  const [writeback_out, setWriteback_out] = createSignal(0, { name: 'writeback_out', module: $m, type: 'int' });

  const [next_instr, setNext_instr] = createSignal(1, { name: 'next_instr', module: $m, type: 'int' });

  const __ec_completed_0 = createChangeCounter(() => writeback_out(), { name: '__ec_completed_0', module: $m });
  const completed = createComb(() => __ec_completed_0(), { name: 'completed', module: $m, deps: ["writeback_out"] });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setFetch_out(next_instr());
      setNext_instr((next_instr() + 1));
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setDecode_out(fetch_out());
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setExecute_out(decode_out());
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setWriteback_out(execute_out());
      setCycle((cycle() + 1));
    });
  }, { name: 'posedge_clk', module: $m });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'pipeline-demo');
  const el1 = document.createElement('p');
  el1.setAttribute('class', 'pipeline-info');
  const txt0 = document.createTextNode('');
  createEffect(() => { txt0.data = String((((("Cycle " + String(cycle())) + " — ") + String(completed())) + " completed")); }, { name: 'view:str', module: $m, viewTarget: { element: 'p.pipeline-info', binding: 'text' } });
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('div');
  el2.setAttribute('class', 'pipeline-stages');
  const el3 = document.createElement('div');
  el3.setAttribute('class', 'pipe-stage');
  const el4 = document.createElement('span');
  el4.setAttribute('class', 'pipe-label');
  const txt1 = document.createTextNode('Fetch');
  el4.appendChild(txt1);
  el3.appendChild(el4);
  const el5 = document.createElement('span');
  createEffect(() => { el5.setAttribute('class', ((fetch_out() > 0) ? "pipe-val active" : "pipe-val")); }, { name: 'view:attr:fetch_out', module: $m, viewTarget: { element: 'span', binding: 'attr:class' } });
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String(((fetch_out() > 0) ? ("I" + String(fetch_out())) : "—")); }, { name: 'view:fetch_out', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el5.appendChild(txt2);
  el3.appendChild(el5);
  el2.appendChild(el3);
  const el6 = document.createElement('div');
  el6.setAttribute('class', 'pipe-arrow');
  const txt3 = document.createTextNode('→');
  el6.appendChild(txt3);
  el2.appendChild(el6);
  const el7 = document.createElement('div');
  el7.setAttribute('class', 'pipe-stage');
  const el8 = document.createElement('span');
  el8.setAttribute('class', 'pipe-label');
  const txt4 = document.createTextNode('Decode');
  el8.appendChild(txt4);
  el7.appendChild(el8);
  const el9 = document.createElement('span');
  createEffect(() => { el9.setAttribute('class', ((decode_out() > 0) ? "pipe-val active" : "pipe-val")); }, { name: 'view:attr:decode_out', module: $m, viewTarget: { element: 'span', binding: 'attr:class' } });
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String(((decode_out() > 0) ? ("I" + String(decode_out())) : "—")); }, { name: 'view:decode_out', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el9.appendChild(txt5);
  el7.appendChild(el9);
  el2.appendChild(el7);
  const el10 = document.createElement('div');
  el10.setAttribute('class', 'pipe-arrow');
  const txt6 = document.createTextNode('→');
  el10.appendChild(txt6);
  el2.appendChild(el10);
  const el11 = document.createElement('div');
  el11.setAttribute('class', 'pipe-stage');
  const el12 = document.createElement('span');
  el12.setAttribute('class', 'pipe-label');
  const txt7 = document.createTextNode('Execute');
  el12.appendChild(txt7);
  el11.appendChild(el12);
  const el13 = document.createElement('span');
  createEffect(() => { el13.setAttribute('class', ((execute_out() > 0) ? "pipe-val active" : "pipe-val")); }, { name: 'view:attr:execute_out', module: $m, viewTarget: { element: 'span', binding: 'attr:class' } });
  const txt8 = document.createTextNode('');
  createEffect(() => { txt8.data = String(((execute_out() > 0) ? ("I" + String(execute_out())) : "—")); }, { name: 'view:execute_out', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el13.appendChild(txt8);
  el11.appendChild(el13);
  el2.appendChild(el11);
  const el14 = document.createElement('div');
  el14.setAttribute('class', 'pipe-arrow');
  const txt9 = document.createTextNode('→');
  el14.appendChild(txt9);
  el2.appendChild(el14);
  const el15 = document.createElement('div');
  el15.setAttribute('class', 'pipe-stage');
  const el16 = document.createElement('span');
  el16.setAttribute('class', 'pipe-label');
  const txt10 = document.createTextNode('Writeback');
  el16.appendChild(txt10);
  el15.appendChild(el16);
  const el17 = document.createElement('span');
  createEffect(() => { el17.setAttribute('class', ((writeback_out() > 0) ? "pipe-val active" : "pipe-val")); }, { name: 'view:attr:writeback_out', module: $m, viewTarget: { element: 'span', binding: 'attr:class' } });
  const txt11 = document.createTextNode('');
  createEffect(() => { txt11.data = String(((writeback_out() > 0) ? ("I" + String(writeback_out())) : "—")); }, { name: 'view:writeback_out', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el17.appendChild(txt11);
  el15.appendChild(el17);
  el2.appendChild(el15);
  el0.appendChild(el2);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'Pipeline';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [clk, setClk] = createSignal(false, { name: 'clk', module: $m, type: 'bool' });

  const [cycle, setCycle] = createSignal(0, { name: 'cycle', module: $m, type: 'int' });

  const [fetch_out, setFetch_out] = createSignal(0, { name: 'fetch_out', module: $m, type: 'int' });

  const [decode_out, setDecode_out] = createSignal(0, { name: 'decode_out', module: $m, type: 'int' });

  const [execute_out, setExecute_out] = createSignal(0, { name: 'execute_out', module: $m, type: 'int' });

  const [writeback_out, setWriteback_out] = createSignal(0, { name: 'writeback_out', module: $m, type: 'int' });

  const [next_instr, setNext_instr] = createSignal(1, { name: 'next_instr', module: $m, type: 'int' });

  const __ec_completed_0 = createChangeCounter(() => writeback_out(), { name: '__ec_completed_0', module: $m });
  const completed = createComb(() => __ec_completed_0(), { name: 'completed', module: $m, deps: ["writeback_out"] });

  return {
    signals: { clk: { get: clk, set: setClk }, cycle: { get: cycle, set: setCycle }, fetch_out: { get: fetch_out, set: setFetch_out }, decode_out: { get: decode_out, set: setDecode_out }, execute_out: { get: execute_out, set: setExecute_out }, writeback_out: { get: writeback_out, set: setWriteback_out }, next_instr: { get: next_instr, set: setNext_instr } },
    combs: { completed },
    dispose: __scope.dispose,
  };
}