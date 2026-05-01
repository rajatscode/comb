import { createSignal, createComb, createEffect, batch, createScope, circuit, X, createEdgeEffect, deferredBatch, createTemporalAssert } from '../runtime/index.js';

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
      "id": "bus_request",
      "name": "bus_request",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "bus_grant",
      "name": "bus_grant",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "bus_data",
      "name": "bus_data",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "bus_valid",
      "name": "bus_valid",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "bus_ack",
      "name": "bus_ack",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "bus_busy",
      "name": "bus_busy",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "master_state",
      "name": "master_state",
      "type": "signal",
      "valueType": "MasterState",
      "states": [
        "MasterState.Idle",
        "MasterState.Requesting",
        "MasterState.Transmitting",
        "MasterState.WaitAck",
        "MasterState.Done"
      ]
    },
    {
      "id": "master_data_idx",
      "name": "master_data_idx",
      "type": "signal",
      "valueType": "int",
      "states": [
        "0",
        "1",
        "2",
        "3"
      ]
    },
    {
      "id": "tx_count",
      "name": "tx_count",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "slave_state",
      "name": "slave_state",
      "type": "signal",
      "valueType": "SlaveState",
      "states": [
        "SlaveState.Idle",
        "SlaveState.Receiving",
        "SlaveState.Processing",
        "SlaveState.Acking"
      ]
    },
    {
      "id": "slave_buffer",
      "name": "slave_buffer",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "rx_count",
      "name": "rx_count",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "arbiter_grant_delay",
      "name": "arbiter_grant_delay",
      "type": "signal",
      "valueType": "int",
      "states": [
        "0",
        "1"
      ]
    },
    {
      "id": "masterStateLabel",
      "name": "masterStateLabel",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "slaveStateLabel",
      "name": "slaveStateLabel",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "transferActive",
      "name": "transferActive",
      "type": "comb",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "protocolHealthy",
      "name": "protocolHealthy",
      "type": "comb",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
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
      "id": "assert:0",
      "name": "assert:0",
      "type": "assert",
      "expr": "!bus_request && bus_ack"
    },
    {
      "id": "posedge(bus_request) eventually(bus_grant) within 5",
      "name": "posedge(bus_request) eventually(bus_grant) within 5",
      "type": "assert",
      "expr": "posedge(bus_request) eventually(bus_grant) within 5"
    },
    {
      "id": "posedge(bus_valid) eventually(bus_ack) within 10",
      "name": "posedge(bus_valid) eventually(bus_ack) within 10",
      "type": "assert",
      "expr": "posedge(bus_valid) eventually(bus_ack) within 10"
    },
    {
      "id": "posedge(bus_busy) always(bus_grant) within 3",
      "name": "posedge(bus_busy) always(bus_grant) within 3",
      "type": "assert",
      "expr": "posedge(bus_busy) always(bus_grant) within 3"
    },
    {
      "id": "view:masterStateLabel",
      "name": "view:masterStateLabel",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.bus-state",
        "binding": "text"
      }
    },
    {
      "id": "view:tx_count",
      "name": "view:tx_count",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:bus_request",
      "name": "view:bus_request",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:bus_grant",
      "name": "view:bus_grant",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:bus_data",
      "name": "view:bus_data",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:bus_valid",
      "name": "view:bus_valid",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:bus_ack",
      "name": "view:bus_ack",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:bus_busy",
      "name": "view:bus_busy",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:slaveStateLabel",
      "name": "view:slaveStateLabel",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.bus-state",
        "binding": "text"
      }
    },
    {
      "id": "view:rx_count",
      "name": "view:rx_count",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:slave_buffer",
      "name": "view:slave_buffer",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:cycle",
      "name": "view:cycle",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:transferActive",
      "name": "view:transferActive",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:protocolHealthy",
      "name": "view:protocolHealthy",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "master_state",
      "to": "masterStateLabel",
      "type": "data"
    },
    {
      "from": "slave_state",
      "to": "slaveStateLabel",
      "type": "data"
    },
    {
      "from": "bus_busy",
      "to": "transferActive",
      "type": "data"
    },
    {
      "from": "bus_request",
      "to": "protocolHealthy",
      "type": "data"
    },
    {
      "from": "bus_ack",
      "to": "protocolHealthy",
      "type": "data"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "master_state",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "bus_request",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "master_data_idx",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "bus_busy",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "bus_data",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "bus_valid",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "tx_count",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "arbiter_grant_delay",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "bus_grant",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "slave_state",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "slave_buffer",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "bus_ack",
      "type": "write"
    },
    {
      "from": "posedge:clk",
      "to": "rx_count",
      "type": "write"
    },
    {
      "from": "clk",
      "to": "posedge:clk",
      "type": "data"
    },
    {
      "from": "posedge:clk",
      "to": "cycle",
      "type": "write"
    },
    {
      "from": "bus_request",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "bus_ack",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "bus_request",
      "to": "posedge(bus_request) eventually(bus_grant) within 5",
      "type": "data"
    },
    {
      "from": "bus_grant",
      "to": "posedge(bus_request) eventually(bus_grant) within 5",
      "type": "data"
    },
    {
      "from": "bus_valid",
      "to": "posedge(bus_valid) eventually(bus_ack) within 10",
      "type": "data"
    },
    {
      "from": "bus_ack",
      "to": "posedge(bus_valid) eventually(bus_ack) within 10",
      "type": "data"
    },
    {
      "from": "bus_busy",
      "to": "posedge(bus_busy) always(bus_grant) within 3",
      "type": "data"
    },
    {
      "from": "bus_grant",
      "to": "posedge(bus_busy) always(bus_grant) within 3",
      "type": "data"
    },
    {
      "from": "masterStateLabel",
      "to": "view:masterStateLabel",
      "type": "data"
    },
    {
      "from": "tx_count",
      "to": "view:tx_count",
      "type": "data"
    },
    {
      "from": "bus_request",
      "to": "view:bus_request",
      "type": "data"
    },
    {
      "from": "bus_grant",
      "to": "view:bus_grant",
      "type": "data"
    },
    {
      "from": "bus_data",
      "to": "view:bus_data",
      "type": "data"
    },
    {
      "from": "bus_valid",
      "to": "view:bus_valid",
      "type": "data"
    },
    {
      "from": "bus_ack",
      "to": "view:bus_ack",
      "type": "data"
    },
    {
      "from": "bus_busy",
      "to": "view:bus_busy",
      "type": "data"
    },
    {
      "from": "slaveStateLabel",
      "to": "view:slaveStateLabel",
      "type": "data"
    },
    {
      "from": "rx_count",
      "to": "view:rx_count",
      "type": "data"
    },
    {
      "from": "slave_buffer",
      "to": "view:slave_buffer",
      "type": "data"
    },
    {
      "from": "cycle",
      "to": "view:cycle",
      "type": "data"
    },
    {
      "from": "transferActive",
      "to": "view:transferActive",
      "type": "data"
    },
    {
      "from": "protocolHealthy",
      "to": "view:protocolHealthy",
      "type": "data"
    }
  ],
  "enums": {
    "MasterState": [
      "Idle",
      "Requesting",
      "Transmitting",
      "WaitAck",
      "Done"
    ],
    "SlaveState": [
      "Idle",
      "Receiving",
      "Processing",
      "Acking"
    ]
  }
};

