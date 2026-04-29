// Circuit Visualizer — renders the reactive graph as an interactive SVG
// Curved bezier wires, animated pulse dots, glowing nodes, live values.

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
  w: number;
  h: number;
}

const NODE_W = 88;
const NODE_H = 36;
const COL_GAP = 130;
const ROW_GAP = 60;
const PAD = 30;

const COLORS: Record<string, { stroke: string; fill: string; glow: string }> = {
  signal: { stroke: '#60a5fa', fill: '#60a5fa18', glow: '#60a5fa60' },
  comb:   { stroke: '#4ade80', fill: '#4ade8018', glow: '#4ade8060' },
  effect: { stroke: '#fbbf24', fill: '#fbbf2418', glow: '#fbbf2460' },
  fsm:    { stroke: '#c084fc', fill: '#c084fc18', glow: '#c084fc60' },
  clock:  { stroke: '#f472b6', fill: '#f472b618', glow: '#f472b660' },
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export class CircuitVisualizer {
  private container: HTMLElement;
  private svg: SVGSVGElement | null = null;
  private nodes = new Map<string, LayoutNode>();
  private wirePaths = new Map<string, SVGPathElement>();
  private nodeGroups = new Map<string, SVGGElement>();
  private valueTexts = new Map<string, SVGTextElement>();
  private nodeRects = new Map<string, SVGRectElement>();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  renderStatic(graph: StaticGraphData): void {
    if (!graph.modules || graph.modules.length === 0) return;
    const mod = graph.modules[0];
    if (mod.nodes.length === 0) return;
    this.layout(mod);
    this.draw(mod);
  }

  private layout(mod: StaticModuleData): void {
    this.nodes.clear();
    const cols: Record<string, StaticNodeData[]> = { signal: [], clock: [], comb: [], fsm: [], effect: [] };
    for (const n of mod.nodes) (cols[n.type] || cols.effect).push(n);

    const order = ['signal', 'clock', 'comb', 'fsm', 'effect'];
    let ci = 0;
    for (const type of order) {
      if (cols[type].length === 0) continue;
      for (let ri = 0; ri < cols[type].length; ri++) {
        const n = cols[type][ri];
        this.nodes.set(n.id, {
          id: n.id, name: n.name, type: n.type,
          x: PAD + ci * COL_GAP,
          y: PAD + ri * ROW_GAP,
          w: NODE_W, h: NODE_H,
        });
      }
      ci++;
    }
  }

  private draw(mod: StaticModuleData): void {
    const allNodes = Array.from(this.nodes.values());
    const vw = Math.max(...allNodes.map(n => n.x + n.w)) + PAD + 20;
    const vh = Math.max(...allNodes.map(n => n.y + n.h)) + PAD + 30;

    this.svg = svgEl('svg', { width: String(vw), height: String(vh), viewBox: `0 0 ${vw} ${vh}` });
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';

    // Defs: glow filters, arrow markers, pulse animation
    const defs = svgEl('defs');

    // Glow filter for active nodes
    for (const [type, c] of Object.entries(COLORS)) {
      const f = svgEl('filter', { id: `glow-${type}`, x: '-50%', y: '-50%', width: '200%', height: '200%' });
      const blur = svgEl('feGaussianBlur', { stdDeviation: '4', result: 'blur' });
      const flood = svgEl('feFlood', { 'flood-color': c.glow, result: 'color' });
      const comp = svgEl('feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'glow' });
      const merge = svgEl('feMerge');
      merge.appendChild(svgEl('feMergeNode', { in: 'glow' }));
      merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
      f.append(blur, flood, comp, merge);
      defs.appendChild(f);
    }

    // Wire glow filter
    const wf = svgEl('filter', { id: 'wire-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    const wBlur = svgEl('feGaussianBlur', { stdDeviation: '2', result: 'blur' });
    const wMerge = svgEl('feMerge');
    wMerge.appendChild(svgEl('feMergeNode', { in: 'blur' }));
    wMerge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
    wf.append(wBlur, wMerge);
    defs.appendChild(wf);

    // Arrow marker
    const marker = svgEl('marker', {
      id: 'arr', markerWidth: '6', markerHeight: '5', refX: '6', refY: '2.5', orient: 'auto',
    });
    marker.appendChild(svgEl('polygon', { points: '0 0, 6 2.5, 0 5', fill: '#3a3a4a' }));
    defs.appendChild(marker);

    this.svg.appendChild(defs);

    // Background grid pattern (subtle)
    for (let x = 0; x < vw; x += 20) {
      this.svg.appendChild(svgEl('line', {
        x1: String(x), y1: '0', x2: String(x), y2: String(vh),
        stroke: '#ffffff06', 'stroke-width': '0.5',
      }));
    }
    for (let y = 0; y < vh; y += 20) {
      this.svg.appendChild(svgEl('line', {
        x1: '0', y1: String(y), x2: String(vw), y2: String(y),
        stroke: '#ffffff06', 'stroke-width': '0.5',
      }));
    }

    // Draw wires as bezier curves
    for (const wire of mod.wires) {
      const from = this.nodes.get(wire.from);
      const to = this.nodes.get(wire.to);
      if (!from || !to) continue;

      const x1 = from.x + from.w;
      const y1 = from.y + from.h / 2;
      const x2 = to.x;
      const y2 = to.y + to.h / 2;
      const cx = (x1 + x2) / 2;

      const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
      const path = svgEl('path', {
        d, fill: 'none', stroke: '#2a2a3a', 'stroke-width': '1.5',
        'marker-end': 'url(#arr)',
      });
      path.style.transition = 'stroke 0.3s ease, stroke-width 0.3s ease';
      this.wirePaths.set(`${wire.from}->${wire.to}`, path);
      this.svg.appendChild(path);
    }

    // Draw nodes
    for (const [id, node] of this.nodes) {
      const c = COLORS[node.type] || COLORS.effect;
      const g = svgEl('g');

      // Outer glow rect (hidden by default, shown on pulse)
      const glowRect = svgEl('rect', {
        x: String(node.x - 2), y: String(node.y - 2),
        width: String(node.w + 4), height: String(node.h + 4),
        rx: '10', fill: 'none', stroke: c.stroke, 'stroke-width': '0', opacity: '0',
      });
      glowRect.style.transition = 'stroke-width 0.3s ease, opacity 0.3s ease';
      g.appendChild(glowRect);

      // Main rectangle
      const rect = svgEl('rect', {
        x: String(node.x), y: String(node.y),
        width: String(node.w), height: String(node.h),
        rx: '8', fill: c.fill, stroke: c.stroke, 'stroke-width': '1.5',
      });
      rect.style.transition = 'filter 0.3s ease';
      this.nodeRects.set(id, rect);
      g.appendChild(rect);

      // Type badge (tiny label)
      const badge = svgEl('text', {
        x: String(node.x + 6), y: String(node.y + 11),
        fill: c.stroke, 'font-family': 'monospace', 'font-size': '7', opacity: '0.6',
      });
      badge.textContent = node.type.toUpperCase().slice(0, 3);
      g.appendChild(badge);

      // Name label
      const label = svgEl('text', {
        x: String(node.x + node.w / 2), y: String(node.y + node.h / 2 + 5),
        'text-anchor': 'middle', fill: c.stroke,
        'font-family': "'JetBrains Mono', monospace", 'font-size': '11', 'font-weight': '600',
      });
      label.textContent = node.name;
      g.appendChild(label);

      // Value display (below node)
      const valText = svgEl('text', {
        x: String(node.x + node.w / 2), y: String(node.y + node.h + 16),
        'text-anchor': 'middle', fill: '#4ade80',
        'font-family': "'JetBrains Mono', monospace", 'font-size': '10', opacity: '0.5',
      });
      valText.textContent = '';
      this.valueTexts.set(id, valText);
      g.appendChild(valText);

      this.nodeGroups.set(id, g);
      this.svg.appendChild(g);
    }

    this.container.innerHTML = '';
    this.container.appendChild(this.svg);
  }

  onSignalChange(nodeId: string, value: any): void {
    // Update value text
    const valEl = this.valueTexts.get(nodeId);
    if (valEl) {
      const display = typeof value === 'string' ? `"${value}"` :
                      value === undefined ? '' : String(value);
      valEl.textContent = display;
      valEl.setAttribute('fill', '#fbbf24');
      valEl.setAttribute('opacity', '1');
      setTimeout(() => {
        valEl.setAttribute('fill', '#4ade80');
        valEl.setAttribute('opacity', '0.5');
      }, 600);
    }

    // Glow the node
    const rect = this.nodeRects.get(nodeId);
    if (rect) {
      const node = this.nodes.get(nodeId);
      const type = node?.type || 'signal';
      rect.setAttribute('filter', `url(#glow-${type})`);
      setTimeout(() => rect.removeAttribute('filter'), 500);
    }

    // Pulse outgoing wires with traveling dot
    for (const [key, path] of this.wirePaths) {
      if (key.startsWith(nodeId + '->')) {
        this.pulseWire(path);
      }
    }
  }

  private pulseWire(path: SVGPathElement): void {
    const node = this.nodes.get(path.getAttribute('d')?.split(' ')[1] || '');
    // Glow the wire
    path.setAttribute('stroke', '#7c5cff');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('filter', 'url(#wire-glow)');

    // Animate a dot traveling along the wire
    if (this.svg) {
      const dot = svgEl('circle', {
        r: '3', fill: '#7c5cff', opacity: '1',
      });
      const anim = svgEl('animateMotion', {
        dur: '0.4s', fill: 'freeze', repeatCount: '1',
      });
      const pathD = path.getAttribute('d') || '';
      const mpath = svgEl('mpath');
      // Create a temporary path element for the motion
      const tempPath = svgEl('path', { d: pathD, id: `_tmp_${Math.random().toString(36).slice(2)}` });
      if (this.svg.querySelector('defs')) {
        this.svg.querySelector('defs')!.appendChild(tempPath);
      }
      mpath.setAttribute('href', `#${tempPath.id}`);
      anim.appendChild(mpath);
      dot.appendChild(anim);
      this.svg.appendChild(dot);

      // Clean up after animation
      setTimeout(() => {
        dot.remove();
        tempPath.remove();
      }, 500);
    }

    setTimeout(() => {
      path.setAttribute('stroke', '#2a2a3a');
      path.setAttribute('stroke-width', '1.5');
      path.removeAttribute('filter');
    }, 500);
  }

  updateValues(values: Record<string, any>): void {
    for (const [id, value] of Object.entries(values)) {
      const valEl = this.valueTexts.get(id);
      if (valEl) valEl.textContent = String(value);
    }
  }

  destroy(): void {
    this.container.innerHTML = '';
    this.svg = null;
    this.nodes.clear();
    this.wirePaths.clear();
    this.nodeGroups.clear();
    this.valueTexts.clear();
    this.nodeRects.clear();
  }
}
