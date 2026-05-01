// stock-ticker.ts — Stock Ticker demo with waveform debugger
// Hand-written against the runtime API (not compiled from .comb)

import { createSignal, createComb, createEffect, batch, createScope, circuit } from '../runtime/index.js';
import { renderCircuitGraph } from '../visualizer.js';
import { renderWaveform } from '../waveform/index.js';
import type { StaticGraph } from '../core/graph.js';

const __graph: StaticGraph = {
  nodes: [
    { id: 'price', name: 'price', type: 'signal' },
    { id: 'threshold', name: 'threshold', type: 'signal' },
    { id: 'movingAvg', name: 'movingAvg', type: 'comb' },
    { id: 'alertFired', name: 'alertFired', type: 'comb' },
    { id: 'priceDisplay', name: 'priceDisplay', type: 'comb' },
    { id: 'statusText', name: 'statusText', type: 'comb' },
    { id: 'view', name: 'view', type: 'view-binding' },
  ],
  edges: [
    { from: 'price', to: 'movingAvg', type: 'data' },
    { from: 'movingAvg', to: 'alertFired', type: 'data' },
    { from: 'threshold', to: 'alertFired', type: 'data' },
    { from: 'price', to: 'priceDisplay', type: 'data' },
    { from: 'movingAvg', to: 'statusText', type: 'data' },
    { from: 'alertFired', to: 'statusText', type: 'data' },
    { from: 'threshold', to: 'statusText', type: 'data' },
    { from: 'priceDisplay', to: 'view', type: 'data' },
    { from: 'movingAvg', to: 'view', type: 'data' },
    { from: 'statusText', to: 'view', type: 'data' },
    { from: 'alertFired', to: 'view', type: 'data' },
    { from: 'threshold', to: 'view', type: 'data' },
  ],
};

export function mountStockTicker(root: HTMLElement): { dispose: () => void } {
  const scope = createScope();
  const $m = 'StockTicker';

  // Signals
  const [price, setPrice] = createSignal(100, { name: 'price', module: $m, type: 'float' });
  const [threshold, setThreshold] = createSignal(105, { name: 'threshold', module: $m, type: 'float' });

  // Price history buffer (plain array for moving average)
  const history: number[] = [100];

  // Combs
  const movingAvg = createComb(() => {
    price(); // track price
    if (history.length === 0) return 0;
    const sum = history.reduce((a, b) => a + b, 0);
    return Math.round((sum / history.length) * 100) / 100;
  }, { name: 'movingAvg', module: $m, deps: ['price'] });

  const alertFired = createComb(
    () => movingAvg() > threshold(),
    { name: 'alertFired', module: $m, deps: ['movingAvg', 'threshold'] },
  );

  const priceDisplay = createComb(
    () => '$' + price().toFixed(2),
    { name: 'priceDisplay', module: $m, deps: ['price'] },
  );

  const statusText = createComb(
    () => alertFired()
      ? `AVG $${movingAvg().toFixed(2)} > $${threshold().toFixed(2)} — ALERT`
      : `AVG $${movingAvg().toFixed(2)} ≤ $${threshold().toFixed(2)} — normal`,
    { name: 'statusText', module: $m, deps: ['movingAvg', 'alertFired', 'threshold'] },
  );

  // Layout: vertical stack
  root.innerHTML = '';
  root.style.flexDirection = 'column';
  root.style.overflow = 'auto';

  // Top section: ticker display
  const tickerEl = document.createElement('div');
  tickerEl.className = 'stock-ticker';
  root.appendChild(tickerEl);

  const h2 = document.createElement('h2');
  h2.textContent = 'Stock Ticker';
  tickerEl.appendChild(h2);

  const priceEl = document.createElement('div');
  priceEl.className = 'price-display';
  tickerEl.appendChild(priceEl);

  const avgEl = document.createElement('div');
  avgEl.className = 'avg-display';
  tickerEl.appendChild(avgEl);

  const statusEl = document.createElement('div');
  statusEl.className = 'status normal';
  tickerEl.appendChild(statusEl);

  // Threshold slider
  const sliderRow = document.createElement('div');
  sliderRow.className = 'slider-row';
  const sliderLabel = document.createElement('label');
  sliderLabel.textContent = `Threshold: $${threshold().toFixed(0)}`;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '90';
  slider.max = '120';
  slider.value = String(threshold());
  slider.className = 'threshold-slider';
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    setThreshold(val);
    sliderLabel.textContent = `Threshold: $${val.toFixed(0)}`;
  });
  sliderRow.appendChild(sliderLabel);
  sliderRow.appendChild(slider);
  tickerEl.appendChild(sliderRow);

  // Effects for DOM updates
  createEffect(() => { priceEl.textContent = priceDisplay(); }, { name: 'view:price', module: $m });
  createEffect(() => { avgEl.textContent = `Moving Avg: $${movingAvg().toFixed(2)}`; }, { name: 'view:avg', module: $m });
  createEffect(() => {
    statusEl.textContent = statusText();
    statusEl.className = alertFired() ? 'status alert' : 'status normal';
  }, { name: 'view:status', module: $m });

  // Circuit diagram section
  const circuitSection = document.createElement('div');
  circuitSection.className = 'stock-circuit';
  root.appendChild(circuitSection);
  renderCircuitGraph(circuitSection, __graph, circuit);

  // Start waveform recording
  circuit.startRecording();

  // Waveform section
  const waveformSection = document.createElement('div');
  waveformSection.className = 'waveform-container';
  const waveformHeader = document.createElement('div');
  waveformHeader.style.cssText = 'padding: 4px 12px; font-size: 0.7rem; color: #666; letter-spacing: 1px; text-transform: uppercase;';
  waveformHeader.textContent = 'Signal Waveforms';
  waveformSection.appendChild(waveformHeader);
  root.appendChild(waveformSection);

  const signalIds = [
    `${$m}.price`,
    `${$m}.movingAvg`,
    `${$m}.threshold`,
    `${$m}.alertFired`,
  ];
  const waveform = renderWaveform(waveformSection, circuit, signalIds);

  // Price update interval — random walk
  const intervalId = setInterval(() => {
    const delta = (Math.random() - 0.48) * 3; // slight upward bias
    const newPrice = Math.round((price() + delta) * 100) / 100;
    history.push(newPrice);
    if (history.length > 20) history.shift();
    batch(() => {
      setPrice(newPrice);
    });
  }, 500);

  function dispose() {
    clearInterval(intervalId);
    circuit.stopRecording();
    waveform.dispose();
    scope.dispose();
    root.innerHTML = '';
  }

  return { dispose };
}
