// autotest.ts — Graph-directed auto-test: reads __graph to drive all bounded
// signals through their state spaces and tracks coverage automatically.
// No module-specific knowledge needed — it works for ANY compiled .comb module.

import type { CircuitGraph } from './circuit.js';
import type { StaticGraph } from '../core/graph.js';

export interface AutoTestResult {
  /** Per-signal coverage: which states were visited */
  signalCoverage: Array<{
    id: string;
    runtimeId: string;
    valueType: string;
    states: string[];
    visited: Set<string>;
  }>;
  /** Signals driven as inputs (root signals with no incoming edges) */
  inputsDriven: string[];
  /** Clock signals that were ticked */
  clocksDriven: string[];
  /** Total ticks/steps taken */
  steps: number;
  /** Overall coverage percentage */
  percentage: number;
}

/**
 * Run a graph-directed auto-test on a compiled module.
 *
 * Algorithm:
 * 1. Find all bounded signals (nodes with `states` arrays in __graph)
 * 2. Find root signals (no incoming data/write edges) — these are drivable inputs
 * 3. Find clock signals (signals that feed into posedge sensitivity blocks)
 * 4. For each root signal with finite states, set it to each state value
 * 5. After each state change, tick all clocks to propagate effects
 * 6. Track which states each bounded signal actually reached
 * 7. Return coverage report
 */
export function runAutoTest(
  graph: StaticGraph,
  circuit: CircuitGraph,
  module: string,
  options?: { onProgress?: (result: AutoTestResult) => void },
): AutoTestResult {
  const nodes = graph.nodes;
  const edges = graph.edges;

  // 1. Find bounded signals (have finite state spaces)
  const boundedNodes = nodes.filter(n => n.states && n.states.length > 0);

  // 2. Find root signals (no incoming data/write edges)
  const incomingCount = new Map<string, number>();
  for (const n of nodes) incomingCount.set(n.id, 0);
  for (const e of edges) {
    incomingCount.set(e.to, (incomingCount.get(e.to) ?? 0) + 1);
  }
  const rootSignals = nodes.filter(
    n => n.type === 'signal' && (incomingCount.get(n.id) ?? 0) === 0
  );

  // 3. Find clock signals (feed into posedge/negedge sensitivity blocks)
  const clockIds = new Set<string>();
  const sensitivityNodes = nodes.filter(
    n => n.type === 'sensitivity' && (n.name?.includes('posedge') || n.name?.includes('negedge'))
  );
  for (const sens of sensitivityNodes) {
    for (const e of edges) {
      if (e.to === sens.id) clockIds.add(e.from);
    }
  }

  // 4. Set up coverage tracking
  const signalCoverage = boundedNodes.map(n => ({
    id: n.id,
    runtimeId: `${module}.${n.id}`,
    valueType: n.valueType ?? 'unknown',
    states: n.states!,
    visited: new Set<string>(),
  }));

  let steps = 0;

  // Helper: record current state of all bounded signals
  function snapshot() {
    for (const sig of signalCoverage) {
      const node = circuit.getNode(sig.runtimeId);
      if (node?.getValue) {
        const val = String(node.getValue());
        sig.visited.add(val);
      }
    }
  }

  // Helper: tick all clocks (posedge + negedge)
  function tickClocks() {
    for (const clockId of clockIds) {
      const clockNode = circuit.getNode(`${module}.${clockId}`);
      if (clockNode?.setValue) {
        clockNode.setValue(true);
        clockNode.setValue(false);
      }
    }
    steps++;
    snapshot();
  }

  // Initial snapshot
  snapshot();

  // 5. Drive each root signal through its state space
  const inputsDriven: string[] = [];
  for (const root of rootSignals) {
    const bounded = boundedNodes.find(n => n.id === root.id);
    if (!bounded || !bounded.states) continue;

    const runtimeNode = circuit.getNode(`${module}.${root.id}`);
    if (!runtimeNode?.setValue) continue;

    inputsDriven.push(root.id);

    for (const state of bounded.states) {
      // Parse state value: "true"/"false" → boolean, "PieceType.I" → string, "0" → number
      let value: any = state;
      if (state === 'true') value = true;
      else if (state === 'false') value = false;
      else if (/^\d+$/.test(state)) value = parseInt(state, 10);

      runtimeNode.setValue(value);
      steps++;
      snapshot();

      // Tick clocks to propagate effects
      tickClocks();
    }
  }

  // 6. Extra: tick clocks a few more times to let any remaining effects settle
  for (let i = 0; i < 5; i++) {
    tickClocks();
  }

  // 7. Build result
  let totalStates = 0;
  let coveredStates = 0;
  for (const sig of signalCoverage) {
    totalStates += sig.states.length;
    coveredStates += Math.min(sig.visited.size, sig.states.length);
  }

  const result: AutoTestResult = {
    signalCoverage,
    inputsDriven,
    clocksDriven: [...clockIds],
    steps,
    percentage: totalStates > 0 ? (coveredStates / totalStates) * 100 : 0,
  };

  options?.onProgress?.(result);
  return result;
}

/**
 * Render an AutoTestResult as HTML for display in a coverage panel.
 */
export function renderAutoTestResult(result: AutoTestResult): string {
  const lines: string[] = [];

  for (const sig of result.signalCoverage) {
    const covered = Math.min(sig.visited.size, sig.states.length);
    const total = sig.states.length;
    const pct = ((covered / total) * 100).toFixed(0);
    const pctColor = covered === total ? 'var(--success)' : 'var(--warning)';

    lines.push(`<div style="margin-bottom:6px;">`);
    lines.push(`<div style="display:flex; justify-content:space-between;"><span style="color:var(--accent); font-weight:600;">${sig.id}</span><span style="color:${pctColor};">${covered}/${total} (${pct}%)</span></div>`);

    // State chips
    const chips = sig.states.map(s => {
      const short = s.includes('.') ? s.split('.').pop()! : s;
      const hit = sig.visited.has(s);
      return `<span style="display:inline-block; padding:1px 5px; border-radius:2px; margin:1px; font-size:0.6rem; background:${hit ? 'rgba(114,241,184,0.15)' : 'var(--bg-elevated)'}; border:1px solid ${hit ? 'var(--success)' : 'var(--border)'}; color:${hit ? 'var(--success)' : 'var(--text-faint)'};">${short}</span>`;
    }).join('');
    lines.push(`<div>${chips}</div>`);
    lines.push(`</div>`);
  }

  return lines.join('');
}
