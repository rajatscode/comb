// dashboard-diff-mount.ts — Dashboard Diff: regression detection demo
// Shows how __graph diff catches subtle bugs from a "clean" refactoring

import { CircuitGraph } from '../runtime/circuit.js';
import { renderCircuitGraph } from '../visualizer.js';
import type { StaticGraph } from '../core/graph.js';

const v1Source = `module Dashboard {
  signal cpu = 0.0;
  signal memory = 0.0;
  signal disk = 0.0;
  signal network = 0.0;

  signal cpuThreshold = 80.0;
  signal memThreshold = 90.0;

  comb cpuUsage = round(cpu);       // derived from cpu
  comb memUsage = round(memory);

  comb cpuAlert = cpuUsage > cpuThreshold;
  comb memAlert = memUsage > memThreshold;

  comb systemStatus = cpuAlert || memAlert
    ? "ALERT" : "OK";               // checks BOTH alerts

  comb avgLoad = (cpu + memory + disk + network) / 4.0;
  comb loadLevel = avgLoad > 75.0 ? "high"
    : avgLoad > 50.0 ? "medium" : "low";

  comb alertCount = (cpuAlert ? 1 : 0)
    + (memAlert ? 1 : 0);           // counts active alerts

  always @(posedge cpuAlert) { ... }
  always @(posedge memAlert) { ... }
  view { ... }
}`;

const v2Source = `module Dashboard {
  signal cpu = 0.0;
  signal memory = 0.0;
  signal disk = 0.0;
  signal network = 0.0;

  signal cpuThreshold = 80.0;
  signal memThreshold = 90.0;

  signal cpuUsage = 0.0;            // BUG: now independent
  comb memUsage = round(memory);

  comb cpuAlert = cpuUsage > cpuThreshold;
  comb memAlert = memUsage > memThreshold;

  comb systemStatus = memAlert      // BUG: dropped cpuAlert
    ? "ALERT" : "OK";

  comb avgLoad = (cpu + memory + disk + network) / 4.0;
  comb loadLevel = avgLoad > 75.0 ? "high"
    : avgLoad > 50.0 ? "medium" : "low";

  // BUG: alertCount removed entirely

  always @(posedge cpuAlert) { ... }
  always @(posedge memAlert) { ... }
  view { ... }
}`;

