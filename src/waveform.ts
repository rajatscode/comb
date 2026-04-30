// waveform.ts — Canvas-based waveform viewer for CircuitGraph signal recording

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
  container.appendChild(canvas);

  let disposed = false;
  let cursorX = -1;

  const tooltip = document.createElement('div');
  tooltip.className = 'waveform-tooltip';
  tooltip.style.display = 'none';
  container.style.position = 'relative';
  container.appendChild(tooltip);

  function resize() {
    const w = container.clientWidth;
    const h = signalIds.length * ROW_H;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
  }

  function draw() {
    if (disposed) return;
    const w = container.clientWidth;
    const h = signalIds.length * ROW_H;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const data = circuit.getWaveformData();
    const chartW = w - LABEL_W;
    const now = Date.now();

    // Find global time range from all recorded data
    let tMin = now;
    let tMax = now;
    for (const id of signalIds) {
      const buf = data.get(id);
      if (buf && buf.length > 0) {
        if (buf[0].t < tMin) tMin = buf[0].t;
        if (buf[buf.length - 1].t > tMax) tMax = buf[buf.length - 1].t;
      }
    }
    // At least 5 seconds of range
    if (tMax - tMin < 5000) tMin = tMax - 5000;

    for (let row = 0; row < signalIds.length; row++) {
      const id = signalIds[row];
      const color = COLORS[row % COLORS.length];
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

      // Determine if boolean
      const isBoolean = typeof buf[0].v === 'boolean';
      const padY = 8;
      const plotH = ROW_H - padY * 2;

      if (isBoolean) {
        // Boolean: filled rectangles for true
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < buf.length; i++) {
          if (!buf[i].v) continue;
          const x1 = LABEL_W + ((buf[i].t - tMin) / (tMax - tMin)) * chartW;
          const x2 = i + 1 < buf.length
            ? LABEL_W + ((buf[i + 1].t - tMin) / (tMax - tMin)) * chartW
            : LABEL_W + chartW;
          ctx.fillRect(x1, y0 + padY, Math.max(x2 - x1, 2), plotH);
        }
        ctx.globalAlpha = 1;
      } else {
        // Numeric: line chart with auto-scale
        let vMin = Infinity;
        let vMax = -Infinity;
        for (const pt of buf) {
          const v = Number(pt.v);
          if (v < vMin) vMin = v;
          if (v > vMax) vMax = v;
        }
        if (vMax === vMin) { vMin -= 1; vMax += 1; }
        const vRange = vMax - vMin;
        const margin = vRange * 0.1;
        vMin -= margin;
        vMax += margin;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < buf.length; i++) {
          const x = LABEL_W + ((buf[i].t - tMin) / (tMax - tMin)) * chartW;
          const v = Number(buf[i].v);
          const y = y0 + padY + plotH - ((v - vMin) / (vMax - vMin)) * plotH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Y axis labels
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

      // Compute values at cursor time
      const t = tMin + ((cursorX - LABEL_W) / chartW) * (tMax - tMin);
      const lines: string[] = [];
      for (let row = 0; row < signalIds.length; row++) {
        const id = signalIds[row];
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

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    cursorX = e.clientX - rect.left;
    draw();
  });

  canvas.addEventListener('mouseleave', () => {
    cursorX = -1;
    draw();
  });

  resize();
  draw();

  const interval = setInterval(() => {
    if (!disposed) draw();
  }, 500);

  function dispose() {
    disposed = true;
    clearInterval(interval);
    container.innerHTML = '';
  }

  return { dispose };
}
