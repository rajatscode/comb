// graph.ts — Static graph output from verification pass

export interface StaticGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'signal' | 'comb' | 'event' | 'view-binding' | 'assert';
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'data' | 'trigger' | 'write';
}
