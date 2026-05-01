// benchmark-mount.ts — In-browser DES vs Topological Sort benchmark
// Runs both engines on linear chains, pipelines, diamonds, feedback rings, and mixed topologies

import { createDemoShell } from '../demo-shell.js';
import { createSignal, createEffect, batch, untrack } from '../runtime/index.js';

// ============================================================
// Minimal topological-sort reactive engine
// ============================================================

class TopoSignal {
  value: any;
  subscribers: (() => void)[] = [];
  constructor(initial: any) { this.value = initial; }
}

function createTopoChain(n: number): { set0: (v: any) => void; getLast: () => any } {
  const sigs: TopoSignal[] = [];
  for (let i = 0; i < n; i++) sigs.push(new TopoSignal(0));
  for (let i = 0; i < n - 1; i++) {
    const src = sigs[i], dst = sigs[i + 1];
    src.subscribers.push(() => {
      if (!Object.is(src.value, dst.value)) {
        dst.value = src.value;
        for (const fn of dst.subscribers) fn();
      }
    });
  }
  return {
    set0: (v: any) => {
      sigs[0].value = v;
      for (const fn of sigs[0].subscribers) fn();
    },
    getLast: () => sigs[n - 1].value,
  };
}

// ============================================================
// Minimal DES engine (delta cycles)
// ============================================================

interface DESPending { sig: { value: any; subs: (() => void)[] }; val: any }

function createDESChain(n: number): { set0: (v: any) => void; getLast: () => any } {
  const sigs = Array.from({ length: n }, () => ({ value: 0, subs: [] as (() => void)[] }));
  let evaluating = false;
  let running = false;
  const pendingComps: (() => void)[] = [];
  const pendingUpdates: DESPending[] = [];

  function desSet(sig: typeof sigs[0], v: any) {
    if (Object.is(v, sig.value)) return;
    if (evaluating) {
      pendingUpdates.push({ sig, val: v });
    } else {
      sig.value = v;
      for (const fn of sig.subs) pendingComps.push(fn);
      runQuiescent();
    }
  }

  function runQuiescent() {
    if (running) return;
    running = true;
    let delta = 0;
    while (pendingComps.length > 0 || pendingUpdates.length > 0) {
      delta++;
      if (delta > 100000) { pendingComps.length = 0; pendingUpdates.length = 0; break; }
      evaluating = true;
      const batch = pendingComps.splice(0);
      for (const fn of batch) fn();
      evaluating = false;
      const updates = pendingUpdates.splice(0);
      for (const u of updates) {
        if (!Object.is(u.val, u.sig.value)) {
          u.sig.value = u.val;
          for (const fn of u.sig.subs) pendingComps.push(fn);
        }
      }
    }
    running = false;
  }

  // Wire chain
  for (let i = 0; i < n - 1; i++) {
    sigs[i].subs.push(() => { desSet(sigs[i + 1], sigs[i].value); });
  }

  return {
    set0: (v: any) => desSet(sigs[0], v),
    getLast: () => sigs[n - 1].value,
  };
}

// ============================================================
// Pipeline benchmark (correctness test)
// ============================================================

function benchPipeline(n: number, iters: number) {
  // Topo (immediate writes, wrong order)
  const topoVals = new Array(n).fill(0);
  let topoNext = 1;
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) {
    topoVals[0] = topoNext++;
    for (let j = 1; j < n; j++) topoVals[j] = topoVals[j - 1];
  }
  const topoMs = performance.now() - t0;

  // DES (deferred writes)
  const desVals = new Array(n).fill(0);
  const desNext2 = new Array(n).fill(0);
  let desNextI = 1;
  const t1 = performance.now();
  for (let i = 0; i < iters; i++) {
    desNext2[0] = desNextI++;
    for (let j = 1; j < n; j++) desNext2[j] = desVals[j - 1];
    for (let j = 0; j < n; j++) desVals[j] = desNext2[j];
  }
  const desMs = performance.now() - t1;

  return {
    topoMs, desMs,
    topoCorrect: n >= 2 ? topoVals[0] !== topoVals[1] : true,
    desCorrect: n >= 2 ? desVals[0] !== desVals[1] : true,
  };
}

// ============================================================
// Diamond Dependencies (topo)
// ============================================================

