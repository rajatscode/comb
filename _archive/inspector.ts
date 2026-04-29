// Signal Inspector — live panel showing all signal names and values
// Subscribes to CircuitGraph events and updates in real-time.
// Mount alongside any Comb demo for instant circuit introspection.

import type { CircuitGraph, CircuitEvent, CircuitNode } from './runtime/circuit';

export class SignalInspector {
  private container: HTMLElement;
  private graph: CircuitGraph | null = null;
  private unsubscribe: (() => void) | null = null;
  private rows = new Map<string, HTMLElement>();
  private collapsed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  attach(graph: CircuitGraph): void {
    this.graph = graph;
    this.buildRows();
    this.unsubscribe = graph.subscribe((event) => this.onEvent(event));
  }

  detach(): void {
    if (this.unsubscribe) this.unsubscribe();
    this.graph = null;
    this.rows.clear();
  }

  private render(): void {
    this.container.className = 'signal-inspector';
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.style.cursor = 'pointer';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const title = document.createElement('span');
    title.textContent = 'Signals';
    header.appendChild(title);

    const toggle = document.createElement('span');
    toggle.textContent = '▼';
    toggle.style.fontSize = '0.6rem';
    header.appendChild(toggle);

    const body = document.createElement('div');
    body.className = 'inspector-body';

    header.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      body.style.display = this.collapsed ? 'none' : 'block';
      toggle.textContent = this.collapsed ? '▶' : '▼';
    });

    this.container.appendChild(header);
    this.container.appendChild(body);
  }

  private buildRows(): void {
    if (!this.graph) return;
    const body = this.container.querySelector('.inspector-body') as HTMLElement;
    if (!body) return;
    body.innerHTML = '';
    this.rows.clear();

    const nodes = this.graph.getNodes().filter(
      (n: CircuitNode) => n.type === 'signal' || n.type === 'comb' || n.type === 'fsm'
    );

    for (const node of nodes) {
      const row = document.createElement('div');
      row.className = 'signal-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'signal-name';
      const typePrefix = node.type === 'signal' ? 'sig' :
                         node.type === 'comb' ? 'comb' : 'fsm';
      nameSpan.textContent = `${typePrefix} ${node.name}`;
      row.appendChild(nameSpan);

      const valueSpan = document.createElement('span');
      valueSpan.className = 'signal-value';
      valueSpan.textContent = formatValue(node.value());
      row.appendChild(valueSpan);

      body.appendChild(row);
      this.rows.set(node.id, valueSpan);
    }
  }

  private onEvent(event: CircuitEvent): void {
    if (event.type === 'signal-change' || event.type === 'comb-recompute') {
      const valueEl = this.rows.get(event.nodeId);
      if (valueEl) {
        valueEl.textContent = formatValue(event.newValue);
        // Flash animation
        valueEl.classList.add('changed');
        setTimeout(() => valueEl.classList.remove('changed'), 400);
      }
    } else if (event.type === 'fsm-transition') {
      const valueEl = this.rows.get(event.nodeId);
      if (valueEl) {
        valueEl.textContent = event.toState || '';
        valueEl.classList.add('changed');
        setTimeout(() => valueEl.classList.remove('changed'), 400);
      }
    }
  }

  destroy(): void {
    this.detach();
    this.container.innerHTML = '';
  }
}

function formatValue(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (Array.isArray(val)) return `[${val.length}]`;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
