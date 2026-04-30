// stock-ticker-mount.ts — Thin wrapper for compiled StockTicker module
// Handles: setInterval price walk, moving average calculation, waveform, circuit graph

import { StockTicker, __graph, __test } from '../generated/stock-ticker.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { renderWaveform } from '../waveform.js';
import { circuit } from '../runtime/index.js';
import { batch } from '../runtime/index.js';

const MODULE = 'StockTicker';

export function mountStockTicker(root: HTMLElement): { dispose: () => void } {
  // Create shell: stacked layout (app on top, circuit + waveform below)
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'Stock Ticker',
    description: 'Random-walk price, moving average, threshold alert. Wrapper feeds price updates via setInterval.',
  });
  const paneApp = shell.app;
  const paneCircuit = shell.circuit;

  // Mount the compiled component
  const componentRoot = document.createElement('div');
  paneApp.appendChild(componentRoot);
  const component = StockTicker(componentRoot);

  // Get signal setters via __test() for feeding price data from JS
  const test = __test();

  // Price history buffer for moving average (managed in JS)
  const history: number[] = [100];

  // Start waveform recording
  circuit.startRecording();

  // Waveform section
  const waveformSection = document.createElement('div');
  waveformSection.className = 'waveform-container';
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

  // Price update interval -- random walk
  const intervalId = setInterval(() => {
    const currentPrice = test.signals.price.get();
    const delta = (Math.random() - 0.48) * 3; // slight upward bias
    const newPrice = Math.round((currentPrice + delta) * 100) / 100;
    history.push(newPrice);
    if (history.length > 20) history.shift();

    // Compute moving average
    let sum = 0;
    for (let i = 0; i < history.length; i++) sum += history[i];
    const avg = Math.round((sum / history.length) * 100) / 100;

    batch(() => {
      test.signals.price.set(newPrice);
      test.signals.movingAvg.set(avg);
    });
  }, 500);

  function dispose() {
    clearInterval(intervalId);
    circuit.stopRecording();
    waveform.dispose();
    test.dispose();
    component.dispose();
    shell.dispose();
  }

  return { dispose };
}
