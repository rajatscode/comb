// visualizer.ts — CircuitGraph live visualizer
// Renders static graph topology with live value updates and pulse animations

import type { StaticGraph, GraphNode as StaticNode, GraphEdge as StaticEdge } from './core/graph.js';
import type { CircuitGraph, GraphEvent } from './runtime/circuit.js';

interface NodeLayout {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  el: HTMLDivElement;
  valueEl: HTMLSpanElement;
}

interface EdgeLayout {
  from: string;
  to: string;
  type: string;
}

const ROW_GAP = 10;
const PAD_X = 16;
const COLORS: Record<string, string> = {
  signal: '#4a9eff',
  comb: '#4ae04a',
  event: '#ff9f43',
  'view-binding': '#c084fc',
  effect: '#c084fc',
};

export function renderCircuitGraph(
  container: HTMLElement,
  graph: StaticGraph,
  circuit?: CircuitGraph,
): { dispose: () => void } {
  container.innerHTML = '';
  container.style.position = 'relative';
  container.style.overflow = 'hidden';

  let unsub: (() => void) | undefined;
  let disposed = false;

  // Defer layout until the container has been laid out by the browser
  requestAnimationFrame(() => {
    if (disposed) return;
    buildLayout(container, graph, circuit, (u) => { unsub = u; });
  });

  function dispose() {
    disposed = true;
    unsub?.();
    container.innerHTML = '';
  }

  return { dispose };
}

function buildLayout(
  container: HTMLElement,
  graph: StaticGraph,
  circuit: CircuitGraph | undefined,
  setUnsub: (u: () => void) => void,
) {
  // Categorize nodes into columns
  const columns: Record<string, StaticNode[]> = {
    signal: [],
    comb: [],
    event: [],
    'view-binding': [],
  };
  for (const node of graph.nodes) {
    (columns[node.type] ?? columns['event']).push(node);
  }

  const colOrder = ['signal', 'comb', 'event', 'view-binding'];
  const activeCols = colOrder.filter(c => columns[c].length > 0);

  // Compute layout — fit all columns within container
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const nCols = activeCols.length;
  const availW = cw - PAD_X * 2;
  const NODE_W = Math.min(120, Math.max(80, Math.floor(availW / nCols * 0.5)));
  const COL_GAP = nCols > 1 ? Math.floor((availW - nCols * NODE_W) / (nCols - 1)) : 0;

  // Compute NODE_H to fit tallest column in container
  const maxRows = Math.max(...activeCols.map(c => columns[c].length));
  const availH = ch - 40; // 40px for headers + padding
  const NODE_H = Math.min(50, Math.max(36, Math.floor((availH - (maxRows - 1) * ROW_GAP) / maxRows)));

  const nodeLayouts = new Map<string, NodeLayout>();
  const edgeLayouts: EdgeLayout[] = [];

  for (let ci = 0; ci < activeCols.length; ci++) {
    const colType = activeCols[ci];
    const colNodes = columns[colType];
    const x = PAD_X + ci * (NODE_W + COL_GAP);
    const totalH = colNodes.length * (NODE_H + ROW_GAP) - ROW_GAP;
    const offsetY = Math.max(24, (ch - totalH) / 2);

    for (let ri = 0; ri < colNodes.length; ri++) {
      const node = colNodes[ri];
      const y = offsetY + ri * (NODE_H + ROW_GAP);
      const { el, valueEl } = createNodeEl(node, COLORS[node.type] ?? '#888', NODE_W, NODE_H);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      container.appendChild(el);
      nodeLayouts.set(node.id, { id: node.id, name: node.name, type: node.type, x, y, w: NODE_W, h: NODE_H, el, valueEl });
    }
  }

  for (const edge of graph.edges) {
    edgeLayouts.push({ from: edge.from, to: edge.to, type: edge.type });
  }

  // Canvas for edges
  const baseCanvas = document.createElement('canvas');
  baseCanvas.style.position = 'absolute';
  baseCanvas.style.top = '0';
  baseCanvas.style.left = '0';
  baseCanvas.style.pointerEvents = 'none';
  container.appendChild(baseCanvas);

  const pulseCanvas = document.createElement('canvas');
  pulseCanvas.style.position = 'absolute';
  pulseCanvas.style.top = '0';
  pulseCanvas.style.left = '0';
  pulseCanvas.style.pointerEvents = 'none';
  container.appendChild(pulseCanvas);

  function resizeCanvases() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    for (const c of [baseCanvas, pulseCanvas]) {
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      c.getContext('2d')!.scale(dpr, dpr);
    }
  }
  resizeCanvases();

  function drawBaseEdges() {
    const ctx = baseCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    for (const edge of edgeLayouts) {
      const from = nodeLayouts.get(edge.from);
      const to = nodeLayouts.get(edge.to);
      if (!from || !to) continue;
      drawBezier(ctx, from, to, edgeColor(edge.type), 1.5, 0.4);
    }
  }
  drawBaseEdges();

  // Pulse animation state
  const activePulses: { from: string; to: string; start: number; duration: number }[] = [];
  let animating = false;

  function triggerPulse(fromId: string) {
    const now = performance.now();
    for (const edge of edgeLayouts) {
      if (edge.from === fromId) {
        activePulses.push({ from: edge.from, to: edge.to, start: now, duration: 300 });
      }
    }
    if (!animating) {
      animating = true;
      requestAnimationFrame(animatePulses);
    }
  }

  function animatePulses(time: number) {
    const ctx = pulseCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, pulseCanvas.width, pulseCanvas.height);

    let i = activePulses.length;
    while (i--) {
      const pulse = activePulses[i];
      const t = (time - pulse.start) / pulse.duration;
      if (t > 1) {
        const targetNode = nodeLayouts.get(pulse.to);
        if (targetNode) flashNode(targetNode);
        activePulses.splice(i, 1);
        continue;
      }

      const from = nodeLayouts.get(pulse.from);
      const to = nodeLayouts.get(pulse.to);
      if (!from || !to) { activePulses.splice(i, 1); continue; }

      drawBezier(ctx, from, to, edgeColor('active'), 2.5, 0.8);

      const pt = bezierPoint(from, to, t);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    if (activePulses.length > 0) {
      requestAnimationFrame(animatePulses);
    } else {
      animating = false;
    }
  }

  function flashNode(layout: NodeLayout) {
    layout.el.classList.add('active');
    setTimeout(() => layout.el.classList.remove('active'), 300);
  }

  // Live mode — subscribe to circuit events
  if (circuit) {
    // Detect module name from circuit's registered nodes
    const allNodes = circuit.getNodes();
    const firstNode = allNodes[0];
    const moduleName = firstNode ? firstNode.id.split('.')[0] : '';

    for (const [id, layout] of nodeLayouts) {
      const runtimeNode = circuit.getNode(`${moduleName}.${layout.name}`);
      if (runtimeNode?.getValue) {
        const val = runtimeNode.getValue();
        layout.valueEl.textContent = formatValue(val);
      }
    }

    const unsub = circuit.subscribe((event: GraphEvent) => {
      const name = event.nodeId.split('.').pop() ?? '';
      const layout = nodeLayouts.get(name);
      if (layout) {
        if (event.newValue !== undefined) {
          layout.valueEl.textContent = formatValue(event.newValue);
        }
        flashNode(layout);
        triggerPulse(layout.id);
      }
    });
    setUnsub(unsub);
  }

  // Column headers
  for (let ci = 0; ci < activeCols.length; ci++) {
    const colType = activeCols[ci];
    const x = PAD_X + ci * (NODE_W + COL_GAP);
    const header = document.createElement('div');
    header.className = 'circuit-col-header';
    header.textContent = colType === 'view-binding' ? 'VIEW' : colType.toUpperCase() + 'S';
    header.style.position = 'absolute';
    header.style.left = `${x}px`;
    header.style.top = '4px';
    header.style.width = `${NODE_W}px`;
    header.style.textAlign = 'center';
    header.style.fontSize = '10px';
    header.style.letterSpacing = '1px';
    header.style.color = COLORS[colType] ?? '#888';
    header.style.opacity = '0.6';
    header.style.textTransform = 'uppercase';
    container.appendChild(header);
  }
}

