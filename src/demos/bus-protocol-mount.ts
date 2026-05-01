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

// React — full apples-to-apples with JSX view
const REACT_CODE = `function BusProtocol() {
  const [cycle, setCycle] = useState(0);
  const [masterState, setMasterState] = useState('Idle');
  const [slaveState, setSlaveState] = useState('Idle');
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

  // Must snapshot ALL values before ANY writes
  // Forget one ref? Silent ordering bug.
  const step = useCallback(() => {
    const old = {
      master: masterState, slave: slaveState,
      req: busReq, grant: busGrant, valid: busValid,
      ack: busAck, busy: busBusy, data: busData,
      idx: dataIdx, delay: grantDelay, cycle, tx: txCount, rx: rxCount,
    };

    // Master FSM
    if (old.master === 'Idle' && old.cycle % 8 === 0 && old.cycle > 0) {
      setMasterState('Requesting'); setBusReq(true); setDataIdx(0);
    }
    if (old.master === 'Requesting' && old.grant) {
      setMasterState('Transmitting'); setBusReq(false); setBusBusy(true);
    }
    if (old.master === 'Transmitting') {
      setBusData((old.tx + 1) * 100 + old.idx); setBusValid(true);
      setDataIdx(old.idx + 1);
      if (old.idx >= 3) { setMasterState('WaitAck'); setBusValid(false); }
    }
    if (old.master === 'WaitAck' && old.ack) {
      setMasterState('Done'); setBusBusy(false); setTxCount(old.tx + 1);
    }
    if (old.master === 'Done') setMasterState('Idle');

    // Arbiter
    if (old.req && !old.grant) {
      setGrantDelay(d => d + 1);
      if (old.delay >= 1) { setBusGrant(true); setGrantDelay(0); }
    }
    if (!old.req && old.grant && !old.busy) setBusGrant(false);

    // Slave
    if (old.slave === 'Idle' && old.valid) {
      setSlaveState('Receiving'); setSlaveBuffer(old.data);
    }
    if (old.slave === 'Receiving') {
      setSlaveBuffer(old.data);
      if (!old.valid) setSlaveState('Processing');
    }
    if (old.slave === 'Processing') {
      setSlaveState('Acking'); setBusAck(true); setRxCount(old.rx + 1);
    }
    if (old.slave === 'Acking') { setBusAck(false); setSlaveState('Idle'); }
    setCycle(old.cycle + 1);
  }, [masterState, slaveState, busReq, busGrant,
      busValid, busAck, busBusy, busData, dataIdx,
      grantDelay, cycle, txCount, rxCount]);

  // Edge detection: manual useRef per signal
  const prevReq = useRef(busReq);
  useEffect(() => {
    if (!prevReq.current && busReq) { /* posedge */ }
    prevReq.current = busReq;
  }, [busReq]);
  const prevValid = useRef(busValid);
  useEffect(() => {
    if (!prevValid.current && busValid) { /* posedge */ }
    prevValid.current = busValid;
  }, [busValid]);

  // Temporal assertions? Not expressible in React.
  // Protocol invariant? Manual useEffect:
  useEffect(() => {
    if (busReq && busAck) console.warn('Protocol violation');
  });

  const masterLabel = masterState === 'Idle' ? 'IDLE'
    : masterState === 'Requesting' ? 'REQ'
    : masterState === 'Transmitting' ? 'TX'
    : masterState === 'WaitAck' ? 'WAIT' : 'DONE';
  const slaveLabel = slaveState === 'Idle' ? 'IDLE'
    : slaveState === 'Receiving' ? 'RX'
    : slaveState === 'Processing' ? 'PROC' : 'ACK';

  return (
    <div className="bus-protocol">
      <h2>SPI Bus Protocol Simulator</h2>
      <div className="bus-status-row">
        <div className="bus-device">
          <h3>Master</h3>
          <span className="bus-state">{masterLabel}</span>
          <p>TX count: {txCount}</p>
        </div>
        <div className="bus-signals">
          <h3>Bus</h3>
          <p>REQ:{busReq?1:0} GNT:{busGrant?1:0}</p>
          <p>DATA:{busData} VALID:{busValid?1:0}</p>
          <p>ACK:{busAck?1:0} BUSY:{busBusy?1:0}</p>
        </div>
        <div className="bus-device">
          <h3>Slave</h3>
          <span className="bus-state">{slaveLabel}</span>
          <p>RX: {rxCount} | Buf: {slaveBuffer}</p>
        </div>
      </div>
      <p>Cycle:{cycle} | {busBusy?'ACTIVE':'idle'}</p>
    </div>
  );
}`;

