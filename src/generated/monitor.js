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
      "id": "memAvg",
      "name": "memAvg",
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
      "id": "cpuDisplay",
      "name": "cpuDisplay",
      "type": "comb"
    },
    {
      "id": "memDisplay",
      "name": "memDisplay",
      "type": "comb"
    },
    {
      "id": "diskDisplay",
      "name": "diskDisplay",
      "type": "comb"
    },
    {
      "id": "netDisplay",
      "name": "netDisplay",
      "type": "comb"
    },
    {
      "id": "avgDisplay",
      "name": "avgDisplay",
      "type": "comb"
    },
    {
      "id": "memAvgDisplay",
      "name": "memAvgDisplay",
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
      "id": "view:memAvgDisplay",
      "name": "view:memAvgDisplay",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-detail",
        "binding": "text"
      }
    },
    {
      "id": "view:diskDisplay",
      "name": "view:diskDisplay",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.metric-value",
        "binding": "text"
      }
    },
    {
      "id": "view:netDisplay",
      "name": "view:netDisplay",
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
      "from": "memAvg",
      "to": "memHigh",
      "type": "data"
    },
    {
      "from": "disk",
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
      "from": "cpu",
      "to": "cpuDisplay",
      "type": "data"
    },
    {
      "from": "mem",
      "to": "memDisplay",
      "type": "data"
    },
    {
      "from": "disk",
      "to": "diskDisplay",
      "type": "data"
    },
    {
      "from": "net",
      "to": "netDisplay",
      "type": "data"
    },
    {
      "from": "cpuAvg",
      "to": "avgDisplay",
      "type": "data"
    },
    {
      "from": "memAvg",
      "to": "memAvgDisplay",
      "type": "data"
    },
    {
      "from": "cpuThreshold",
      "to": "threshDisplay",
      "type": "data"
    },
    {
      "from": "anyAlert",
      "to": "statusText",
      "type": "data"
    },
    {
      "from": "cpuHigh",
      "to": "statusText",
      "type": "data"
    },
    {
      "from": "memHigh",
      "to": "statusText",
      "type": "data"
    },
    {
      "from": "diskHigh",
      "to": "statusText",
      "type": "data"
    },
    {
      "from": "anyAlert",
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
      "from": "memHigh",
      "to": "posedge:memHigh",
      "type": "data"
    },
    {
      "from": "posedge:memHigh",
      "to": "alertCount",
      "type": "write"
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
      "to": "alertCount",
      "type": "write"
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
      "from": "memAvgDisplay",
      "to": "view:memAvgDisplay",
      "type": "data"
    },
    {
      "from": "diskDisplay",
      "to": "view:diskDisplay",
      "type": "data"
    },
    {
      "from": "netDisplay",
      "to": "view:netDisplay",
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

  const [disk, setDisk] = createSignal(5, { name: 'disk', module: $m, type: 'float' });

  const [net, setNet] = createSignal(10, { name: 'net', module: $m, type: 'float' });

  const [cpuThreshold, setCpuThreshold] = createSignal(80, { name: 'cpuThreshold', module: $m, type: 'float' });

  const [cpuAvg, setCpuAvg] = createSignal(25, { name: 'cpuAvg', module: $m, type: 'float' });

  const [memAvg, setMemAvg] = createSignal(40, { name: 'memAvg', module: $m, type: 'float' });

  const [alertCount, setAlertCount] = createSignal(0, { name: 'alertCount', module: $m, type: 'int' });

  const [lastAlert, setLastAlert] = createSignal("", { name: 'lastAlert', module: $m, type: 'string' });

  const cpuHigh = createComb(() => (cpuAvg() > cpuThreshold()), { name: 'cpuHigh', module: $m, deps: ["cpuAvg","cpuThreshold"] });

  const memHigh = createComb(() => (memAvg() > 85), { name: 'memHigh', module: $m, deps: ["memAvg"] });

  const diskHigh = createComb(() => (disk() > 90), { name: 'diskHigh', module: $m, deps: ["disk"] });

  const anyAlert = createComb(() => ((cpuHigh() || memHigh()) || diskHigh()), { name: 'anyAlert', module: $m, deps: ["cpuHigh","memHigh","diskHigh"] });

  const cpuDisplay = createComb(() => (String(Math.round(cpu())) + "%"), { name: 'cpuDisplay', module: $m, deps: ["cpu"] });

  const memDisplay = createComb(() => (String(Math.round(mem())) + "%"), { name: 'memDisplay', module: $m, deps: ["mem"] });

  const diskDisplay = createComb(() => (String(Math.round(disk())) + "%"), { name: 'diskDisplay', module: $m, deps: ["disk"] });

  const netDisplay = createComb(() => (String(Math.round(net())) + " MB/s"), { name: 'netDisplay', module: $m, deps: ["net"] });

  const avgDisplay = createComb(() => (String(Math.round(cpuAvg())) + "%"), { name: 'avgDisplay', module: $m, deps: ["cpuAvg"] });

  const memAvgDisplay = createComb(() => (String(Math.round(memAvg())) + "%"), { name: 'memAvgDisplay', module: $m, deps: ["memAvg"] });

  const threshDisplay = createComb(() => (String(Math.round(cpuThreshold())) + "%"), { name: 'threshDisplay', module: $m, deps: ["cpuThreshold"] });

  const statusText = createComb(() => (anyAlert() ? (((("ALERT: " + (cpuHigh() ? "CPU " : "")) + (memHigh() ? "MEM " : "")) + (diskHigh() ? "DISK " : "")) + "threshold exceeded") : "All systems normal"), { name: 'statusText', module: $m, deps: ["anyAlert","cpuHigh","memHigh","diskHigh"] });

  const statusClass = createComb(() => (anyAlert() ? "status-alert" : "status-ok"), { name: 'statusClass', module: $m, deps: ["anyAlert"] });

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

  createEdgeEffect(() => memHigh(), 'posedge', () => {
    batch(() => {
      setAlertCount((alertCount() + 1));
      setLastAlert("Memory exceeded 85%");
    });
  }, { name: 'posedge_memHigh', module: $m });

  createEdgeEffect(() => memHigh(), 'negedge', () => {
    batch(() => {
      setLastAlert("Memory recovered below 85%");
    });
  }, { name: 'negedge_memHigh', module: $m });

  createEdgeEffect(() => diskHigh(), 'posedge', () => {
    batch(() => {
      setAlertCount((alertCount() + 1));
      setLastAlert("Disk usage exceeded 90%");
    });
  }, { name: 'posedge_diskHigh', module: $m });

  createEdgeEffect(() => diskHigh(), 'negedge', () => {
    batch(() => {
      setLastAlert("Disk usage recovered");
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
  const txt4 = document.createTextNode('Memory');
  el7.appendChild(txt4);
  el6.appendChild(el7);
  const el8 = document.createElement('span');
  el8.setAttribute('class', 'metric-value');
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String(memDisplay()); }, { name: 'view:memDisplay', module: $m, viewTarget: { element: 'span.metric-value', binding: 'text' } });
  el8.appendChild(txt5);
  el6.appendChild(el8);
  const el9 = document.createElement('span');
  el9.setAttribute('class', 'metric-detail');
  const txt6 = document.createTextNode('avg');
  el9.appendChild(txt6);
  const txt7 = document.createTextNode('');
  createEffect(() => { txt7.data = String(memAvgDisplay()); }, { name: 'view:memAvgDisplay', module: $m, viewTarget: { element: 'span.metric-detail', binding: 'text' } });
  el9.appendChild(txt7);
  el6.appendChild(el9);
  el1.appendChild(el6);
  const el10 = document.createElement('div');
  el10.setAttribute('class', 'metric');
  const el11 = document.createElement('span');
  el11.setAttribute('class', 'metric-label');
  const txt8 = document.createTextNode('Disk I/O');
  el11.appendChild(txt8);
  el10.appendChild(el11);
  const el12 = document.createElement('span');
  el12.setAttribute('class', 'metric-value');
  const txt9 = document.createTextNode('');
  createEffect(() => { txt9.data = String(diskDisplay()); }, { name: 'view:diskDisplay', module: $m, viewTarget: { element: 'span.metric-value', binding: 'text' } });
  el12.appendChild(txt9);
  el10.appendChild(el12);
  el1.appendChild(el10);
  const el13 = document.createElement('div');
  el13.setAttribute('class', 'metric');
  const el14 = document.createElement('span');
  el14.setAttribute('class', 'metric-label');
  const txt10 = document.createTextNode('Network');
  el14.appendChild(txt10);
  el13.appendChild(el14);
  const el15 = document.createElement('span');
  el15.setAttribute('class', 'metric-value');
  const txt11 = document.createTextNode('');
  createEffect(() => { txt11.data = String(netDisplay()); }, { name: 'view:netDisplay', module: $m, viewTarget: { element: 'span.metric-value', binding: 'text' } });
  el15.appendChild(txt11);
  el13.appendChild(el15);
  el1.appendChild(el13);
  el0.appendChild(el1);
  const el16 = document.createElement('p');
  createEffect(() => { el16.setAttribute('class', statusClass()); }, { name: 'view:attr:statusClass', module: $m, viewTarget: { element: 'p', binding: 'attr:class' } });
  const txt12 = document.createTextNode('');
  createEffect(() => { txt12.data = String(statusText()); }, { name: 'view:statusText', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el16.appendChild(txt12);
  el0.appendChild(el16);
  const el17 = document.createElement('p');
  el17.setAttribute('class', 'alert-info');
  const txt13 = document.createTextNode('Alerts fired:');
  el17.appendChild(txt13);
  const txt14 = document.createTextNode('');
  createEffect(() => { txt14.data = String(String(alertCount())); }, { name: 'view:str', module: $m, viewTarget: { element: 'p.alert-info', binding: 'text' } });
  el17.appendChild(txt14);
  const txt15 = document.createTextNode('—');
  el17.appendChild(txt15);
  const txt16 = document.createTextNode('');
  createEffect(() => { txt16.data = String(lastAlert()); }, { name: 'view:lastAlert', module: $m, viewTarget: { element: 'p.alert-info', binding: 'text' } });
  el17.appendChild(txt16);
  el0.appendChild(el17);
  const el18 = document.createElement('label');
  const txt17 = document.createTextNode('CPU Threshold:');
  el18.appendChild(txt17);
  const txt18 = document.createTextNode('');
  createEffect(() => { txt18.data = String(threshDisplay()); }, { name: 'view:threshDisplay', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el18.appendChild(txt18);
  const el19 = document.createElement('input');
  el19.setAttribute('type', 'range');
  el19.setAttribute('min', '0');
  el19.setAttribute('max', '100');
  el19.value = cpuThreshold();
  createEffect(() => { el19.value = cpuThreshold(); }, { name: 'view:bind:cpuThreshold', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el19.addEventListener('input', (e) => { setCpuThreshold(Number(e.target.value)); });
  el18.appendChild(el19);
  el0.appendChild(el18);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'Monitor';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [cpu, setCpu] = createSignal(25, { name: 'cpu', module: $m, type: 'float' });

  const [mem, setMem] = createSignal(40, { name: 'mem', module: $m, type: 'float' });

  const [disk, setDisk] = createSignal(5, { name: 'disk', module: $m, type: 'float' });

  const [net, setNet] = createSignal(10, { name: 'net', module: $m, type: 'float' });

  const [cpuThreshold, setCpuThreshold] = createSignal(80, { name: 'cpuThreshold', module: $m, type: 'float' });

  const [cpuAvg, setCpuAvg] = createSignal(25, { name: 'cpuAvg', module: $m, type: 'float' });

  const [memAvg, setMemAvg] = createSignal(40, { name: 'memAvg', module: $m, type: 'float' });

  const [alertCount, setAlertCount] = createSignal(0, { name: 'alertCount', module: $m, type: 'int' });

  const [lastAlert, setLastAlert] = createSignal("", { name: 'lastAlert', module: $m, type: 'string' });

  const cpuHigh = createComb(() => (cpuAvg() > cpuThreshold()), { name: 'cpuHigh', module: $m, deps: ["cpuAvg","cpuThreshold"] });

  const memHigh = createComb(() => (memAvg() > 85), { name: 'memHigh', module: $m, deps: ["memAvg"] });

  const diskHigh = createComb(() => (disk() > 90), { name: 'diskHigh', module: $m, deps: ["disk"] });

  const anyAlert = createComb(() => ((cpuHigh() || memHigh()) || diskHigh()), { name: 'anyAlert', module: $m, deps: ["cpuHigh","memHigh","diskHigh"] });

  const cpuDisplay = createComb(() => (String(Math.round(cpu())) + "%"), { name: 'cpuDisplay', module: $m, deps: ["cpu"] });

  const memDisplay = createComb(() => (String(Math.round(mem())) + "%"), { name: 'memDisplay', module: $m, deps: ["mem"] });

  const diskDisplay = createComb(() => (String(Math.round(disk())) + "%"), { name: 'diskDisplay', module: $m, deps: ["disk"] });

  const netDisplay = createComb(() => (String(Math.round(net())) + " MB/s"), { name: 'netDisplay', module: $m, deps: ["net"] });

  const avgDisplay = createComb(() => (String(Math.round(cpuAvg())) + "%"), { name: 'avgDisplay', module: $m, deps: ["cpuAvg"] });

  const memAvgDisplay = createComb(() => (String(Math.round(memAvg())) + "%"), { name: 'memAvgDisplay', module: $m, deps: ["memAvg"] });

  const threshDisplay = createComb(() => (String(Math.round(cpuThreshold())) + "%"), { name: 'threshDisplay', module: $m, deps: ["cpuThreshold"] });

  const statusText = createComb(() => (anyAlert() ? (((("ALERT: " + (cpuHigh() ? "CPU " : "")) + (memHigh() ? "MEM " : "")) + (diskHigh() ? "DISK " : "")) + "threshold exceeded") : "All systems normal"), { name: 'statusText', module: $m, deps: ["anyAlert","cpuHigh","memHigh","diskHigh"] });

  const statusClass = createComb(() => (anyAlert() ? "status-alert" : "status-ok"), { name: 'statusClass', module: $m, deps: ["anyAlert"] });

  return {
    signals: { cpu: { get: cpu, set: setCpu }, mem: { get: mem, set: setMem }, disk: { get: disk, set: setDisk }, net: { get: net, set: setNet }, cpuThreshold: { get: cpuThreshold, set: setCpuThreshold }, cpuAvg: { get: cpuAvg, set: setCpuAvg }, memAvg: { get: memAvg, set: setMemAvg }, alertCount: { get: alertCount, set: setAlertCount }, lastAlert: { get: lastAlert, set: setLastAlert } },
    combs: { cpuHigh, memHigh, diskHigh, anyAlert, cpuDisplay, memDisplay, diskDisplay, netDisplay, avgDisplay, memAvgDisplay, threshDisplay, statusText, statusClass },
    dispose: __scope.dispose,
  };
}