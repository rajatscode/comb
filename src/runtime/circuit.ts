// circuit.ts — CircuitGraph: introspectable reactive dependency graph

export type NodeType = 'signal' | 'comb' | 'effect';

export interface GraphNode {
  id: string;
  name: string;
  module: string;
  type: NodeType;
  valueType?: string;
  deps: string[];
  getValue: (() => any) | null;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphEvent {
  type: 'signal-change' | 'comb-recompute' | 'effect-run';
  nodeId: string;
  timestamp: number;
  oldValue?: any;
  newValue?: any;
}

const EVENT_BUFFER_SIZE = 256;

export class CircuitGraph {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private events: GraphEvent[] = [];
  private listeners = new Set<(event: GraphEvent) => void>();

  registerNode(info: { name: string; module: string; type: NodeType; deps?: string[]; valueType?: string }): string {
    const id = `${info.module}.${info.name}`;
    this.nodes.set(id, {
      id,
      name: info.name,
      module: info.module,
      type: info.type,
      valueType: info.valueType,
      deps: info.deps ?? [],
      getValue: null,
    });
    if (info.deps) {
      for (const dep of info.deps) {
        const depId = `${info.module}.${dep}`;
        this.edges.push({ from: depId, to: id });
      }
    }
    return id;
  }

  setNodeValue(nodeId: string, getter: () => any): void {
    const node = this.nodes.get(nodeId);
    if (node) node.getValue = getter;
  }

  notifyChange(nodeId: string, oldValue: any, newValue: any): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    const eventType: GraphEvent['type'] =
      node.type === 'signal' ? 'signal-change' :
      node.type === 'comb' ? 'comb-recompute' : 'effect-run';
    const event: GraphEvent = { type: eventType, nodeId, timestamp: Date.now(), oldValue, newValue };
    if (this.events.length >= EVENT_BUFFER_SIZE) this.events.shift();
    this.events.push(event);
    for (const listener of this.listeners) listener(event);
  }

  notifyEffect(nodeId: string): void {
    const event: GraphEvent = { type: 'effect-run', nodeId, timestamp: Date.now() };
    if (this.events.length >= EVENT_BUFFER_SIZE) this.events.shift();
    this.events.push(event);
    for (const listener of this.listeners) listener(event);
  }

  subscribe(listener: (event: GraphEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getNodes(): GraphNode[] { return [...this.nodes.values()]; }
  getEdges(): GraphEdge[] { return [...this.edges]; }
  getNode(id: string): GraphNode | undefined { return this.nodes.get(id); }

  getModuleNodes(module: string): GraphNode[] {
    return this.getNodes().filter(n => n.module === module);
  }

  getRecentEvents(n = 50): GraphEvent[] {
    return this.events.slice(-n);
  }

  snapshot(): object {
    return {
      nodes: this.getNodes().map(n => ({
        id: n.id, name: n.name, module: n.module, type: n.type,
        deps: n.deps, valueType: n.valueType,
        value: n.getValue ? n.getValue() : undefined,
      })),
      edges: this.getEdges(),
      recentEvents: this.events.slice(-20),
    };
  }

  reset(): void {
    this.nodes.clear();
    this.edges = [];
    this.events = [];
    this.listeners.clear();
  }
}

export const circuit = new CircuitGraph();