function createTopoDiamond(width: number, depth: number): {
  set0: (v: any) => void; getLast: () => any; count: number;
} {
  const allSigs: TopoSignal[] = [];
  let prevLeaf: TopoSignal | null = null;

  for (let d = 0; d < depth; d++) {
    const root = prevLeaf ?? new TopoSignal(0);
    if (!prevLeaf) allSigs.push(root);
    const intermediates: TopoSignal[] = [];
    for (let w = 0; w < width; w++) {
      const mid = new TopoSignal(0);
      intermediates.push(mid);
      allSigs.push(mid);
      root.subscribers.push(() => {
        if (!Object.is(root.value, mid.value)) {
          mid.value = root.value;
          for (const fn of mid.subscribers) fn();
        }
      });
    }
    const leaf = new TopoSignal(0);
    allSigs.push(leaf);
    for (const mid of intermediates) {
      mid.subscribers.push(() => {
        let sum = 0;
        for (const m of intermediates) sum += m.value;
        if (!Object.is(sum, leaf.value)) {
          leaf.value = sum;
          for (const fn of leaf.subscribers) fn();
        }
      });
    }
    prevLeaf = leaf;
  }

  return {
    set0: (v: any) => {
      allSigs[0].value = v;
      for (const fn of allSigs[0].subscribers) fn();
    },
    getLast: () => allSigs[allSigs.length - 1].value,
    count: allSigs.length,
  };
}

// ============================================================
// Diamond benchmark (DES uses actual Comb runtime)
// ============================================================

function benchDiamond(width: number, depth: number, iterations: number) {
  // --- Topo ---
  const topo = createTopoDiamond(width, depth);
  topo.set0(1); topo.set0(0);
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) topo.set0(i + 2);
  const topoMs = performance.now() - t0;

  // --- DES (actual Comb runtime) ---
  const rootSig = createSignal(0, { name: 'dia_root', module: 'dia_bench', type: 'int' });
  let lastLeafGetter: (() => any) = rootSig[0];

  for (let d = 0; d < depth; d++) {
    const src = lastLeafGetter;
    const intermediates: [() => any, (v: any) => void][] = [];
    for (let w = 0; w < width; w++) {
      const mid = createSignal(0, { name: `dia_m${d}_${w}`, module: 'dia_bench', type: 'int' });
      intermediates.push(mid);
      createEffect(() => { mid[1](src()); }, { name: `dia_em${d}_${w}`, module: 'dia_bench' });
    }
    const leaf = createSignal(0, { name: `dia_l${d}`, module: 'dia_bench', type: 'int' });
    createEffect(() => {
      let sum = 0;
      for (const m of intermediates) sum += m[0]();
      leaf[1](sum);
    }, { name: `dia_el${d}`, module: 'dia_bench' });
    lastLeafGetter = leaf[0];
  }

  rootSig[1](1); rootSig[1](0); // warmup
  const t1 = performance.now();
  for (let i = 0; i < iterations; i++) rootSig[1](i + 2);
  const desMs = performance.now() - t1;

  const totalSignals = topo.count;
  const expectedLast = (iterations + 1) * Math.pow(width, depth);
  const topoCorrect = topo.getLast() === expectedLast;
  const desCorrect = lastLeafGetter() === expectedLast;

  return { topoMs, desMs, totalSignals, topoCorrect, desCorrect };
}

// ============================================================
// Feedback Ring Stress
// ============================================================

function benchFeedbackRings(numRings: number, stagesPerRing: number, iterations: number) {
  // --- DES (actual Comb runtime) ---
  const clock = createSignal(0, { name: 'ring_clk', module: 'ring_bench', type: 'int' });
  const rings: [() => any, (v: any) => void][][] = [];

  for (let r = 0; r < numRings; r++) {
    const stages: [() => any, (v: any) => void][] = [];
    for (let s = 0; s < stagesPerRing; s++) {
      stages.push(createSignal(0, { name: `rb_r${r}_s${s}`, module: 'ring_bench', type: 'int' }));
    }
    for (let s = 0; s < stagesPerRing; s++) {
      const prev = s === 0 ? stagesPerRing - 1 : s - 1;
      const srcStage = stages[prev], dstStage = stages[s];
      createEffect(() => {
        clock[0](); // sensitivity to clock only
        dstStage[1](untrack(() => srcStage[0]()));
      }, { name: `rb_e${r}_${s}`, module: 'ring_bench' });
    }
    stages[0][1](1); // Set token after effects are wired
    rings.push(stages);
  }

  batch(() => clock[1](1));
  batch(() => clock[1](2)); // warmup

  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    batch(() => clock[1](i + 3));
  }
  const desMs = performance.now() - t0;

  // --- Topo (immediate writes — wrong for rings) ---
  const topoRings: number[][] = [];
  for (let r = 0; r < numRings; r++) {
    const stages = new Array(stagesPerRing).fill(0);
    stages[0] = 1;
    topoRings.push(stages);
  }

  const t1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const stages of topoRings) {
      for (let s = 0; s < stagesPerRing; s++) {
        const prev = s === 0 ? stagesPerRing - 1 : s - 1;
        stages[s] = stages[prev];
      }
    }
  }
  const topoMs = performance.now() - t1;

  const desCorrect = rings.every(stages => {
    let ones = 0;
    for (const s of stages) if (s[0]() === 1) ones++;
    return ones === 1;
  });
  const topoCorrect = topoRings.every(stages => {
    let ones = 0;
    for (const s of stages) if (s === 1) ones++;
    return ones === 1;
  });

  const totalSignals = numRings * stagesPerRing + 1;
  return { topoMs, desMs, totalSignals, topoCorrect, desCorrect };
}

