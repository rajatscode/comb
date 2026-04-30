import { createSignal, createComb, createEffect, batch, createScope, circuit, X, createEdgeEffect } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "cpu",
      "name": "cpu",
      "type": "signal"
    },
    {
      "id": "mem",
      "name": "mem",
      "type": "signal"
    },
    {
      "id": "cpuThreshold",
      "name": "cpuThreshold",
      "type": "signal"
    },
    {
      "id": "cpuAvg",
      "name": "cpuAvg",
      "type": "signal"
    },
    {
      "id": "alertCount",
      "name": "alertCount",
      "type": "signal"
    },
    {
      "id": "lastAlert",
      "name": "lastAlert",
      "type": "signal"
    },
    {
      "id": "cpuHigh",
      "name": "cpuHigh",
      "type": "comb"
    },
    {
      "id": "cpuDisplay",
      "name": "cpuDisplay",
      "type": "comb"
    },
    {
      "id": "avgDisplay",
      "name": "avgDisplay",
      "type": "comb"
    },
    {
      "id": "memDisplay",
      "name": "memDisplay",
      "type": "comb"
    },
    {
      "id": "threshDisplay",
      "name": "threshDisplay",
      "type": "comb"
    },
    {
      "id": "statusText",
      "name": "statusText",
      "type": "comb"
    },
    {
      "id": "statusClass",
      "name": "statusClass",
      "type": "comb"
    },
    {
      "id": "posedge:cpuHigh",
      "name": "posedge(cpuHigh)",
      "type": "sensitivity"
    },
    {
      "id": "negedge:cpuHigh",
      "name": "negedge(cpuHigh)",
      "type": "sensitivity"
    },
    {
      "id": "view:cpuDisplay",
      "name": "view:cpuDisplay",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-value",
        "binding": "text"
      }
    },
    {
      "id": "view:avgDisplay",
      "name": "view:avgDisplay",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-detail",
        "binding": "text"
      }
    },
    {
      "id": "view:memDisplay",
      "name": "view:memDisplay",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-value",
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
      "id": "view:statusText",
      "name": "view:statusText",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:str",
      "name": "view:str",
      "type": "view-effect",
      "viewTarget": {
        "element": "p.alert-info",
        "binding": "text"
      }
    },
    {
      "id": "view:lastAlert",
      "name": "view:lastAlert",
      "type": "view-effect",
      "viewTarget": {
        "element": "p.alert-info",
        "binding": "text"
      }
    },
    {
      "id": "view:threshDisplay",
      "name": "view:threshDisplay",
      "type": "view-effect",
      "viewTarget": {
        "element": "label",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:cpuThreshold",
      "name": "view:bind:cpuThreshold",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    }
  ],
  "edges": [
    {
      "from": "cpuAvg",
      "to": "cpuHigh",
      "type": "data"
    },
    {
      "from": "cpuThreshold",
      "to": "cpuHigh",
      "type": "data"
    },
    {
      "from": "cpu",
      "to": "cpuDisplay",
      "type": "data"
    },
    {
      "from": "cpuAvg",
      "to": "avgDisplay",
      "type": "data"
    },
    {
      "from": "mem",
      "to": "memDisplay",
      "type": "data"
    },
    {
      "from": "cpuThreshold",
      "to": "threshDisplay",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "statusText",
      "type": "data"
    },
    {
      "from": "threshDisplay",
      "to": "statusText",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "statusClass",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "posedge:cpuHigh",
      "type": "data"
    },
    {
      "from": "posedge:cpuHigh",
      "to": "alertCount",
      "type": "write"
    },
    {
      "from": "posedge:cpuHigh",
      "to": "lastAlert",
      "type": "write"
    },
    {
      "from": "cpuHigh",
      "to": "negedge:cpuHigh",
      "type": "data"
    },
    {
      "from": "negedge:cpuHigh",
      "to": "lastAlert",
      "type": "write"
    },
    {
      "from": "cpuDisplay",
      "to": "view:cpuDisplay",
      "type": "data"
    },
    {
      "from": "avgDisplay",
      "to": "view:avgDisplay",
      "type": "data"
    },
    {
      "from": "memDisplay",
      "to": "view:memDisplay",
      "type": "data"
    },
    {
      "from": "statusClass",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "statusText",
      "to": "view:statusText",
      "type": "data"
    },
    {
      "from": "alertCount",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "lastAlert",
      "to": "view:lastAlert",
      "type": "data"
    },
    {
      "from": "threshDisplay",
      "to": "view:threshDisplay",
      "type": "data"
    },
    {
      "from": "cpuThreshold",
      "to": "view:bind:cpuThreshold",
      "type": "data"
    }
  ]
};

