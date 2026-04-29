// Circuit Visualizer — renders the reactive graph as an interactive SVG
// Consumes CircuitGraph (static metadata + live events) and produces
// an animated circuit diagram with wire pulses and signal value display.

export interface StaticGraphData {
  modules: StaticModuleData[];
}

export interface StaticModuleData {
  name: string;
  nodes: StaticNodeData[];
  wires: StaticWireData[];
}

export interface StaticNodeData {
  id: string;
  name: string;
  type: 'signal' | 'comb' | 'effect' | 'fsm' | 'clock';
  deps: string[];
}

export interface StaticWireData {
  from: string;
  to: string;
}

interface LayoutNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
}

interface LayoutWire {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const NODE_WIDTH = 80;
const NODE_HEIGHT = 32;
const COLUMN_SPACING = 140;
const ROW_SPACING = 56;
const PADDING = 40;

const TYPE_COLORS: Record<string, string> = {
  signal: '#60a5fa',
  comb: '#4ade80',
  effect: '#fbbf24',
  fsm: '#c084fc',
  clock: '#f472b6',
};

export class CircuitVisualizer {
  private container: HTMLElement;
  private svg: SVGSVGElement | null = null;
  private nodes: Map<string, LayoutNode> = new Map();
  private wires: LayoutWire[] = [];
  private wireElements: Map<string, SVGLineElement> = new Map();
  private valueElements: Map<string, SVGTextElement> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  renderStatic(graph: StaticGraphData): void {
    if (!graph.modules || graph.modules.length === 0) return;
    const mod = graph.modules[0]; // render first module
    this.layout(mod);
    this.draw();
  }

  private layout(mod: StaticModuleData): void {
    this.nodes.clear();
    this.wires = [];

    // Group nodes by type into columns
    const columns: Record<string, StaticNodeData[]> = {
      signal: [],
      clock: [],
      comb: [],
      fsm: [],
      effect: [],
    };

    for (const node of mod.nodes) {
      const col = columns[node.type] || columns['effect'];
      col.push(node);
    }

    // Layout columns left to right: signal → clock → comb → fsm → effect
    const columnOrder = ['signal', 'clock', 'comb', 'fsm', 'effect'];
    let colIndex = 0;

    for (const colType of columnOrder) {
      const nodesInCol = columns[colType];
      if (nodesInCol.length === 0) continue;

      for (let row = 0; row < nodesInCol.length; row++) {
        const node = nodesInCol[row];
        this.nodes.set(node.id, {
          id: node.id,
          name: node.name,
          type: node.type,
          x: PADDING + colIndex * COLUMN_SPACING,
          y: PADDING + row * ROW_SPACING,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        });
      }
      colIndex++;
    }

    // Layout wires
    for (const wire of mod.wires) {
      const fromNode = this.nodes.get(wire.from);
      const toNode = this.nodes.get(wire.to);
      if (fromNode && toNode) {
        this.wires.push({
          from: wire.from,
          to: wire.to,
          x1: fromNode.x + fromNode.width,
          y1: fromNode.y + fromNode.height / 2,
          x2: toNode.x,
          y2: toNode.y + toNode.height / 2,
        });
      }
    }
  }

  private draw(): void {
    const maxX = Math.max(...Array.from(this.nodes.values()).map(n => n.x + n.width)) + PADDING;
    const maxY = Math.max(...Array.from(this.nodes.values()).map(n => n.y + n.height)) + PADDING;

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', String(maxX));
    this.svg.setAttribute('height', String(maxY));
    this.svg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';

    // Defs for arrow markers and glow filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Arrow marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrowPath.setAttribute('points', '0 0, 8 3, 0 6');
    arrowPath.setAttribute('fill', '#3a3a4a');
    marker.appendChild(arrowPath);
    defs.appendChild(marker);

    // Glow filter
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'glow');
    const feGaussian = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussian.setAttribute('stdDeviation', '3');
    feGaussian.setAttribute('result', 'coloredBlur');
    filter.appendChild(feGaussian);
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMerge1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMerge1.setAttribute('in', 'coloredBlur');
    feMerge.appendChild(feMerge1);
    const feMerge2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMerge2.setAttribute('in', 'SourceGraphic');
    feMerge.appendChild(feMerge2);
    filter.appendChild(feMerge);
    defs.appendChild(filter);

