// resizable-layout.ts — Demo 5: Constraint-based layout with Kiwi.js Cassowary solver
// Three-pane resizable layout: sidebar + main + inspector with drag dividers

import { Solver, Variable, Constraint, Expression, Operator, Strength } from 'kiwi.js';
import { createCell, createEffect, createScope, batch, circuit } from '../runtime/index.js';
import { renderCircuitGraph } from '../visualizer.js';
import { createDemoShell } from '../demo-shell.js';
import type { StaticGraph } from '../core/graph.js';

const MODULE = 'ResizableLayout';

const __graph: StaticGraph = {
  nodes: [
    { id: 'containerWidth', name: 'containerWidth', type: 'cell' },
    { id: 'sidebarWidth', name: 'sidebarWidth', type: 'cell' },
    { id: 'mainWidth', name: 'mainWidth', type: 'cell' },
    { id: 'inspectorWidth', name: 'inspectorWidth', type: 'cell' },
    { id: 'constraint:solver', name: 'solver', type: 'constraint' },
  ],
  edges: [
    { from: 'containerWidth', to: 'constraint:solver', type: 'data' },
    { from: 'sidebarWidth', to: 'constraint:solver', type: 'data' },
    { from: 'mainWidth', to: 'constraint:solver', type: 'data' },
    { from: 'inspectorWidth', to: 'constraint:solver', type: 'data' },
    { from: 'constraint:solver', to: 'sidebarWidth', type: 'write' },
    { from: 'constraint:solver', to: 'mainWidth', type: 'write' },
    { from: 'constraint:solver', to: 'inspectorWidth', type: 'write' },
  ],
};

