// ring-mount.ts — Ring counter: token rotates around a feedback loop
// The pipeline demo proved delta cycles work for feed-forward chains.
// This demo proves they work for FEEDBACK LOOPS — the harder case.

import { Ring, __graph } from '../generated/ring.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { renderWaveform } from '../waveform/index.js';
import { circuit, batch } from '../runtime/index.js';

const M = 'Ring';
const N = 6; // number of stages

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function hlComb(code: string): string {
  let h = esc(code);
  h = h.replace(/("[^"]*")/g, '<span class="hl-str">$1</span>');
  h = h.replace(/\b(module|signal|comb|always|view)\b/g, '<span class="hl-kw">$1</span>');
  h = h.replace(/\b(int|bool)\b/g, '<span class="hl-type">$1</span>');
  h = h.replace(/@\((posedge)\s/g, '@(<span class="hl-edge">$1</span> ');
  h = h.replace(/&lt;=/g, '<span class="hl-op">&lt;=</span>');
  h = h.replace(/(\/\/.*)/g, '<span class="hl-cmt">$1</span>');
  return h;
}
function hlJS(code: string): string {
  let h = esc(code);
  h = h.replace(/\b(function|let|for)\b/g, '<span class="hl-kw">$1</span>');
  h = h.replace(/(\/\/.*)/g, '<span class="hl-cmt">$1</span>');
  return h;
}

const COMB_CODE = `// Ring: last stage feeds back to first
// Delta cycles: ALL reads see OLD values
// Token rotates one position per tick

always @(posedge clk) { s0 <= s5; }  // feedback!
always @(posedge clk) { s1 <= s0; }
always @(posedge clk) { s2 <= s1; }
always @(posedge clk) { s3 <= s2; }
always @(posedge clk) { s4 <= s3; }
always @(posedge clk) { s5 <= s4; }`;

const NAIVE_CODE = `// Same assignments, same order
// No deferred writes — token vanishes

function step() {
  s[0] = s[5];  // reads OLD s5 (0) — OK
  s[1] = s[0];  // reads NEW s0 (0) — BUG
  s[2] = s[1];  // reads NEW s1 (0) — BUG
  // ... token is gone
}`;

export function mountRing(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'Ring Counter: Feedback Loops Need Delta Cycles',
    description:
      'A token circulates around a 6-stage ring. The last stage feeds back to the first — a feedback loop. ' +
      'With delta cycles, the token rotates one position per tick. Without, the token vanishes on the first tick.',
  });

  // --- Code comparison ---
  const codeSection = document.createElement('div');
  codeSection.className = 'pipeline-code-section';
  codeSection.innerHTML = `
    <div class="code-comparison-row">
      <div class="code-pane">
        <div class="code-pane-header" style="color: #4ae04a;">Comb <span style="color:#666; font-weight:400;">— feedback loop, correct</span></div>
        <pre><code>${hlComb(COMB_CODE)}</code></pre>
      </div>
      <div class="code-pane">
        <div class="code-pane-header" style="color: #ff4444;">Naive JS <span style="color:#666; font-weight:400;">— token vanishes</span></div>
        <pre><code>${hlJS(NAIVE_CODE)}</code></pre>
      </div>
    </div>
  `;
  shell.app.appendChild(codeSection);

  // --- Controls ---
  const controls = document.createElement('div');
  controls.className = 'pipeline-controls';
  controls.innerHTML = `
    <button class="pipeline-btn pipeline-btn-step">⏱ Step</button>
    <button class="pipeline-btn pipeline-btn-auto">▶ Auto-run</button>
    <button class="pipeline-btn pipeline-btn-reset">↺ Reset</button>
  `;
  shell.app.appendChild(controls);

  // --- Live execution ---
  const liveSection = document.createElement('div');
  liveSection.className = 'pipeline-compare';
  liveSection.innerHTML = `
    <div class="pipeline-col pipeline-col-des">
      <h3 class="pipeline-heading pipeline-heading-correct">Comb (Delta Cycles) ✓</h3>
      <div class="ring-component"></div>
      <div class="pipeline-log"></div>
    </div>
    <div class="pipeline-col pipeline-col-naive">
      <h3 class="pipeline-heading pipeline-heading-broken">Naive JS ✗</h3>
      <div class="ring-naive"></div>
      <div class="pipeline-log"></div>
    </div>
  `;
  shell.app.appendChild(liveSection);

  // Mount Comb component
  const combRoot = liveSection.querySelector('.ring-component') as HTMLElement;
  const component = Ring(combRoot);

  const set = (name: string, v: any) => circuit.getNode(`${M}.${name}`)?.setValue?.(v);
  const get = (name: string) => circuit.getNode(`${M}.${name}`)?.getValue?.();

  // Naive state
  let naive = [1, 0, 0, 0, 0, 0];
  let naiveCycle = 0;
  const naiveEl = liveSection.querySelector('.ring-naive') as HTMLElement;
  const combLog = liveSection.querySelector('.pipeline-col-des .pipeline-log') as HTMLElement;
  const naiveLog = liveSection.querySelector('.pipeline-col-naive .pipeline-log') as HTMLElement;

  function renderNaive() {
    naiveEl.innerHTML = `
      <p class="ring-info">Cycle ${naiveCycle}</p>
      <div class="ring-nodes">
        ${naive.map((v, i) =>
          `<div class="ring-node${v > 0 ? ' active naive-wrong' : ''}">${v > 0 ? '●' : '○'}</div>` +
          (i < 5 ? '<div class="ring-arrow">→</div>' : '<div class="ring-arrow">↩</div>')
        ).join('')}
      </div>
    `;
  }
  renderNaive();

  const combHistory: string[] = [];
  const naiveHistory: string[] = [];

  function appendLog(el: HTMLElement, history: string[], entry: string) {
    history.push(entry);
    if (history.length > 20) history.shift();
    el.innerHTML = '<div class="log-title">History</div>' +
      history.map(h => `<div class="log-entry">${h}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }

  let autoInterval: ReturnType<typeof setInterval> | null = null;

  function step() {
    // Comb: pulse clock
    set('clk', true);
    set('clk', false);

    const vals = [];
    for (let i = 0; i < N; i++) vals.push(get(`s${i}`));
    const cc = get('cycle');
    appendLog(combLog, combHistory, `Cycle ${cc}: [${vals.map(v => v > 0 ? '●' : '○').join(' ')}]`);

    // Naive: same order, immediate writes
    const old5 = naive[5]; // only this one gets the old value
    naive[0] = old5;           // reads old s5 — accidentally correct
    naive[1] = naive[0];       // reads NEW s0 — BUG
    naive[2] = naive[1];       // reads NEW s1 — BUG
    naive[3] = naive[2];       // reads NEW s2 — BUG
    naive[4] = naive[3];       // reads NEW s3 — BUG
    naive[5] = naive[4];       // reads NEW s4 — BUG
    naiveCycle++;
    renderNaive();
    appendLog(naiveLog, naiveHistory, `Cycle ${naiveCycle}: [${naive.map(v => v > 0 ? '●' : '○').join(' ')}]`);
  }

  function reset() {
    if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
    (controls.querySelector('.pipeline-btn-auto') as HTMLButtonElement).textContent = '▶ Auto-run';
    batch(() => {
      set('clk', false); set('cycle', 0);
      set('s0', 1); set('s1', 0); set('s2', 0);
      set('s3', 0); set('s4', 0); set('s5', 0);
    });
    naive = [1, 0, 0, 0, 0, 0]; naiveCycle = 0;
    renderNaive();
    combHistory.length = 0; naiveHistory.length = 0;
    combLog.innerHTML = ''; naiveLog.innerHTML = '';
  }

  controls.querySelector('.pipeline-btn-step')!.addEventListener('click', step);
  controls.querySelector('.pipeline-btn-reset')!.addEventListener('click', reset);
  const autoBtn = controls.querySelector('.pipeline-btn-auto') as HTMLButtonElement;
  autoBtn.addEventListener('click', () => {
    if (autoInterval) {
      clearInterval(autoInterval); autoInterval = null;
      autoBtn.textContent = '▶ Auto-run';
    } else {
      autoInterval = setInterval(step, 600);
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
    `${M}.s0`, `${M}.s1`, `${M}.s2`, `${M}.s3`, `${M}.s4`, `${M}.s5`
  ]);

  renderCircuitGraph(shell.circuit, __graph as any, circuit);

  return {
    dispose() {
      if (autoInterval) clearInterval(autoInterval);
      circuit.stopRecording(); wf.dispose();
      component.dispose(); shell.dispose();
    }
  };
}
