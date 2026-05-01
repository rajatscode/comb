import { createSignal, createComb, createEffect, batch, createScope, circuit, X, createEdgeEffect, deferredBatch } from '../runtime/index.js';

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
      "id": "s0",
      "name": "s0",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "s1",
      "name": "s1",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "s2",
      "name": "s2",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "s3",
      "name": "s3",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "s4",
      "name": "s4",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "s5",
      "name": "s5",
      "type": "signal",
      "valueType": "int"
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
        "element": "p.ring-info",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:s0",
      "name": "view:s0",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:s1",
      "name": "view:s1",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:s2",
      "name": "view:s2",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:s3",
      "name": "view:s3",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:s4",
      "name": "view:s4",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:s5",
      "name": "view:s5",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "s0",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "s1",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "s2",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "s3",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "s4",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "s5",
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
      "from": "s0",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "s0",
      "to": "view:s0",
      "type": "data"
    },
    {
      "from": "s1",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "s1",
      "to": "view:s1",
      "type": "data"
    },
    {
      "from": "s2",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "s2",
      "to": "view:s2",
      "type": "data"
    },
    {
      "from": "s3",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "s3",
      "to": "view:s3",
      "type": "data"
    },
    {
      "from": "s4",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "s4",
      "to": "view:s4",
      "type": "data"
    },
    {
      "from": "s5",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "s5",
      "to": "view:s5",
      "type": "data"
    }
  ]
};

