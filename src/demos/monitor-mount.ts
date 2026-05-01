// monitor-mount.ts — System monitor demo with edge-triggered alerts
// Shows @(posedge cpuHigh) and @(negedge cpuHigh) in action

import { Monitor, __graph } from '../generated/monitor.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { renderWaveform } from '../waveform/index.js';
import { circuit, batch } from '../runtime/index.js';

const M = 'Monitor';

export function mountMonitor(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'System Monitor',
    description: 'Edge-triggered alerts: @(posedge cpuHigh) fires ONCE when CPU crosses threshold. Not every tick. Not while above. Once.',
  });

  const el = document.createElement('div');
  shell.app.appendChild(el);
  const component = Monitor(el);

  const set = (name: string, v: any) => circuit.getNode(`${M}.${name}`)?.setValue?.(v);

  circuit.startRecording();

  // Waveform
  const wfDiv = document.createElement('div');
  wfDiv.style.maxHeight = '140px';
  wfDiv.style.overflow = 'hidden';
  shell.app.appendChild(wfDiv);
  const wf = renderWaveform(wfDiv, circuit, [`${M}.cpu`, `${M}.cpuAvg`, `${M}.cpuHigh`]);

  // Circuit graph
  renderCircuitGraph(shell.circuit, __graph as any, circuit);

  // Simulation: CPU spikes above threshold every ~15s
  const cpuHist: number[] = [];
  let t = 0;
  const iv = setInterval(() => {
    t++;
    const spike = (t % 30 > 20 && t % 30 < 28);
    const cpu = spike ? 75 + Math.random() * 20 : 20 + Math.random() * 30;
    const mem = 40 + 20 * Math.sin(t / 40) + Math.random() * 10;
    cpuHist.push(cpu);
    if (cpuHist.length > 10) cpuHist.shift();
    const avg = cpuHist.reduce((a, b) => a + b) / cpuHist.length;
    batch(() => {
      set('cpu', Math.round(cpu * 10) / 10);
      set('mem', Math.round(mem * 10) / 10);
      set('cpuAvg', Math.round(avg * 10) / 10);
    });
  }, 500);

  return {
    dispose() {
      clearInterval(iv);
      circuit.stopRecording();
      wf.dispose();
      component.dispose();
      shell.dispose();
    }
  };
}