export function mountResizableLayout(root: HTMLElement): { dispose: () => void } {

  const scope = createScope();
  circuit.loadStaticGraph(__graph);

  // --- Cells ---
  const [containerWidth, setContainerWidth] = createCell(900, { name: 'containerWidth', module: MODULE });
  const [sidebarWidth, setSidebarWidth] = createCell(220, { name: 'sidebarWidth', module: MODULE });
  const [mainWidth, setMainWidth] = createCell(460, { name: 'mainWidth', module: MODULE });
  const [inspectorWidth, setInspectorWidth] = createCell(220, { name: 'inspectorWidth', module: MODULE });

  // --- Kiwi solver ---
  const solver = new Solver();
  const vSidebar = new Variable('sidebar');
  const vMain = new Variable('main');
  const vInspector = new Variable('inspector');
  const vContainer = new Variable('container');
  const DIVIDER_W = 12; // 2 dividers × 6px

  // Total constraint: sidebar + main + inspector = container - dividers
  solver.addConstraint(new Constraint(
    new Expression(vSidebar, vMain, vInspector, [-1, vContainer], DIVIDER_W),
    Operator.Eq, undefined, Strength.required,
  ));

  // Min widths
  solver.addConstraint(new Constraint(new Expression(vSidebar, -150), Operator.Ge, undefined, Strength.required));
  solver.addConstraint(new Constraint(new Expression(vMain, -200), Operator.Ge, undefined, Strength.required));
  solver.addConstraint(new Constraint(new Expression(vInspector, -120), Operator.Ge, undefined, Strength.required));

  // Max widths
  solver.addConstraint(new Constraint(new Expression([-1, vSidebar], 500), Operator.Ge, undefined, Strength.required));
  solver.addConstraint(new Constraint(new Expression([-1, vInspector], 400), Operator.Ge, undefined, Strength.required));

  // Edit variables
  solver.addEditVariable(vContainer, Strength.strong);
  solver.addEditVariable(vSidebar, Strength.medium);
  solver.addEditVariable(vInspector, Strength.medium);

  function solve() {
    solver.suggestValue(vContainer, containerWidth());
    solver.suggestValue(vSidebar, sidebarWidth());
    solver.suggestValue(vInspector, inspectorWidth());
    solver.updateVariables();
    batch(() => {
      setSidebarWidth(Math.round(vSidebar.value()));
      setMainWidth(Math.round(vMain.value()));
      setInspectorWidth(Math.round(vInspector.value()));
    });
  }

  // Run solver when container or user drag changes
  createEffect(() => {
    containerWidth();
    sidebarWidth();
    inspectorWidth();
    solve();
  }, { name: 'solver', module: MODULE });

  // --- DOM ---
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'Constraint-Based Layout',
    description: 'Drag the dividers. Kiwi.js Cassowary solver enforces min/max widths and total = container.',
  });
  const paneApp = shell.app;
  const paneCircuit = shell.circuit;

  const layoutContainer = document.createElement('div');
  layoutContainer.className = 'resizable-layout';

  const sidebar = createPane('sidebar', 'Sidebar', 'Explorer, file tree, navigation');
  const div1 = createDivider();
  const main = createPane('main', 'Main Editor', 'Primary content area');
  const div2 = createDivider();
  const inspector = createPane('inspector', 'Inspector', 'Properties, details, settings');

  layoutContainer.appendChild(sidebar);
  layoutContainer.appendChild(div1);
  layoutContainer.appendChild(main);
  layoutContainer.appendChild(div2);
  layoutContainer.appendChild(inspector);

  paneApp.appendChild(layoutContainer);

  // Width readout
  const readout = document.createElement('div');
  readout.style.cssText = 'margin-top: 0.75rem; font-family: monospace; font-size: 0.8rem; color: #888; padding: 0 1rem;';
  paneApp.appendChild(readout);

  // --- Effects: bind cell values to DOM ---
  createEffect(() => {
    sidebar.style.width = `${sidebarWidth()}px`;
  }, { name: 'dom:sidebar', module: MODULE });

  createEffect(() => {
    main.style.width = `${mainWidth()}px`;
  }, { name: 'dom:main', module: MODULE });

  createEffect(() => {
    inspector.style.width = `${inspectorWidth()}px`;
  }, { name: 'dom:inspector', module: MODULE });

  createEffect(() => {
    readout.textContent = `sidebar: ${sidebarWidth()}px  |  main: ${mainWidth()}px  |  inspector: ${inspectorWidth()}px  |  total: ${sidebarWidth() + mainWidth() + inspectorWidth() + DIVIDER_W}px / ${containerWidth()}px`;
  }, { name: 'dom:readout', module: MODULE });

  // --- Drag handling ---
  let dragging: 'left' | 'right' | null = null;
  let dragStartX = 0;
  let dragStartSidebar = 0;
  let dragStartInspector = 0;

  function onMouseDown(which: 'left' | 'right', e: MouseEvent) {
    e.preventDefault();
    dragging = which;
    dragStartX = e.clientX;
    dragStartSidebar = sidebarWidth();
    dragStartInspector = inspectorWidth();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    if (dragging === 'left') {
      setSidebarWidth(Math.max(150, dragStartSidebar + dx));
    } else {
      setInspectorWidth(Math.max(120, dragStartInspector - dx));
    }
  }

  function onMouseUp() {
    if (!dragging) return;
    dragging = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  div1.addEventListener('mousedown', (e) => onMouseDown('left', e));
  div2.addEventListener('mousedown', (e) => onMouseDown('right', e));
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // --- ResizeObserver: update containerWidth ---
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      setContainerWidth(Math.round(entry.contentRect.width));
    }
  });
  ro.observe(layoutContainer);

  // Initial solve
  setContainerWidth(layoutContainer.clientWidth || 900);

  // Circuit visualizer
  renderCircuitGraph(paneCircuit, __graph, circuit);

  function dispose() {
    ro.disconnect();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    scope.dispose();
    shell.dispose();
  }

  return { dispose };
}

function createPane(cls: string, title: string, desc: string): HTMLDivElement {
  const pane = document.createElement('div');
  pane.className = `pane ${cls}`;
  pane.innerHTML = `<h3 style="margin:0 0 0.5rem;color:#e0e0e0;font-size:0.95rem;">${title}</h3><p style="margin:0;color:#666;font-size:0.8rem;">${desc}</p>`;
  return pane;
}

function createDivider(): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'divider';
  return div;
}