function createNodeEl(node: StaticNode, color: string, nodeW: number, nodeH: number = 50): { el: HTMLDivElement; valueEl: HTMLSpanElement } {
  const el = document.createElement('div');
  el.className = `circuit-node circuit-node-${node.type}`;
  el.style.position = 'absolute';
  el.style.width = `${nodeW}px`;
  el.style.height = `${nodeH}px`;
  el.style.borderLeft = `3px solid ${color}`;
  el.style.color = color;

  const nameEl = document.createElement('div');
  nameEl.className = 'circuit-node-name';
  nameEl.textContent = node.name;
  el.appendChild(nameEl);

  const valueEl = document.createElement('span');
  valueEl.className = 'circuit-node-value';
  valueEl.textContent = '—';
  el.appendChild(valueEl);

  return { el, valueEl };
}

function edgeColor(type: string): string {
  if (type === 'active') return '#fff';
  if (type === 'write') return '#ff9f43';
  if (type === 'trigger') return '#ff6b6b';
  return '#4a9eff';
}

function drawBezier(
  ctx: CanvasRenderingContext2D,
  from: NodeLayout,
  to: NodeLayout,
  color: string,
  lineWidth: number,
  alpha: number,
) {
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x;
  const y2 = to.y + to.h / 2;
  const cpOffset = Math.abs(x2 - x1) * 0.4;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(x1 + cpOffset, y1, x2 - cpOffset, y2, x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function bezierPoint(from: NodeLayout, to: NodeLayout, t: number): { x: number; y: number } {
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x;
  const y2 = to.y + to.h / 2;
  const cpOffset = Math.abs(x2 - x1) * 0.4;

  const cx1 = x1 + cpOffset;
  const cy1 = y1;
  const cx2 = x2 - cpOffset;
  const cy2 = y2;

  const u = 1 - t;
  return {
    x: u * u * u * x1 + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * x2,
    y: u * u * u * y1 + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * y2,
  };
}

function formatValue(val: any): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'string') return val.length > 16 ? val.slice(0, 14) + '..' : val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  return JSON.stringify(val).slice(0, 16);
}
