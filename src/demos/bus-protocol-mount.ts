// bus-protocol-mount.ts — Capstone demo: SPI Bus Protocol Simulator
// Exercises: delta cycles, edge triggers, temporal assertions, waveform, __graph, coverage
// Multiple cross-dependent FSMs that REQUIRE delta cycles for correctness

import { BusProtocol, __graph } from '../generated/bus-protocol.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { renderWaveform } from '../waveform/index.js';
import { circuit, batch, coverage } from '../runtime/index.js';
import combSource from '../../examples/bus-protocol.comb?raw';

const M = 'BusProtocol';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hlComb(code: string): string {
  let h = esc(code);
  h = h.replace(/\b(module|signal|comb|always|view|input|output|enum|cell|constraint|assert|temporal|within|if|else)\b/g, '<span class="hl-kw">$1</span>');
  h = h.replace(/\b(int|bool|float|string|MasterState|SlaveState)\b/g, '<span class="hl-type">$1</span>');
  h = h.replace(/@\((posedge|negedge)\s/g, '@(<span class="hl-edge">$1</span> ');
  h = h.replace(/&lt;=/g, '<span class="hl-op">&lt;=</span>');
  h = h.replace(/(\/\/.*)/gm, '<span class="hl-cmt">$1</span>');
  h = h.replace(/(&lt;\/?[a-z][a-z0-9-]*)/gi, '<span class="hl-tag">$1</span>');
  h = h.replace(/\b(eventually|always)\(/g, '<span style="color:var(--warning);font-weight:600">$1</span>(');
  return h;
}

function hlJS(code: string): string {
  let h = esc(code);
  // Strings first (before keywords insert double-quoted class attrs that the string regex would match)
  h = h.replace(/(`[^`]*`|"[^"]*"|'[^']*')/g, '<span class=\'hl-str\'>$1</span>');
  h = h.replace(/\b(const|let|function|return|if|else|export|import|from)\b/g, '<span class=\'hl-kw\'>$1</span>');
  h = h.replace(/\b(useState|useRef|useEffect|useCallback|createSignal|createEffect|createMemo|onCleanup|batch)\b/g, '<span class=\'hl-fn\'>$1</span>');
  h = h.replace(/(\/\/.*)/gm, '<span class=\'hl-cmt\'>$1</span>');
  return h;
}

function hlSvelte(code: string): string {
  let h = esc(code);
  h = h.replace(/(`[^`]*`|"[^"]*"|'[^']*')/g, '<span class=\'hl-str\'>$1</span>');
  h = h.replace(/\b(let|const|function|if|else|export)\b/g, '<span class=\'hl-kw\'>$1</span>');
  h = h.replace(/(\$:)/g, '<span class=\'hl-edge\'>$1</span>');
  h = h.replace(/(\$state|\$derived|\$effect)/g, '<span class=\'hl-fn\'>$1</span>');
  h = h.replace(/(\/\/.*)/gm, '<span class=\'hl-cmt\'>$1</span>');
  h = h.replace(/(&#?\w+;?)?(&lt;\/?[A-Za-z][A-Za-z0-9.-]*)/g, '$1<span class=\'hl-tag\'>$2</span>');
  return h;
}

// React — apples-to-apples: attempts EVERYTHING Comb does
const REACT_CODE = `// Enums (Comb has first-class enums; React uses frozen objects)
const MasterState = Object.freeze({
  Idle: 'Idle', Requesting: 'Requesting',
  Transmitting: 'Transmitting', WaitAck: 'WaitAck', Done: 'Done',
});
const SlaveState = Object.freeze({
  Idle: 'Idle', Receiving: 'Receiving',
  Processing: 'Processing', Acking: 'Acking',
});

function BusProtocol() {
  // --- State (same as Comb signals) ---
  const [cycle, setCycle] = useState(0);
  const [masterState, setMasterState] = useState(MasterState.Idle);
  const [slaveState, setSlaveState] = useState(SlaveState.Idle);
  const [busReq, setBusReq] = useState(false);
  const [busGrant, setBusGrant] = useState(false);
  const [busData, setBusData] = useState(0);
  const [busValid, setBusValid] = useState(false);
  const [busAck, setBusAck] = useState(false);
  const [busBusy, setBusBusy] = useState(false);
  const [txCount, setTxCount] = useState(0);
  const [rxCount, setRxCount] = useState(0);
  const [slaveBuffer, setSlaveBuffer] = useState(0);
  const [dataIdx, setDataIdx] = useState(0);
  const [grantDelay, setGrantDelay] = useState(0);

  // --- Derived (same as Comb combs) ---
  const masterLabel = {Idle:'IDLE', Requesting:'REQ',
    Transmitting:'TX', WaitAck:'WAIT', Done:'DONE'}[masterState];
  const slaveLabel = {Idle:'IDLE', Receiving:'RX',
    Processing:'PROC', Acking:'ACK'}[slaveState];
  const transferActive = busBusy;
  const protocolHealthy = !(busReq && busAck);

  // --- Clock step: must manually snapshot ALL values ---
  // (Comb does this automatically via deferredBatch)
  const step = useCallback(() => {
    const old = {
      master: masterState, slave: slaveState,
      req: busReq, grant: busGrant, valid: busValid,
      ack: busAck, busy: busBusy, data: busData,
      idx: dataIdx, delay: grantDelay, cycle,
      tx: txCount, rx: rxCount,
    };

    // Master FSM
    if (old.master === MasterState.Idle
        && old.cycle % 8 === 0 && old.cycle > 0) {
      setMasterState(MasterState.Requesting);
      setBusReq(true); setDataIdx(0);
    }
    if (old.master === MasterState.Requesting && old.grant) {
      setMasterState(MasterState.Transmitting);
      setBusReq(false); setBusBusy(true);
    }
    if (old.master === MasterState.Transmitting) {
      setBusData((old.tx + 1) * 100 + old.idx);
      setBusValid(true); setDataIdx(old.idx + 1);
      if (old.idx >= 3) {
        setMasterState(MasterState.WaitAck);
        setBusValid(false);
      }
    }
    if (old.master === MasterState.WaitAck && old.ack) {
      setMasterState(MasterState.Done);
      setBusBusy(false); setTxCount(old.tx + 1);
    }
    if (old.master === MasterState.Done)
      setMasterState(MasterState.Idle);

    // Arbiter FSM
    if (old.req && !old.grant) {
      setGrantDelay(d => d + 1);
      if (old.delay >= 1) {
        setBusGrant(true); setGrantDelay(0);
      }
    }
    if (!old.req && old.grant && !old.busy)
      setBusGrant(false);

    // Slave FSM
    if (old.slave === SlaveState.Idle && old.valid) {
      setSlaveState(SlaveState.Receiving);
      setSlaveBuffer(old.data);
    }
    if (old.slave === SlaveState.Receiving) {
      setSlaveBuffer(old.data);
      if (!old.valid) setSlaveState(SlaveState.Processing);
    }
    if (old.slave === SlaveState.Processing) {
      setSlaveState(SlaveState.Acking);
      setBusAck(true); setRxCount(old.rx + 1);
    }
    if (old.slave === SlaveState.Acking) {
      setBusAck(false); setSlaveState(SlaveState.Idle);
    }
    setCycle(old.cycle + 1);
  }, [masterState, slaveState, busReq, busGrant,
      busValid, busAck, busBusy, busData, dataIdx,
      grantDelay, cycle, txCount, rxCount]);

  // --- Continuous invariant (Comb: assert always) ---
  useEffect(() => {
    if (busReq && busAck)
      console.warn('Protocol violation: req && ack');
  });

  // --- Edge detection (Comb: @(posedge x) is 1 line) ---
  const prevReq = useRef(busReq);
  useEffect(() => {
    if (!prevReq.current && busReq) { /* posedge bus_request */ }
    prevReq.current = busReq;
  }, [busReq]);

  const prevValid = useRef(busValid);
  useEffect(() => {
    if (!prevValid.current && busValid) { /* posedge bus_valid */ }
    prevValid.current = busValid;
  }, [busValid]);

  const prevBusy = useRef(busBusy);
  useEffect(() => {
    if (!prevBusy.current && busBusy) { /* posedge bus_busy */ }
    prevBusy.current = busBusy;
  }, [busBusy]);

  // --- Temporal assertions (Comb: 1 line each; React: DIY) ---
  // "after request rises, grant must follow within 1500ms"
  const reqTimerRef = useRef(null);
  useEffect(() => {
    if (!prevReq.current && busReq) {
      reqTimerRef.current = setTimeout(() => {
        if (!busGrant)
          console.warn('Temporal: req->grant timeout');
      }, 1500);
    }
    if (busGrant && reqTimerRef.current) {
      clearTimeout(reqTimerRef.current);
      reqTimerRef.current = null;
    }
  }, [busReq, busGrant]);

  // "after valid data, ack must follow within 5000ms"
  const validTimerRef = useRef(null);
  useEffect(() => {
    if (!prevValid.current && busValid) {
      validTimerRef.current = setTimeout(() => {
        if (!busAck)
          console.warn('Temporal: valid->ack timeout');
      }, 5000);
    }
    if (busAck && validTimerRef.current) {
      clearTimeout(validTimerRef.current);
      validTimerRef.current = null;
    }
  }, [busValid, busAck]);

  // "while busy, grant must stay true for 100ms"
  const busyTimerRef = useRef(null);
  useEffect(() => {
    if (!prevBusy.current && busBusy) {
      busyTimerRef.current = setTimeout(() => {
        // passed — grant held
      }, 100);
    }
    if (busBusy && !busGrant && busyTimerRef.current) {
      clearTimeout(busyTimerRef.current);
      console.warn('Temporal: busy->grant violated');
    }
  }, [busBusy, busGrant]);

  // Cleanup timers
  useEffect(() => () => {
    if (reqTimerRef.current) clearTimeout(reqTimerRef.current);
    if (validTimerRef.current) clearTimeout(validTimerRef.current);
    if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
  }, []);

  // --- View (same as Comb view) ---
  return (
    <div className="bus-protocol">
      <h2>SPI Bus Protocol Simulator</h2>
      <p className="bus-subtitle">
        Clock-driven FSMs with manual value snapshots
      </p>
      <div className="bus-status-row">
        <div className="bus-device">
          <h3>Master</h3>
          <span className="bus-state">{masterLabel}</span>
          <p>TX count: {txCount}</p>
        </div>
        <div className="bus-signals">
          <h3>Bus</h3>
          <p>REQ:{busReq?1:0} | GNT:{busGrant?1:0}</p>
          <p>DATA:{busData} | VALID:{busValid?1:0}</p>
          <p>ACK:{busAck?1:0} | BUSY:{busBusy?1:0}</p>
        </div>
        <div className="bus-device">
          <h3>Slave</h3>
          <span className="bus-state">{slaveLabel}</span>
          <p>RX count: {rxCount}</p>
          <p>Buffer: {slaveBuffer}</p>
        </div>
      </div>
      <p>Cycle:{cycle} | Transfer:{transferActive ? 'ACTIVE' : 'idle'}
         | Health:{protocolHealthy ? 'OK' : 'VIOLATION'}</p>
    </div>
  );
}`;

// SolidJS — closer to Comb's reactivity model but still needs manual snapshots
// SolidJS — apples-to-apples: attempts EVERYTHING Comb does
const SOLID_CODE = `const MasterState = Object.freeze({
  Idle: 'Idle', Requesting: 'Requesting',
  Transmitting: 'Transmitting', WaitAck: 'WaitAck', Done: 'Done',
});
const SlaveState = Object.freeze({
  Idle: 'Idle', Receiving: 'Receiving',
  Processing: 'Processing', Acking: 'Acking',
});

function BusProtocol() {
  const [cycle, setCycle] = createSignal(0);
  const [masterState, setMasterState] = createSignal(MasterState.Idle);
  const [slaveState, setSlaveState] = createSignal(SlaveState.Idle);
  const [busReq, setBusReq] = createSignal(false);
  const [busGrant, setBusGrant] = createSignal(false);
  const [busData, setBusData] = createSignal(0);
  const [busValid, setBusValid] = createSignal(false);
  const [busAck, setBusAck] = createSignal(false);
  const [busBusy, setBusBusy] = createSignal(false);
  const [txCount, setTxCount] = createSignal(0);
  const [rxCount, setRxCount] = createSignal(0);
  const [slaveBuffer, setSlaveBuffer] = createSignal(0);
  const [dataIdx, setDataIdx] = createSignal(0);
  const [grantDelay, setGrantDelay] = createSignal(0);

  // Derived (same as Comb combs)
  const masterLabel = createMemo(() =>
    ({Idle:'IDLE',Requesting:'REQ',Transmitting:'TX',
      WaitAck:'WAIT',Done:'DONE'})[masterState()]);
  const slaveLabel = createMemo(() =>
    ({Idle:'IDLE',Receiving:'RX',Processing:'PROC',
      Acking:'ACK'})[slaveState()]);
  const transferActive = createMemo(() => busBusy());
  const protocolHealthy = createMemo(() => !(busReq() && busAck()));

  // Must snapshot — batch() defers updates but reads see current
  function step() {
    batch(() => {
      const old = {
        master: masterState(), slave: slaveState(),
        req: busReq(), grant: busGrant(), valid: busValid(),
        ack: busAck(), busy: busBusy(), data: busData(),
        idx: dataIdx(), delay: grantDelay(),
        cycle: cycle(), tx: txCount(), rx: rxCount(),
      };
      if (old.master === MasterState.Idle
          && old.cycle % 8 === 0 && old.cycle > 0) {
        setMasterState(MasterState.Requesting);
        setBusReq(true); setDataIdx(0);
      }
      if (old.master === MasterState.Requesting && old.grant) {
        setMasterState(MasterState.Transmitting);
        setBusReq(false); setBusBusy(true);
      }
      if (old.master === MasterState.Transmitting) {
        setBusData((old.tx+1)*100+old.idx);
        setBusValid(true); setDataIdx(old.idx+1);
        if (old.idx >= 3) {
          setMasterState(MasterState.WaitAck);
          setBusValid(false);
        }
      }
      if (old.master === MasterState.WaitAck && old.ack) {
        setMasterState(MasterState.Done);
        setBusBusy(false); setTxCount(old.tx+1);
      }
      if (old.master === MasterState.Done)
        setMasterState(MasterState.Idle);
      if (old.req && !old.grant) {
        setGrantDelay(d=>d+1);
        if (old.delay>=1) { setBusGrant(true); setGrantDelay(0); }
      }
      if (!old.req && old.grant && !old.busy) setBusGrant(false);
      if (old.slave === SlaveState.Idle && old.valid) {
        setSlaveState(SlaveState.Receiving); setSlaveBuffer(old.data);
      }
      if (old.slave === SlaveState.Receiving) {
        setSlaveBuffer(old.data);
        if (!old.valid) setSlaveState(SlaveState.Processing);
      }
      if (old.slave === SlaveState.Processing) {
        setSlaveState(SlaveState.Acking);
        setBusAck(true); setRxCount(old.rx+1);
      }
      if (old.slave === SlaveState.Acking) {
        setBusAck(false); setSlaveState(SlaveState.Idle);
      }
      setCycle(old.cycle + 1);
    });
  }

  // Continuous invariant
  createEffect(() => {
    if (busReq() && busAck())
      console.warn('Protocol violation');
  });

  // Edge detection (Comb: 1 line; Solid: 4 lines per signal)
  let prevReq = busReq();
  createEffect(() => {
    const cur = busReq();
    if (!prevReq && cur) { /* posedge bus_request */ }
    prevReq = cur;
  });
  let prevValid = busValid();
  createEffect(() => {
    const cur = busValid();
    if (!prevValid && cur) { /* posedge bus_valid */ }
    prevValid = cur;
  });
  let prevBusy = busBusy();
  createEffect(() => {
    const cur = busBusy();
    if (!prevBusy && cur) { /* posedge bus_busy */ }
    prevBusy = cur;
  });

  // Temporal assertions: manual setTimeout + cleanup
  let reqTimer = null;
  createEffect(() => {
    const req = busReq(), grant = busGrant();
    if (!prevReq && req) {
      reqTimer = setTimeout(() => {
        if (!busGrant()) console.warn('Temporal: req->grant');
      }, 1500);
    }
    if (grant && reqTimer) { clearTimeout(reqTimer); reqTimer = null; }
  });
  let validTimer = null;
  createEffect(() => {
    const valid = busValid(), ack = busAck();
    if (!prevValid && valid) {
      validTimer = setTimeout(() => {
        if (!busAck()) console.warn('Temporal: valid->ack');
      }, 5000);
    }
    if (ack && validTimer) { clearTimeout(validTimer); validTimer = null; }
  });
  let busyTimer = null;
  createEffect(() => {
    const busy = busBusy(), grant = busGrant();
    if (!prevBusy && busy) {
      busyTimer = setTimeout(() => {}, 100);
    }
    if (busy && !grant && busyTimer) {
      clearTimeout(busyTimer);
      console.warn('Temporal: busy->grant violated');
    }
  });
  onCleanup(() => {
    if (reqTimer) clearTimeout(reqTimer);
    if (validTimer) clearTimeout(validTimer);
    if (busyTimer) clearTimeout(busyTimer);
  });

  return (
    <div class="bus-protocol">
      <h2>SPI Bus Protocol Simulator</h2>
      <p class="bus-subtitle">Clock-driven FSMs with manual snapshots</p>
      <div class="bus-status-row">
        <div class="bus-device">
          <h3>Master</h3>
          <span class="bus-state">{masterLabel()}</span>
          <p>TX count: {txCount()}</p>
        </div>
        <div class="bus-signals">
          <h3>Bus</h3>
          <p>REQ:{busReq()?1:0} | GNT:{busGrant()?1:0}</p>
          <p>DATA:{busData()} | VALID:{busValid()?1:0}</p>
          <p>ACK:{busAck()?1:0} | BUSY:{busBusy()?1:0}</p>
        </div>
        <div class="bus-device">
          <h3>Slave</h3>
          <span class="bus-state">{slaveLabel()}</span>
          <p>RX: {rxCount()} | Buf: {slaveBuffer()}</p>
        </div>
      </div>
      <p>Cycle:{cycle()} | {transferActive()?'ACTIVE':'idle'}
         | {protocolHealthy()?'OK':'VIOLATION'}</p>
    </div>
  );
}`;

// Svelte 5 — apples-to-apples: attempts EVERYTHING Comb does
const SVELTE_CODE = `<script>
  // Enums
  const MasterState = Object.freeze({
    Idle: 'Idle', Requesting: 'Requesting',
    Transmitting: 'Transmitting', WaitAck: 'WaitAck', Done: 'Done',
  });
  const SlaveState = Object.freeze({
    Idle: 'Idle', Receiving: 'Receiving',
    Processing: 'Processing', Acking: 'Acking',
  });

  let cycle = $state(0);
  let masterState = $state(MasterState.Idle);
  let slaveState = $state(SlaveState.Idle);
  let busReq = $state(false);
  let busGrant = $state(false);
  let busData = $state(0);
  let busValid = $state(false);
  let busAck = $state(false);
  let busBusy = $state(false);
  let txCount = $state(0);
  let rxCount = $state(0);
  let slaveBuffer = $state(0);
  let dataIdx = $state(0);
  let grantDelay = $state(0);

  // Derived
  let masterLabel = $derived(
    ({Idle:'IDLE',Requesting:'REQ',Transmitting:'TX',
      WaitAck:'WAIT',Done:'DONE'})[masterState]);
  let slaveLabel = $derived(
    ({Idle:'IDLE',Receiving:'RX',Processing:'PROC',
      Acking:'ACK'})[slaveState]);
  let transferActive = $derived(busBusy);
  let protocolHealthy = $derived(!(busReq && busAck));

  // Must snapshot — $state reads see current values
  function step() {
    const old = {
      master: masterState, slave: slaveState,
      req: busReq, grant: busGrant,
      valid: busValid, ack: busAck,
      busy: busBusy, data: busData,
      idx: dataIdx, delay: grantDelay,
      cycle, tx: txCount, rx: rxCount,
    };
    if (old.master===MasterState.Idle
        && old.cycle%8===0 && old.cycle>0) {
      masterState = MasterState.Requesting;
      busReq = true; dataIdx = 0;
    }
    if (old.master===MasterState.Requesting && old.grant) {
      masterState = MasterState.Transmitting;
      busReq = false; busBusy = true;
    }
    if (old.master===MasterState.Transmitting) {
      busData = (old.tx+1)*100+old.idx;
      busValid = true; dataIdx = old.idx+1;
      if (old.idx>=3) {
        masterState = MasterState.WaitAck;
        busValid = false;
      }
    }
    if (old.master===MasterState.WaitAck && old.ack) {
      masterState = MasterState.Done;
      busBusy = false; txCount = old.tx+1;
    }
    if (old.master===MasterState.Done)
      masterState = MasterState.Idle;
    if (old.req && !old.grant) {
      grantDelay++;
      if (old.delay>=1) { busGrant = true; grantDelay = 0; }
    }
    if (!old.req && old.grant && !old.busy) busGrant = false;
    if (old.slave===SlaveState.Idle && old.valid) {
      slaveState = SlaveState.Receiving;
      slaveBuffer = old.data;
    }
    if (old.slave===SlaveState.Receiving) {
      slaveBuffer = old.data;
      if (!old.valid) slaveState = SlaveState.Processing;
    }
    if (old.slave===SlaveState.Processing) {
      slaveState = SlaveState.Acking;
      busAck = true; rxCount = old.rx+1;
    }
    if (old.slave===SlaveState.Acking) {
      busAck = false; slaveState = SlaveState.Idle;
    }
    cycle = old.cycle + 1;
  }

  // Continuous invariant
  $effect(() => {
    if (busReq && busAck)
      console.warn('Protocol violation');
  });

  // Edge detection (Comb: 1 line; Svelte: 4 lines each)
  let prevReq = busReq;
  $effect(() => {
    if (!prevReq && busReq) { /* posedge */ }
    prevReq = busReq;
  });
  let prevValid = busValid;
  $effect(() => {
    if (!prevValid && busValid) { /* posedge */ }
    prevValid = busValid;
  });
  let prevBusy = busBusy;
  $effect(() => {
    if (!prevBusy && busBusy) { /* posedge */ }
    prevBusy = busBusy;
  });

  // Temporal assertions: manual setTimeout
  let reqTimer = null;
  $effect(() => {
    if (!prevReq && busReq) {
      reqTimer = setTimeout(() => {
        if (!busGrant) console.warn('Temporal: req->grant');
      }, 1500);
    }
    if (busGrant && reqTimer) {
      clearTimeout(reqTimer); reqTimer = null;
    }
  });
  let validTimer = null;
  $effect(() => {
    if (!prevValid && busValid) {
      validTimer = setTimeout(() => {
        if (!busAck) console.warn('Temporal: valid->ack');
      }, 5000);
    }
    if (busAck && validTimer) {
      clearTimeout(validTimer); validTimer = null;
    }
  });
  let busyTimer = null;
  $effect(() => {
    if (!prevBusy && busBusy) {
      busyTimer = setTimeout(() => {}, 100);
    }
    if (busBusy && !busGrant && busyTimer) {
      clearTimeout(busyTimer);
      console.warn('Temporal: busy->grant violated');
    }
  });
</script>

<div class="bus-protocol">
  <h2>SPI Bus Protocol Simulator</h2>
  <p class="bus-subtitle">Clock-driven FSMs with manual snapshots</p>
  <div class="bus-status-row">
    <div class="bus-device">
      <h3>Master</h3>
      <span class="bus-state">{masterLabel}</span>
      <p>TX count: {txCount}</p>
    </div>
    <div class="bus-signals">
      <h3>Bus</h3>
      <p>REQ:{busReq?1:0} | GNT:{busGrant?1:0}</p>
      <p>DATA:{busData} | VALID:{busValid?1:0}</p>
      <p>ACK:{busAck?1:0} | BUSY:{busBusy?1:0}</p>
    </div>
    <div class="bus-device">
      <h3>Slave</h3>
      <span class="bus-state">{slaveLabel}</span>
      <p>RX: {rxCount} | Buf: {slaveBuffer}</p>
    </div>
  </div>
  <p>Cycle:{cycle} | {transferActive?'ACTIVE':'idle'}
     | {protocolHealthy?'OK':'VIOLATION'}</p>
</div>`;

interface TabInfo { label: string; code: string; hl: (s: string) => string; color: string; note: string; }

const TABS: TabInfo[] = [
  { label: 'Comb', code: combSource, hl: hlComb, color: 'var(--success)', note: 'Compiled from .comb. Delta cycles handle cross-FSM reads automatically.' },
  { label: 'React', code: REACT_CODE, hl: hlJS, color: 'var(--event)', note: 'Same features attempted. Manual snapshots, useRef edge detection, setTimeout temporal assertions.' },
  { label: 'SolidJS', code: SOLID_CODE, hl: hlJS, color: 'var(--event)', note: 'Same features attempted. Manual snapshots inside batch(), createEffect edge detection, setTimeout temporals.' },
  { label: 'Svelte 5', code: SVELTE_CODE, hl: hlSvelte, color: 'var(--event)', note: 'Same features attempted. Manual snapshots ($state is mutable), $effect edge detection, setTimeout temporals.' },
];

export function mountBusProtocol(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'SPI Bus Protocol Simulator',
    description:
      'Three cross-dependent FSMs (Master, Arbiter, Slave) driven by a shared clock. ' +
      'Each device reads other devices\' PREVIOUS cycle outputs. Without delta cycles, ' +
      'you must manually snapshot every value before writing — forget one and you get a silent bug.',
  });

  // Live component (compiled from bus-protocol.comb)
  const componentRoot = document.createElement('div');
  componentRoot.style.cssText = 'padding: 0 16px 8px;';
  shell.app.appendChild(componentRoot);
  const component = BusProtocol(componentRoot);

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex; gap:8px; padding:0 16px 12px; align-items:center;';

  const stepBtn = document.createElement('button');
  stepBtn.className = 'pipeline-btn';
  stepBtn.textContent = 'Step (posedge clk)';

  const autoBtn = document.createElement('button');
  autoBtn.className = 'pipeline-btn';
  autoBtn.textContent = 'Auto Run';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'pipeline-btn';
  resetBtn.textContent = 'Reset';

  controls.appendChild(stepBtn);
  controls.appendChild(autoBtn);
  controls.appendChild(resetBtn);
  shell.app.appendChild(controls);

  const clkNode = circuit.getNode(`${M}.clk`);
  let autoRunInterval: ReturnType<typeof setInterval> | null = null;
  let running = false;

  function step() {
    if (clkNode?.setValue) {
      batch(() => { clkNode.setValue!(true); });
      setTimeout(() => { batch(() => { clkNode.setValue!(false); }); }, 10);
    }
  }

  stepBtn.addEventListener('click', step);
  autoBtn.addEventListener('click', () => {
    if (running) {
      if (autoRunInterval) clearInterval(autoRunInterval);
      autoRunInterval = null; running = false;
      autoBtn.textContent = 'Auto Run';
    } else {
      running = true; autoBtn.textContent = 'Stop';
      autoRunInterval = setInterval(step, 200);
    }
  });

  resetBtn.addEventListener('click', () => {
    if (autoRunInterval) clearInterval(autoRunInterval);
    autoRunInterval = null; running = false;
    autoBtn.textContent = 'Auto Run';
    // Reset all signals to initial values
    const resets: Record<string, any> = {
      clk: false, cycle: 0, bus_request: false, bus_grant: false,
      bus_data: 0, bus_valid: false, bus_ack: false, bus_busy: false,
      master_state: 0, master_data_idx: 0, tx_count: 0,
      slave_state: 0, slave_buffer: 0, rx_count: 0, arbiter_grant_delay: 0,
    };
    batch(() => {
      for (const [name, val] of Object.entries(resets)) {
        const node = circuit.getNode(`${M}.${name}`);
        if (node?.setValue) node.setValue(val);
      }
    });
  });

  // Side-by-side code comparison: Comb (left) vs selected framework (right)
  const codeSection = document.createElement('div');
  codeSection.style.cssText = 'margin: 0 16px 12px; display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--border); border-radius:8px; overflow:hidden; max-height:400px;';

  // Left: always Comb
  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = 'background:var(--bg-base); display:flex; flex-direction:column; overflow:hidden;';
  leftPanel.innerHTML = `
    <div style="padding:5px 12px; font-size:0.72rem; font-weight:600; color:var(--success); background:rgba(114,241,184,0.06); border-bottom:1px solid var(--border); flex-shrink:0; display:flex; justify-content:space-between;">
      <span>COMB</span><span style="color:var(--text-faint)">${combSource.split('\n').length} lines</span>
    </div>
    <pre style="margin:0; padding:10px; font-family:var(--mono); font-size:0.7rem; line-height:1.5; overflow:auto; flex:1;">${hlComb(combSource)}</pre>
  `;

  // Right: framework tabs + code
  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = 'background:var(--bg-base); display:flex; flex-direction:column; overflow:hidden;';

  const rightTabBar = document.createElement('div');
  rightTabBar.style.cssText = 'display:flex; gap:0; background:rgba(255,93,143,0.06); border-bottom:1px solid var(--border); flex-shrink:0;';

  const rightCode = document.createElement('pre');
  rightCode.style.cssText = 'margin:0; padding:10px; font-family:var(--mono); font-size:0.7rem; line-height:1.5; overflow:auto; flex:1;';

  const rightHeader = document.createElement('div');
  rightHeader.style.cssText = 'display:flex; justify-content:space-between; padding:0 12px; align-items:center;';

  // Only non-Comb tabs on the right
  const rightTabs = TABS.slice(1); // React, SolidJS, Svelte
  let activeRight = 0;

  function renderRight(idx: number) {
    activeRight = idx;
    const tab = rightTabs[idx];
    rightCode.innerHTML = tab.hl(tab.code);
    rightTabBar.querySelectorAll('button').forEach((btn, i) => {
      const el = btn as HTMLElement;
      el.style.color = i === idx ? 'var(--event)' : 'var(--text-faint)';
      el.style.borderBottomColor = i === idx ? 'var(--event)' : 'transparent';
    });
    // Update line count in header
    const countEl = rightPanel.querySelector('.right-line-count');
    if (countEl) countEl.textContent = `${tab.code.split('\n').length} lines`;
  }

  for (let i = 0; i < rightTabs.length; i++) {
    const btn = document.createElement('button');
    btn.textContent = rightTabs[i].label;
    btn.style.cssText = 'padding:5px 14px; background:none; border:none; cursor:pointer; font-size:0.72rem; font-weight:600; font-family:var(--sans); border-bottom:2px solid transparent; margin-bottom:-1px; transition:all 0.15s;';
    btn.addEventListener('click', () => renderRight(i));
    rightTabBar.appendChild(btn);
  }

  // Line count label
  const lineCount = document.createElement('span');
  lineCount.className = 'right-line-count';
  lineCount.style.cssText = 'font-size:0.72rem; color:var(--text-faint); padding:5px 12px;';
  rightTabBar.appendChild(lineCount);

  rightPanel.appendChild(rightTabBar);
  rightPanel.appendChild(rightCode);

  codeSection.appendChild(leftPanel);
  codeSection.appendChild(rightPanel);
  renderRight(0);
  shell.app.appendChild(codeSection);
  // (removed stale renderTab call)

  // === Coverage & Auto-Test Panel ===
  const coveragePanel = document.createElement('div');
  coveragePanel.style.cssText = 'margin:0 16px 12px; padding:12px 16px; background:var(--bg-surface); border:1px solid var(--border); border-radius:8px;';

  const coverageHeader = document.createElement('div');
  coverageHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;';
  coverageHeader.innerHTML = `<h3 style="margin:0; font-size:0.85rem; color:var(--accent-2); text-transform:uppercase; letter-spacing:1px;">Coverage &amp; Auto-Test</h3>`;

  const autoTestBtn = document.createElement('button');
  autoTestBtn.className = 'pipeline-btn';
  autoTestBtn.textContent = 'Run Auto-Test';
  coverageHeader.appendChild(autoTestBtn);
  coveragePanel.appendChild(coverageHeader);

  const coverageGrid = document.createElement('div');
  coverageGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;';
  coveragePanel.appendChild(coverageGrid);

  // Toggle coverage display
  const toggleDiv = document.createElement('div');
  toggleDiv.innerHTML = '<h4 style="margin:0 0 6px; font-size:0.72rem; color:var(--text-faint); text-transform:uppercase; letter-spacing:0.5px;">Toggle Coverage</h4>';
  const toggleBody = document.createElement('div');
  toggleBody.style.cssText = 'font-family:var(--mono); font-size:0.7rem; color:var(--text-muted);';
  toggleBody.textContent = 'Run auto-test to collect';
  toggleDiv.appendChild(toggleBody);

  // FSM transition coverage display
  const fsmDiv = document.createElement('div');
  fsmDiv.innerHTML = '<h4 style="margin:0 0 6px; font-size:0.72rem; color:var(--text-faint); text-transform:uppercase; letter-spacing:0.5px;">FSM Transitions</h4>';
  const fsmBody = document.createElement('div');
  fsmBody.style.cssText = 'font-family:var(--mono); font-size:0.7rem; color:var(--text-muted);';
  fsmBody.textContent = 'Run auto-test to collect';
  fsmDiv.appendChild(fsmBody);

  // Cross coverage display
  const crossDiv = document.createElement('div');
  crossDiv.innerHTML = '<h4 style="margin:0 0 6px; font-size:0.72rem; color:var(--text-faint); text-transform:uppercase; letter-spacing:0.5px;">Cross Coverage</h4>';
  const crossBody = document.createElement('div');
  crossBody.style.cssText = 'font-family:var(--mono); font-size:0.7rem; color:var(--text-muted);';
  crossBody.textContent = 'Run auto-test to collect';
  crossDiv.appendChild(crossBody);

  coverageGrid.appendChild(toggleDiv);
  coverageGrid.appendChild(fsmDiv);
  coverageGrid.appendChild(crossDiv);

  // Summary bar
  const summaryBar = document.createElement('div');
  summaryBar.style.cssText = 'margin-top:10px; padding:6px 10px; background:var(--bg-elevated); border-radius:4px; font-family:var(--mono); font-size:0.75rem; color:var(--text-faint); text-align:center;';
  summaryBar.textContent = 'No coverage data yet';
  coveragePanel.appendChild(summaryBar);

  // === Graph-directed coverage state ===
  // Read the graph's state space metadata to know exactly what to track
  const graph = __graph as { nodes: any[]; edges: any[]; enums?: Record<string, string[]> };

  // Find all nodes with a known finite state space (from static analysis)
  interface TrackedNode { id: string; runtimeId: string; name: string; states: string[]; valueType: string; }
  const trackedNodes: TrackedNode[] = graph.nodes
    .filter((n: any) => n.states && n.states.length > 0 && n.states.length <= 64)
    .map((n: any) => ({
      id: n.id,
      runtimeId: `${M}.${n.id}`,
      name: n.id,
      states: n.states as string[],
      valueType: n.valueType || 'unknown',
    }));

  // Find clock signals from graph (triggers for posedge sensitivity blocks)
  const clockSignals = [...new Set(
    graph.nodes
      .filter((n: any) => n.type === 'sensitivity' && n.name?.includes('posedge'))
      .flatMap((n: any) => graph.edges.filter((e: any) => e.to === n.id).map((e: any) => e.from))
  )];

  // State tracking: for each tracked node, which states have we seen?
  const seenStates = new Map<string, Set<string>>();
  const seenTransitions = new Map<string, Map<string, number>>();

  function renderCoverageResults() {
    // State coverage per tracked node
    const lines: string[] = [];
    let totalStates = 0, coveredStates = 0;
    let totalTransitions = 0, coveredTransitions = 0;

    for (const node of trackedNodes) {
      const seen = seenStates.get(node.id) ?? new Set();
      const trans = seenTransitions.get(node.id) ?? new Map();
      const covered = seen.size;
      const total = node.states.length;
      totalStates += total;
      coveredStates += covered;

      // Possible transitions = states × states (overestimate; some are impossible)
      // But we show what we actually observed
      coveredTransitions += trans.size;

      const pct = ((covered / total) * 100).toFixed(0);
      const pctColor = covered === total ? 'var(--success)' : 'var(--warning)';
      const typeLabel = node.valueType === 'bool' ? 'bool' :
                        node.valueType === 'int' ? `int(0..${node.states.length - 1})` :
                        node.valueType;

      lines.push(`<div style="margin-bottom:8px;">`);
      lines.push(`<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">`);
      lines.push(`<span style="color:var(--accent); font-weight:600;">${node.name}</span>`);
      lines.push(`<span style="color:${pctColor}; font-size:0.72rem;">${covered}/${total} states (${pct}%)</span>`);
      lines.push(`</div>`);
      lines.push(`<div style="font-size:0.65rem; color:var(--text-faint); margin-bottom:2px;">${typeLabel}</div>`);

      // State heatmap
      const stateGrid = node.states.map(s => {
        const shortName = s.includes('.') ? s.split('.').pop()! : s;
        const hit = seen.has(s);
        return `<span style="display:inline-block; padding:1px 5px; border-radius:2px; margin:1px; font-size:0.6rem; background:${hit ? 'rgba(114,241,184,0.15)' : 'var(--bg-elevated)'}; border:1px solid ${hit ? 'var(--success)' : 'var(--border)'}; color:${hit ? 'var(--success)' : 'var(--text-faint)'};">${shortName}</span>`;
      }).join('');
      lines.push(`<div>${stateGrid}</div>`);

      // Transitions
      if (trans.size > 0) {
        const transLines = [...trans.entries()].map(([t, count]) => {
          const short = t.replace(/MasterState\.|SlaveState\./g, '');
          return `<span style="color:var(--text-muted); font-size:0.6rem;">${short}<span style="color:var(--text-faint);"> \u00d7${count}</span></span>`;
        }).join(', ');
        lines.push(`<div style="margin-top:2px; line-height:1.6;">${transLines}</div>`);
      }

      lines.push(`</div>`);
    }

    // Render into the three columns
    // Split tracked nodes: enums in FSM column, bools in toggle column, ints in toggle column
    const enumNodes = trackedNodes.filter(n => !['bool', 'int'].includes(n.valueType));
    const boolNodes = trackedNodes.filter(n => n.valueType === 'bool');
    const intNodes = trackedNodes.filter(n => n.valueType === 'int');

    // Toggle column: bools + bounded ints
    const toggleItems = [...boolNodes, ...intNodes];
    toggleBody.innerHTML = toggleItems.map(node => {
      const seen = seenStates.get(node.id) ?? new Set();
      return node.states.map(s => {
        const short = s.includes('.') ? s.split('.').pop()! : s;
        const hit = seen.has(s);
        return `<span style="display:inline-block; padding:1px 5px; border-radius:2px; margin:1px; font-size:0.6rem; background:${hit ? 'rgba(114,241,184,0.15)' : 'var(--bg-elevated)'}; border:1px solid ${hit ? 'var(--success)' : 'var(--border)'}; color:${hit ? 'var(--success)' : 'var(--text-faint)'};">${node.name}=${short}</span>`;
      }).join('');
    }).join('<br>') || 'No bounded signals found in graph';

    // FSM column: enum signals with transitions
    const fsmLines: string[] = [];
    for (const node of enumNodes) {
      const seen = seenStates.get(node.id) ?? new Set();
      const trans = seenTransitions.get(node.id) ?? new Map();
      const pct = ((seen.size / node.states.length) * 100).toFixed(0);
      fsmLines.push(`<div style="color:var(--accent); font-weight:600; margin-bottom:2px;">${node.name} <span style="color:var(--text-faint); font-weight:400;">${seen.size}/${node.states.length} (${pct}%)</span></div>`);
      // State chips
      fsmLines.push(`<div style="margin-bottom:4px;">${node.states.map(s => {
        const short = s.split('.').pop()!;
        const hit = seen.has(s);
        return `<span style="display:inline-block; padding:1px 5px; border-radius:2px; margin:1px; font-size:0.6rem; background:${hit ? 'rgba(114,241,184,0.15)' : 'var(--bg-elevated)'}; border:1px solid ${hit ? 'var(--success)' : 'var(--border)'}; color:${hit ? 'var(--success)' : 'var(--text-faint)'};">${short}</span>`;
      }).join('')}</div>`);
      if (trans.size > 0) {
        for (const [t, count] of trans) {
          const short = t.replace(/MasterState\.|SlaveState\./g, '');
          fsmLines.push(`<div style="padding-left:8px; font-size:0.65rem; color:var(--text-muted);">${short} <span style="color:var(--text-faint);">\u00d7${count}</span></div>`);
        }
      }
    }
    fsmBody.innerHTML = fsmLines.join('') || 'No enum FSMs in graph';

    // Cross column: bool signal cross-product
    const nBools = boolNodeIds.length;
    const totalCombos = Math.pow(2, nBools);
    const crossSeen = seenCrossCombos.size;
    const unreachable = testComplete ? totalCombos - crossSeen : 0;
    const boolNames = boolNodeIds.map(id => id.split('.').pop()!);

    crossBody.innerHTML = `<div style="font-size:0.65rem; color:var(--text-faint); margin-bottom:4px;">${nBools} bool signals = ${totalCombos} combos</div>`;
    crossBody.innerHTML += `<div style="color:var(--accent); margin-bottom:2px;">${crossSeen} reachable${unreachable > 0 ? ` <span style="color:var(--text-faint);">| ${unreachable} unreachable</span>` : ''}</div>`;

    // Signal name header
    crossBody.innerHTML += `<div style="font-size:0.55rem; color:var(--text-faint); margin-bottom:2px; font-family:var(--mono);">${boolNames.map(n => n.substring(0, 3)).join(' ')}</div>`;

    // Mini heatmap with labels
    const miniGrid: string[] = [];
    for (let i = 0; i < totalCombos; i++) {
      const combo = i.toString(2).padStart(nBools, '0');
      const hit = seenCrossCombos.has(combo);
      const label = combo.split('').map((b, j) => `${boolNames[j]}=${b}`).join(', ');
      const bg = hit ? 'var(--success)' : (testComplete ? 'rgba(255,93,143,0.15)' : 'var(--bg-elevated)');
      const border = hit ? 'var(--success)' : (testComplete ? 'rgba(255,93,143,0.3)' : 'var(--border)');
      miniGrid.push(`<span style="display:inline-block; width:10px; height:10px; border-radius:2px; margin:1px; background:${bg}; border:1px solid ${border};" title="${label}${!hit && testComplete ? ' (unreachable)' : ''}"></span>`);
    }
    crossBody.innerHTML += `<div>${miniGrid.join('')}</div>`;

    // Summary bar
    const overallPct = totalStates > 0 ? ((coveredStates / totalStates) * 100) : 0;
    const pctColor = overallPct >= 90 ? 'var(--success)' : overallPct >= 60 ? 'var(--warning)' : 'var(--event)';
    summaryBar.innerHTML = `State coverage: <span style="color:${pctColor}; font-weight:700;">${overallPct.toFixed(1)}%</span> (${coveredStates}/${totalStates} states across ${trackedNodes.length} bounded signals) | ${coveredTransitions} transitions observed`;
  }

  // Cross coverage tracking (manual since we need bool signal values)
  const boolNodeIds = trackedNodes.filter(n => n.valueType === 'bool' && (
    graph.nodes.find((gn: any) => gn.id === n.id)?.type === 'signal'
  )).map(n => n.runtimeId);
  const seenCrossCombos = new Set<string>();
  let testComplete = false;

  autoTestBtn.addEventListener('click', () => {
    autoTestBtn.disabled = true;

    // Reset state tracking
    testComplete = false;
    seenStates.clear();
    seenTransitions.clear();
    seenCrossCombos.clear();
    for (const node of trackedNodes) {
      seenStates.set(node.id, new Set());
      seenTransitions.set(node.id, new Map());
    }

    // Initialize: record current state of all tracked nodes
    for (const node of trackedNodes) {
      const rNode = circuit.getNode(node.runtimeId);
      if (rNode?.getValue) {
        const val = String(rNode.getValue());
        seenStates.get(node.id)!.add(val);
      }
    }

    const maxCycles = 200;
    let cyclesRun = 0;
    let lastSeenCount = 0;
    let plateauCount = 0;
    const plateauThreshold = 20;

    summaryBar.innerHTML = `<span style="color:var(--accent);">Graph analysis: ${trackedNodes.length} bounded signals (${trackedNodes.reduce((s, n) => s + n.states.length, 0)} total states), driving ${clockSignals.length} clock(s)...</span>`;

    const testInterval = setInterval(() => {
      // Drive clock posedge/negedge
      if (clkNode?.setValue) {
        batch(() => { clkNode.setValue!(true); });
        setTimeout(() => { batch(() => { clkNode.setValue!(false); }); }, 5);
      }

      // Sample all tracked nodes
      for (const node of trackedNodes) {
        const rNode = circuit.getNode(node.runtimeId);
        if (!rNode?.getValue) continue;
        const val = String(rNode.getValue());
        const prevVal = coverage.getPreviousValue(node.runtimeId);

        // Record state
        seenStates.get(node.id)!.add(val);

        // Record transition
        if (prevVal !== undefined && prevVal !== val) {
          const transMap = seenTransitions.get(node.id)!;
          const key = `${prevVal}->${val}`;
          transMap.set(key, (transMap.get(key) ?? 0) + 1);
        }
        coverage.setPreviousValue(node.runtimeId, val);
      }

      // Sample bool cross coverage
      if (boolNodeIds.length > 0 && boolNodeIds.length <= 6) {
        const combo = boolNodeIds.map(id => {
          const n = circuit.getNode(id);
          return n?.getValue ? (n.getValue() ? '1' : '0') : '0';
        }).join('');
        seenCrossCombos.add(combo);
      }

      cyclesRun++;

      // Check plateau
      let currentSeen = 0;
      for (const [, s] of seenStates) currentSeen += s.size;
      currentSeen += seenCrossCombos.size;
      if (currentSeen > lastSeenCount) {
        lastSeenCount = currentSeen;
        plateauCount = 0;
      } else {
        plateauCount++;
      }

      // Live update every 5 cycles
      if (cyclesRun % 5 === 0) renderCoverageResults();

      // Check completion: all states covered?
      let allCovered = true;
      for (const node of trackedNodes) {
        if (seenStates.get(node.id)!.size < node.states.length) { allCovered = false; break; }
      }

      if (allCovered || plateauCount >= plateauThreshold || cyclesRun >= maxCycles) {
        clearInterval(testInterval);
        testComplete = true;
        renderCoverageResults();
        const reason = allCovered
          ? `\u2713 100% state coverage in ${cyclesRun} cycles`
          : plateauCount >= plateauThreshold
          ? `Plateaued after ${cyclesRun} cycles`
          : `Max ${maxCycles} cycles`;
        autoTestBtn.textContent = 'Run Auto-Test';
        autoTestBtn.disabled = false;
        summaryBar.innerHTML += `<br><span style="color:${allCovered ? 'var(--success)' : 'var(--text-faint)'}; font-size:0.7rem;">${reason}</span>`;
      }
    }, 30);
  });

  shell.app.appendChild(coveragePanel);

  // Start recording
  circuit.startRecording();

  // Waveform
  const wfDiv = document.createElement('div');
  wfDiv.style.cssText = 'height: 350px; flex-shrink: 0; border-top: 1px solid var(--border);';
  shell.app.appendChild(wfDiv);

  const wf = renderWaveform(wfDiv, circuit, [
    `${M}.clk`,
    `${M}.bus_request`,
    `${M}.bus_grant`,
    `${M}.bus_data`,
    `${M}.bus_valid`,
    `${M}.bus_ack`,
    `${M}.bus_busy`,
    `${M}.cycle`,
  ], {
    extraSignals: [
      { id: `${M}.posedge(bus_request) eventually(bus_grant) within 1500ms`, displayName: 'req\u2192grant', group: 'Assertions', type: 'assertion' },
      { id: `${M}.posedge(bus_valid) eventually(bus_ack) within 5000ms`, displayName: 'valid\u2192ack', group: 'Assertions', type: 'assertion' },
      { id: `${M}.posedge(bus_busy) always(bus_grant) within 100ms`, displayName: 'busy\u2192grant', group: 'Assertions', type: 'assertion' },
    ],
  });

  // Circuit graph
  shell.circuit.style.minHeight = '400px';
  renderCircuitGraph(shell.circuit, __graph as any, circuit);

  // Inline styles
  const style = document.createElement('style');
  style.textContent = `
    .bus-protocol { padding: 8px 0; }
    .bus-protocol h2 { margin: 0 0 4px; font-size: 1.1rem; color: var(--text); }
    .bus-subtitle { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 12px; }
    .bus-status-row {
      display: grid; grid-template-columns: 1fr 1.5fr 1fr; gap: 12px; margin-bottom: 12px;
    }
    .bus-device {
      background: rgba(110,231,249,0.04); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px 14px; text-align: center;
    }
    .bus-device h3 { margin: 0 0 6px; font-size: 0.8rem; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; }
    .bus-device p { margin: 3px 0; font-size: 0.78rem; color: var(--text-muted); font-family: var(--mono); }
    .bus-signals {
      background: rgba(167,139,250,0.04); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px 14px; text-align: center;
    }
    .bus-signals h3 { margin: 0 0 6px; font-size: 0.8rem; color: var(--accent-2); text-transform: uppercase; letter-spacing: 1px; }
    .bus-signals p { margin: 3px 0; font-size: 0.78rem; color: var(--text-muted); font-family: var(--mono); }
    .bus-state {
      display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 0.85rem; font-weight: 700;
      font-family: var(--mono); background: rgba(110,231,249,0.1); color: var(--accent); border: 1px solid var(--accent);
    }
  `;
  root.appendChild(style);

  return {
    dispose() {
      if (autoRunInterval) clearInterval(autoRunInterval);
      circuit.stopRecording();
      wf.dispose();
      component.dispose();
      shell.dispose();
      style.remove();
    },
  };
}
