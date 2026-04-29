// circuit.ts — The CircuitGraph: first-class, introspectable reactive dependency graph

export type NodeId = string;
export type NodeType = 'signal' | 'comb' | 'effect' | 'fsm' | 'clock';

export interface CircuitNode {
  id: NodeId;
  name: string;
  type: NodeType;
  moduleId: string;
  value: () => any;
  dependencies: Set<NodeId>;
  dependents: Set<NodeId>;
  metadata: Record<string, any>;
  dirty: boolean;
}

export interface Wire {
  from: NodeId;
  to: NodeId;
  lastPulse: number;
}

export interface CircuitEvent {
  type: 'signal-change' | 'comb-recompute' | 'fsm-transition' | 'clock-tick' | 'effect-run';
  nodeId: NodeId;
  timestamp: number;
  oldValue?: any;
  newValue?: any;
  fromState?: string;
  toState?: string;
}

const EVENT_BUFFER_SIZE = 256;

export class CircuitGraph {
  private nodes = new Map<NodeId, CircuitNode>();
  private wires = new Map<string, Wire>();
  private events: CircuitEvent[] = [];
  private listeners = new Set<(event: CircuitEvent) => void>();
  private idCounter = 0;

  private nextId(prefix: string): NodeId {
    return `${prefix}_${++this.idCounter}`;
  }

  // --- Registration ---

  registerSignal(name: string, moduleId: string, getter: () => any): NodeId {
    const id = this.nextId('sig');
    this.nodes.set(id, {
      id, name, type: 'signal', moduleId, value: getter,
      dependencies: new Set(), dependents: new Set(),
      metadata: {}, dirty: false,
    });
    return id;
  }

  registerComb(name: string, moduleId: string, deps: NodeId[], getter: () => any): NodeId {
    const id = this.nextId('comb');
    const node: CircuitNode = {
      id, name, type: 'comb', moduleId, value: getter,
      dependencies: new Set(deps), dependents: new Set(),
      metadata: {}, dirty: true,
    };
    this.nodes.set(id, node);
    for (const dep of deps) {
      this.addWire(dep, id);
    }
    return id;
  }

  registerEffect(name: string, moduleId: string, deps: NodeId[]): NodeId {
    const id = this.nextId('eff');
    const node: CircuitNode = {
      id, name, type: 'effect', moduleId, value: () => undefined,
      dependencies: new Set(deps), dependents: new Set(),
      metadata: {}, dirty: false,
    };
    this.nodes.set(id, node);
    for (const dep of deps) {
      this.addWire(dep, id);
    }
    return id;
  }

  registerFSM(name: string, moduleId: string, states: string[], initial: string): NodeId {
    const id = this.nextId('fsm');
    this.nodes.set(id, {
      id, name, type: 'fsm', moduleId, value: () => initial,
      dependencies: new Set(), dependents: new Set(),
      metadata: { states, currentState: initial }, dirty: false,
    });
    return id;
  }

  registerClock(name: string, moduleId: string, config: Record<string, any>): NodeId {
    const id = this.nextId('clk');
    this.nodes.set(id, {
      id, name, type: 'clock', moduleId, value: () => Date.now(),
      dependencies: new Set(), dependents: new Set(),
      metadata: { config }, dirty: false,
    });
    return id;
  }

  addWire(from: NodeId, to: NodeId): void {
    const key = `${from}->${to}`;
    if (this.wires.has(key)) return;
    this.wires.set(key, { from, to, lastPulse: 0 });
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);
    if (fromNode) fromNode.dependents.add(to);
    if (toNode) toNode.dependencies.add(from);
  }

  // --- Notification ---

  notifyChange(nodeId: NodeId, oldVal: any, newVal: any): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const eventType: CircuitEvent['type'] =
      node.type === 'signal' ? 'signal-change' :
      node.type === 'comb' ? 'comb-recompute' :
      node.type === 'fsm' ? 'fsm-transition' :
      node.type === 'clock' ? 'clock-tick' : 'effect-run';

    const event: CircuitEvent = {
      type: eventType, nodeId, timestamp: Date.now(),
      oldValue: oldVal, newValue: newVal,
    };

    if (this.events.length >= EVENT_BUFFER_SIZE) {
      this.events.shift();
    }
    this.events.push(event);

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  markWireActive(from: NodeId, to: NodeId): void {
    const key = `${from}->${to}`;
    const wire = this.wires.get(key);
    if (wire) wire.lastPulse = Date.now();
  }

  // --- Query ---

  getNodes(): CircuitNode[] {
    return [...this.nodes.values()];
  }

  getWires(): Wire[] {
    return [...this.wires.values()];
  }

  getNode(id: NodeId): CircuitNode | undefined {
    return this.nodes.get(id);
  }

  getModule(moduleId: string): { nodes: CircuitNode[]; wires: Wire[] } {
    const nodes = this.getNodes().filter(n => n.moduleId === moduleId);
    const nodeIds = new Set(nodes.map(n => n.id));
    const wires = this.getWires().filter(w => nodeIds.has(w.from) || nodeIds.has(w.to));
    return { nodes, wires };
  }

  getRecentEvents(n = 50): CircuitEvent[] {
    return this.events.slice(-n);
  }

  // --- Live subscription ---

  subscribe(listener: (event: CircuitEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  // --- Snapshot ---

  snapshot(): object {
    return {
      nodes: this.getNodes().map(n => ({
        id: n.id, name: n.name, type: n.type, moduleId: n.moduleId,
        dependencies: [...n.dependencies], dependents: [...n.dependents],
        dirty: n.dirty, metadata: n.metadata,
      })),
      wires: this.getWires().map(w => ({ from: w.from, to: w.to, lastPulse: w.lastPulse })),
      events: this.events.slice(-20),
    };
  }

  // --- Update helpers for dynamic wiring ---

  updateNodeValue(id: NodeId, getter: () => any): void {
    const node = this.nodes.get(id);
    if (node) node.value = getter;
  }

  updateFSMState(id: NodeId, state: string, oldState: string): void {
    const node = this.nodes.get(id);
    if (node) {
      node.metadata.currentState = state;
      node.value = () => state;
      const event: CircuitEvent = {
        type: 'fsm-transition', nodeId: id, timestamp: Date.now(),
        fromState: oldState, toState: state,
      };
      if (this.events.length >= EVENT_BUFFER_SIZE) this.events.shift();
      this.events.push(event);
      for (const listener of this.listeners) listener(event);
    }
  }
  reset(): void {
    this.nodes.clear();
    this.wires.clear();
    this.events = [];
    this.idCounter = 0;
  }
}

export const circuit = new CircuitGraph();
