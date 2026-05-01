// waveform/index.ts — GTKWave-grade waveform viewer
// Features: hierarchy browser, dual markers, pattern search, analog/digital/step rendering

import type { CircuitGraph } from '../runtime/circuit.js';
import type { WaveformSignal, SearchMatch } from './types.js';
import { ROW_H, LABEL_W } from './types.js';
import { drawWaveforms } from './renderer.js';
import { createMarkerSystem } from './markers.js';
import { searchWaveform, createSearchUI } from './search.js';
import { createHierarchyBrowser, buildSignalList } from './hierarchy.js';

export { buildSignalList } from './hierarchy.js';
export type { WaveformSignal } from './types.js';

export function renderWaveform(
  container: HTMLElement,
  circuit: CircuitGraph,
  signalIds: string[],
  options?: {
    extraSignals?: Array<{ id: string; displayName: string; group: string; type: WaveformSignal['type'] }>;
    showHierarchy?: boolean;
    showSearch?: boolean;
  },
): { dispose: () => void } {
  const showHierarchy = options?.showHierarchy ?? true;
  const showSearch = options?.showSearch ?? true;

  const signals = buildSignalList(signalIds, options?.extraSignals);
  const markers = createMarkerSystem();

  let disposed = false;
  let cursorX = -1;
  let viewStart = 0;
  let viewEnd = 0;
  let viewInitialized = false;
  let userInteracted = false;

  // Search state
  let searchMatches: SearchMatch[] = [];
  let searchIndex = -1;

  // Pan state
  let isPanning = false;
  let panStartX = 0;
  let panStartViewStart = 0;
  let panStartViewEnd = 0;

  // --- Layout ---
  // overflow:hidden on the container prevents the waveform from pushing the page taller;
  // the canvasWrap inside handles vertical scrolling of signal rows
  container.style.position = 'relative';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.overflow = 'hidden';

  // Controls bar
  const controlBar = document.createElement('div');
  controlBar.className = 'waveform-controls';
  controlBar.style.cssText = 'display:flex; align-items:center; gap:4px; padding:3px 8px; background:var(--bg-surface); border-bottom:1px solid var(--border); font-size:0.7rem; flex-wrap:wrap; flex-shrink:0;';

  // Zoom buttons
  const zoomGroup = document.createElement('span');
  zoomGroup.style.cssText = 'display:flex; gap:3px; margin-left:auto;';
  for (const [label, action] of [['Fit', 'fit'], ['Zoom +', 'in'], ['Zoom \u2212', 'out']] as const) {
    const btn = document.createElement('button');
    btn.className = 'waveform-zoom-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (action === 'fit') {
        viewInitialized = false;
        userInteracted = false;
      } else {
        userInteracted = true;
        const range = viewEnd - viewStart;
        const mid = (viewStart + viewEnd) / 2;
        const factor = action === 'in' ? 0.5 : 2;
        const newRange = range * factor;
        viewStart = mid - newRange / 2;
        viewEnd = mid + newRange / 2;
      }
      draw();
    });
    zoomGroup.appendChild(btn);
  }
  controlBar.appendChild(zoomGroup);
  container.appendChild(controlBar);

  // Search bar
  let searchUI: ReturnType<typeof createSearchUI> | null = null;
  if (showSearch) {
    searchUI = createSearchUI(
      controlBar,
      (query) => {
        const data = circuit.getWaveformData();
        searchMatches = searchWaveform(query, data, signalIds);
        searchIndex = searchMatches.length > 0 ? 0 : -1;
        searchUI?.updateCount(searchIndex, searchMatches.length);
        if (searchIndex >= 0) navigateToMatch(searchMatches[searchIndex]);
      },
      () => { // next
        if (searchMatches.length === 0) return;
        searchIndex = (searchIndex + 1) % searchMatches.length;
        searchUI?.updateCount(searchIndex, searchMatches.length);
        navigateToMatch(searchMatches[searchIndex]);
      },
      () => { // prev
        if (searchMatches.length === 0) return;
        searchIndex = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
        searchUI?.updateCount(searchIndex, searchMatches.length);
        navigateToMatch(searchMatches[searchIndex]);
      },
    );
  }

  // Main content row: hierarchy browser + canvas (flex:1 + min-height:0 makes it shrink to fit container)
  const mainRow = document.createElement('div');
  mainRow.style.cssText = 'display:flex; flex:1; min-height:0;';
  container.appendChild(mainRow);

  // Hierarchy browser (left panel)
  let hierarchyBrowser: ReturnType<typeof createHierarchyBrowser> | null = null;
  if (showHierarchy) {
    const hierPanel = document.createElement('div');
    hierPanel.style.cssText = 'width:140px; flex-shrink:0; border-right:1px solid var(--border); overflow-y:auto; background:var(--bg-surface);';
    mainRow.appendChild(hierPanel);

    hierarchyBrowser = createHierarchyBrowser(
      hierPanel,
      signals,
      (signalId) => {
        const sig = signals.find(s => s.id === signalId);
        if (sig) {
          sig.visible = !sig.visible;
          resize();
          draw();
        }
      },
      (signalId) => {
        const sig = signals.find(s => s.id === signalId);
        if (sig) {
          sig.renderMode = sig.renderMode === 'analog' ? 'digital' : 'analog';
          draw();
        }
      },
    );
  }

  // Canvas container — scrollable vertically for many signals
  const canvasWrap = document.createElement('div');
  canvasWrap.style.cssText = 'flex:1; min-width:0; min-height:0; position:relative; overflow-y:auto; overflow-x:hidden;';
  mainRow.appendChild(canvasWrap);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%; display:block; cursor:crosshair;';
  canvasWrap.appendChild(canvas);

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'waveform-tooltip';
  tooltip.style.display = 'none';
  tooltip.style.position = 'sticky';
  canvasWrap.appendChild(tooltip);

  // --- Drawing ---
  function getVisibleSignals(): WaveformSignal[] {
    return signals.filter(s => s.visible);
  }

  function resize() {
    const visible = getVisibleSignals();
    const w = canvasWrap.clientWidth;
    const h = Math.max(visible.length * ROW_H, ROW_H);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
  }

  function draw() {
    if (disposed) return;
    const visible = getVisibleSignals();
    const w = canvasWrap.clientWidth;
    const h = Math.max(visible.length * ROW_H, ROW_H);
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const data = circuit.getWaveformData();
    const chartW = w - LABEL_W;
    const now = performance.now();

    // Auto-fit / auto-scroll — only when data is actually changing
    if (!viewInitialized || !userInteracted) {
      let tMin = Infinity;
      let tMax = -Infinity;
      for (const sig of visible) {
        const buf = data.get(sig.id);
        if (buf && buf.length > 0) {
          if (buf[0].t < tMin) tMin = buf[0].t;
          if (buf[buf.length - 1].t > tMax) tMax = buf[buf.length - 1].t;
        }
      }
      if (tMin === Infinity) { tMin = 0; tMax = 5000; }
      if (tMax - tMin < 5000) tMin = tMax - 5000;
      viewStart = tMin;
      viewEnd = tMax;
      viewInitialized = true;
    }

    // Draw signals
    const { tooltipLines } = drawWaveforms(ctx, visible, data, viewStart, viewEnd, w, cursorX);

    // Draw markers on top
    markers.drawMarkers(ctx, viewStart, viewEnd, chartW, h);

    // Draw search match highlights
    if (searchMatches.length > 0) {
      const tRange = viewEnd - viewStart || 1;
      for (let i = 0; i < searchMatches.length; i++) {
        const match = searchMatches[i];
        const x = LABEL_W + ((match.timestamp - viewStart) / tRange) * chartW;
        if (x < LABEL_W || x > w) continue;
        ctx.fillStyle = i === searchIndex ? '#f8d66d' : 'rgba(248,214,109,0.3)';
        ctx.fillRect(x - 1, 0, 3, h);
      }
    }

    // Tooltip
    if (cursorX >= LABEL_W && cursorX < w && tooltipLines.length > 0) {
      tooltip.textContent = tooltipLines.join('  |  ');
      tooltip.style.display = 'block';
      tooltip.style.left = `${Math.min(cursorX + 10, w - 200)}px`;
      tooltip.style.top = '4px';
    } else {
      tooltip.style.display = 'none';
    }

    ctx.restore();
  }

  function navigateToMatch(match: SearchMatch) {
    userInteracted = true;
    const range = viewEnd - viewStart;
    viewStart = match.timestamp - range * 0.3;
    viewEnd = match.timestamp + range * 0.7;
    markers.setMarker('A', match.timestamp);
    draw();
  }

  // --- Mouse interaction ---
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    cursorX = e.clientX - rect.left;
    if (isPanning) {
      userInteracted = true;
      const dx = e.clientX - panStartX;
      const chartW = canvasWrap.clientWidth - LABEL_W;
      const tRange = panStartViewEnd - panStartViewStart;
      const dt = -(dx / chartW) * tRange;
      viewStart = panStartViewStart + dt;
      viewEnd = panStartViewEnd + dt;
    }
    draw();
  });

  canvas.addEventListener('mouseleave', () => {
    cursorX = -1;
    draw();
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    if (mouseX >= LABEL_W) {
      if (e.altKey || e.metaKey) {
        // Alt/Cmd+click = set marker
        const chartW = canvasWrap.clientWidth - LABEL_W;
        markers.handleClick(e, rect, viewStart, viewEnd, chartW);
        draw();
      } else {
        // Regular click = pan
        isPanning = true;
        panStartX = e.clientX;
        panStartViewStart = viewStart;
        panStartViewEnd = viewEnd;
        canvas.style.cursor = 'grabbing';
      }
    }
  });

  const handleMouseUp = () => {
    isPanning = false;
    canvas.style.cursor = 'crosshair';
  };
  window.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+scroll = timeline zoom
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      if (mouseX < LABEL_W) return;

      userInteracted = true;
      const chartW = canvasWrap.clientWidth - LABEL_W;
      const ratio = (mouseX - LABEL_W) / chartW;
      const tRange = viewEnd - viewStart;
      const factor = e.deltaY > 0 ? 1.3 : 0.7;
      const newRange = tRange * factor;
      const anchor = viewStart + ratio * tRange;
      viewStart = anchor - ratio * newRange;
      viewEnd = anchor + (1 - ratio) * newRange;
      draw();
    } else {
      // Plain scroll = vertical scroll through signal rows
      // Prevent page scroll and scroll the canvasWrap instead
      const maxScroll = canvasWrap.scrollHeight - canvasWrap.clientHeight;
      if (maxScroll > 0) {
        e.preventDefault();
        canvasWrap.scrollTop += e.deltaY;
      }
    }
  }, { passive: false });

  // --- Keyboard shortcuts (only when mouse is over container) ---
  let mouseIsOver = false;
  container.addEventListener('mouseenter', () => { mouseIsOver = true; });
  container.addEventListener('mouseleave', () => { mouseIsOver = false; });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!mouseIsOver) return;
    const range = viewEnd - viewStart;
    const mid = (viewStart + viewEnd) / 2;

    switch (e.key) {
      case '+':
      case '=': {
        // Zoom in: shrink range by 30% around center
        e.preventDefault();
        userInteracted = true;
        const newRange = range * 0.7;
        viewStart = mid - newRange / 2;
        viewEnd = mid + newRange / 2;
        draw();
        break;
      }
      case '-': {
        // Zoom out: expand range by 40%
        e.preventDefault();
        userInteracted = true;
        const newRange = range * 1.4;
        viewStart = mid - newRange / 2;
        viewEnd = mid + newRange / 2;
        draw();
        break;
      }
      case 'ArrowLeft': {
        // Pan left 10%
        e.preventDefault();
        userInteracted = true;
        const shift = range * 0.1;
        viewStart -= shift;
        viewEnd -= shift;
        draw();
        break;
      }
      case 'ArrowRight': {
        // Pan right 10%
        e.preventDefault();
        userInteracted = true;
        const shift = range * 0.1;
        viewStart += shift;
        viewEnd += shift;
        draw();
        break;
      }
      case 'Home': {
        // Fit all
        e.preventDefault();
        viewInitialized = false;
        userInteracted = false;
        draw();
        break;
      }
      case 'Escape': {
        // Clear markers
        e.preventDefault();
        markers.clear();
        draw();
        break;
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  // --- Initialize ---
  resize();
  draw();

  const interval = setInterval(() => {
    if (!disposed) {
      if (!viewInitialized) resize();
      draw();
    }
  }, 500);

  function dispose() {
    disposed = true;
    clearInterval(interval);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('keydown', handleKeyDown);
    hierarchyBrowser?.dispose();
    container.innerHTML = '';
  }

  return { dispose };
}
