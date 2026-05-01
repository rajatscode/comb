// graph.ts — Static graph output from verification pass

export interface StaticGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  enums?: Record<string, string[]>;  // enum name → variant names (e.g. { MasterState: ["Idle","Requesting",...] })
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'signal' | 'comb' | 'event' | 'sensitivity' | 'view-binding' | 'view-effect' | 'assert' | 'cell' | 'constraint';
  isToken?: boolean;
  valueType?: string;   // 'int' | 'bool' | 'float' | 'string' | enum name
  states?: string[];    // finite state space (e.g. ['true','false'] for bool, ['MasterState.Idle',...] for enum)
  viewTarget?: { element: string; binding: string };
  expr?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'data' | 'trigger' | 'write';
}
