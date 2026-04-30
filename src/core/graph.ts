// graph.ts — Static graph output from verification pass

export interface StaticGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'signal' | 'comb' | 'event' | 'sensitivity' | 'view-binding' | 'assert' | 'cell' | 'constraint';
  isToken?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'data' | 'trigger' | 'write';
}
