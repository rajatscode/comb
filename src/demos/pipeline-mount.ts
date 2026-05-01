// pipeline-mount.ts — The demo that proves delta cycles matter
// Side-by-side code comparison (Comb vs React vs Naive JS) + live execution comparison

import { Pipeline, __graph } from '../generated/pipeline.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { renderWaveform } from '../waveform/index.js';
import { circuit, batch } from '../runtime/index.js';

const M = 'Pipeline';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hlComb(code: string): string {
  let h = esc(code);
  h = h.replace(/("[^"]*")/g, '<span class="hl-str">$1</span>');
  h = h.replace(/\b(module|signal|comb|always|view|input|output)\b/g, '<span class="hl-kw">$1</span>');
  h = h.replace(/\b(int|bool)\b/g, '<span class="hl-type">$1</span>');
  h = h.replace(/@\((posedge|negedge)\s/g, '@(<span class="hl-edge">$1</span> ');
  h = h.replace(/&lt;=/g, '<span class="hl-op">&lt;=</span>');
  h = h.replace(/(\/\/.*)/g, '<span class="hl-cmt">$1</span>');
  return h;
}

function hlJS(code: string): string {
  let h = esc(code);
  h = h.replace(/(`[^`]*`|"[^"]*"|'[^']*')/g, '<span class="hl-str">$1</span>');
  h = h.replace(/\b(const|let|function|return|if|else)\b/g, '<span class="hl-kw">$1</span>');
  h = h.replace(/\b(useState|useRef|useEffect|useCallback)\b/g, '<span class="hl-fn">$1</span>');
  h = h.replace(/(\/\/.*)/g, '<span class="hl-cmt">$1</span>');
  return h;
}

const COMB_CODE = `// 4 separate blocks, "wrong" order
// Delta cycles: ALL reads see OLD values

always @(posedge clk) {
  fetch_out <= next_instr;
  next_instr <= next_instr + 1;
}

always @(posedge clk) {
  decode_out <= fetch_out;
}

always @(posedge clk) {
  execute_out <= decode_out;
}

always @(posedge clk) {
  writeback_out <= execute_out;
}`;

const REACT_CODE = `// Must MANUALLY snapshot old values
// Forget one? Silent bug.

function step() {
  const oldFetch = fetchOut;
  const oldDecode = decodeOut;
  const oldExec = executeOut;

  setFetchOut(nextInstr);
  setNextInstr(n => n + 1);
  setDecodeOut(oldFetch);    // manual old ref
  setExecuteOut(oldDecode);  // manual old ref
  setWritebackOut(oldExec);  // manual old ref
}`;

const NAIVE_CODE = `// Same logic, same order as Comb
// No double-buffering = teleportation

function step() {
  fetch_out = next_instr;      // write
  next_instr = next_instr + 1;
  decode_out = fetch_out;      // reads NEW!
  execute_out = decode_out;    // reads NEW!
  writeback_out = execute_out; // reads NEW!
}`;

export function mountPipeline(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'Pipeline: Delta Cycles vs Immediate Assignment',
    description:
      'Same pipeline logic, three execution models. ' +
      'Comb\'s delta cycles guarantee all reads see pre-update values — ' +
      'no manual double-buffering, no order dependence.',
  });

  // --- Code comparison ---
  const codeSection = document.createElement('div');
  codeSection.className = 'pipeline-code-section';
  codeSection.innerHTML = `
    <div class="code-comparison-row">
      <div class="code-pane">
        <div class="code-pane-header" style="color: #4ae04a;">Comb <span style="color:#666; font-weight:400;">— order doesn't matter</span></div>
        <pre><code>${hlComb(COMB_CODE)}</code></pre>
      </div>
      <div class="code-pane">
        <div class="pipeline-code-tabs">
          <button class="tab active" data-tab="react">React (correct but manual)</button>
          <button class="tab" data-tab="naive">Naive JS (broken)</button>
        </div>
        <div class="pipeline-code-panels">
          <div class="panel active" data-panel="react">
            <pre><code>${hlJS(REACT_CODE)}</code></pre>
          </div>
          <div class="panel" data-panel="naive">
            <pre><code>${hlJS(NAIVE_CODE)}</code></pre>
          </div>
        </div>
      </div>
    </div>
  `;
  shell.app.appendChild(codeSection);

  // Tab switching
  codeSection.querySelectorAll('.pipeline-code-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = (tab as HTMLElement).dataset.tab!;
      codeSection.querySelectorAll('.pipeline-code-tabs .tab').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.tab === t));
      codeSection.querySelectorAll('.pipeline-code-panels .panel').forEach(p => (p as HTMLElement).classList.toggle('active', (p as HTMLElement).dataset.panel === t));
    });
  });

  // --- Controls ---
  const controls = document.createElement('div');
  controls.className = 'pipeline-controls';
  controls.innerHTML = `
    <button class="pipeline-btn pipeline-btn-step">⏱ Step (one clock cycle)</button>
    <button class="pipeline-btn pipeline-btn-auto">▶ Auto-run</button>
    <button class="pipeline-btn pipeline-btn-reset">↺ Reset</button>
  `;
  shell.app.appendChild(controls);

  // --- Live execution comparison ---
  const combSection = document.createElement('div');
  combSection.className = 'pipeline-compare';
  combSection.innerHTML = `
    <div class="pipeline-col pipeline-col-des">
      <h3 class="pipeline-heading pipeline-heading-correct">Comb (Delta Cycles) ✓</h3>
      <div class="pipeline-component"></div>
      <div class="pipeline-log"></div>
    </div>
    <div class="pipeline-col pipeline-col-naive">
      <h3 class="pipeline-heading pipeline-heading-broken">Naive JS (No Delta Cycles) ✗</h3>
      <div class="pipeline-stages-naive"></div>
      <div class="pipeline-log"></div>
    </div>
  `;
  shell.app.appendChild(combSection);

  // Mount Comb component
  const combRoot = combSection.querySelector('.pipeline-component') as HTMLElement;
  const component = Pipeline(combRoot);

  const set = (name: string, v: any) => circuit.getNode(`${M}.${name}`)?.setValue?.(v);
  const get = (name: string) => circuit.getNode(`${M}.${name}`)?.getValue?.();

  // --- Naive JS pipeline state ---
  let naive = { fetch_out: 0, decode_out: 0, execute_out: 0, writeback_out: 0, next_instr: 1, cycle: 0 };
  const naiveStages = combSection.querySelector('.pipeline-stages-naive') as HTMLElement;
  const combLog = combSection.querySelector('.pipeline-col-des .pipeline-log') as HTMLElement;
  const naiveLog = combSection.querySelector('.pipeline-col-naive .pipeline-log') as HTMLElement;

  function renderNaive() {
    const stages = [
      { name: 'Fetch', val: naive.fetch_out },
      { name: 'Decode', val: naive.decode_out },
      { name: 'Execute', val: naive.execute_out },
      { name: 'Writeback', val: naive.writeback_out },
    ];
    naiveStages.innerHTML = `
      <p class="pipeline-info">Cycle ${naive.cycle}</p>
      <div class="pipeline-stages">
        ${stages.map((s, i) =>
          `<div class="pipe-stage">` +
          `<span class="pipe-label">${s.name}</span>` +
          `<span class="pipe-val${s.val > 0 ? ' active naive-wrong' : ''}">` +
          `${s.val > 0 ? 'I' + s.val : '—'}</span></div>` +
          (i < 3 ? '<div class="pipe-arrow">→</div>' : '')
        ).join('')}
      </div>
    `;
  }
  renderNaive();

  const combHistory: string[] = [];
  const naiveHistory: string[] = [];

  function appendLog(el: HTMLElement, history: string[], entry: string) {
    history.push(entry);
    el.innerHTML = '<div class="log-title">History</div>' +
      history.map(h => `<div class="log-entry">${h}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }

  let autoInterval: ReturnType<typeof setInterval> | null = null;

  function step() {
    set('clk', true);
    set('clk', false);

    const cf = get('fetch_out');
    const cd = get('decode_out');
    const ce = get('execute_out');
    const cw = get('writeback_out');
    const cc = get('cycle');

    appendLog(combLog, combHistory,
      `Cycle ${cc}: F=I${cf || '—'} D=I${cd || '—'} E=I${ce || '—'} W=I${cw || '—'}`);

    // Naive: same assignments, same "wrong" order, immediate writes
    naive.fetch_out = naive.next_instr;
    naive.next_instr = naive.next_instr + 1;
    naive.decode_out = naive.fetch_out;       // reads NEW value — BUG
    naive.execute_out = naive.decode_out;     // reads NEW value — BUG
    naive.writeback_out = naive.execute_out;  // reads NEW value — BUG
    naive.cycle++;

    renderNaive();
    appendLog(naiveLog, naiveHistory,
      `Cycle ${naive.cycle}: F=I${naive.fetch_out || '—'} D=I${naive.decode_out || '—'} E=I${naive.execute_out || '—'} W=I${naive.writeback_out || '—'}`);
  }

  function reset() {
    if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
    autoBtn.textContent = '▶ Auto-run';
    batch(() => {
      set('clk', false);
      set('cycle', 0);
      set('fetch_out', 0);
      set('decode_out', 0);
      set('execute_out', 0);
      set('writeback_out', 0);
      set('next_instr', 1);
    });
    naive = { fetch_out: 0, decode_out: 0, execute_out: 0, writeback_out: 0, next_instr: 1, cycle: 0 };
    renderNaive();
    combHistory.length = 0;
    naiveHistory.length = 0;
    combLog.innerHTML = '';
    naiveLog.innerHTML = '';
  }

  const stepBtn = controls.querySelector('.pipeline-btn-step') as HTMLButtonElement;
  const autoBtn = controls.querySelector('.pipeline-btn-auto') as HTMLButtonElement;
  const resetBtn = controls.querySelector('.pipeline-btn-reset') as HTMLButtonElement;

  stepBtn.addEventListener('click', step);
  resetBtn.addEventListener('click', reset);
  autoBtn.addEventListener('click', () => {
    if (autoInterval) {
      clearInterval(autoInterval);
      autoInterval = null;
      autoBtn.textContent = '▶ Auto-run';
    } else {
      autoInterval = setInterval(step, 800);
      autoBtn.textContent = '⏸ Pause';
    }
  });

  // Waveform
  circuit.startRecording();
  const wfDiv = document.createElement('div');
  wfDiv.style.maxHeight = '160px';
  wfDiv.style.overflow = 'hidden';
  shell.app.appendChild(wfDiv);
  const wf = renderWaveform(wfDiv, circuit, [
    `${M}.fetch_out`, `${M}.decode_out`, `${M}.execute_out`, `${M}.writeback_out`
  ]);

  // Circuit graph
  renderCircuitGraph(shell.circuit, __graph as any, circuit);

  return {
    dispose() {
      if (autoInterval) clearInterval(autoInterval);
      circuit.stopRecording();
      wf.dispose();
      component.dispose();
      shell.dispose();
    }
  };
}