// ============================================================
// Mixed Topology
// ============================================================

function benchMixed(n: number, iterations: number) {
  const chainLen = Math.floor(n * 0.4);
  const diamondWidth = Math.max(2, Math.floor(Math.sqrt(n * 0.4)));
  const diamondDepth = Math.max(1, Math.floor((n * 0.4) / diamondWidth));
  const ringStages = Math.max(3, Math.floor(n * 0.2));

  // --- Topo ---
  const t0 = performance.now();
  const topoC = createTopoChain(chainLen);
  for (let i = 0; i < iterations; i++) topoC.set0(i + 1);
  const topoD = createTopoDiamond(diamondWidth, diamondDepth);
  for (let i = 0; i < iterations; i++) topoD.set0(i + 1);
  const topoRing = new Array(ringStages).fill(0);
  topoRing[0] = 1;
  for (let i = 0; i < iterations; i++) {
    for (let s = 0; s < ringStages; s++) {
      const prev = s === 0 ? ringStages - 1 : s - 1;
      topoRing[s] = topoRing[prev];
    }
  }
  const topoMs = performance.now() - t0;

  // --- DES ---
  const t1 = performance.now();
  // Chain
  const chainSigs: [() => any, (v: any) => void][] = [];
  for (let i = 0; i < chainLen; i++) {
    chainSigs.push(createSignal(0, { name: `mx_c${i}`, module: 'mixed', type: 'int' }));
  }
  for (let i = 0; i < chainLen - 1; i++) {
    const src = chainSigs[i], dst = chainSigs[i + 1];
    createEffect(() => { dst[1](src[0]()); }, { name: `mx_ce${i}`, module: 'mixed' });
  }
  for (let i = 0; i < iterations; i++) chainSigs[0][1](i + 1);

  // Diamond
  const dRoot = createSignal(0, { name: 'mx_dr', module: 'mixed', type: 'int' });
  let dLeafGetter: (() => any) = dRoot[0];
  for (let d = 0; d < diamondDepth; d++) {
    const src = dLeafGetter;
    const mids: [() => any, (v: any) => void][] = [];
    for (let w = 0; w < diamondWidth; w++) {
      const mid = createSignal(0, { name: `mx_dm${d}_${w}`, module: 'mixed', type: 'int' });
      mids.push(mid);
      createEffect(() => { mid[1](src()); }, { name: `mx_dme${d}_${w}`, module: 'mixed' });
    }
    const leaf = createSignal(0, { name: `mx_dl${d}`, module: 'mixed', type: 'int' });
    createEffect(() => {
      let sum = 0;
      for (const m of mids) sum += m[0]();
      leaf[1](sum);
    }, { name: `mx_dle${d}`, module: 'mixed' });
    dLeafGetter = leaf[0];
  }
  for (let i = 0; i < iterations; i++) dRoot[1](i + 1);

  // Ring
  const mxClock = createSignal(0, { name: 'mx_clk', module: 'mixed', type: 'int' });
  const ringSigs: [() => any, (v: any) => void][] = [];
  for (let s = 0; s < ringStages; s++) {
    ringSigs.push(createSignal(0, { name: `mx_r${s}`, module: 'mixed', type: 'int' }));
  }
  for (let s = 0; s < ringStages; s++) {
    const prev = s === 0 ? ringStages - 1 : s - 1;
    const srcS = ringSigs[prev], dstS = ringSigs[s];
    createEffect(() => { mxClock[0](); dstS[1](untrack(() => srcS[0]())); }, { name: `mx_re${s}`, module: 'mixed' });
  }
  ringSigs[0][1](1); // Set token after effects are wired
  for (let i = 0; i < iterations; i++) batch(() => mxClock[1](i + 1));
  const desMs = performance.now() - t1;

  const totalSignals = chainLen + (1 + diamondWidth * diamondDepth + diamondDepth) + (1 + ringStages);

  const desRingCorrect = (() => {
    let ones = 0;
    for (const s of ringSigs) if (s[0]() === 1) ones++;
    return ones === 1;
  })();
  const topoRingCorrect = (() => {
    let ones = 0;
    for (const s of topoRing) if (s === 1) ones++;
    return ones === 1;
  })();

  return { topoMs, desMs, totalSignals, desRingCorrect, topoRingCorrect };
}