export function BusProtocol(root) {
  const $m = 'BusProtocol';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [clk, setClk] = createSignal(false, { name: 'clk', module: $m, type: 'bool' });

  const [cycle, setCycle] = createSignal(0, { name: 'cycle', module: $m, type: 'int' });

  const [bus_request, setBus_request] = createSignal(false, { name: 'bus_request', module: $m, type: 'bool' });

  const [bus_grant, setBus_grant] = createSignal(false, { name: 'bus_grant', module: $m, type: 'bool' });

  const [bus_data, setBus_data] = createSignal(0, { name: 'bus_data', module: $m, type: 'int' });

  const [bus_valid, setBus_valid] = createSignal(false, { name: 'bus_valid', module: $m, type: 'bool' });

  const [bus_ack, setBus_ack] = createSignal(false, { name: 'bus_ack', module: $m, type: 'bool' });

  const [bus_busy, setBus_busy] = createSignal(false, { name: 'bus_busy', module: $m, type: 'bool' });

  const MasterState = Object.freeze({
    Idle: 'MasterState.Idle',
    Requesting: 'MasterState.Requesting',
    Transmitting: 'MasterState.Transmitting',
    WaitAck: 'MasterState.WaitAck',
    Done: 'MasterState.Done',
  });

  const [master_state, setMaster_state] = createSignal(MasterState.Idle, { name: 'master_state', module: $m, type: 'MasterState' });

  const [master_data_idx, setMaster_data_idx] = createSignal(0, { name: 'master_data_idx', module: $m, type: 'int' });

  const [tx_count, setTx_count] = createSignal(0, { name: 'tx_count', module: $m, type: 'int' });

  const SlaveState = Object.freeze({
    Idle: 'SlaveState.Idle',
    Receiving: 'SlaveState.Receiving',
    Processing: 'SlaveState.Processing',
    Acking: 'SlaveState.Acking',
  });

  const [slave_state, setSlave_state] = createSignal(SlaveState.Idle, { name: 'slave_state', module: $m, type: 'SlaveState' });

  const [slave_buffer, setSlave_buffer] = createSignal(0, { name: 'slave_buffer', module: $m, type: 'int' });

  const [rx_count, setRx_count] = createSignal(0, { name: 'rx_count', module: $m, type: 'int' });

  const [arbiter_grant_delay, setArbiter_grant_delay] = createSignal(0, { name: 'arbiter_grant_delay', module: $m, type: 'int' });

  const masterStateLabel = createComb(() => ((master_state() == MasterState.Idle) ? "IDLE" : ((master_state() == MasterState.Requesting) ? "REQ" : ((master_state() == MasterState.Transmitting) ? "TX" : ((master_state() == MasterState.WaitAck) ? "WAIT" : "DONE")))), { name: 'masterStateLabel', module: $m, deps: ["master_state"] });

  const slaveStateLabel = createComb(() => ((slave_state() == SlaveState.Idle) ? "IDLE" : ((slave_state() == SlaveState.Receiving) ? "RX" : ((slave_state() == SlaveState.Processing) ? "PROC" : "ACK"))), { name: 'slaveStateLabel', module: $m, deps: ["slave_state"] });

  const transferActive = createComb(() => bus_busy(), { name: 'transferActive', module: $m, deps: ["bus_busy"] });

  const protocolHealthy = createComb(() => !(bus_request() && bus_ack()), { name: 'protocolHealthy', module: $m, deps: ["bus_request","bus_ack"] });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      if ((master_state() == MasterState.Idle)) {
        if ((((cycle() % 8) == 0) && (cycle() > 0))) {
          setMaster_state(MasterState.Requesting);
          setBus_request(true);
          setMaster_data_idx(0);
        }
      }
      if ((master_state() == MasterState.Requesting)) {
        if (bus_grant()) {
          setMaster_state(MasterState.Transmitting);
          setBus_request(false);
          setBus_busy(true);
        }
      }
      if ((master_state() == MasterState.Transmitting)) {
        setBus_data((((tx_count() + 1) * 100) + master_data_idx()));
        setBus_valid(true);
        setMaster_data_idx((master_data_idx() + 1));
        if ((master_data_idx() >= 3)) {
          setMaster_state(MasterState.WaitAck);
          setBus_valid(false);
        }
      }
      if ((master_state() == MasterState.WaitAck)) {
        if (bus_ack()) {
          setMaster_state(MasterState.Done);
          setBus_busy(false);
          setTx_count((tx_count() + 1));
        }
      }
      if ((master_state() == MasterState.Done)) {
        setMaster_state(MasterState.Idle);
      }
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      if ((bus_request() && !bus_grant())) {
        setArbiter_grant_delay((arbiter_grant_delay() + 1));
        if ((arbiter_grant_delay() >= 1)) {
          setBus_grant(true);
          setArbiter_grant_delay(0);
        }
      }
      if (((!bus_request() && bus_grant()) && !bus_busy())) {
        setBus_grant(false);
      }
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      if ((slave_state() == SlaveState.Idle)) {
        if (bus_valid()) {
          setSlave_state(SlaveState.Receiving);
          setSlave_buffer(bus_data());
        }
      }
      if ((slave_state() == SlaveState.Receiving)) {
        setSlave_buffer(bus_data());
        if (!bus_valid()) {
          setSlave_state(SlaveState.Processing);
        }
      }
      if ((slave_state() == SlaveState.Processing)) {
        setSlave_state(SlaveState.Acking);
        setBus_ack(true);
        setRx_count((rx_count() + 1));
      }
      if ((slave_state() == SlaveState.Acking)) {
        setBus_ack(false);
        setSlave_state(SlaveState.Idle);
      }
    });
  }, { name: 'posedge_clk', module: $m });

  createEdgeEffect(() => clk(), 'posedge', () => {
    deferredBatch(() => {
      setCycle((cycle() + 1));
    });
  }, { name: 'posedge_clk', module: $m });

  createEffect(() => {
    const __ok = !(bus_request() && bus_ack());
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '!(bus_request && bus_ack)',
        module: $m,
        values: { bus_request: bus_request(), bus_ack: bus_ack() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createTemporalAssert(
    () => bus_request(),
    'eventually',
    () => bus_grant(),
    { name: 'posedge(bus_request) eventually(bus_grant) within 5', module: $m, duration: 5 }
  );

  createTemporalAssert(
    () => bus_valid(),
    'eventually',
    () => bus_ack(),
    { name: 'posedge(bus_valid) eventually(bus_ack) within 10', module: $m, duration: 10 }
  );

  createTemporalAssert(
    () => bus_busy(),
    'always',
    () => bus_grant(),
    { name: 'posedge(bus_busy) always(bus_grant) within 3', module: $m, duration: 3 }
  );

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'bus-protocol');
  const el1 = document.createElement('h2');
  const txt0 = document.createTextNode('SPI Bus Protocol Simulator');
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('p');
  el2.setAttribute('class', 'bus-subtitle');
  const txt1 = document.createTextNode('Clock-driven FSMs with delta cycle synchronization');
  el2.appendChild(txt1);
  el0.appendChild(el2);
  const el3 = document.createElement('div');
  el3.setAttribute('class', 'bus-status-row');
  const el4 = document.createElement('div');
  el4.setAttribute('class', 'bus-device');
  const el5 = document.createElement('h3');
  const txt2 = document.createTextNode('Master');
  el5.appendChild(txt2);
  el4.appendChild(el5);
  const el6 = document.createElement('span');
  el6.setAttribute('class', 'bus-state');
  const txt3 = document.createTextNode('');
  createEffect(() => { txt3.data = String(masterStateLabel()); }, { name: 'view:masterStateLabel', module: $m, viewTarget: { element: 'span.bus-state', binding: 'text' } });
  el6.appendChild(txt3);
  el4.appendChild(el6);
  const el7 = document.createElement('p');
  const txt4 = document.createTextNode('TX count:');
  el7.appendChild(txt4);
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String(tx_count()); }, { name: 'view:tx_count', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el7.appendChild(txt5);
  el4.appendChild(el7);
  el3.appendChild(el4);
  const el8 = document.createElement('div');
  el8.setAttribute('class', 'bus-signals');
  const el9 = document.createElement('h3');
  const txt6 = document.createTextNode('Bus');
  el9.appendChild(txt6);
  el8.appendChild(el9);
  const el10 = document.createElement('p');
  const txt7 = document.createTextNode('REQ:');
  el10.appendChild(txt7);
  const txt8 = document.createTextNode('');
  createEffect(() => { txt8.data = String((bus_request() ? "1" : "0")); }, { name: 'view:bus_request', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el10.appendChild(txt8);
  const txt9 = document.createTextNode('| GNT:');
  el10.appendChild(txt9);
  const txt10 = document.createTextNode('');
  createEffect(() => { txt10.data = String((bus_grant() ? "1" : "0")); }, { name: 'view:bus_grant', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el10.appendChild(txt10);
  el8.appendChild(el10);
  const el11 = document.createElement('p');
  const txt11 = document.createTextNode('DATA:');
  el11.appendChild(txt11);
  const txt12 = document.createTextNode('');
  createEffect(() => { txt12.data = String(bus_data()); }, { name: 'view:bus_data', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el11.appendChild(txt12);
  const txt13 = document.createTextNode('| VALID:');
  el11.appendChild(txt13);
  const txt14 = document.createTextNode('');
  createEffect(() => { txt14.data = String((bus_valid() ? "1" : "0")); }, { name: 'view:bus_valid', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el11.appendChild(txt14);
  el8.appendChild(el11);
  const el12 = document.createElement('p');
  const txt15 = document.createTextNode('ACK:');
  el12.appendChild(txt15);
  const txt16 = document.createTextNode('');
  createEffect(() => { txt16.data = String((bus_ack() ? "1" : "0")); }, { name: 'view:bus_ack', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el12.appendChild(txt16);
  const txt17 = document.createTextNode('| BUSY:');
  el12.appendChild(txt17);
  const txt18 = document.createTextNode('');
  createEffect(() => { txt18.data = String((bus_busy() ? "1" : "0")); }, { name: 'view:bus_busy', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el12.appendChild(txt18);
  el8.appendChild(el12);
  el3.appendChild(el8);
  const el13 = document.createElement('div');
  el13.setAttribute('class', 'bus-device');
  const el14 = document.createElement('h3');
  const txt19 = document.createTextNode('Slave');
  el14.appendChild(txt19);
  el13.appendChild(el14);
  const el15 = document.createElement('span');
  el15.setAttribute('class', 'bus-state');
  const txt20 = document.createTextNode('');
  createEffect(() => { txt20.data = String(slaveStateLabel()); }, { name: 'view:slaveStateLabel', module: $m, viewTarget: { element: 'span.bus-state', binding: 'text' } });
  el15.appendChild(txt20);
  el13.appendChild(el15);
  const el16 = document.createElement('p');
  const txt21 = document.createTextNode('RX count:');
  el16.appendChild(txt21);
  const txt22 = document.createTextNode('');
  createEffect(() => { txt22.data = String(rx_count()); }, { name: 'view:rx_count', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el16.appendChild(txt22);
  el13.appendChild(el16);
  const el17 = document.createElement('p');
  const txt23 = document.createTextNode('Buffer:');
  el17.appendChild(txt23);
  const txt24 = document.createTextNode('');
  createEffect(() => { txt24.data = String(slave_buffer()); }, { name: 'view:slave_buffer', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el17.appendChild(txt24);
  el13.appendChild(el17);
  el3.appendChild(el13);
  el0.appendChild(el3);
  const el18 = document.createElement('p');
  const txt25 = document.createTextNode('Cycle:');
  el18.appendChild(txt25);
  const txt26 = document.createTextNode('');
  createEffect(() => { txt26.data = String(cycle()); }, { name: 'view:cycle', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el18.appendChild(txt26);
  const txt27 = document.createTextNode('| Transfer:');
  el18.appendChild(txt27);
  const txt28 = document.createTextNode('');
  createEffect(() => { txt28.data = String((transferActive() ? "ACTIVE" : "idle")); }, { name: 'view:transferActive', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el18.appendChild(txt28);
  const txt29 = document.createTextNode('| Health:');
  el18.appendChild(txt29);
  const txt30 = document.createTextNode('');
  createEffect(() => { txt30.data = String((protocolHealthy() ? "OK" : "VIOLATION")); }, { name: 'view:protocolHealthy', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el18.appendChild(txt30);
  el0.appendChild(el18);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'BusProtocol';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [clk, setClk] = createSignal(false, { name: 'clk', module: $m, type: 'bool' });

  const [cycle, setCycle] = createSignal(0, { name: 'cycle', module: $m, type: 'int' });

  const [bus_request, setBus_request] = createSignal(false, { name: 'bus_request', module: $m, type: 'bool' });

  const [bus_grant, setBus_grant] = createSignal(false, { name: 'bus_grant', module: $m, type: 'bool' });

  const [bus_data, setBus_data] = createSignal(0, { name: 'bus_data', module: $m, type: 'int' });

  const [bus_valid, setBus_valid] = createSignal(false, { name: 'bus_valid', module: $m, type: 'bool' });

  const [bus_ack, setBus_ack] = createSignal(false, { name: 'bus_ack', module: $m, type: 'bool' });

  const [bus_busy, setBus_busy] = createSignal(false, { name: 'bus_busy', module: $m, type: 'bool' });

  const MasterState = Object.freeze({
    Idle: 'MasterState.Idle',
    Requesting: 'MasterState.Requesting',
    Transmitting: 'MasterState.Transmitting',
    WaitAck: 'MasterState.WaitAck',
    Done: 'MasterState.Done',
  });

  const [master_state, setMaster_state] = createSignal(MasterState.Idle, { name: 'master_state', module: $m, type: 'MasterState' });

  const [master_data_idx, setMaster_data_idx] = createSignal(0, { name: 'master_data_idx', module: $m, type: 'int' });

  const [tx_count, setTx_count] = createSignal(0, { name: 'tx_count', module: $m, type: 'int' });

  const SlaveState = Object.freeze({
    Idle: 'SlaveState.Idle',
    Receiving: 'SlaveState.Receiving',
    Processing: 'SlaveState.Processing',
    Acking: 'SlaveState.Acking',
  });

  const [slave_state, setSlave_state] = createSignal(SlaveState.Idle, { name: 'slave_state', module: $m, type: 'SlaveState' });

  const [slave_buffer, setSlave_buffer] = createSignal(0, { name: 'slave_buffer', module: $m, type: 'int' });

  const [rx_count, setRx_count] = createSignal(0, { name: 'rx_count', module: $m, type: 'int' });

  const [arbiter_grant_delay, setArbiter_grant_delay] = createSignal(0, { name: 'arbiter_grant_delay', module: $m, type: 'int' });

  const masterStateLabel = createComb(() => ((master_state() == MasterState.Idle) ? "IDLE" : ((master_state() == MasterState.Requesting) ? "REQ" : ((master_state() == MasterState.Transmitting) ? "TX" : ((master_state() == MasterState.WaitAck) ? "WAIT" : "DONE")))), { name: 'masterStateLabel', module: $m, deps: ["master_state"] });

  const slaveStateLabel = createComb(() => ((slave_state() == SlaveState.Idle) ? "IDLE" : ((slave_state() == SlaveState.Receiving) ? "RX" : ((slave_state() == SlaveState.Processing) ? "PROC" : "ACK"))), { name: 'slaveStateLabel', module: $m, deps: ["slave_state"] });

  const transferActive = createComb(() => bus_busy(), { name: 'transferActive', module: $m, deps: ["bus_busy"] });

  const protocolHealthy = createComb(() => !(bus_request() && bus_ack()), { name: 'protocolHealthy', module: $m, deps: ["bus_request","bus_ack"] });

  createEffect(() => {
    const __ok = !(bus_request() && bus_ack());
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '!(bus_request && bus_ack)',
        module: $m,
        values: { bus_request: bus_request(), bus_ack: bus_ack() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createTemporalAssert(
    () => bus_request(),
    'eventually',
    () => bus_grant(),
    { name: 'posedge(bus_request) eventually(bus_grant) within 5', module: $m, duration: 5 }
  );

  createTemporalAssert(
    () => bus_valid(),
    'eventually',
    () => bus_ack(),
    { name: 'posedge(bus_valid) eventually(bus_ack) within 10', module: $m, duration: 10 }
  );

  createTemporalAssert(
    () => bus_busy(),
    'always',
    () => bus_grant(),
    { name: 'posedge(bus_busy) always(bus_grant) within 3', module: $m, duration: 3 }
  );

  return {
    signals: { clk: { get: clk, set: setClk }, cycle: { get: cycle, set: setCycle }, bus_request: { get: bus_request, set: setBus_request }, bus_grant: { get: bus_grant, set: setBus_grant }, bus_data: { get: bus_data, set: setBus_data }, bus_valid: { get: bus_valid, set: setBus_valid }, bus_ack: { get: bus_ack, set: setBus_ack }, bus_busy: { get: bus_busy, set: setBus_busy }, master_state: { get: master_state, set: setMaster_state }, master_data_idx: { get: master_data_idx, set: setMaster_data_idx }, tx_count: { get: tx_count, set: setTx_count }, slave_state: { get: slave_state, set: setSlave_state }, slave_buffer: { get: slave_buffer, set: setSlave_buffer }, rx_count: { get: rx_count, set: setRx_count }, arbiter_grant_delay: { get: arbiter_grant_delay, set: setArbiter_grant_delay } },
    combs: { masterStateLabel, slaveStateLabel, transferActive, protocolHealthy },
    dispose: __scope.dispose,
  };
}