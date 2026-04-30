// resizable-layout-mount.ts — Thin wrapper for compiled ResizableLayout module
// Handles: Kiwi.js Cassowary solver, mouse drag, ResizeObserver, circuit graph

import { Solver, Variable, Constraint, Expression, Operator, Strength } from 'kiwi.js';
import { ResizableLayout, __graph, __test } from '../generated/resizable-layout.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { circuit } from '../runtime/index.js';
import { batch } from '../runtime/index.js';

const MODULE = 'ResizableLayout';

export function mountResizableLayout(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'Constraint-Based Layout',
    description: 'Drag the dividers. Kiwi.js Cassowary solver enforces min/max widths and total = container.',
  });
  const paneApp = shell.app;
  const paneCircuit = shell.circuit;

  // Mount the compiled component into a container
  const layoutContainer = document.createElement('div');
  layoutContainer.style.display = 'flex';
  layoutContainer.style.flexDirection = 'row';
  paneApp.appendChild(layoutContainer);
  const component = ResizableLayout(layoutContainer);

  // Get signal setters via __test()
  const test = __test();

  // Width readout
  const readout = document.createElement('div');
  readout.style.cssText = 'margin-top: 0.75rem; font-family: monospace; font-size: 0.8rem; color: #888; padding: 0 1rem;';
  paneApp.appendChild(readout);

  // --- Kiwi solver ---
  const solver = new Solver();
  const vSidebar = new Variable('sidebar');
  const vMain = new Variable('main');
  const vInspector = new Variable('inspector');
  const vContainer = new Variable('container');
  const DIVIDER_W = 12; // 2 dividers x 6px

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

  let containerWidth = 900;
  let sidebarW = 220;
  let inspectorW = 220;

  function solve() {
    solver.suggestValue(vContainer, containerWidth);
    solver.suggestValue(vSidebar, sidebarW);
    solver.suggestValue(vInspector, inspectorW);
    solver.updateVariables();
    const newSidebar = Math.round(vSidebar.value());
    const newMain = Math.round(vMain.value());
    const newInspector = Math.round(vInspector.value());
    sidebarW = newSidebar;
    inspectorW = newInspector;
    batch(() => {
      test.signals.sidebarWidth.set(newSidebar);
      test.signals.mainWidth.set(newMain);
      test.signals.inspectorWidth.set(newInspector);
    });
    readout.textContent = `sidebar: ${newSidebar}px  |  main: ${newMain}px  |  inspector: ${newInspector}px  |  total: ${newSidebar + newMain + newInspector + DIVIDER_W}px / ${containerWidth}px`;
  }

  // --- Drag handling ---
  let dragging: 'left' | 'right' | null = null;
  let dragStartX = 0;
  let dragStartSidebar = 0;
  let dragStartInspector = 0;

  // Find divider elements from the compiled DOM
  const dividers = layoutContainer.querySelectorAll('.divider');
  const div1 = dividers[0] as HTMLElement | undefined;
  const div2 = dividers[1] as HTMLElement | undefined;

  function onMouseDown(which: 'left' | 'right', e: MouseEvent) {
    e.preventDefault();
    dragging = which;
    dragStartX = e.clientX;
    dragStartSidebar = sidebarW;
    dragStartInspector = inspectorW;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    if (dragging === 'left') {
      sidebarW = Math.max(150, dragStartSidebar + dx);
    } else {
      inspectorW = Math.max(120, dragStartInspector - dx);
    }
    solve();
  }

  function onMouseUp() {
    if (!dragging) return;
    dragging = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  if (div1) div1.addEventListener('mousedown', (e) => onMouseDown('left', e));
  if (div2) div2.addEventListener('mousedown', (e) => onMouseDown('right', e));
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // --- ResizeObserver: update containerWidth ---
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      containerWidth = Math.round(entry.contentRect.width);
      solve();
    }
  });
  ro.observe(layoutContainer);

  // Initial solve
  containerWidth = layoutContainer.clientWidth || 900;
  solve();

  // Circuit graph
  renderCircuitGraph(paneCircuit, __graph as any, circuit);

  function dispose() {
    ro.disconnect();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    test.dispose();
    component.dispose();
    shell.dispose();
  }

  return { dispose };
}
