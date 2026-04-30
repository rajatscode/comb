import { createSignal, createComb, createEffect, batch, createScope, circuit, X, createEdgeEffect, createEdgeCounter } from '../runtime/index.js';

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
      "id": "disk",
      "name": "disk",
      "type": "signal"
    },
    {
      "id": "net",
      "name": "net",
      "type": "signal"
    },
    {
      "id": "cpuAvg",
      "name": "cpuAvg",
      "type": "signal"
    },
    {
      "id": "memAvg",
      "name": "memAvg",
      "type": "signal"
    },
    {
      "id": "cpuThreshold",
      "name": "cpuThreshold",
      "type": "signal"
    },
    {
      "id": "memThreshold",
      "name": "memThreshold",
      "type": "signal"
    },
    {
      "id": "diskThreshold",
      "name": "diskThreshold",
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
      "id": "memHigh",
      "name": "memHigh",
      "type": "comb"
    },
    {
      "id": "diskHigh",
      "name": "diskHigh",
      "type": "comb"
    },
    {
      "id": "anyAlert",
      "name": "anyAlert",
      "type": "comb"
    },
    {
      "id": "alertCount",
      "name": "alertCount",
      "type": "comb"
    },
    {
      "id": "assert:0",
      "name": "assert:0",
      "type": "assert",
      "expr": "anyAlert == cpuHigh || memHigh || diskHigh"
    },
    {
      "id": "assert:1",
      "name": "assert:1",
      "type": "assert",
      "expr": "cpuHigh == cpuAvg > cpuThreshold"
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
      "id": "posedge:memHigh",
      "name": "posedge(memHigh)",
      "type": "sensitivity"
    },
    {
      "id": "negedge:memHigh",
      "name": "negedge(memHigh)",
      "type": "sensitivity"
    },
    {
      "id": "posedge:diskHigh",
      "name": "posedge(diskHigh)",
      "type": "sensitivity"
    },
    {
      "id": "negedge:diskHigh",
      "name": "negedge(diskHigh)",
      "type": "sensitivity"
    },
    {
      "id": "view:round",
      "name": "view:round",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-value",
        "binding": "text"
      }
    },
    {
      "id": "view:round",
      "name": "view:round",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-detail",
        "binding": "text"
      }
    },
    {
      "id": "view:round",
      "name": "view:round",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-value",
        "binding": "text"
      }
    },
    {
      "id": "view:round",
      "name": "view:round",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-detail",
        "binding": "text"
      }
    },
    {
      "id": "view:round",
      "name": "view:round",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-value",
        "binding": "text"
      }
    },
    {
      "id": "view:round",
      "name": "view:round",
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
      "id": "view:anyAlert",
      "name": "view:anyAlert",
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
      "id": "view:round",
      "name": "view:round",
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
    },
    {
      "id": "view:round",
      "name": "view:round",
      "type": "view-effect",
      "viewTarget": {
        "element": "label",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:memThreshold",
      "name": "view:bind:memThreshold",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:round",
      "name": "view:round",
      "type": "view-effect",
      "viewTarget": {
        "element": "label",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:diskThreshold",
      "name": "view:bind:diskThreshold",
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
      "from": "memAvg",
      "to": "memHigh",
      "type": "data"
    },
    {
      "from": "memThreshold",
      "to": "memHigh",
      "type": "data"
    },
    {
      "from": "disk",
      "to": "diskHigh",
      "type": "data"
    },
    {
      "from": "diskThreshold",
      "to": "diskHigh",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "anyAlert",
      "type": "data"
    },
    {
      "from": "memHigh",
      "to": "anyAlert",
      "type": "data"
    },
    {
      "from": "diskHigh",
      "to": "anyAlert",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "alertCount",
      "type": "data"
    },
    {
      "from": "memHigh",
      "to": "alertCount",
      "type": "data"
    },
    {
      "from": "diskHigh",
      "to": "alertCount",
      "type": "data"
    },
    {
      "from": "anyAlert",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "memHigh",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "diskHigh",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "cpuAvg",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "cpuThreshold",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "posedge:cpuHigh",
      "type": "data"
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
      "from": "memHigh",
      "to": "posedge:memHigh",
      "type": "data"
    },
    {
      "from": "posedge:memHigh",
      "to": "lastAlert",
      "type": "write"
    },
    {
      "from": "memHigh",
      "to": "negedge:memHigh",
      "type": "data"
    },
    {
      "from": "negedge:memHigh",
      "to": "lastAlert",
      "type": "write"
    },
    {
      "from": "diskHigh",
      "to": "posedge:diskHigh",
      "type": "data"
    },
    {
      "from": "posedge:diskHigh",
      "to": "lastAlert",
      "type": "write"
    },
    {
      "from": "diskHigh",
      "to": "negedge:diskHigh",
      "type": "data"
    },
    {
      "from": "negedge:diskHigh",
      "to": "lastAlert",
      "type": "write"
    },
    {
      "from": "cpu",
      "to": "view:round",
      "type": "data"
    },
    {
      "from": "cpuAvg",
      "to": "view:round",
      "type": "data"
    },
    {
      "from": "mem",
      "to": "view:round",
      "type": "data"
    },
    {
      "from": "memAvg",
      "to": "view:round",
      "type": "data"
    },
    {
      "from": "disk",
      "to": "view:round",
      "type": "data"
    },
    {
      "from": "net",
      "to": "view:round",
      "type": "data"
    },
    {
      "from": "anyAlert",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "anyAlert",
      "to": "view:anyAlert",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "view:anyAlert",
      "type": "data"
    },
    {
      "from": "memHigh",
      "to": "view:anyAlert",
      "type": "data"
    },
    {
      "from": "diskHigh",
      "to": "view:anyAlert",
      "type": "data"
    },
    {
      "from": "alertCount",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "lastAlert",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "cpuThreshold",
      "to": "view:round",
      "type": "data"
    },
    {
      "from": "cpuThreshold",
      "to": "view:bind:cpuThreshold",
      "type": "data"
    },
    {
      "from": "memThreshold",
      "to": "view:round",
      "type": "data"
    },
    {
      "from": "memThreshold",
      "to": "view:bind:memThreshold",
      "type": "data"
    },
    {
      "from": "diskThreshold",
      "to": "view:round",
      "type": "data"
    },
    {
      "from": "diskThreshold",
      "to": "view:bind:diskThreshold",
      "type": "data"
    }
  ]
};

