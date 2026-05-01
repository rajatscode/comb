// waveform/markers.ts — Dual cursor marker system

import type { WaveformMarker } from './types.js';
import { LABEL_W } from './types.js';

export function createMarkerSystem() {
  const markers: WaveformMarker[] = [];

  function setMarker(id: 'A' | 'B', timestamp: number): void {
    const existing = markers.find(m => m.id === id);
    if (existing) {
      existing.timestamp = timestamp;
    } else {
      markers.push({
        id,
        timestamp,
        color: id === 'A' ? '#eef4ff' : 'rgba(238,244,255,0.5)',
      });
    }
  }

  function getMarker(id: 'A' | 'B'): WaveformMarker | undefined {
    return markers.find(m => m.id === id);
  }

  function getDelta(): number | null {
    const a = getMarker('A');
    const b = getMarker('B');
    if (!a || !b) return null;
    return Math.abs(b.timestamp - a.timestamp);
  }

  function clear(): void {
    markers.length = 0;
  }

  function drawMarkers(
    ctx: CanvasRenderingContext2D,
    viewStart: number,
    viewEnd: number,
    chartW: number,
    height: number,
  ): void {
    const tRange = viewEnd - viewStart || 1;
    for (const marker of markers) {
      const x = LABEL_W + ((marker.timestamp - viewStart) / tRange) * chartW;
      if (x < LABEL_W || x > LABEL_W + chartW) continue;

      ctx.strokeStyle = marker.color;
      ctx.lineWidth = marker.id === 'A' ? 1.5 : 1;
      if (marker.id === 'B') ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = marker.color;
      ctx.font = 'bold 10px system-ui';
      ctx.textBaseline = 'top';
      ctx.fillText(marker.id, x + 3, 2);
    }

    // Delta display
    const delta = getDelta();
    if (delta !== null) {
      const label = `\u0394t = ${delta.toFixed(1)}ms`;
      ctx.fillStyle = 'rgba(238,244,255,0.8)';
      ctx.font = '10px "SF Mono", "Fira Code", monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';
      ctx.fillText(label, LABEL_W + chartW - 4, 4);
      ctx.textAlign = 'left';
    }
  }

  function handleClick(
    e: MouseEvent,
    canvasRect: DOMRect,
    viewStart: number,
    viewEnd: number,
    chartW: number,
  ): boolean {
    const mouseX = e.clientX - canvasRect.left;
    if (mouseX < LABEL_W) return false;

    const tRange = viewEnd - viewStart || 1;
    const t = viewStart + ((mouseX - LABEL_W) / chartW) * tRange;

    if (e.shiftKey) {
      setMarker('B', t);
    } else {
      setMarker('A', t);
    }
    return true;
  }

  return { markers, setMarker, getMarker, getDelta, clear, drawMarkers, handleClick };
}
