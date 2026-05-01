// waveform.ts — Canvas-based waveform viewer with zoom, pan, and signal filtering

import type { CircuitGraph } from './runtime/circuit.js';

const ROW_H = 60;
const LABEL_W = 110;
const COLORS = ['#5b9bd5', '#6bc46d', '#e8915a', '#d94f4f', '#c084fc', '#4ae04a'];

export function renderWaveform(
  container: HTMLElement,
  circuit: CircuitGraph,
  signalIds: string[],
): { dispose: () => void } {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  canvas.style.cursor = 'crosshair';
  container.appendChild(canvas);

  let disposed = false;
  let cursorX = -1;

  // Zoom/pan state
  let viewStart = 0; // ms timestamp
  let viewEnd = 0;
  let viewInitialized = false;
  let userInteracted = false; // true once user zooms/pans — stops auto-scroll

  // Signal filter state
  const hidden = new Set<string>();

  // Pan state
  let isPanning = false;
  let panStartX = 0;
  let panStartViewStart = 0;
  let panStartViewEnd = 0;

  const tooltip = document.createElement('div');
  tooltip.className = 'waveform-tooltip';
  tooltip.style.display = 'none';
  container.style.position = 'relative';
  container.appendChild(tooltip);

  // Controls bar
  const controlBar = document.createElement('div');
  controlBar.className = 'waveform-controls';
  controlBar.innerHTML = `
    <span class="waveform-ctrl-label">Signals:</span>
    ${signalIds.map((id, i) => {
      const name = id.split('.').pop() ?? id;
      return `<button class="waveform-sig-btn" data-idx="${i}" data-id="${id}" style="color:${COLORS[i % COLORS.length]};border-color:${COLORS[i % COLORS.length]}">${name}</button>`;
    }).join('')}
    <span class="waveform-ctrl-sep">|</span>
    <button class="waveform-zoom-btn" data-action="fit">Fit</button>
    <button class="waveform-zoom-btn" data-action="in">Zoom +</button>
    <button class="waveform-zoom-btn" data-action="out">Zoom −</button>
  `;
  container.insertBefore(controlBar, canvas);

  // Signal toggle handlers
  controlBar.querySelectorAll('.waveform-sig-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id!;
      if (hidden.has(id)) {
        hidden.delete(id);
        (btn as HTMLElement).style.opacity = '1';
      } else {
        hidden.add(id);
        (btn as HTMLElement).style.opacity = '0.3';
      }
      resize();
      draw();
    });
  });

  // Zoom button handlers
  controlBar.querySelectorAll('.waveform-zoom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = (btn as HTMLElement).dataset.action;
      if (action === 'fit') {
        viewInitialized = false;
        userInteracted = false; // resume auto-scroll
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
  });

  function getVisibleSignals(): string[] {
    return signalIds.filter(id => !hidden.has(id));
  }

  function resize() {
    const visible = getVisibleSignals();
    const w = container.clientWidth;
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
    const w = container.clientWidth;
    const h = Math.max(visible.length * ROW_H, ROW_H);
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const data = circuit.getWaveformData();
    const chartW = w - LABEL_W;
    const now = Date.now();

    // Auto-fit on first draw, or auto-scroll when user hasn't zoomed/panned
    if (!viewInitialized || !userInteracted) {
      let tMin = now;
      let tMax = now;
      for (const id of visible) {
        const buf = data.get(id);
        if (buf && buf.length > 0) {
          if (buf[0].t < tMin) tMin = buf[0].t;
          if (buf[buf.length - 1].t > tMax) tMax = buf[buf.length - 1].t;
        }
      }
      if (tMax - tMin < 5000) tMin = tMax - 5000;
      viewStart = tMin;
      viewEnd = tMax;
      viewInitialized = true;
    }

    const tMin = viewStart;
    const tMax = viewEnd;
    const tRange = tMax - tMin || 1;

    for (let row = 0; row < visible.length; row++) {
      const id = visible[row];
      const origIdx = signalIds.indexOf(id);
      const color = COLORS[origIdx % COLORS.length];
      const y0 = row * ROW_H;
      const buf = data.get(id) ?? [];
      const name = id.split('.').pop() ?? id;

      // Row background
      ctx.fillStyle = row % 2 === 0 ? '#1a1a2e' : '#1e1e35';
      ctx.fillRect(0, y0, w, ROW_H);

      // Row separator
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y0 + ROW_H);
      ctx.lineTo(w, y0 + ROW_H);
      ctx.stroke();

      // Label
      ctx.fillStyle = color;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 8, y0 + ROW_H / 2);

      if (buf.length === 0) continue;

      const isBoolean = typeof buf[0].v === 'boolean';
      const padY = 8;
      const plotH = ROW_H - padY * 2;

      if (isBoolean) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < buf.length; i++) {
          if (!buf[i].v) continue;
          const x1 = LABEL_W + ((buf[i].t - tMin) / tRange) * chartW;
          const x2 = i + 1 < buf.length
            ? LABEL_W + ((buf[i + 1].t - tMin) / tRange) * chartW
            : LABEL_W + chartW;
          if (x2 < LABEL_W || x1 > w) continue; // clip
          ctx.fillRect(Math.max(x1, LABEL_W), y0 + padY, Math.max(x2 - Math.max(x1, LABEL_W), 2), plotH);
        }
        ctx.globalAlpha = 1;
      } else {
        // Numeric: line chart with auto-scale
        let vMin = Infinity;
        let vMax = -Infinity;
        for (const pt of buf) {
          if (pt.t < tMin || pt.t > tMax) continue;
          const v = Number(pt.v);
          if (v < vMin) vMin = v;
          if (v > vMax) vMax = v;
        }
        if (vMin === Infinity) { vMin = 0; vMax = 1; }
        if (vMax === vMin) { vMin -= 1; vMax += 1; }
        const vRange = vMax - vMin;
        const margin = vRange * 0.1;
        vMin -= margin;
        vMax += margin;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < buf.length; i++) {
          const x = LABEL_W + ((buf[i].t - tMin) / tRange) * chartW;
          const v = Number(buf[i].v);
          const y = y0 + padY + plotH - ((v - vMin) / (vMax - vMin)) * plotH;
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#666';
        ctx.font = '9px system-ui';
        ctx.textBaseline = 'top';
        ctx.fillText(vMax.toFixed(1), LABEL_W + 2, y0 + 2);
        ctx.textBaseline = 'bottom';
        ctx.fillText(vMin.toFixed(1), LABEL_W + 2, y0 + ROW_H - 2);
      }
    }

    // Cursor line
    if (cursorX >= LABEL_W && cursorX < w) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, h);
      ctx.stroke();
      ctx.setLineDash([]);

      const t = tMin + ((cursorX - LABEL_W) / chartW) * tRange;
      const lines: string[] = [];
      for (const id of visible) {
        const buf = data.get(id) ?? [];
        const name = id.split('.').pop() ?? id;
        let val: any = '—';
        for (let i = buf.length - 1; i >= 0; i--) {
          if (buf[i].t <= t) { val = buf[i].v; break; }
        }
        if (typeof val === 'number') val = val.toFixed(2);
        lines.push(`${name}: ${val}`);
      }
      tooltip.textContent = lines.join('  |  ');
      tooltip.style.display = 'block';
      tooltip.style.left = `${Math.min(cursorX + 10, w - 200)}px`;
      tooltip.style.top = '4px';
    } else {
      tooltip.style.display = 'none';
    }

    ctx.restore();
  }

  // Mouse: cursor + pan
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    cursorX = e.clientX - rect.left;
    if (isPanning) {
      userInteracted = true;
      const dx = e.clientX - panStartX;
      const chartW = container.clientWidth - LABEL_W;
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
    if (e.clientX - rect.left >= LABEL_W) {
      isPanning = true;
      panStartX = e.clientX;
      panStartViewStart = viewStart;
      panStartViewEnd = viewEnd;
      canvas.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.style.cursor = 'crosshair';
  });

  // Mouse wheel: zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    if (mouseX < LABEL_W) return;

    userInteracted = true;
    const chartW = container.clientWidth - LABEL_W;
    const ratio = (mouseX - LABEL_W) / chartW; // 0..1 position
    const tRange = viewEnd - viewStart;
    const factor = e.deltaY > 0 ? 1.3 : 0.7; // scroll down = zoom out
    const newRange = tRange * factor;
    const anchor = viewStart + ratio * tRange;
    viewStart = anchor - ratio * newRange;
    viewEnd = anchor + (1 - ratio) * newRange;
    draw();
  }, { passive: false });

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
    container.innerHTML = '';
  }

  return { dispose };
}
