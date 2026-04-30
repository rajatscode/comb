// color-picker-mount.ts — Thin wrapper for compiled ColorPicker module
// Handles: demo shell layout, circuit graph visualization

import { ColorPicker, __graph } from '../generated/color-picker.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { circuit } from '../runtime/index.js';

export function mountColorPicker(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, { layout: 'split' });
  const paneApp = shell.app;
  const paneCircuit = shell.circuit;

  // Mount the compiled component
  const componentRoot = document.createElement('div');
  componentRoot.className = 'form-wrapper color-picker';
  paneApp.appendChild(componentRoot);
  const component = ColorPicker(componentRoot);

  // Circuit graph
  renderCircuitGraph(paneCircuit, __graph as any, circuit);

  function dispose() {
    component.dispose();
    shell.dispose();
  }

  return { dispose };
}