// SolidJS — closer to Comb's reactivity model but still needs manual snapshots
const SOLID_CODE = `function BusProtocol() {
  const [cycle, setCycle] = createSignal(0);
  const [masterState, setMasterState] = createSignal('Idle');
  const [slaveState, setSlaveState] = createSignal('Idle');
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

  // Solid batch() defers updates but reads
  // still see CURRENT values, not old ones.
  // Must snapshot manually for cross-FSM reads.
  function step() {
    batch(() => {
      const old = {
        master: masterState(), slave: slaveState(),
        req: busReq(), grant: busGrant(), valid: busValid(),
        ack: busAck(), busy: busBusy(), data: busData(),
        idx: dataIdx(), delay: grantDelay(),
        cycle: cycle(), tx: txCount(), rx: rxCount(),
      };

      // Master FSM
      if (old.master === 'Idle' && old.cycle % 8 === 0
          && old.cycle > 0) {
        setMasterState('Requesting');
        setBusReq(true); setDataIdx(0);
      }
      if (old.master === 'Requesting' && old.grant) {
        setMasterState('Transmitting');
        setBusReq(false); setBusBusy(true);
      }
      if (old.master === 'Transmitting') {
        setBusData((old.tx+1)*100+old.idx);
        setBusValid(true); setDataIdx(old.idx+1);
        if (old.idx>=3) {
          setMasterState('WaitAck');
          setBusValid(false);
        }
      }
      if (old.master==='WaitAck' && old.ack) {
        setMasterState('Done');
        setBusBusy(false); setTxCount(old.tx+1);
      }
      if (old.master==='Done') setMasterState('Idle');

      // Arbiter
      if (old.req && !old.grant) {
        setGrantDelay(d=>d+1);
        if (old.delay>=1) {
          setBusGrant(true); setGrantDelay(0);
        }
      }
      if (!old.req && old.grant && !old.busy)
        setBusGrant(false);

      // Slave
      if (old.slave==='Idle' && old.valid) {
        setSlaveState('Receiving');
        setSlaveBuffer(old.data);
      }
      if (old.slave==='Receiving') {
        setSlaveBuffer(old.data);
        if (!old.valid) setSlaveState('Processing');
      }
      if (old.slave==='Processing') {
        setSlaveState('Acking');
        setBusAck(true); setRxCount(old.rx+1);
      }
      if (old.slave==='Acking') {
        setBusAck(false); setSlaveState('Idle');
      }
      setCycle(old.cycle + 1);
    });
  }

  // Edge detection: track previous with createEffect
  let prevReq = busReq();
  createEffect(() => {
    const cur = busReq();
    if (!prevReq && cur) { /* posedge */ }
    prevReq = cur;
  });

  // Temporal assertions? Not expressible.
  // Protocol invariant:
  createEffect(() => {
    if (busReq() && busAck())
      console.warn('Protocol violation');
  });

  const masterLabel = createMemo(() =>
    ({Idle:'IDLE',Requesting:'REQ',Transmitting:'TX',
      WaitAck:'WAIT',Done:'DONE'})[masterState()]);
  const slaveLabel = createMemo(() =>
    ({Idle:'IDLE',Receiving:'RX',Processing:'PROC',
      Acking:'ACK'})[slaveState()]);

  return (
    <div class="bus-protocol">
      <h2>SPI Bus Protocol Simulator</h2>
      <div class="bus-status-row">
        <div class="bus-device">
          <h3>Master</h3>
          <span class="bus-state">{masterLabel()}</span>
          <p>TX count: {txCount()}</p>
        </div>
        <div class="bus-signals">
          <h3>Bus</h3>
          <p>REQ:{busReq()?1:0} GNT:{busGrant()?1:0}</p>
          <p>DATA:{busData()} VALID:{busValid()?1:0}</p>
          <p>ACK:{busAck()?1:0} BUSY:{busBusy()?1:0}</p>
        </div>
        <div class="bus-device">
          <h3>Slave</h3>
          <span class="bus-state">{slaveLabel()}</span>
          <p>RX: {rxCount()} | Buf: {slaveBuffer()}</p>
        </div>
      </div>
      <p>Cycle:{cycle()} | {busBusy()?'ACTIVE':'idle'}</p>
    </div>
  );
}`;

