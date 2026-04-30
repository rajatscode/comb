// circuit-diff.ts — Demo 3: Circuit Diff visualizer
// Shows side-by-side circuit graphs with diff highlights

import { CircuitGraph } from '../runtime/circuit.js';
import { renderCircuitGraph } from '../visualizer.js';
import type { StaticGraph } from '../core/graph.js';

// Source code for display
const v1Source = `module TodoApp {
  signal input: string = "";
  signal items: string = "";
  signal filter: string = "all";
  comb count = len(items);
  comb label = str(count) + " items";
  comb visible = filter == "all" ? items
    : filter == "done" ? items : items;
  always @(add) { ... }
  always @(clear) { ... }
  view { ... }
}`;

const v2Source = `module TodoApp {
  signal input: string = "";
  signal items: string = "";
  signal filter: string = "all";
  comb count = len(items);
  comb isEmpty = count == 0;        // +NEW
  comb remaining = count;            // +NEW
  comb label = str(remaining) + " remaining";
  comb visible = filter == "all" ? items
    : filter == "done" ? items : items;
  comb showClear = !isEmpty;         // +NEW
  always @(add) { ... }
  always @(clear) { ... }
  view { ... }
}`;

export function mountCircuitDiff(root: HTMLElement): { dispose: () => void } {
  root.style.display = 'flex';
  root.style.flexDirection = 'column';

  const disposers: (() => void)[] = [];
  let graphA: StaticGraph;
  let graphB: StaticGraph;

  // We need to dynamically import the compiled files
  const loadAndRender = async () => {
    const modA = await import('../generated/todo-v1.js');
    const modB = await import('../generated/todo-v2.js');
    graphA = modA.__graph as StaticGraph;
    graphB = modB.__graph as StaticGraph;

    const diff = CircuitGraph.diffGraphs(graphA, graphB);

    // Build highlight sets
    const addedIds = new Set(diff.addedNodes.map(n => n.id));
    const removedIds = new Set(diff.removedNodes.map(n => n.id));
    const changedIds = new Set(diff.changedNodes.map(n => n.id));

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
    leftLabel.innerHTML = '<span class="version">v1</span> todo-v1.comb';
    leftPane.appendChild(leftLabel);
    const leftGraph = document.createElement('div');
    leftGraph.className = 'diff-graph-container';
    leftPane.appendChild(leftGraph);

    const rightPane = document.createElement('div');
    rightPane.className = 'diff-pane';
    const rightLabel = document.createElement('div');
    rightLabel.className = 'diff-label';
    rightLabel.innerHTML = '<span class="version">v2</span> todo-v2.comb';
    rightPane.appendChild(rightLabel);
    const rightGraph = document.createElement('div');
    rightGraph.className = 'diff-graph-container';
    rightPane.appendChild(rightGraph);

    graphRow.appendChild(leftPane);
    graphRow.appendChild(rightPane);
    root.appendChild(graphRow);

    // Source panel — append BEFORE rendering graphs so layout sees correct container size
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
  // Escape HTML first
  let html = source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Single-pass tokenization to avoid regex collisions
  html = html.replace(/(\/\/.*$)|("[^"]*")|(\+NEW)|\b(module|signal|comb|always|view|enum|assert)\b|\b(string|int|bool)\b/gm,
    (match, comment, str, added, keyword, type) => {
      if (comment) return `<span class="hl-comment">${comment}</span>`;
      if (str) return `<span class="hl-string">${str}</span>`;
      if (added) return `<span class="hl-added">${added}</span>`;
      if (keyword) return `<span class="hl-keyword">${keyword}</span>`;
      if (type) return `<span class="hl-type">${type}</span>`;
      return match;
    });
  return html;
}