export function Ring(root) {
  const $m = 'Ring';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [clk, setClk] = createSignal(false, { name: 'clk', module: $m, type: 'bool' });

  const [cycle, setCycle] = createSignal(0, { name: 'cycle', module: $m, type: 'int' });

  const [s0, setS0] = createSignal(1, { name: 's0', module: $m, type: 'int' });

  const [s1, setS1] = createSignal(0, { name: 's1', module: $m, type: 'int' });

  const [s2, setS2] = createSignal(0, { name: 's2', module: $m, type: 'int' });

  const [s3, setS3] = createSignal(0, { name: 's3', module: $m, type: 'int' });

  const [s4, setS4] = createSignal(0, { name: 's4', module: $m, type: 'int' });

  const [s5, setS5] = createSignal(0, { name: 's5', module: $m, type: 'int' });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setS0(s5());
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setS1(s0());
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setS2(s1());
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setS3(s2());
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setS4(s3());
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setS5(s4());
      setCycle((cycle() + 1));
    });
  }, { name: 'posedge_clk', module: $m });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'ring-demo');
  const el1 = document.createElement('p');
  el1.setAttribute('class', 'ring-info');
  const txt0 = document.createTextNode('');
  createEffect(() => { txt0.data = String(("Cycle " + String(cycle()))); }, { name: 'view:str', module: $m, viewTarget: { element: 'p.ring-info', binding: 'text' } });
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('div');
  el2.setAttribute('class', 'ring-nodes');
  const el3 = document.createElement('div');
  createEffect(() => { el3.setAttribute('class', ((s0() > 0) ? "ring-node active" : "ring-node")); }, { name: 'view:attr:s0', module: $m, viewTarget: { element: 'div', binding: 'attr:class' } });
  const txt1 = document.createTextNode('');
  createEffect(() => { txt1.data = String(((s0() > 0) ? "●" : "○")); }, { name: 'view:s0', module: $m, viewTarget: { element: 'div', binding: 'text' } });
  el3.appendChild(txt1);
  el2.appendChild(el3);
  const el4 = document.createElement('div');
  el4.setAttribute('class', 'ring-arrow');
  const txt2 = document.createTextNode('→');
  el4.appendChild(txt2);
  el2.appendChild(el4);
  const el5 = document.createElement('div');
  createEffect(() => { el5.setAttribute('class', ((s1() > 0) ? "ring-node active" : "ring-node")); }, { name: 'view:attr:s1', module: $m, viewTarget: { element: 'div', binding: 'attr:class' } });
  const txt3 = document.createTextNode('');
  createEffect(() => { txt3.data = String(((s1() > 0) ? "●" : "○")); }, { name: 'view:s1', module: $m, viewTarget: { element: 'div', binding: 'text' } });
  el5.appendChild(txt3);
  el2.appendChild(el5);
  const el6 = document.createElement('div');
  el6.setAttribute('class', 'ring-arrow');
  const txt4 = document.createTextNode('→');
  el6.appendChild(txt4);
  el2.appendChild(el6);
  const el7 = document.createElement('div');
  createEffect(() => { el7.setAttribute('class', ((s2() > 0) ? "ring-node active" : "ring-node")); }, { name: 'view:attr:s2', module: $m, viewTarget: { element: 'div', binding: 'attr:class' } });
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String(((s2() > 0) ? "●" : "○")); }, { name: 'view:s2', module: $m, viewTarget: { element: 'div', binding: 'text' } });
  el7.appendChild(txt5);
  el2.appendChild(el7);
  const el8 = document.createElement('div');
  el8.setAttribute('class', 'ring-arrow');
  const txt6 = document.createTextNode('→');
  el8.appendChild(txt6);
  el2.appendChild(el8);
  const el9 = document.createElement('div');
  createEffect(() => { el9.setAttribute('class', ((s3() > 0) ? "ring-node active" : "ring-node")); }, { name: 'view:attr:s3', module: $m, viewTarget: { element: 'div', binding: 'attr:class' } });
  const txt7 = document.createTextNode('');
  createEffect(() => { txt7.data = String(((s3() > 0) ? "●" : "○")); }, { name: 'view:s3', module: $m, viewTarget: { element: 'div', binding: 'text' } });
  el9.appendChild(txt7);
  el2.appendChild(el9);
  const el10 = document.createElement('div');
  el10.setAttribute('class', 'ring-arrow');
  const txt8 = document.createTextNode('→');
  el10.appendChild(txt8);
  el2.appendChild(el10);
  const el11 = document.createElement('div');
  createEffect(() => { el11.setAttribute('class', ((s4() > 0) ? "ring-node active" : "ring-node")); }, { name: 'view:attr:s4', module: $m, viewTarget: { element: 'div', binding: 'attr:class' } });
  const txt9 = document.createTextNode('');
  createEffect(() => { txt9.data = String(((s4() > 0) ? "●" : "○")); }, { name: 'view:s4', module: $m, viewTarget: { element: 'div', binding: 'text' } });
  el11.appendChild(txt9);
  el2.appendChild(el11);
  const el12 = document.createElement('div');
  el12.setAttribute('class', 'ring-arrow');
  const txt10 = document.createTextNode('→');
  el12.appendChild(txt10);
  el2.appendChild(el12);
  const el13 = document.createElement('div');
  createEffect(() => { el13.setAttribute('class', ((s5() > 0) ? "ring-node active" : "ring-node")); }, { name: 'view:attr:s5', module: $m, viewTarget: { element: 'div', binding: 'attr:class' } });
  const txt11 = document.createTextNode('');
  createEffect(() => { txt11.data = String(((s5() > 0) ? "●" : "○")); }, { name: 'view:s5', module: $m, viewTarget: { element: 'div', binding: 'text' } });
  el13.appendChild(txt11);
  el2.appendChild(el13);
  const el14 = document.createElement('div');
  el14.setAttribute('class', 'ring-arrow');
  const txt12 = document.createTextNode('↩');
  el14.appendChild(txt12);
  el2.appendChild(el14);
  el0.appendChild(el2);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'Ring';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [clk, setClk] = createSignal(false, { name: 'clk', module: $m, type: 'bool' });

  const [cycle, setCycle] = createSignal(0, { name: 'cycle', module: $m, type: 'int' });

  const [s0, setS0] = createSignal(1, { name: 's0', module: $m, type: 'int' });

  const [s1, setS1] = createSignal(0, { name: 's1', module: $m, type: 'int' });

  const [s2, setS2] = createSignal(0, { name: 's2', module: $m, type: 'int' });

  const [s3, setS3] = createSignal(0, { name: 's3', module: $m, type: 'int' });

  const [s4, setS4] = createSignal(0, { name: 's4', module: $m, type: 'int' });

  const [s5, setS5] = createSignal(0, { name: 's5', module: $m, type: 'int' });

  return {
    signals: { clk: { get: clk, set: setClk }, cycle: { get: cycle, set: setCycle }, s0: { get: s0, set: setS0 }, s1: { get: s1, set: setS1 }, s2: { get: s2, set: setS2 }, s3: { get: s3, set: setS3 }, s4: { get: s4, set: setS4 }, s5: { get: s5, set: setS5 } },
    combs: {  },
    dispose: __scope.dispose,
  };
}