export function Monitor(root) {
  const $m = 'Monitor';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [cpu, setCpu] = createSignal(25, { name: 'cpu', module: $m });

  const [mem, setMem] = createSignal(40, { name: 'mem', module: $m });

  const [disk, setDisk] = createSignal(5, { name: 'disk', module: $m });

  const [net, setNet] = createSignal(10, { name: 'net', module: $m });

  const [cpuAvg, setCpuAvg] = createSignal(25, { name: 'cpuAvg', module: $m });

  const [memAvg, setMemAvg] = createSignal(40, { name: 'memAvg', module: $m });

  const [cpuThreshold, setCpuThreshold] = createSignal(40, { name: 'cpuThreshold', module: $m });

  const [memThreshold, setMemThreshold] = createSignal(85, { name: 'memThreshold', module: $m });

  const [diskThreshold, setDiskThreshold] = createSignal(500, { name: 'diskThreshold', module: $m });

  const [lastAlert, setLastAlert] = createSignal("", { name: 'lastAlert', module: $m });

  const cpuHigh = createComb(() => (cpuAvg() > cpuThreshold()), { name: 'cpuHigh', module: $m, deps: ["cpuAvg","cpuThreshold"] });

  const memHigh = createComb(() => (memAvg() > memThreshold()), { name: 'memHigh', module: $m, deps: ["memAvg","memThreshold"] });

  const diskHigh = createComb(() => (disk() > diskThreshold()), { name: 'diskHigh', module: $m, deps: ["disk","diskThreshold"] });

  const anyAlert = createComb(() => ((cpuHigh() || memHigh()) || diskHigh()), { name: 'anyAlert', module: $m, deps: ["cpuHigh","memHigh","diskHigh"] });

  const __ec_alertCount_0 = createEdgeCounter(() => cpuHigh(), 'posedge', { name: '__ec_alertCount_0', module: $m });
  const __ec_alertCount_1 = createEdgeCounter(() => memHigh(), 'posedge', { name: '__ec_alertCount_1', module: $m });
  const __ec_alertCount_2 = createEdgeCounter(() => diskHigh(), 'posedge', { name: '__ec_alertCount_2', module: $m });
  const alertCount = createComb(() => ((__ec_alertCount_0() + __ec_alertCount_1()) + __ec_alertCount_2()), { name: 'alertCount', module: $m, deps: ["cpuHigh","memHigh","diskHigh"] });

  createEffect(() => {
    const __ok = (anyAlert() == ((cpuHigh() || memHigh()) || diskHigh()));
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(anyAlert == ((cpuHigh || memHigh) || diskHigh))',
        module: $m,
        values: { anyAlert: anyAlert(), cpuHigh: cpuHigh(), memHigh: memHigh(), diskHigh: diskHigh() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createEffect(() => {
    const __ok = (cpuHigh() == (cpuAvg() > cpuThreshold()));
    if (!__ok) {
      circuit.assertionFailed('assert:1', {
        expr: '(cpuHigh == (cpuAvg > cpuThreshold))',
        module: $m,
        values: { cpuHigh: cpuHigh(), cpuAvg: cpuAvg(), cpuThreshold: cpuThreshold() },
      });
    }
  }, { name: 'assert:1', module: $m });

  createEdgeEffect(() => cpuHigh(), 'posedge', () => {
    batch(() => {
      setLastAlert("CPU crossed threshold");
    });
  }, { name: 'posedge_cpuHigh', module: $m });

  createEdgeEffect(() => cpuHigh(), 'negedge', () => {
    batch(() => {
      setLastAlert("CPU recovered");
    });
  }, { name: 'negedge_cpuHigh', module: $m });

  createEdgeEffect(() => memHigh(), 'posedge', () => {
    batch(() => {
      setLastAlert("Memory exceeded threshold");
    });
  }, { name: 'posedge_memHigh', module: $m });

  createEdgeEffect(() => memHigh(), 'negedge', () => {
    batch(() => {
      setLastAlert("Memory recovered");
    });
  }, { name: 'negedge_memHigh', module: $m });

  createEdgeEffect(() => diskHigh(), 'posedge', () => {
    batch(() => {
      setLastAlert("Storage exceeded threshold");
    });
  }, { name: 'posedge_diskHigh', module: $m });

  createEdgeEffect(() => diskHigh(), 'negedge', () => {
    batch(() => {
      setLastAlert("Storage recovered");
    });
  }, { name: 'negedge_diskHigh', module: $m });

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
  createEffect(() => { txt1.data = String((Math.round(cpu()) + "%")); }, { name: 'view:round', module: $m, viewTarget: { element: 'span.metric-value', binding: 'text' } });
  el4.appendChild(txt1);
  el2.appendChild(el4);
  const el5 = document.createElement('span');
  el5.setAttribute('class', 'metric-detail');
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String((("avg " + Math.round(cpuAvg())) + "%")); }, { name: 'view:round', module: $m, viewTarget: { element: 'span.metric-detail', binding: 'text' } });
  el5.appendChild(txt2);
  el2.appendChild(el5);
  el1.appendChild(el2);
  const el6 = document.createElement('div');
  el6.setAttribute('class', 'metric');
  const el7 = document.createElement('span');
  el7.setAttribute('class', 'metric-label');
  const txt3 = document.createTextNode('Memory');
  el7.appendChild(txt3);
  el6.appendChild(el7);
  const el8 = document.createElement('span');
  el8.setAttribute('class', 'metric-value');
  const txt4 = document.createTextNode('');
  createEffect(() => { txt4.data = String((Math.round(mem()) + "%")); }, { name: 'view:round', module: $m, viewTarget: { element: 'span.metric-value', binding: 'text' } });
  el8.appendChild(txt4);
  el6.appendChild(el8);
  const el9 = document.createElement('span');
  el9.setAttribute('class', 'metric-detail');
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String((("avg " + Math.round(memAvg())) + "%")); }, { name: 'view:round', module: $m, viewTarget: { element: 'span.metric-detail', binding: 'text' } });
  el9.appendChild(txt5);
  el6.appendChild(el9);
  el1.appendChild(el6);
  const el10 = document.createElement('div');
  el10.setAttribute('class', 'metric');
  const el11 = document.createElement('span');
  el11.setAttribute('class', 'metric-label');
  const txt6 = document.createTextNode('Storage');
  el11.appendChild(txt6);
  el10.appendChild(el11);
  const el12 = document.createElement('span');
  el12.setAttribute('class', 'metric-value');
  const txt7 = document.createTextNode('');
  createEffect(() => { txt7.data = String((Math.round(disk()) + " KB")); }, { name: 'view:round', module: $m, viewTarget: { element: 'span.metric-value', binding: 'text' } });
  el12.appendChild(txt7);
  el10.appendChild(el12);
  el1.appendChild(el10);
  const el13 = document.createElement('div');
  el13.setAttribute('class', 'metric');
  const el14 = document.createElement('span');
  el14.setAttribute('class', 'metric-label');
  const txt8 = document.createTextNode('Network');
  el14.appendChild(txt8);
  el13.appendChild(el14);
  const el15 = document.createElement('span');
  el15.setAttribute('class', 'metric-value');
  const txt9 = document.createTextNode('');
  createEffect(() => { txt9.data = String((Math.round(net()) + " MB/s")); }, { name: 'view:round', module: $m, viewTarget: { element: 'span.metric-value', binding: 'text' } });
  el15.appendChild(txt9);
  el13.appendChild(el15);
  el1.appendChild(el13);
  el0.appendChild(el1);
  const el16 = document.createElement('p');
  createEffect(() => { el16.setAttribute('class', (anyAlert() ? "status-alert" : "status-ok")); }, { name: 'view:attr:anyAlert', module: $m, viewTarget: { element: 'p', binding: 'attr:class' } });
  const txt10 = document.createTextNode('');
  createEffect(() => { txt10.data = String((anyAlert() ? ((((cpuHigh() ? "CPU " : "") + (memHigh() ? "MEM " : "")) + (diskHigh() ? "STORAGE " : "")) + "alert") : "All systems normal")); }, { name: 'view:anyAlert', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el16.appendChild(txt10);
  el0.appendChild(el16);
  const el17 = document.createElement('p');
  el17.setAttribute('class', 'alert-info');
  const txt11 = document.createTextNode('');
  createEffect(() => { txt11.data = String(((("Alerts: " + String(alertCount())) + " — ") + lastAlert())); }, { name: 'view:str', module: $m, viewTarget: { element: 'p.alert-info', binding: 'text' } });
  el17.appendChild(txt11);
  el0.appendChild(el17);
  const el18 = document.createElement('div');
  el18.setAttribute('class', 'threshold-controls');
  const el19 = document.createElement('label');
  const txt12 = document.createTextNode('');
  createEffect(() => { txt12.data = String((("CPU: " + Math.round(cpuThreshold())) + "%")); }, { name: 'view:round', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el19.appendChild(txt12);
  const el20 = document.createElement('input');
  el20.setAttribute('type', 'range');
  el20.setAttribute('min', '0');
  el20.setAttribute('max', '100');
  el20.value = cpuThreshold();
  createEffect(() => { el20.value = cpuThreshold(); }, { name: 'view:bind:cpuThreshold', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el20.addEventListener('input', (e) => { setCpuThreshold(Number(e.target.value)); });
  el19.appendChild(el20);
  el18.appendChild(el19);
  const el21 = document.createElement('label');
  const txt13 = document.createTextNode('');
  createEffect(() => { txt13.data = String((("MEM: " + Math.round(memThreshold())) + "%")); }, { name: 'view:round', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el21.appendChild(txt13);
  const el22 = document.createElement('input');
  el22.setAttribute('type', 'range');
  el22.setAttribute('min', '0');
  el22.setAttribute('max', '100');
  el22.value = memThreshold();
  createEffect(() => { el22.value = memThreshold(); }, { name: 'view:bind:memThreshold', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el22.addEventListener('input', (e) => { setMemThreshold(Number(e.target.value)); });
  el21.appendChild(el22);
  el18.appendChild(el21);
  const el23 = document.createElement('label');
  const txt14 = document.createTextNode('');
  createEffect(() => { txt14.data = String((("STORAGE: " + Math.round(diskThreshold())) + "KB")); }, { name: 'view:round', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el23.appendChild(txt14);
  const el24 = document.createElement('input');
  el24.setAttribute('type', 'range');
  el24.setAttribute('min', '0');
  el24.setAttribute('max', '2000');
  el24.value = diskThreshold();
  createEffect(() => { el24.value = diskThreshold(); }, { name: 'view:bind:diskThreshold', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el24.addEventListener('input', (e) => { setDiskThreshold(Number(e.target.value)); });
  el23.appendChild(el24);
  el18.appendChild(el23);
  el0.appendChild(el18);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'Monitor';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [cpu, setCpu] = createSignal(25, { name: 'cpu', module: $m });

  const [mem, setMem] = createSignal(40, { name: 'mem', module: $m });

  const [disk, setDisk] = createSignal(5, { name: 'disk', module: $m });

  const [net, setNet] = createSignal(10, { name: 'net', module: $m });

  const [cpuAvg, setCpuAvg] = createSignal(25, { name: 'cpuAvg', module: $m });

  const [memAvg, setMemAvg] = createSignal(40, { name: 'memAvg', module: $m });

  const [cpuThreshold, setCpuThreshold] = createSignal(40, { name: 'cpuThreshold', module: $m });

  const [memThreshold, setMemThreshold] = createSignal(85, { name: 'memThreshold', module: $m });

  const [diskThreshold, setDiskThreshold] = createSignal(500, { name: 'diskThreshold', module: $m });

  const [lastAlert, setLastAlert] = createSignal("", { name: 'lastAlert', module: $m });

  const cpuHigh = createComb(() => (cpuAvg() > cpuThreshold()), { name: 'cpuHigh', module: $m, deps: ["cpuAvg","cpuThreshold"] });

  const memHigh = createComb(() => (memAvg() > memThreshold()), { name: 'memHigh', module: $m, deps: ["memAvg","memThreshold"] });

  const diskHigh = createComb(() => (disk() > diskThreshold()), { name: 'diskHigh', module: $m, deps: ["disk","diskThreshold"] });

  const anyAlert = createComb(() => ((cpuHigh() || memHigh()) || diskHigh()), { name: 'anyAlert', module: $m, deps: ["cpuHigh","memHigh","diskHigh"] });

  const __ec_alertCount_0 = createEdgeCounter(() => cpuHigh(), 'posedge', { name: '__ec_alertCount_0', module: $m });
  const __ec_alertCount_1 = createEdgeCounter(() => memHigh(), 'posedge', { name: '__ec_alertCount_1', module: $m });
  const __ec_alertCount_2 = createEdgeCounter(() => diskHigh(), 'posedge', { name: '__ec_alertCount_2', module: $m });
  const alertCount = createComb(() => ((__ec_alertCount_0() + __ec_alertCount_1()) + __ec_alertCount_2()), { name: 'alertCount', module: $m, deps: ["cpuHigh","memHigh","diskHigh"] });

  createEffect(() => {
    const __ok = (anyAlert() == ((cpuHigh() || memHigh()) || diskHigh()));
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(anyAlert == ((cpuHigh || memHigh) || diskHigh))',
        module: $m,
        values: { anyAlert: anyAlert(), cpuHigh: cpuHigh(), memHigh: memHigh(), diskHigh: diskHigh() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createEffect(() => {
    const __ok = (cpuHigh() == (cpuAvg() > cpuThreshold()));
    if (!__ok) {
      circuit.assertionFailed('assert:1', {
        expr: '(cpuHigh == (cpuAvg > cpuThreshold))',
        module: $m,
        values: { cpuHigh: cpuHigh(), cpuAvg: cpuAvg(), cpuThreshold: cpuThreshold() },
      });
    }
  }, { name: 'assert:1', module: $m });

  return {
    signals: { cpu: { get: cpu, set: setCpu }, mem: { get: mem, set: setMem }, disk: { get: disk, set: setDisk }, net: { get: net, set: setNet }, cpuAvg: { get: cpuAvg, set: setCpuAvg }, memAvg: { get: memAvg, set: setMemAvg }, cpuThreshold: { get: cpuThreshold, set: setCpuThreshold }, memThreshold: { get: memThreshold, set: setMemThreshold }, diskThreshold: { get: diskThreshold, set: setDiskThreshold }, lastAlert: { get: lastAlert, set: setLastAlert } },
    combs: { cpuHigh, memHigh, diskHigh, anyAlert, alertCount },
    dispose: __scope.dispose,
  };
}