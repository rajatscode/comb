// waveform/renderer.ts — Canvas-based waveform rendering engine
// Supports analog (line), digital (step/VCD), boolean (filled), and assertion overlay modes

import type { WaveformSignal } from './types.js';
import { ROW_H, LABEL_W } from './types.js';

type WaveformData = Map<string, Array<{ t: number; v: any }>>;

export function drawWaveforms(
  ctx: CanvasRenderingContext2D,
  signals: WaveformSignal[],
  data: WaveformData,
  viewStart: number,
  viewEnd: number,
  width: number,
  cursorX: number,
): { tooltipLines: string[] } {
  const visible = signals.filter(s => s.visible);
  const height = Math.max(visible.length * ROW_H, ROW_H);
  const chartW = width - LABEL_W;
  const tRange = viewEnd - viewStart || 1;
  const tooltipLines: string[] = [];

  ctx.clearRect(0, 0, width, height);

  for (let row = 0; row < visible.length; row++) {
    const sig = visible[row];
    const y0 = row * ROW_H;
    const buf = data.get(sig.id) ?? [];

    // Row background
    ctx.fillStyle = row % 2 === 0 ? 'rgba(6,9,19,0.8)' : 'rgba(15,23,40,0.6)';
    ctx.fillRect(0, y0, width, ROW_H);

    // Row separator
    ctx.strokeStyle = 'rgba(154,168,189,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y0 + ROW_H - 0.5);
    ctx.lineTo(width, y0 + ROW_H - 0.5);
    ctx.stroke();

    // Label
    ctx.fillStyle = sig.color;
    ctx.font = '11px "SF Mono", "Fira Code", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(sig.displayName, 8, y0 + ROW_H / 2);

    if (buf.length === 0) continue;

    const isBoolean = typeof buf[0].v === 'boolean';
    const padY = 8;
    const plotH = ROW_H - padY * 2;

    if (sig.type === 'assertion') {
      drawAssertionOverlay(ctx, buf, y0, padY, plotH, sig.color, viewStart, tRange, chartW);
    } else if (isBoolean) {
      drawBooleanSignal(ctx, buf, y0, padY, plotH, sig.color, viewStart, tRange, chartW, width);
    } else if (sig.renderMode === 'digital') {
      drawDigitalSignal(ctx, buf, y0, padY, plotH, sig.color, viewStart, viewEnd, tRange, chartW);
    } else {
      drawAnalogSignal(ctx, buf, y0, padY, plotH, sig.color, viewStart, viewEnd, tRange, chartW);
    }

    // Tooltip value at cursor
    if (cursorX >= LABEL_W && cursorX < width) {
      const t = viewStart + ((cursorX - LABEL_W) / chartW) * tRange;
      let val: any = '\u2014';
      for (let i = buf.length - 1; i >= 0; i--) {
        if (buf[i].t <= t) { val = buf[i].v; break; }
      }
      if (typeof val === 'number') val = val.toFixed(2);
      tooltipLines.push(`${sig.displayName}: ${val}`);
    }
  }

  // Cursor line
  if (cursorX >= LABEL_W && cursorX < width) {
    ctx.strokeStyle = 'rgba(238,244,255,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  return { tooltipLines };
}

function drawBooleanSignal(
  ctx: CanvasRenderingContext2D,
  buf: Array<{ t: number; v: any }>,
  y0: number, padY: number, plotH: number,
  color: string,
  viewStart: number, tRange: number, chartW: number, width: number,
): void {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < buf.length; i++) {
    if (!buf[i].v) continue;
    const x1 = LABEL_W + ((buf[i].t - viewStart) / tRange) * chartW;
    const x2 = i + 1 < buf.length
      ? LABEL_W + ((buf[i + 1].t - viewStart) / tRange) * chartW
      : LABEL_W + chartW;
    if (x2 < LABEL_W || x1 > width) continue;
    ctx.fillRect(Math.max(x1, LABEL_W), y0 + padY, Math.max(x2 - Math.max(x1, LABEL_W), 2), plotH);
  }
  ctx.globalAlpha = 1;
}

function drawAnalogSignal(
  ctx: CanvasRenderingContext2D,
  buf: Array<{ t: number; v: any }>,
  y0: number, padY: number, plotH: number,
  color: string,
  viewStart: number, viewEnd: number, tRange: number, chartW: number,
): void {
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const pt of buf) {
    if (pt.t < viewStart || pt.t > viewEnd) continue;
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
    const x = LABEL_W + ((buf[i].t - viewStart) / tRange) * chartW;
    const v = Number(buf[i].v);
    const y = y0 + padY + plotH - ((v - vMin) / (vMax - vMin)) * plotH;
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = 'rgba(154,168,189,0.4)';
  ctx.font = '9px system-ui';
  ctx.textBaseline = 'top';
  ctx.fillText(vMax.toFixed(1), LABEL_W + 2, y0 + 2);
  ctx.textBaseline = 'bottom';
  ctx.fillText(vMin.toFixed(1), LABEL_W + 2, y0 + ROW_H - 2);
}

function drawDigitalSignal(
  ctx: CanvasRenderingContext2D,
  buf: Array<{ t: number; v: any }>,
  y0: number, padY: number, plotH: number,
  color: string,
  viewStart: number, viewEnd: number, tRange: number, chartW: number,
): void {
  // VCD-style: horizontal lines with vertical transitions
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const pt of buf) {
    if (pt.t < viewStart || pt.t > viewEnd) continue;
    const v = Number(pt.v);
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  if (vMin === Infinity) { vMin = 0; vMax = 1; }
  if (vMax === vMin) { vMin -= 1; vMax += 1; }
  const margin = (vMax - vMin) * 0.1;
  vMin -= margin;
  vMax += margin;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let started = false;
  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = LABEL_W + ((buf[i].t - viewStart) / tRange) * chartW;
    const v = Number(buf[i].v);
    const y = y0 + padY + plotH - ((v - vMin) / (vMax - vMin)) * plotH;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      // Step: horizontal to new x, then vertical to new y
      ctx.lineTo(x, prevY);
      ctx.lineTo(x, y);
    }
    prevX = x;
    prevY = y;
  }
  // Extend last value to end
  if (started) {
    ctx.lineTo(LABEL_W + chartW, prevY);
  }
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = 'rgba(154,168,189,0.4)';
  ctx.font = '9px system-ui';
  ctx.textBaseline = 'top';
  ctx.fillText(vMax.toFixed(1), LABEL_W + 2, y0 + 2);
  ctx.textBaseline = 'bottom';
  ctx.fillText(vMin.toFixed(1), LABEL_W + 2, y0 + ROW_H - 2);
}

function drawAssertionOverlay(
  ctx: CanvasRenderingContext2D,
  buf: Array<{ t: number; v: any }>,
  y0: number, padY: number, plotH: number,
  color: string,
  viewStart: number, tRange: number, chartW: number,
): void {
  // Assertion entries: { status: 'armed' | 'passed' | 'failed', start, end }
  for (const pt of buf) {
    const val = pt.v;
    if (!val || typeof val !== 'object') continue;
    const x1 = LABEL_W + ((val.start - viewStart) / tRange) * chartW;
    const x2 = LABEL_W + (((val.end || pt.t) - viewStart) / tRange) * chartW;
    const barColor = val.status === 'passed' ? '#72f1b8' :
                     val.status === 'failed' ? '#ff5d8f' : '#f8d66d';
    ctx.fillStyle = barColor;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x1, y0 + padY, Math.max(x2 - x1, 4), plotH);
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = barColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x1, y0 + padY, Math.max(x2 - x1, 4), plotH);
  }
}