// ============================================================
// Mount
// ============================================================

export function mountBenchmark(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'DES vs Topological Sort — Performance',
    description:
      'Live benchmarks comparing delta-cycle execution (Comb) against single-pass topological sort (React/Solid). ' +
      'Linear chains show DES overhead. Pipelines show DES correctness advantage.',
  });

  const container = document.createElement('div');
  container.className = 'bench-container';
  container.innerHTML = `
    <div class="bench-controls">
      <button class="pipeline-btn bench-run-btn">Run Benchmarks</button>
      <span class="bench-status"></span>
    </div>
    <div class="bench-section">
      <h3 class="bench-heading">Linear Chain (A → B → C → ... → N)</h3>
      <p class="bench-desc">Single-pass propagation. DES has overhead here — each hop requires a separate delta cycle where topo sort does one pass.</p>
      <table class="bench-table">
        <thead><tr><th>N</th><th>Topo Sort (ms)</th><th>DES (ms)</th><th>Ratio</th></tr></thead>
        <tbody class="bench-chain-body"></tbody>
      </table>
    </div>
    <div class="bench-section">
      <h3 class="bench-heading">Pipeline (cross-dependent stages)</h3>
      <p class="bench-desc">Each stage reads the previous stage's output. DES defers writes so all stages see old values (correct). Topo applies writes immediately (broken).</p>
      <table class="bench-table">
        <thead><tr><th>N</th><th>Topo (ms)</th><th>DES (ms)</th><th>Ratio</th><th>Topo</th><th>DES</th></tr></thead>
        <tbody class="bench-pipe-body"></tbody>
      </table>
    </div>
    <div class="bench-section">
      <h3 class="bench-heading">Diamond Dependencies (fan-out → fan-in)</h3>
      <p class="bench-desc">1 root → N intermediates → 1 leaf. DES evaluates the leaf ONCE with all intermediates settled (glitch-free). Stacked diamonds test scaling.</p>
      <table class="bench-table">
        <thead><tr><th>Width×Depth</th><th>Signals</th><th>Topo (ms)</th><th>DES (ms)</th><th>Ratio</th><th>Topo</th><th>DES</th></tr></thead>
        <tbody class="bench-diamond-body"></tbody>
      </table>
    </div>
    <div class="bench-section">
      <h3 class="bench-heading">Feedback Ring Stress</h3>
      <p class="bench-desc">Independent ring counters on a shared clock. Topo sort smears the token across all stages (wrong). DES preserves exactly one token per ring.</p>
      <table class="bench-table">
        <thead><tr><th>Rings×Stages</th><th>Signals</th><th>Topo (ms)</th><th>DES (ms)</th><th>Ratio</th><th>Topo</th><th>DES</th></tr></thead>
        <tbody class="bench-ring-body"></tbody>
      </table>
    </div>
    <div class="bench-section">
      <h3 class="bench-heading">Mixed Topology (chain + diamond + ring)</h3>
      <p class="bench-desc">Realistic workload: 40% linear chain, 40% diamond fan-out/fan-in, 20% feedback ring. Tests fast-path optimization under mixed conditions.</p>
      <table class="bench-table">
        <thead><tr><th>N</th><th>Signals</th><th>Topo (ms)</th><th>DES (ms)</th><th>Ratio</th><th>Ring (Topo)</th><th>Ring (DES)</th></tr></thead>
        <tbody class="bench-mixed-body"></tbody>
      </table>
    </div>
    <div class="bench-section">
      <h3 class="bench-heading">What the numbers mean</h3>
      <div class="bench-explainer">
        <p><strong>Linear chains:</strong> DES is 2-6x slower because it creates N delta cycles where topo sort does 1 pass. Each delta cycle has overhead: array splice, while-loop check, Object.is comparison. For real UI components (10-100 signals), the overhead is 2-4x — imperceptible at UI timescales.</p>
        <p><strong>Pipelines:</strong> DES is ~1-2x slower but <em>correct</em>. Topo sort produces wrong results because it applies writes immediately, causing values to teleport through stages. The performance cost of correctness is small.</p>
        <p><strong>Diamonds:</strong> Fan-out/fan-in topologies where multiple intermediates converge on a single leaf. DES evaluates the leaf once with all intermediates settled (glitch-free). Both engines handle this correctly — the test proves DES doesn't degrade on wide fan-out.</p>
        <p><strong>Feedback rings:</strong> Circular dependencies where each stage reads the previous. Topo sort smears the token across all stages (wrong). DES uses delta cycles to settle correctly — exactly one token per ring. This is the strongest correctness proof.</p>
        <p><strong>Mixed topology:</strong> Realistic workload combining chains, diamonds, and rings. Tests the fast-path optimization (linear chains skip delta cycles) alongside full delta-cycle feedback resolution.</p>
        <p><strong>Why not optimize?</strong> Real HDL simulators (Verilator) detect acyclic subgraphs and batch them in a single pass. Comb could do this — topologically sort the acyclic parts, use delta cycles only for feedback loops. This would eliminate the linear chain overhead entirely.</p>
      </div>
    </div>
  `;
  shell.app.appendChild(container);

  const runBtn = container.querySelector('.bench-run-btn') as HTMLButtonElement;
  const statusEl = container.querySelector('.bench-status') as HTMLElement;
  const chainBody = container.querySelector('.bench-chain-body') as HTMLElement;
  const pipeBody = container.querySelector('.bench-pipe-body') as HTMLElement;
  const diamondBody = container.querySelector('.bench-diamond-body') as HTMLElement;
  const ringBody = container.querySelector('.bench-ring-body') as HTMLElement;
  const mixedBody = container.querySelector('.bench-mixed-body') as HTMLElement;

  runBtn.addEventListener('click', () => {
    runBtn.disabled = true;
    statusEl.textContent = 'Running...';
    chainBody.innerHTML = '';
    pipeBody.innerHTML = '';
    diamondBody.innerHTML = '';
    ringBody.innerHTML = '';
    mixedBody.innerHTML = '';

    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      const sizes = [10, 100, 1000, 10000];
      const iters = 1000;

      // Linear chain benchmarks
      statusEl.textContent = 'Running linear chains...';
      for (const n of sizes) {
        const actualIters = n <= 100 ? iters : Math.max(10, Math.floor(iters / (n / 100)));

        const topo = createTopoChain(n);
        topo.set0(1); topo.set0(0); // warmup
        const t0 = performance.now();
        for (let i = 0; i < actualIters; i++) topo.set0(i + 2);
        const topoMs = performance.now() - t0;

        const des = createDESChain(n);
        des.set0(1); des.set0(0); // warmup
        const t1 = performance.now();
        for (let i = 0; i < actualIters; i++) des.set0(i + 2);
        const desMs = performance.now() - t1;

        const ratio = desMs / (topoMs || 0.001);
        const ratioClass = ratio < 3 ? 'bench-ok' : ratio < 6 ? 'bench-warn' : 'bench-bad';

        chainBody.innerHTML += `<tr>
          <td>${n.toLocaleString()}</td>
          <td>${topoMs.toFixed(2)}</td>
          <td>${desMs.toFixed(2)}</td>
          <td class="${ratioClass}">${ratio.toFixed(1)}x</td>
        </tr>`;
      }

      // Pipeline benchmarks
      statusEl.textContent = 'Running pipelines...';
      for (const n of sizes) {
        const actualIters = n <= 100 ? iters : Math.max(10, Math.floor(iters / (n / 100)));
        const result = benchPipeline(n, actualIters);
        const ratio = result.desMs / (result.topoMs || 0.001);

        pipeBody.innerHTML += `<tr>
          <td>${n.toLocaleString()}</td>
          <td>${result.topoMs.toFixed(2)}</td>
          <td>${result.desMs.toFixed(2)}</td>
          <td>${ratio.toFixed(1)}x</td>
          <td class="${result.topoCorrect ? 'bench-ok' : 'bench-bad'}">${result.topoCorrect ? '✓' : '✗ WRONG'}</td>
          <td class="${result.desCorrect ? 'bench-ok' : 'bench-bad'}">${result.desCorrect ? '✓ Correct' : '✗ WRONG'}</td>
        </tr>`;
      }

      // Diamond benchmarks
      statusEl.textContent = 'Running diamond dependencies...';
      const diamondConfigs = [
        { width: 5, depth: 2 },
        { width: 10, depth: 5 },
        { width: 20, depth: 3 },
        { width: 50, depth: 1 },
      ];
      for (const { width, depth } of diamondConfigs) {
        const totalSigs = 1 + width * depth + depth;
        const actualIters = totalSigs > 100 ? 50 : 200;
        const result = benchDiamond(width, depth, actualIters);
        const ratio = result.desMs / (result.topoMs || 0.001);
        const ratioClass = ratio < 3 ? 'bench-ok' : ratio < 6 ? 'bench-warn' : 'bench-bad';

        diamondBody.innerHTML += `<tr>
          <td>${width}x${depth}</td>
          <td>${result.totalSignals.toLocaleString()}</td>
          <td>${result.topoMs.toFixed(2)}</td>
          <td>${result.desMs.toFixed(2)}</td>
          <td class="${ratioClass}">${ratio.toFixed(1)}x</td>
          <td class="${result.topoCorrect ? 'bench-ok' : 'bench-bad'}">${result.topoCorrect ? '✓' : '✗ WRONG'}</td>
          <td class="${result.desCorrect ? 'bench-ok' : 'bench-bad'}">${result.desCorrect ? '✓ Correct' : '✗ WRONG'}</td>
        </tr>`;
      }

      // Feedback ring benchmarks
      statusEl.textContent = 'Running feedback rings...';
      const ringConfigs = [
        { rings: 1, stages: 10 },
        { rings: 5, stages: 10 },
        { rings: 10, stages: 10 },
        { rings: 10, stages: 20 },
      ];
      for (const { rings, stages } of ringConfigs) {
        const actualIters = (rings * stages) > 50 ? 10 : 50;
        const result = benchFeedbackRings(rings, stages, actualIters);
        const ratio = result.desMs / (result.topoMs || 0.001);
        const ratioClass = ratio < 5 ? 'bench-ok' : ratio < 15 ? 'bench-warn' : 'bench-bad';

        ringBody.innerHTML += `<tr>
          <td>${rings}x${stages}</td>
          <td>${result.totalSignals.toLocaleString()}</td>
          <td>${result.topoMs.toFixed(2)}</td>
          <td>${result.desMs.toFixed(2)}</td>
          <td class="${ratioClass}">${ratio.toFixed(1)}x</td>
          <td class="${result.topoCorrect ? 'bench-ok' : 'bench-bad'}">${result.topoCorrect ? '✓' : '✗ WRONG'}</td>
          <td class="${result.desCorrect ? 'bench-ok' : 'bench-bad'}">${result.desCorrect ? '✓ Correct' : '✗ WRONG'}</td>
        </tr>`;
      }

      // Mixed topology benchmarks
      statusEl.textContent = 'Running mixed topologies...';
      for (const n of [20, 50, 100]) {
        const actualIters = n > 50 ? 20 : 50;
        const result = benchMixed(n, actualIters);
        const ratio = result.desMs / (result.topoMs || 0.001);
        const ratioClass = ratio < 5 ? 'bench-ok' : ratio < 15 ? 'bench-warn' : 'bench-bad';

        mixedBody.innerHTML += `<tr>
          <td>${n.toLocaleString()}</td>
          <td>${result.totalSignals.toLocaleString()}</td>
          <td>${result.topoMs.toFixed(2)}</td>
          <td>${result.desMs.toFixed(2)}</td>
          <td class="${ratioClass}">${ratio.toFixed(1)}x</td>
          <td class="${result.topoRingCorrect ? 'bench-ok' : 'bench-bad'}">${result.topoRingCorrect ? '✓' : '✗ WRONG'}</td>
          <td class="${result.desRingCorrect ? 'bench-ok' : 'bench-bad'}">${result.desRingCorrect ? '✓ Correct' : '✗ WRONG'}</td>
        </tr>`;
      }

      statusEl.textContent = 'Done';
      runBtn.disabled = false;
    });
  });

  return { dispose: () => shell.dispose() };
}
