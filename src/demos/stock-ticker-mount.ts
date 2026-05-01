// stock-ticker-mount.ts — Thin wrapper for compiled StockTicker module
// Handles: setInterval price walk, moving average calculation, waveform, circuit graph

import { StockTicker, __graph } from '../generated/stock-ticker.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { renderWaveform } from '../waveform/index.js';
import { circuit, batch } from '../runtime/index.js';

const MODULE = 'StockTicker';

export function mountStockTicker(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'Stock Ticker',
    description: 'Random-walk price, moving average, threshold alert. Compiled from stock-ticker.comb.',
  });
  const paneApp = shell.app;
  const paneCircuit = shell.circuit;

  // Mount the compiled component
  const componentRoot = document.createElement('div');
  paneApp.appendChild(componentRoot);
  const component = StockTicker(componentRoot);

  // Price history buffer for moving average (managed in JS)
  const history: number[] = [100];

  // Start waveform recording
  circuit.startRecording();

  // Waveform section
  const waveformSection = document.createElement('div');
  waveformSection.className = 'waveform-container';
  waveformSection.style.cssText = 'max-height: 180px; overflow: hidden;';
  const waveformHeader = document.createElement('div');
  waveformHeader.style.cssText = 'padding: 4px 12px; font-size: 0.7rem; color: #666; letter-spacing: 1px; text-transform: uppercase;';
  waveformHeader.textContent = 'Signal Waveforms';
  waveformSection.appendChild(waveformHeader);
  paneApp.appendChild(waveformSection);

  const signalIds = [
    `${MODULE}.price`,
    `${MODULE}.movingAvg`,
    `${MODULE}.threshold`,
    `${MODULE}.alertFired`,
  ];
  const waveform = renderWaveform(waveformSection, circuit, signalIds);

  // Circuit graph
  renderCircuitGraph(paneCircuit, __graph as any, circuit);

  // Use the circuit graph's registered setters on the MOUNTED component instance
  // (not __test() which creates a separate signal graph)
  function setSignal(name: string, value: any) {
    const node = circuit.getNode(`${MODULE}.${name}`);
    if (node?.setValue) node.setValue(value);
  }

  function getSignal(name: string): any {
    const node = circuit.getNode(`${MODULE}.${name}`);
    return node?.getValue ? node.getValue() : undefined;
  }

  // Price update interval — random walk
  const intervalId = setInterval(() => {
    const currentPrice = getSignal('price') ?? 100;
    const delta = (Math.random() - 0.48) * 3;
    const newPrice = Math.round((currentPrice + delta) * 100) / 100;
    history.push(newPrice);
    if (history.length > 20) history.shift();

    // Compute moving average
    let sum = 0;
    for (let i = 0; i < history.length; i++) sum += history[i];
    const avg = Math.round((sum / history.length) * 100) / 100;

    batch(() => {
      setSignal('price', newPrice);
      setSignal('movingAvg', avg);
    });
  }, 500);

  function dispose() {
    clearInterval(intervalId);
    circuit.stopRecording();
    waveform.dispose();
    component.dispose();
    shell.dispose();
  }

  return { dispose };
}