export function mountDashboardDiff(root: HTMLElement): { dispose: () => void } {
  root.style.display = 'flex';
  root.style.flexDirection = 'column';

  const disposers: (() => void)[] = [];

  const loadAndRender = async () => {
    const modA = await import('../generated/dashboard-v1.js');
    const modB = await import('../generated/dashboard-v2.js');
    const graphA = modA.__graph as StaticGraph;
    const graphB = modB.__graph as StaticGraph;

    const diff = CircuitGraph.diffGraphs(graphA, graphB);

    // Build highlight sets
    const addedIds = new Set(diff.addedNodes.map(n => n.id));
    const removedIds = new Set(diff.removedNodes.map(n => n.id));
    const changedIds = new Set(diff.changedNodes.map(n => n.id));

    // Explanation panel
    const explanation = document.createElement('div');
    explanation.className = 'diff-explanation';
    explanation.innerHTML = `
      <h2>Regression Detection: Dashboard Refactoring</h2>
      <p class="diff-subtitle">A refactoring that compiles clean and runs without errors — but silently breaks three things.</p>
      <div class="regression-list">
        <div class="regression-item regression-critical">
          <strong>1. Broken dependency:</strong> <code>cpuUsage</code> changed from <code>comb</code> (derived from <code>cpu</code>) to <code>signal</code> (independent).
          CPU usage will never update when CPU input changes.
        </div>
        <div class="regression-item regression-critical">
          <strong>2. Dropped check:</strong> <code>systemStatus</code> no longer checks <code>cpuAlert</code>.
          CPU alerts are silently ignored — the dashboard shows "OK" even when CPU is critical.
        </div>
        <div class="regression-item regression-warning">
          <strong>3. Removed node:</strong> <code>alertCount</code> was deleted.
          Any downstream consumer of alert counts (UI, logging, API) is now broken.
        </div>
      </div>
      <p class="diff-punchline">The <code>__graph</code> diff catches all three. No test suite required — it's a structural comparison of the reactive topology.</p>
    `;
    root.appendChild(explanation);

    // Diff summary
    const summary = document.createElement('div');
    summary.className = 'diff-summary';
    const safetyLabel = diff.removedNodes.length === 0 && diff.changedNodes.length === 0
      ? '<span class="safe">SAFE</span>'
      : diff.removedNodes.length > 0
      ? '<span class="breaking">BREAKING</span>'
      : '<span class="caution">CAUTION</span>';
    summary.innerHTML = `
      <div class="diff-stats">
        <span class="stat added">+${diff.addedNodes.length} nodes</span>
        <span class="stat changed">~${diff.changedNodes.length} changed</span>
        <span class="stat removed">-${diff.removedNodes.length} removed</span>
        <span class="stat edges">+${diff.addedEdges.length}/-${diff.removedEdges.length} edges</span>
        <span class="stat topology">Topology: ${safetyLabel}</span>
      </div>
    `;
    root.appendChild(summary);

    // Side-by-side circuit graphs
    const graphRow = document.createElement('div');
    graphRow.className = 'diff-graphs';

    const leftPane = document.createElement('div');
    leftPane.className = 'diff-pane';
    const leftLabel = document.createElement('div');
    leftLabel.className = 'diff-label';
    leftLabel.innerHTML = '<span class="version">v1</span> dashboard-v1.comb';
    leftPane.appendChild(leftLabel);
    const leftGraph = document.createElement('div');
    leftGraph.className = 'diff-graph-container';
    leftPane.appendChild(leftGraph);

    const rightPane = document.createElement('div');
    rightPane.className = 'diff-pane';
    const rightLabel = document.createElement('div');
    rightLabel.className = 'diff-label';
    rightLabel.innerHTML = '<span class="version">v2</span> dashboard-v2.comb';
    rightPane.appendChild(rightLabel);
    const rightGraph = document.createElement('div');
    rightGraph.className = 'diff-graph-container';
    rightPane.appendChild(rightGraph);

    graphRow.appendChild(leftPane);
    graphRow.appendChild(rightPane);
    root.appendChild(graphRow);

    // Source panels
    const sourceRow = document.createElement('div');
    sourceRow.className = 'diff-sources';

    const leftSource = document.createElement('div');
    leftSource.className = 'diff-source';
    leftSource.innerHTML = `<pre>${highlightSyntax(v1Source)}</pre>`;

    const rightSource = document.createElement('div');
    rightSource.className = 'diff-source';
    rightSource.innerHTML = `<pre>${highlightSyntax(v2Source)}</pre>`;

    sourceRow.appendChild(leftSource);
    sourceRow.appendChild(rightSource);
    root.appendChild(sourceRow);

    // Force reflow so graph containers have final flex dimensions
    void leftGraph.offsetHeight;

    // Render graphs with highlights
    const leftVis = renderCircuitGraph(leftGraph, graphA, undefined, { removed: removedIds });
    const rightVis = renderCircuitGraph(rightGraph, graphB, undefined, { added: addedIds, changed: changedIds });
    disposers.push(leftVis.dispose, rightVis.dispose);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'diff-legend';
    legend.innerHTML = `
      <span class="legend-item"><span class="swatch added"></span> Added</span>
      <span class="legend-item"><span class="swatch changed"></span> Changed</span>
      <span class="legend-item"><span class="swatch removed"></span> Removed</span>
      <span class="legend-item"><span class="swatch unchanged"></span> Unchanged</span>
    `;
    summary.appendChild(legend);
  };

  loadAndRender();

  return {
    dispose: () => { disposers.forEach(d => d()); },
  };
}

function highlightSyntax(source: string): string {
  let html = source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/(\/\/.*$)|("[^"]*")|(BUG:)|\b(module|signal|comb|always|view|enum|assert)\b|\b(string|int|bool|float)\b/gm,
    (match, comment, str, bug, keyword, type) => {
      if (comment) return `<span class="hl-comment">${comment}</span>`;
      if (str) return `<span class="hl-string">${str}</span>`;
      if (bug) return `<span class="hl-added">${bug}</span>`;
      if (keyword) return `<span class="hl-keyword">${keyword}</span>`;
      if (type) return `<span class="hl-type">${type}</span>`;
      return match;
    });
  return html;
}