export function Monitor(root) {
  const $m = 'Monitor';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [cpu, setCpu] = createSignal(25, { name: 'cpu', module: $m, type: 'float' });

  const [mem, setMem] = createSignal(40, { name: 'mem', module: $m, type: 'float' });

  const [cpuThreshold, setCpuThreshold] = createSignal(80, { name: 'cpuThreshold', module: $m, type: 'float' });

  const [cpuAvg, setCpuAvg] = createSignal(25, { name: 'cpuAvg', module: $m, type: 'float' });

  const [alertCount, setAlertCount] = createSignal(0, { name: 'alertCount', module: $m, type: 'int' });

  const [lastAlert, setLastAlert] = createSignal("", { name: 'lastAlert', module: $m, type: 'string' });

  const cpuHigh = createComb(() => (cpuAvg() > cpuThreshold()), { name: 'cpuHigh', module: $m, deps: ["cpuAvg","cpuThreshold"] });

  const cpuDisplay = createComb(() => (String(Math.round(cpu())) + "%"), { name: 'cpuDisplay', module: $m, deps: ["cpu"] });

  const avgDisplay = createComb(() => (String(Math.round(cpuAvg())) + "%"), { name: 'avgDisplay', module: $m, deps: ["cpuAvg"] });

  const memDisplay = createComb(() => (String(Math.round(mem())) + "%"), { name: 'memDisplay', module: $m, deps: ["mem"] });

  const threshDisplay = createComb(() => (String(Math.round(cpuThreshold())) + "%"), { name: 'threshDisplay', module: $m, deps: ["cpuThreshold"] });

  const statusText = createComb(() => (cpuHigh() ? ("ALERT: CPU above " + threshDisplay()) : "Normal"), { name: 'statusText', module: $m, deps: ["cpuHigh","threshDisplay"] });

  const statusClass = createComb(() => (cpuHigh() ? "status-alert" : "status-ok"), { name: 'statusClass', module: $m, deps: ["cpuHigh"] });

  createEdgeEffect(() => cpuHigh(), 'posedge', () => {
    batch(() => {
      setAlertCount((alertCount() + 1));
      setLastAlert(("CPU crossed " + threshDisplay()));
    });
  }, { name: 'posedge_cpuHigh', module: $m });

  createEdgeEffect(() => cpuHigh(), 'negedge', () => {
    batch(() => {
      setLastAlert(("CPU recovered below " + threshDisplay()));
    });
  }, { name: 'negedge_cpuHigh', module: $m });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'monitor');
  const el1 = document.createElement('div');
  el1.setAttribute('class', 'monitor-metrics');
  const el2 = document.createElement('div');
  el2.setAttribute('class', 'metric');
  const el3 = document.createElement('span');
  el3.setAttribute('class', 'metric-label');
  const txt0 = document.createTextNode('CPU');
  el3.appendChild(txt0);
  el2.appendChild(el3);
  const el4 = document.createElement('span');
  el4.setAttribute('class', 'metric-value');
  const txt1 = document.createTextNode('');
  createEffect(() => { txt1.data = String(cpuDisplay()); }, { name: 'view:cpuDisplay', module: $m, viewTarget: { element: 'span.metric-value', binding: 'text' } });
  el4.appendChild(txt1);
  el2.appendChild(el4);
  const el5 = document.createElement('span');
  el5.setAttribute('class', 'metric-detail');
  const txt2 = document.createTextNode('avg');
  el5.appendChild(txt2);
  const txt3 = document.createTextNode('');
  createEffect(() => { txt3.data = String(avgDisplay()); }, { name: 'view:avgDisplay', module: $m, viewTarget: { element: 'span.metric-detail', binding: 'text' } });
  el5.appendChild(txt3);
  el2.appendChild(el5);
  el1.appendChild(el2);
  const el6 = document.createElement('div');
  el6.setAttribute('class', 'metric');
  const el7 = document.createElement('span');
  el7.setAttribute('class', 'metric-label');
  const txt4 = document.createTextNode('MEM');
  el7.appendChild(txt4);
  el6.appendChild(el7);
  const el8 = document.createElement('span');
  el8.setAttribute('class', 'metric-value');
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String(memDisplay()); }, { name: 'view:memDisplay', module: $m, viewTarget: { element: 'span.metric-value', binding: 'text' } });
  el8.appendChild(txt5);
  el6.appendChild(el8);
  el1.appendChild(el6);
  el0.appendChild(el1);
  const el9 = document.createElement('p');
  createEffect(() => { el9.setAttribute('class', statusClass()); }, { name: 'view:attr:statusClass', module: $m, viewTarget: { element: 'p', binding: 'attr:class' } });
  const txt6 = document.createTextNode('');
  createEffect(() => { txt6.data = String(statusText()); }, { name: 'view:statusText', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el9.appendChild(txt6);
  el0.appendChild(el9);
  const el10 = document.createElement('p');
  el10.setAttribute('class', 'alert-info');
  const txt7 = document.createTextNode('Alerts fired:');
  el10.appendChild(txt7);
  const txt8 = document.createTextNode('');
  createEffect(() => { txt8.data = String(String(alertCount())); }, { name: 'view:str', module: $m, viewTarget: { element: 'p.alert-info', binding: 'text' } });
  el10.appendChild(txt8);
  const txt9 = document.createTextNode('|');
  el10.appendChild(txt9);
  const txt10 = document.createTextNode('');
  createEffect(() => { txt10.data = String(lastAlert()); }, { name: 'view:lastAlert', module: $m, viewTarget: { element: 'p.alert-info', binding: 'text' } });
  el10.appendChild(txt10);
  el0.appendChild(el10);
  const el11 = document.createElement('label');
  const txt11 = document.createTextNode('Threshold:');
  el11.appendChild(txt11);
  const txt12 = document.createTextNode('');
  createEffect(() => { txt12.data = String(threshDisplay()); }, { name: 'view:threshDisplay', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el11.appendChild(txt12);
  const el12 = document.createElement('input');
  el12.setAttribute('type', 'range');
  el12.setAttribute('min', '50');
  el12.setAttribute('max', '100');
  el12.value = cpuThreshold();
  createEffect(() => { el12.value = cpuThreshold(); }, { name: 'view:bind:cpuThreshold', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el12.addEventListener('input', (e) => { setCpuThreshold(Number(e.target.value)); });
  el11.appendChild(el12);
  el0.appendChild(el11);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'Monitor';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [cpu, setCpu] = createSignal(25, { name: 'cpu', module: $m, type: 'float' });

  const [mem, setMem] = createSignal(40, { name: 'mem', module: $m, type: 'float' });

  const [cpuThreshold, setCpuThreshold] = createSignal(80, { name: 'cpuThreshold', module: $m, type: 'float' });

  const [cpuAvg, setCpuAvg] = createSignal(25, { name: 'cpuAvg', module: $m, type: 'float' });

  const [alertCount, setAlertCount] = createSignal(0, { name: 'alertCount', module: $m, type: 'int' });

  const [lastAlert, setLastAlert] = createSignal("", { name: 'lastAlert', module: $m, type: 'string' });

  const cpuHigh = createComb(() => (cpuAvg() > cpuThreshold()), { name: 'cpuHigh', module: $m, deps: ["cpuAvg","cpuThreshold"] });

  const cpuDisplay = createComb(() => (String(Math.round(cpu())) + "%"), { name: 'cpuDisplay', module: $m, deps: ["cpu"] });

  const avgDisplay = createComb(() => (String(Math.round(cpuAvg())) + "%"), { name: 'avgDisplay', module: $m, deps: ["cpuAvg"] });

  const memDisplay = createComb(() => (String(Math.round(mem())) + "%"), { name: 'memDisplay', module: $m, deps: ["mem"] });

  const threshDisplay = createComb(() => (String(Math.round(cpuThreshold())) + "%"), { name: 'threshDisplay', module: $m, deps: ["cpuThreshold"] });

  const statusText = createComb(() => (cpuHigh() ? ("ALERT: CPU above " + threshDisplay()) : "Normal"), { name: 'statusText', module: $m, deps: ["cpuHigh","threshDisplay"] });

  const statusClass = createComb(() => (cpuHigh() ? "status-alert" : "status-ok"), { name: 'statusClass', module: $m, deps: ["cpuHigh"] });

  return {
    signals: { cpu: { get: cpu, set: setCpu }, mem: { get: mem, set: setMem }, cpuThreshold: { get: cpuThreshold, set: setCpuThreshold }, cpuAvg: { get: cpuAvg, set: setCpuAvg }, alertCount: { get: alertCount, set: setAlertCount }, lastAlert: { get: lastAlert, set: setLastAlert } },
    combs: { cpuHigh, cpuDisplay, avgDisplay, memDisplay, threshDisplay, statusText, statusClass },
    dispose: __scope.dispose,
  };
}