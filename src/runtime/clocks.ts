// clocks.ts — Clock domains: timing sources as circuit graph nodes

import { circuit } from './circuit.js';
import { createSignal, batch } from './signals.js';

export type ClockConfig =
  | { type: 'interval'; interval: number }
  | { type: 'animationFrame' }
  | { type: 'idle' };

export interface ClockInstance {
  start: () => void;
  stop: () => void;
  onTick: (fn: () => void) => () => void;
  tickCount: () => number;
  readonly running: boolean;
}

export function createClock(
  name: string,
  moduleId: string,
  config: ClockConfig
): ClockInstance {
  const nodeId = circuit.registerClock(name, moduleId, config);
  const [tickCount, setTickCount] = createSignal(0, `${name}.tickCount`, moduleId);
  const subscribers = new Set<() => void>();
  let handle: number | null = null;
  let running = false;

  const tick = (): void => {
    batch(() => {
      setTickCount(c => c + 1);
      circuit.notifyChange(nodeId, undefined, Date.now());
      for (const fn of subscribers) {
        fn();
      }
    });
  };

  const start = (): void => {
    if (running) return;
    running = true;

    if (config.type === 'interval') {
      handle = window.setInterval(tick, config.interval);
    } else if (config.type === 'animationFrame') {
      const loop = (): void => {
        if (!running) return;
        tick();
        handle = window.requestAnimationFrame(loop);
      };
      handle = window.requestAnimationFrame(loop);
    } else if (config.type === 'idle') {
      const loop = (): void => {
        if (!running) return;
        tick();
        handle = (window as any).requestIdleCallback?.(loop) ?? window.setTimeout(loop, 50);
      };
      handle = (window as any).requestIdleCallback?.(loop) ?? window.setTimeout(loop, 50);
    }
  };

  const stop = (): void => {
    if (!running) return;
    running = false;
    if (handle !== null) {
      if (config.type === 'interval') {
        window.clearInterval(handle);
      } else if (config.type === 'animationFrame') {
        window.cancelAnimationFrame(handle);
      } else {
        // idle callback or fallback timeout
        if ((window as any).cancelIdleCallback) {
          (window as any).cancelIdleCallback(handle);
        } else {
          window.clearTimeout(handle);
        }
      }
      handle = null;
    }
  };

  const onTick = (fn: () => void): (() => void) => {
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
  };

  return {
    start,
    stop,
    onTick,
    tickCount,
    get running() { return running; },
  };
}
