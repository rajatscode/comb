// fsm.ts — First-class state machines as circuit graph nodes

import { circuit } from './circuit.js';
import { createSignal, batch } from './signals.js';

export interface FSMTransition {
  event: string;
  guard?: () => boolean;
  target: string;
  action?: () => void;
}

export interface FSMStateConfig {
  name: string;
  onEnter?: () => void;
  onExit?: () => void;
  transitions: FSMTransition[];
}

export interface FSMInstance {
  state: () => string;
  send: (event: string) => void;
  matches: (stateName: string) => boolean;
}

export function createFSM(
  name: string,
  moduleId: string,
  states: FSMStateConfig[],
  initial: string
): FSMInstance {
  const stateMap = new Map<string, FSMStateConfig>();
  for (const s of states) {
    stateMap.set(s.name, s);
  }

  const stateNames = states.map(s => s.name);
  const nodeId = circuit.registerFSM(name, moduleId, stateNames, initial);

  const [state, setState] = createSignal(initial, `${name}.state`, moduleId);

  // Run initial state's onEnter
  const initialState = stateMap.get(initial);
  if (initialState?.onEnter) initialState.onEnter();

  const send = (event: string): void => {
    const currentState = state();
    const config = stateMap.get(currentState);
    if (!config) return;

    for (const transition of config.transitions) {
      if (transition.event !== event) continue;
      if (transition.guard && !transition.guard()) continue;

      const oldState = currentState;
      const targetConfig = stateMap.get(transition.target);

      batch(() => {
        // Exit old state
        if (config.onExit) config.onExit();

        // Run transition action
        if (transition.action) transition.action();

        // Enter new state
        setState(transition.target);

        // Enter callback
        if (targetConfig?.onEnter) targetConfig.onEnter();
      });

      circuit.updateFSMState(nodeId, transition.target, oldState);
      return;
    }
  };

  const matches = (stateName: string): boolean => state() === stateName;

  return { state, send, matches };
}