// Svelte 5 — runes syntax
const SVELTE_CODE = `<script>
  let cycle = $state(0);
  let masterState = $state('Idle');
  let slaveState = $state('Idle');
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

  // Svelte $state is mutable — reads see current
  // values during the same tick. Must snapshot
  // for cross-FSM correctness.
  function step() {
    const old = {
      master: masterState, slave: slaveState,
      req: busReq, grant: busGrant,
      valid: busValid, ack: busAck,
      busy: busBusy, data: busData,
      idx: dataIdx, delay: grantDelay,
      cycle, tx: txCount, rx: rxCount,
    };

    // Master FSM
    if (old.master==='Idle' && old.cycle%8===0
        && old.cycle>0) {
      masterState = 'Requesting';
      busReq = true; dataIdx = 0;
    }
    if (old.master==='Requesting' && old.grant) {
      masterState = 'Transmitting';
      busReq = false; busBusy = true;
    }
    if (old.master==='Transmitting') {
      busData = (old.tx+1)*100+old.idx;
      busValid = true; dataIdx = old.idx+1;
      if (old.idx>=3) {
        masterState = 'WaitAck'; busValid = false;
      }
    }
    if (old.master==='WaitAck' && old.ack) {
      masterState = 'Done';
      busBusy = false; txCount = old.tx+1;
    }
    if (old.master==='Done') masterState = 'Idle';

    // Arbiter
    if (old.req && !old.grant) {
      grantDelay++;
      if (old.delay>=1) {
        busGrant = true; grantDelay = 0;
      }
    }
    if (!old.req && old.grant && !old.busy)
      busGrant = false;

    // Slave
    if (old.slave==='Idle' && old.valid) {
      slaveState = 'Receiving';
      slaveBuffer = old.data;
    }
    if (old.slave==='Receiving') {
      slaveBuffer = old.data;
      if (!old.valid) slaveState = 'Processing';
    }
    if (old.slave==='Processing') {
      slaveState = 'Acking';
      busAck = true; rxCount = old.rx+1;
    }
    if (old.slave==='Acking') {
      busAck = false; slaveState = 'Idle';
    }
    cycle = old.cycle + 1;
  }

  // Edge detection: manual $effect + previous
  let prevReq = busReq;
  $effect(() => {
    if (!prevReq && busReq) { /* posedge */ }
    prevReq = busReq;
  });

  // Temporal assertions? Not expressible.
  $effect(() => {
    if (busReq && busAck)
      console.warn('Protocol violation');
  });

  let masterLabel = $derived(
    masterState==='Idle'?'IDLE':
    masterState==='Requesting'?'REQ':
    masterState==='Transmitting'?'TX':
    masterState==='WaitAck'?'WAIT':'DONE');
  let slaveLabel = $derived(
    slaveState==='Idle'?'IDLE':
    slaveState==='Receiving'?'RX':
    slaveState==='Processing'?'PROC':'ACK');
</script>

<div class="bus-protocol">
  <h2>SPI Bus Protocol Simulator</h2>
  <div class="bus-status-row">
    <div class="bus-device">
      <h3>Master</h3>
      <span class="bus-state">{masterLabel}</span>
      <p>TX count: {txCount}</p>
    </div>
    <div class="bus-signals">
      <h3>Bus</h3>
      <p>REQ:{busReq?1:0} GNT:{busGrant?1:0}</p>
      <p>DATA:{busData} VALID:{busValid?1:0}</p>
      <p>ACK:{busAck?1:0} BUSY:{busBusy?1:0}</p>
    </div>
    <div class="bus-device">
      <h3>Slave</h3>
      <span class="bus-state">{slaveLabel}</span>
      <p>RX: {rxCount} | Buf: {slaveBuffer}</p>
    </div>
  </div>
  <p>Cycle:{cycle} | {busBusy?'ACTIVE':'idle'}</p>
</div>`;

interface TabInfo { label: string; code: string; hl: (s: string) => string; color: string; note: string; }

const TABS: TabInfo[] = [
  { label: 'Comb', code: combSource, hl: hlComb, color: 'var(--success)', note: 'Compiled from .comb. Delta cycles handle cross-FSM reads automatically.' },
  { label: 'React', code: REACT_CODE, hl: hlJS, color: 'var(--event)', note: 'Must manually snapshot all 13 values before any writes. Temporal assertions impossible.' },
  { label: 'SolidJS', code: SOLID_CODE, hl: hlJS, color: 'var(--event)', note: 'batch() defers updates but reads see current values. Same snapshot problem.' },
  { label: 'Svelte 5', code: SVELTE_CODE, hl: hlSvelte, color: 'var(--event)', note: '$state is mutable — reads see current values in same tick. Same snapshot problem.' },
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
