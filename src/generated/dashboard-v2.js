import { createSignal, createComb, createEffect, batch, createScope, circuit, X, createEdgeEffect, deferredBatch } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "cpu",
      "name": "cpu",
      "type": "signal"
    },
    {
      "id": "memory",
      "name": "memory",
      "type": "signal"
    },
    {
      "id": "disk",
      "name": "disk",
      "type": "signal"
    },
    {
      "id": "network",
      "name": "network",
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
      "id": "cpuUsage",
      "name": "cpuUsage",
      "type": "signal"
    },
    {
      "id": "memUsage",
      "name": "memUsage",
      "type": "comb",
      "valueType": "int"
    },
    {
      "id": "cpuAlert",
      "name": "cpuAlert",
      "type": "comb",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "memAlert",
      "name": "memAlert",
      "type": "comb",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "systemStatus",
      "name": "systemStatus",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "avgLoad",
      "name": "avgLoad",
      "type": "comb",
      "valueType": "float"
    },
    {
      "id": "loadLevel",
      "name": "loadLevel",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "lastEvent",
      "name": "lastEvent",
      "type": "signal"
    },
    {
      "id": "posedge:cpuAlert",
      "name": "posedge(cpuAlert)",
      "type": "sensitivity"
    },
    {
      "id": "posedge:memAlert",
      "name": "posedge(memAlert)",
      "type": "sensitivity"
    },
    {
      "id": "view:systemStatus",
      "name": "view:systemStatus",
      "type": "view-effect",
      "viewTarget": {
        "element": "p.status",
        "binding": "text"
      }
    },
    {
      "id": "view:str",
      "name": "view:str",
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
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:lastEvent",
      "name": "view:lastEvent",
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
        "element": "label",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:cpu",
      "name": "view:bind:cpu",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:str",
      "name": "view:str",
      "type": "view-effect",
      "viewTarget": {
        "element": "label",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:memory",
      "name": "view:bind:memory",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:str",
      "name": "view:str",
      "type": "view-effect",
      "viewTarget": {
        "element": "label",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:disk",
      "name": "view:bind:disk",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:str",
      "name": "view:str",
      "type": "view-effect",
      "viewTarget": {
        "element": "label",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:network",
      "name": "view:bind:network",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    }
  ],
  "edges": [
    {
      "from": "memory",
      "to": "memUsage",
      "type": "data"
    },
    {
      "from": "cpuUsage",
      "to": "cpuAlert",
      "type": "data"
    },
    {
      "from": "cpuThreshold",
      "to": "cpuAlert",
      "type": "data"
    },
    {
      "from": "memUsage",
      "to": "memAlert",
      "type": "data"
    },
    {
      "from": "memThreshold",
      "to": "memAlert",
      "type": "data"
    },
    {
      "from": "memAlert",
      "to": "systemStatus",
      "type": "data"
    },
    {
      "from": "cpu",
      "to": "avgLoad",
      "type": "data"
    },
    {
      "from": "memory",
      "to": "avgLoad",
      "type": "data"
    },
    {
      "from": "disk",
      "to": "avgLoad",
      "type": "data"
    },
    {
      "from": "network",
      "to": "avgLoad",
      "type": "data"
    },
    {
      "from": "avgLoad",
      "to": "loadLevel",
      "type": "data"
    },
    {
      "from": "cpuAlert",
      "to": "posedge:cpuAlert",
      "type": "data"
    },
    {
      "from": "posedge:cpuAlert",
      "to": "lastEvent",
      "type": "write"
    },
    {
      "from": "memAlert",
      "to": "posedge:memAlert",
      "type": "data"
    },
    {
      "from": "posedge:memAlert",
      "to": "lastEvent",
      "type": "write"
    },
    {
      "from": "systemStatus",
      "to": "view:systemStatus",
      "type": "data"
    },
    {
      "from": "cpuUsage",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "memUsage",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "avgLoad",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "loadLevel",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "lastEvent",
      "to": "view:lastEvent",
      "type": "data"
    },
    {
      "from": "cpu",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "cpu",
      "to": "view:bind:cpu",
      "type": "data"
    },
    {
      "from": "memory",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "memory",
      "to": "view:bind:memory",
      "type": "data"
    },
    {
      "from": "disk",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "disk",
      "to": "view:bind:disk",
      "type": "data"
    },
    {
      "from": "network",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "network",
      "to": "view:bind:network",
      "type": "data"
    }
  ]
};

export function Dashboard(root) {
  const $m = 'Dashboard';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [cpu, setCpu] = createSignal(0, { name: 'cpu', module: $m });

  const [memory, setMemory] = createSignal(0, { name: 'memory', module: $m });

  const [disk, setDisk] = createSignal(0, { name: 'disk', module: $m });

  const [network, setNetwork] = createSignal(0, { name: 'network', module: $m });

  const [cpuThreshold, setCpuThreshold] = createSignal(80, { name: 'cpuThreshold', module: $m });

  const [memThreshold, setMemThreshold] = createSignal(90, { name: 'memThreshold', module: $m });

  const [cpuUsage, setCpuUsage] = createSignal(0, { name: 'cpuUsage', module: $m });

  const memUsage = createComb(() => Math.round(memory()), { name: 'memUsage', module: $m, deps: ["memory"] });

  const cpuAlert = createComb(() => (cpuUsage() > cpuThreshold()), { name: 'cpuAlert', module: $m, deps: ["cpuUsage","cpuThreshold"] });

  const memAlert = createComb(() => (memUsage() > memThreshold()), { name: 'memAlert', module: $m, deps: ["memUsage","memThreshold"] });

  const systemStatus = createComb(() => (memAlert() ? "ALERT" : "OK"), { name: 'systemStatus', module: $m, deps: ["memAlert"] });

  const avgLoad = createComb(() => ((((cpu() + memory()) + disk()) + network()) / 4), { name: 'avgLoad', module: $m, deps: ["cpu","memory","disk","network"] });

  const loadLevel = createComb(() => ((avgLoad() > 75) ? "high" : ((avgLoad() > 50) ? "medium" : "low")), { name: 'loadLevel', module: $m, deps: ["avgLoad"] });

  const [lastEvent, setLastEvent] = createSignal("none", { name: 'lastEvent', module: $m });

  createEdgeEffect(() => cpuAlert(), 'posedge', () => {
    deferredBatch(() => {
      setLastEvent("CPU alert triggered");
    });
  }, { name: 'posedge_cpuAlert', module: $m });

  createEdgeEffect(() => memAlert(), 'posedge', () => {
    deferredBatch(() => {
      setLastEvent("Memory alert triggered");
    });
  }, { name: 'posedge_memAlert', module: $m });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'dashboard');
  const el1 = document.createElement('h2');
  const txt0 = document.createTextNode('System Dashboard');
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('p');
  el2.setAttribute('class', 'status');
  const txt1 = document.createTextNode('');
  createEffect(() => { txt1.data = String(("Status: " + systemStatus())); }, { name: 'view:systemStatus', module: $m, viewTarget: { element: 'p.status', binding: 'text' } });
  el2.appendChild(txt1);
  el0.appendChild(el2);
  const el3 = document.createElement('p');
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String((((("CPU: " + String(cpuUsage())) + "% | Memory: ") + String(memUsage())) + "%")); }, { name: 'view:str', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el3.appendChild(txt2);
  el0.appendChild(el3);
  const el4 = document.createElement('p');
  const txt3 = document.createTextNode('');
  createEffect(() => { txt3.data = String((((("Avg Load: " + String(Math.round(avgLoad()))) + " (") + loadLevel()) + ")")); }, { name: 'view:str', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el4.appendChild(txt3);
  el0.appendChild(el4);
  const el5 = document.createElement('p');
  const txt4 = document.createTextNode('');
  createEffect(() => { txt4.data = String(("Last Event: " + lastEvent())); }, { name: 'view:lastEvent', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el5.appendChild(txt4);
  el0.appendChild(el5);
  const el6 = document.createElement('div');
  el6.setAttribute('class', 'controls');
  const el7 = document.createElement('label');
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String((("CPU: " + String(Math.round(cpu()))) + "%")); }, { name: 'view:str', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el7.appendChild(txt5);
  const el8 = document.createElement('input');
  el8.setAttribute('type', 'range');
  el8.setAttribute('min', '0');
  el8.setAttribute('max', '100');
  el8.value = cpu();
  createEffect(() => { el8.value = cpu(); }, { name: 'view:bind:cpu', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el8.addEventListener('input', (e) => { setCpu(Number(e.target.value)); });
  el7.appendChild(el8);
  el6.appendChild(el7);
  const el9 = document.createElement('label');
  const txt6 = document.createTextNode('');
  createEffect(() => { txt6.data = String((("Memory: " + String(Math.round(memory()))) + "%")); }, { name: 'view:str', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el9.appendChild(txt6);
  const el10 = document.createElement('input');
  el10.setAttribute('type', 'range');
  el10.setAttribute('min', '0');
  el10.setAttribute('max', '100');
  el10.value = memory();
  createEffect(() => { el10.value = memory(); }, { name: 'view:bind:memory', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el10.addEventListener('input', (e) => { setMemory(Number(e.target.value)); });
  el9.appendChild(el10);
  el6.appendChild(el9);
  const el11 = document.createElement('label');
  const txt7 = document.createTextNode('');
  createEffect(() => { txt7.data = String((("Disk: " + String(Math.round(disk()))) + "%")); }, { name: 'view:str', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el11.appendChild(txt7);
  const el12 = document.createElement('input');
  el12.setAttribute('type', 'range');
  el12.setAttribute('min', '0');
  el12.setAttribute('max', '100');
  el12.value = disk();
  createEffect(() => { el12.value = disk(); }, { name: 'view:bind:disk', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el12.addEventListener('input', (e) => { setDisk(Number(e.target.value)); });
  el11.appendChild(el12);
  el6.appendChild(el11);
  const el13 = document.createElement('label');
  const txt8 = document.createTextNode('');
  createEffect(() => { txt8.data = String((("Network: " + String(Math.round(network()))) + "%")); }, { name: 'view:str', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el13.appendChild(txt8);
  const el14 = document.createElement('input');
  el14.setAttribute('type', 'range');
  el14.setAttribute('min', '0');
  el14.setAttribute('max', '100');
  el14.value = network();
  createEffect(() => { el14.value = network(); }, { name: 'view:bind:network', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el14.addEventListener('input', (e) => { setNetwork(Number(e.target.value)); });
  el13.appendChild(el14);
  el6.appendChild(el13);
  el0.appendChild(el6);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'Dashboard';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [cpu, setCpu] = createSignal(0, { name: 'cpu', module: $m });

  const [memory, setMemory] = createSignal(0, { name: 'memory', module: $m });

  const [disk, setDisk] = createSignal(0, { name: 'disk', module: $m });

  const [network, setNetwork] = createSignal(0, { name: 'network', module: $m });

  const [cpuThreshold, setCpuThreshold] = createSignal(80, { name: 'cpuThreshold', module: $m });

  const [memThreshold, setMemThreshold] = createSignal(90, { name: 'memThreshold', module: $m });

  const [cpuUsage, setCpuUsage] = createSignal(0, { name: 'cpuUsage', module: $m });

  const memUsage = createComb(() => Math.round(memory()), { name: 'memUsage', module: $m, deps: ["memory"] });

  const cpuAlert = createComb(() => (cpuUsage() > cpuThreshold()), { name: 'cpuAlert', module: $m, deps: ["cpuUsage","cpuThreshold"] });

  const memAlert = createComb(() => (memUsage() > memThreshold()), { name: 'memAlert', module: $m, deps: ["memUsage","memThreshold"] });

  const systemStatus = createComb(() => (memAlert() ? "ALERT" : "OK"), { name: 'systemStatus', module: $m, deps: ["memAlert"] });

  const avgLoad = createComb(() => ((((cpu() + memory()) + disk()) + network()) / 4), { name: 'avgLoad', module: $m, deps: ["cpu","memory","disk","network"] });

  const loadLevel = createComb(() => ((avgLoad() > 75) ? "high" : ((avgLoad() > 50) ? "medium" : "low")), { name: 'loadLevel', module: $m, deps: ["avgLoad"] });

  const [lastEvent, setLastEvent] = createSignal("none", { name: 'lastEvent', module: $m });

  return {
    signals: { cpu: { get: cpu, set: setCpu }, memory: { get: memory, set: setMemory }, disk: { get: disk, set: setDisk }, network: { get: network, set: setNetwork }, cpuThreshold: { get: cpuThreshold, set: setCpuThreshold }, memThreshold: { get: memThreshold, set: setMemThreshold }, cpuUsage: { get: cpuUsage, set: setCpuUsage }, lastEvent: { get: lastEvent, set: setLastEvent } },
    combs: { memUsage, cpuAlert, memAlert, systemStatus, avgLoad, loadLevel },
    dispose: __scope.dispose,
  };
}