    this.svg.appendChild(defs);

    // Draw wires first (behind nodes)
    for (const wire of this.wires) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(wire.x1));
      line.setAttribute('y1', String(wire.y1));
      line.setAttribute('x2', String(wire.x2));
      line.setAttribute('y2', String(wire.y2));
      line.setAttribute('stroke', '#3a3a4a');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('marker-end', 'url(#arrowhead)');
      line.classList.add('circuit-wire');
      line.dataset.from = wire.from;
      line.dataset.to = wire.to;
      this.wireElements.set(`${wire.from}->${wire.to}`, line);
      this.svg.appendChild(line);
    }

    // Draw nodes
    for (const [id, node] of this.nodes) {
      const color = TYPE_COLORS[node.type] || '#94a3b8';
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.dataset.nodeId = id;

      // Node rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(node.x));
      rect.setAttribute('y', String(node.y));
      rect.setAttribute('width', String(node.width));
      rect.setAttribute('height', String(node.height));
      rect.setAttribute('rx', '6');
      rect.setAttribute('fill', '#12121a');
      rect.setAttribute('stroke', color);
      rect.setAttribute('stroke-width', '1.5');
      g.appendChild(rect);

      // Type indicator (small dot)
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(node.x + 10));
      dot.setAttribute('cy', String(node.y + node.height / 2));
      dot.setAttribute('r', '3');
      dot.setAttribute('fill', color);
      g.appendChild(dot);

      // Name label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(node.x + 18));
      label.setAttribute('y', String(node.y + node.height / 2 + 4));
      label.setAttribute('fill', color);
      label.setAttribute('font-family', "'JetBrains Mono', monospace");
      label.setAttribute('font-size', '10');
      label.textContent = node.name;
      g.appendChild(label);

      // Value display (below node)
      const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valueText.setAttribute('x', String(node.x + node.width / 2));
      valueText.setAttribute('y', String(node.y + node.height + 14));
      valueText.setAttribute('text-anchor', 'middle');
      valueText.setAttribute('fill', '#4ade80');
      valueText.setAttribute('font-family', "'JetBrains Mono', monospace");
      valueText.setAttribute('font-size', '9');
      valueText.setAttribute('opacity', '0.7');
      valueText.textContent = '';
      this.valueElements.set(id, valueText);
      g.appendChild(valueText);

      this.svg.appendChild(g);
    }

    // Clear and mount
    this.container.innerHTML = '';
    this.container.appendChild(this.svg);
  }

  // Called when a signal value changes — updates the value display and pulses wires
  onSignalChange(nodeId: string, value: any): void {
    // Update value display
    const valEl = this.valueElements.get(nodeId);
    if (valEl) {
      valEl.textContent = String(value);
      valEl.setAttribute('fill', '#fbbf24');
      valEl.setAttribute('opacity', '1');
      setTimeout(() => {
        valEl.setAttribute('fill', '#4ade80');
        valEl.setAttribute('opacity', '0.7');
      }, 400);
    }

    // Pulse outgoing wires
    for (const [key, wire] of this.wireElements) {
      if (key.startsWith(nodeId + '->')) {
        this.pulseWire(wire);
      }
    }
  }

  private pulseWire(wire: SVGLineElement): void {
    wire.setAttribute('stroke', '#7c5cff');
    wire.setAttribute('stroke-width', '3');
    wire.setAttribute('filter', 'url(#glow)');
    setTimeout(() => {
      wire.setAttribute('stroke', '#3a3a4a');
      wire.setAttribute('stroke-width', '1.5');
      wire.removeAttribute('filter');
    }, 500);
  }

  // Bulk update values (e.g., from iframe postMessage)
  updateValues(values: Record<string, any>): void {
    for (const [id, value] of Object.entries(values)) {
      const valEl = this.valueElements.get(id);
      if (valEl) {
        valEl.textContent = String(value);
      }
    }
  }

  destroy(): void {
    this.container.innerHTML = '';
    this.svg = null;
    this.nodes.clear();
    this.wires = [];
    this.wireElements.clear();
    this.valueElements.clear();
  }
}
