// unit-converter-mount.ts — Diamond constraint propagation demo
// Proves: constraint networks converge via DES delta cycles
// Key insight: rankine reached via C->F->R and C->K->R must agree

import { UnitConverter, __graph } from '../generated/unit-converter.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { renderWaveform } from '../waveform/index.js';
import { circuit } from '../runtime/index.js';

const M = 'UnitConverter';

export function mountUnitConverter(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'Unit Converter: Diamond Constraint Propagation',
    description:
      'Four temperature units connected by 8 bidirectional constraints forming a diamond topology. ' +
      'Changing any slider propagates through the constraint network via delta cycles. ' +
      'Rankine must converge to the same value whether reached via C\u2192F\u2192R or C\u2192K\u2192R.',
  });

  // Main content area: diamond diagram + live component side by side
  const mainRow = document.createElement('div');
  mainRow.style.cssText = 'display: flex; gap: 24px; padding: 0 16px 16px; align-items: flex-start; flex-wrap: wrap;';
  shell.app.appendChild(mainRow);

  // Diamond diagram (left)
  const diagramCol = document.createElement('div');
  diagramCol.style.cssText = 'flex: 0 0 180px; padding-top: 8px;';
  diagramCol.innerHTML = `
    <svg viewBox="0 0 160 160" width="160" height="160" style="display:block;">
      <line x1="80" y1="20" x2="20" y2="75" stroke="#6ee7f9" stroke-width="1.5" opacity="0.5"/>
      <line x1="80" y1="20" x2="140" y2="75" stroke="#6ee7f9" stroke-width="1.5" opacity="0.5"/>
      <line x1="20" y1="75" x2="80" y2="130" stroke="#6ee7f9" stroke-width="1.5" opacity="0.5"/>
      <line x1="140" y1="75" x2="80" y2="130" stroke="#6ee7f9" stroke-width="1.5" opacity="0.5"/>
      <text x="80" y="12" text-anchor="middle" fill="#6ee7f9" font-size="11" font-weight="600">Celsius</text>
      <text x="10" y="79" text-anchor="middle" fill="#a78bfa" font-size="11" font-weight="600">F</text>
      <text x="150" y="79" text-anchor="middle" fill="#a78bfa" font-size="11" font-weight="600">K</text>
      <text x="80" y="152" text-anchor="middle" fill="#72f1b8" font-size="11" font-weight="600">Rankine</text>
      <circle cx="80" cy="20" r="4" fill="#6ee7f9"/>
      <circle cx="20" cy="75" r="4" fill="#a78bfa"/>
      <circle cx="140" cy="75" r="4" fill="#a78bfa"/>
      <circle cx="80" cy="130" r="4" fill="#72f1b8"/>
    </svg>
    <div style="display:flex; gap:12px; margin-top:12px; font-size:12px; color:#9aa8bd;">
      <span style="display:flex; align-items:center; gap:4px;">
        <span style="width:8px;height:8px;border-radius:50%;background:#72f1b8;display:inline-block;"></span> Converged
      </span>
      <span style="display:flex; align-items:center; gap:4px;">
        <span style="width:8px;height:8px;border-radius:50%;background:#ff5d8f;display:inline-block;"></span> Diverged
      </span>
    </div>
  `;
  mainRow.appendChild(diagramCol);

  // Live component (right, takes remaining space)
  const componentRoot = document.createElement('div');
  componentRoot.style.cssText = 'flex: 1; min-width: 300px;';
  mainRow.appendChild(componentRoot);
  const component = UnitConverter(componentRoot);

  // Start recording for waveform
  circuit.startRecording();

  // Waveform below
  const wfDiv = document.createElement('div');
  wfDiv.style.cssText = 'height: 200px; flex-shrink: 0; border-top: 1px solid var(--border);';
  shell.app.appendChild(wfDiv);
  const wf = renderWaveform(wfDiv, circuit, [
    `${M}.celsius`, `${M}.fahrenheit`, `${M}.kelvin`, `${M}.rankine`
  ]);

  // Circuit graph (in the shell's circuit pane, scrollable)
  shell.circuit.style.minHeight = '350px';
  renderCircuitGraph(shell.circuit, __graph as any, circuit);

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .unit-converter {
      padding: 8px 0;
    }
    .unit-converter h2 {
      margin: 0 0 4px;
      font-size: 1.1rem;
      color: var(--text);
    }
    .converter-subtitle {
      margin: 0 0 12px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .converter-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .converter-cell {
      background: rgba(110, 231, 249, 0.04);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .converter-cell label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .converter-cell input[type="range"] {
      width: 100%;
      accent-color: var(--accent);
    }
    .converter-value {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 1.3rem;
      color: var(--text);
      text-align: center;
      font-weight: 600;
    }
    .converter-status {
      display: flex;
      gap: 12px;
      align-items: stretch;
    }
    .temp-preview {
      width: 48px;
      min-height: 48px;
      border-radius: 8px;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .convergence-info, .freezing-info {
      background: rgba(110, 231, 249, 0.04);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      flex: 1;
    }
    .convergence-info p, .freezing-info p {
      margin: 3px 0;
      font-size: 0.8rem;
      color: var(--text-muted);
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .convergence-result {
      font-weight: 700;
      font-size: 0.85rem !important;
      color: var(--success) !important;
    }
  `;
  root.appendChild(style);

  return {
    dispose() {
      circuit.stopRecording();
      wf.dispose();
      component.dispose();
      shell.dispose();
      style.remove();
    }
  };
}
