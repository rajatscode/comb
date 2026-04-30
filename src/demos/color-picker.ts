// color-picker.ts — Demo 4: Propagator network color picker
// 6 cells (R/G/B + H/S/V) with bidirectional constraints

import { createCell, createComb, createEffect, createPropagator, createScope, batch, circuit } from '../runtime/index.js';
import { rgbToHsv, hsvToRgb, rgbToHex } from '../runtime/color.js';
import { renderCircuitGraph } from '../visualizer.js';
import { createDemoShell } from '../demo-shell.js';
import type { StaticGraph } from '../core/graph.js';

const MODULE = 'ColorPicker';

export function mountColorPicker(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, { layout: 'split' });
  const paneApp = shell.app;
  const paneCircuit = shell.circuit;

  const scope = createScope();

  // 6 cells — convergence via Object.is: integer roundtrips are exact
  const [r, setR] = createCell(255, { name: 'r', module: MODULE });
  const [g, setG] = createCell(0, { name: 'g', module: MODULE });
  const [b, setB] = createCell(0, { name: 'b', module: MODULE });
  const [h, setH] = createCell(0, { name: 'h', module: MODULE });
  const [s, setS] = createCell(100, { name: 's', module: MODULE });
  const [v, setV] = createCell(100, { name: 'v', module: MODULE });

  // Propagator: RGB → HSV
  createPropagator(() => {
    const hsv = rgbToHsv(r(), g(), b());
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  }, { name: 'rgb→hsv', module: MODULE, deps: ['r', 'g', 'b'], writes: ['h', 's', 'v'] });

  // Propagator: HSV → RGB
  createPropagator(() => {
    const rgb = hsvToRgb(h(), s(), v());
    setR(rgb.r);
    setG(rgb.g);
    setB(rgb.b);
  }, { name: 'hsv→rgb', module: MODULE, deps: ['h', 's', 'v'], writes: ['r', 'g', 'b'] });

  // Combs
  const hexColor = createComb(() => rgbToHex(r(), g(), b()), { name: 'hexColor', module: MODULE, deps: ['r', 'g', 'b'] });
  const preview = createComb(() => `rgb(${r()}, ${g()}, ${b()})`, { name: 'preview', module: MODULE, deps: ['r', 'g', 'b'] });

  const wrapper = document.createElement('div');
  wrapper.className = 'form-wrapper color-picker';
  paneApp.appendChild(wrapper);

  // Color preview
  const previewBox = document.createElement('div');
  previewBox.className = 'color-preview';
  wrapper.appendChild(previewBox);

  const hexDisplay = document.createElement('div');
  hexDisplay.className = 'hex-display';
  wrapper.appendChild(hexDisplay);

  // Slider definitions
  const sliderDefs = [
    { label: 'R', get: r, set: setR, min: 0, max: 255, color: '#ff4444' },
    { label: 'G', get: g, set: setG, min: 0, max: 255, color: '#44ff44' },
    { label: 'B', get: b, set: setB, min: 0, max: 255, color: '#4488ff' },
    { label: 'H', get: h, set: setH, min: 0, max: 360, color: '#e8915a' },
    { label: 'S', get: s, set: setS, min: 0, max: 100, color: '#c084fc' },
    { label: 'V', get: v, set: setV, min: 0, max: 100, color: '#ffd700' },
  ];

  const sliderEls: { input: HTMLInputElement; valueEl: HTMLSpanElement }[] = [];

  // RGB group
  const rgbGroup = document.createElement('div');
  rgbGroup.className = 'slider-group';
  rgbGroup.innerHTML = '<h3>RGB</h3>';
  wrapper.appendChild(rgbGroup);

  for (let i = 0; i < 3; i++) {
    const { el, input, valueEl } = createSlider(sliderDefs[i]);
    rgbGroup.appendChild(el);
    sliderEls.push({ input, valueEl });
  }

  // HSV group
  const hsvGroup = document.createElement('div');
  hsvGroup.className = 'slider-group';
  hsvGroup.innerHTML = '<h3>HSV</h3>';
  wrapper.appendChild(hsvGroup);

  for (let i = 3; i < 6; i++) {
    const { el, input, valueEl } = createSlider(sliderDefs[i]);
    hsvGroup.appendChild(el);
    sliderEls.push({ input, valueEl });
  }

  // Wire slider inputs to cell setters (throttled to 1 per frame)
  for (let i = 0; i < sliderDefs.length; i++) {
    const def = sliderDefs[i];
    const slider = sliderEls[i];
    let rafPending = false;
    slider.input.addEventListener('input', () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        batch(() => {
          def.set(parseInt(slider.input.value, 10));
        });
      });
    });
  }

  // Effects to update DOM from cell values
  createEffect(() => {
    previewBox.style.backgroundColor = preview();
  }, { name: 'updatePreview', module: MODULE });

  createEffect(() => {
    hexDisplay.textContent = hexColor();
  }, { name: 'updateHex', module: MODULE });

  for (let i = 0; i < sliderDefs.length; i++) {
    const def = sliderDefs[i];
    const slider = sliderEls[i];
    createEffect(() => {
      const val = def.get();
      slider.input.value = String(val);
      slider.valueEl.textContent = String(val);
    }, { name: `update_${def.label}`, module: MODULE });
  }

  // Build graph for visualizer from runtime nodes (no .comb file for this demo)
  const runtimeNodes = circuit.getNodes().filter(n => n.module === MODULE);
  const runtimeEdges = circuit.getEdges();
  // Only show cells, propagators, and combs (skip internal effects like update_R)
  const showTypes = new Set(['cell', 'propagator', 'comb']);
  const showIds = new Set(runtimeNodes.filter(n => showTypes.has(n.type)).map(n => n.id));
  const graph: StaticGraph = {
    nodes: runtimeNodes
      .filter(n => showIds.has(n.id))
      .map(n => ({ id: n.name, name: n.name, type: n.type as any })),
    edges: runtimeEdges
      .filter(e => showIds.has(e.from) && showIds.has(e.to))
      .map(e => {
        const fromNode = runtimeNodes.find(n => n.id === e.from);
        const toNode = runtimeNodes.find(n => n.id === e.to);
        return { from: fromNode?.name ?? e.from, to: toNode?.name ?? e.to, type: 'data' as const };
      }),
  };
  renderCircuitGraph(paneCircuit, graph, circuit);

  return {
    dispose: () => {
      scope.dispose();
      shell.dispose();
    },
  };
}

function createSlider(def: { label: string; min: number; max: number; color: string; get: () => number }): {
  el: HTMLDivElement;
  input: HTMLInputElement;
  valueEl: HTMLSpanElement;
} {
  const el = document.createElement('div');
  el.className = 'color-slider-row';

  const label = document.createElement('label');
  label.textContent = def.label;
  label.style.color = def.color;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(def.min);
  input.max = String(def.max);
  input.value = String(def.get());
  input.style.accentColor = def.color;

  const valueEl = document.createElement('span');
  valueEl.className = 'slider-value';
  valueEl.textContent = String(def.get());

  el.appendChild(label);
  el.appendChild(input);
  el.appendChild(valueEl);

  return { el, input, valueEl };
}
