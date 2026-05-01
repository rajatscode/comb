// waveform/hierarchy.ts — Signal hierarchy browser grouped by module

import type { WaveformSignal } from './types.js';
import { COLORS } from './types.js';

interface HierarchyGroup {
  name: string;
  signals: WaveformSignal[];
  collapsed: boolean;
}

export function createHierarchyBrowser(
  container: HTMLElement,
  signals: WaveformSignal[],
  onToggleVisibility: (signalId: string) => void,
  onToggleRenderMode: (signalId: string) => void,
): { update: () => void; dispose: () => void } {
  const panel = document.createElement('div');
  panel.className = 'wf-hierarchy';
  panel.style.cssText = `
    display: flex; flex-direction: column; gap: 0;
    font-size: 0.7rem; font-family: "SF Mono", "Fira Code", monospace;
    max-height: 100%; overflow-y: auto; padding: 2px 0;
  `;
  container.appendChild(panel);

  const groups = new Map<string, HierarchyGroup>();

  function buildGroups() {
    groups.clear();
    for (const sig of signals) {
      let group = groups.get(sig.group);
      if (!group) {
        group = { name: sig.group, signals: [], collapsed: false };
        groups.set(sig.group, group);
      }
      group.signals.push(sig);
    }
  }

  function render() {
    panel.innerHTML = '';
    for (const [, group] of groups) {
      // Group header
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 3px 6px; cursor: pointer; color: var(--text-muted);
        display: flex; align-items: center; gap: 4px;
        user-select: none; font-weight: 600; font-size: 0.65rem;
        text-transform: uppercase; letter-spacing: 0.5px;
      `;
      header.innerHTML = `<span style="font-size:8px">${group.collapsed ? '\u25B6' : '\u25BC'}</span> ${group.name}`;
      header.addEventListener('click', () => {
        group.collapsed = !group.collapsed;
        render();
      });
      panel.appendChild(header);

      if (group.collapsed) continue;

      // Signal entries
      for (const sig of group.signals) {
        const entry = document.createElement('div');
        entry.style.cssText = `
          padding: 2px 6px 2px 18px; display: flex; align-items: center; gap: 6px;
          cursor: pointer; transition: background 0.1s;
          opacity: ${sig.visible ? '1' : '0.35'};
        `;
        entry.addEventListener('mouseenter', () => { entry.style.background = 'rgba(110,231,249,0.06)'; });
        entry.addEventListener('mouseleave', () => { entry.style.background = ''; });

        // Color dot
        const dot = document.createElement('span');
        dot.style.cssText = `width:8px; height:8px; border-radius:50%; background:${sig.color}; flex-shrink:0;`;

        // Signal name
        const name = document.createElement('span');
        name.style.cssText = `flex:1; color:${sig.visible ? sig.color : 'var(--text-faint)'}; font-size:0.68rem;`;
        name.textContent = sig.displayName;

        // Render mode toggle (right-click changes mode)
        const mode = document.createElement('span');
        mode.style.cssText = 'color:var(--text-faint); font-size:0.6rem; cursor:pointer;';
        mode.textContent = sig.renderMode === 'digital' ? '\u2581\u2582\u2583' : '\u223F';
        mode.title = `Click to toggle render mode (current: ${sig.renderMode})`;
        mode.addEventListener('click', (e) => {
          e.stopPropagation();
          onToggleRenderMode(sig.id);
          render();
        });

        entry.appendChild(dot);
        entry.appendChild(name);
        entry.appendChild(mode);

        entry.addEventListener('click', () => {
          onToggleVisibility(sig.id);
          render();
        });

        panel.appendChild(entry);
      }
    }
  }

  buildGroups();
  render();

  return {
    update() {
      buildGroups();
      render();
    },
    dispose() {
      panel.remove();
    },
  };
}

export function buildSignalList(
  signalIds: string[],
  extraSignals?: Array<{ id: string; displayName: string; group: string; type: WaveformSignal['type'] }>,
): WaveformSignal[] {
  const signals: WaveformSignal[] = signalIds.map((id, i) => {
    const parts = id.split('.');
    const displayName = parts.pop() ?? id;
    const group = parts.join('.') || 'signals';
    return {
      id,
      displayName,
      group,
      type: 'numeric' as const,
      visible: true,
      color: COLORS[i % COLORS.length],
      renderMode: 'analog' as const,
    };
  });

  if (extraSignals) {
    for (const extra of extraSignals) {
      signals.push({
        ...extra,
        visible: true,
        color: COLORS[signals.length % COLORS.length],
        renderMode: extra.type === 'boolean' ? 'digital' : 'analog',
      });
    }
  }

  return signals;
}
