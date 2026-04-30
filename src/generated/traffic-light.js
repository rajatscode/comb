<<<<<<< HEAD
import { createSignal, createComb, createEffect, batch, createScope, circuit } from '../runtime/index.js';
||||||| b68c2e9
import { createSignal, createComb, createEffect, batch } from '../runtime/signals.js';
=======
import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';
>>>>>>> worktree-agent-ae5d93b0

export const __graph = {
  "nodes": [
    {
      "id": "phase",
      "name": "phase",
      "type": "signal"
    },
    {
      "id": "walk_requested",
      "name": "walk_requested",
      "type": "signal"
    },
    {
      "id": "emergency",
      "name": "emergency",
      "type": "signal"
    },
    {
      "id": "color",
      "name": "color",
      "type": "comb"
    },
    {
      "id": "can_walk",
      "name": "can_walk",
      "type": "comb"
    },
    {
      "id": "event:next_phase",
      "name": "next_phase",
      "type": "event"
    },
    {
      "id": "event:request_walk",
      "name": "request_walk",
      "type": "event"
    },
    {
      "id": "event:toggle_emergency",
      "name": "toggle_emergency",
      "type": "event"
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "div",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:color",
      "name": "view:color",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:if:can_walk",
      "name": "view:if:can_walk",
      "type": "view-effect",
      "viewTarget": {
        "element": "div.status",
        "binding": "if"
      }
    },
    {
      "id": "view:if:emergency",
      "name": "view:if:emergency",
      "type": "view-effect",
      "viewTarget": {
        "element": "div.status",
        "binding": "if"
      }
    },
    {
      "id": "view:emergency",
      "name": "view:emergency",
      "type": "view-effect",
      "viewTarget": {
        "element": "button",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "phase",
      "to": "color",
      "type": "data"
    },
    {
      "from": "phase",
      "to": "can_walk",
      "type": "data"
    },
    {
      "from": "walk_requested",
      "to": "can_walk",
      "type": "data"
    },
    {
      "from": "event:next_phase",
      "to": "phase",
      "type": "write"
    },
    {
      "from": "event:next_phase",
      "to": "walk_requested",
      "type": "write"
    },
    {
      "from": "event:request_walk",
      "to": "walk_requested",
      "type": "write"
    },
    {
      "from": "event:toggle_emergency",
      "to": "emergency",
      "type": "write"
    },
    {
      "from": "color",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "color",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "color",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "color",
      "to": "view:color",
      "type": "data"
    },
    {
      "from": "can_walk",
      "to": "view:if:can_walk",
      "type": "data"
    },
    {
      "from": "emergency",
      "to": "view:if:emergency",
      "type": "data"
    },
    {
      "from": "emergency",
      "to": "view:emergency",
      "type": "data"
    }
  ]
};

export function TrafficLight(root) {
  const $m = 'TrafficLight';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const Phase = Object.freeze({
    Red: 'Phase.Red',
    Green: 'Phase.Green',
    Yellow: 'Phase.Yellow',
  });

  const [phase, setPhase] = createSignal(Phase.Red, { name: 'phase', module: $m, type: 'Phase' });

  const [walk_requested, setWalk_requested] = createSignal(false, { name: 'walk_requested', module: $m, type: 'bool' });

  const [emergency, setEmergency] = createSignal(false, { name: 'emergency', module: $m, type: 'bool' });

  const color = createComb(() => ((phase() == Phase.Red) ? "red" : ((phase() == Phase.Green) ? "green" : "yellow")), { name: 'color', module: $m, deps: ["phase"] });

  const can_walk = createComb(() => ((phase() == Phase.Red) && walk_requested()), { name: 'can_walk', module: $m, deps: ["phase","walk_requested"] });

  function next_phase() {
    batch(() => {
      if (emergency()) {
        setPhase(Phase.Red);
      } else {
        setPhase(((phase() == Phase.Red) ? Phase.Green : ((phase() == Phase.Green) ? Phase.Yellow : Phase.Red)));
      }
      setWalk_requested(false);
    });
  }

  function request_walk() {
    batch(() => {
      setWalk_requested(true);
    });
  }

  function toggle_emergency() {
    batch(() => {
      setEmergency(!emergency());
    });
  }

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'traffic-light');
  const el1 = document.createElement('h1');
  const txt0 = document.createTextNode('Comb Traffic Light');
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('div');
  el2.setAttribute('class', 'light-housing');
  const el3 = document.createElement('div');
  createEffect(() => { el3.setAttribute('class', ("lamp red " + ((color() == "red") ? "active" : ""))); }, { name: 'view:attr:color', module: $m, viewTarget: { element: 'div', binding: 'attr:class' } });
  el2.appendChild(el3);
  const el4 = document.createElement('div');
  createEffect(() => { el4.setAttribute('class', ("lamp yellow " + ((color() == "yellow") ? "active" : ""))); }, { name: 'view:attr:color', module: $m, viewTarget: { element: 'div', binding: 'attr:class' } });
  el2.appendChild(el4);
  const el5 = document.createElement('div');
  createEffect(() => { el5.setAttribute('class', ("lamp green " + ((color() == "green") ? "active" : ""))); }, { name: 'view:attr:color', module: $m, viewTarget: { element: 'div', binding: 'attr:class' } });
  el2.appendChild(el5);
  el0.appendChild(el2);
  const el6 = document.createElement('div');
  el6.setAttribute('class', 'status');
  const el7 = document.createElement('p');
  const txt1 = document.createTextNode('Phase:');
  el7.appendChild(txt1);
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String(color()); }, { name: 'view:color', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el7.appendChild(txt2);
  el6.appendChild(el7);
  const el8 = document.createComment('@if');
  el6.appendChild(el8);
  let el9 = null;
  createEffect(() => {
    if (el9) { el9.remove(); el9 = null; }
    if (can_walk()) {
      el9 = document.createElement('span');
      el9.style.display = 'contents';
      const el10 = document.createElement('p');
      el10.setAttribute('class', 'walk-signal');
      const txt3 = document.createTextNode('WALK');
      el10.appendChild(txt3);
      el9.appendChild(el10);
      el8.parentNode.insertBefore(el9, el8.nextSibling);
    }
  }, { name: 'if:el8', module: $m });
  const el11 = document.createComment('@if');
  el6.appendChild(el11);
  let el12 = null;
  createEffect(() => {
    if (el12) { el12.remove(); el12 = null; }
    if (emergency()) {
      el12 = document.createElement('span');
      el12.style.display = 'contents';
      const el13 = document.createElement('p');
      el13.setAttribute('class', 'emergency');
      const txt4 = document.createTextNode('EMERGENCY MODE');
      el13.appendChild(txt4);
      el12.appendChild(el13);
      el11.parentNode.insertBefore(el12, el11.nextSibling);
    }
  }, { name: 'if:el11', module: $m });
  el0.appendChild(el6);
  const el14 = document.createElement('div');
  el14.setAttribute('class', 'controls');
  const el15 = document.createElement('button');
  el15.addEventListener('click', next_phase);
  const txt5 = document.createTextNode('next clock');
  el15.appendChild(txt5);
  el14.appendChild(el15);
  const el16 = document.createElement('button');
  el16.addEventListener('click', request_walk);
  const txt6 = document.createTextNode('request walk');
  el16.appendChild(txt6);
  el14.appendChild(el16);
  const el17 = document.createElement('button');
  el17.addEventListener('click', toggle_emergency);
  const txt7 = document.createTextNode('');
  createEffect(() => { txt7.data = String((emergency() ? "clear emergency" : "emergency")); }, { name: 'view:emergency', module: $m, viewTarget: { element: 'button', binding: 'text' } });
  el17.appendChild(txt7);
  el14.appendChild(el17);
  el0.appendChild(el14);
  root.appendChild(el0);

<<<<<<< HEAD
  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'TrafficLight';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const Phase = Object.freeze({
    Red: 'Phase.Red',
    Green: 'Phase.Green',
    Yellow: 'Phase.Yellow',
  });

  const [phase, setPhase] = createSignal(Phase.Red, { name: 'phase', module: $m, type: 'Phase' });

  const [walk_requested, setWalk_requested] = createSignal(false, { name: 'walk_requested', module: $m, type: 'bool' });

  const [emergency, setEmergency] = createSignal(false, { name: 'emergency', module: $m, type: 'bool' });

  const color = createComb(() => ((phase() == Phase.Red) ? "red" : ((phase() == Phase.Green) ? "green" : "yellow")), { name: 'color', module: $m, deps: ["phase"] });

  const can_walk = createComb(() => ((phase() == Phase.Red) && walk_requested()), { name: 'can_walk', module: $m, deps: ["phase","walk_requested"] });

  return {
    signals: { phase: { get: phase, set: setPhase }, walk_requested: { get: walk_requested, set: setWalk_requested }, emergency: { get: emergency, set: setEmergency } },
    combs: { color, can_walk },
    dispose: __scope.dispose,
  };
}
//# sourceMappingURL=traffic-light.js.map
||||||| b68c2e9
}
=======
  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'TrafficLight';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const Phase = Object.freeze({
    Red: 'Phase.Red',
    Green: 'Phase.Green',
    Yellow: 'Phase.Yellow',
  });

  const [phase, setPhase] = createSignal(Phase.Red, { name: 'phase', module: $m, type: 'Phase' });

  const [walk_requested, setWalk_requested] = createSignal(false, { name: 'walk_requested', module: $m, type: 'bool' });

  const [emergency, setEmergency] = createSignal(false, { name: 'emergency', module: $m, type: 'bool' });

  const color = createComb(() => ((phase() == Phase.Red) ? "red" : ((phase() == Phase.Green) ? "green" : "yellow")), { name: 'color', module: $m, deps: ["phase"] });

  const can_walk = createComb(() => ((phase() == Phase.Red) && walk_requested()), { name: 'can_walk', module: $m, deps: ["phase","walk_requested"] });

  return {
    signals: { phase: { get: phase, set: setPhase }, walk_requested: { get: walk_requested, set: setWalk_requested }, emergency: { get: emergency, set: setEmergency } },
    combs: { color, can_walk },
    dispose: __scope.dispose,
  };
}
>>>>>>> worktree-agent-ae5d93b0
