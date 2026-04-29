import { createSignal, createComb, createEffect, batch } from '../runtime/signals.js';
import { circuit } from '../runtime/circuit.js';

export function TrafficLight(root) {
  const moduleId = 'TrafficLight';

  // Enum: Phase
  const Phase = Object.freeze({
    Red: 'Phase.Red',
    Green: 'Phase.Green',
    Yellow: 'Phase.Yellow',
  });

  // Signal: phase
  const [phase, setPhase] = createSignal(Phase.Red, 'phase', moduleId);

  // Signal: walk_requested
  const [walk_requested, setWalk_requested] = createSignal(false, 'walk_requested', moduleId);

  // Signal: emergency
  const [emergency, setEmergency] = createSignal(false, 'emergency', moduleId);

  // Combinational: color
  const color = createComb(() => ((phase() == Phase.Red) ? "red" : ((phase() == Phase.Green) ? "green" : "yellow")), 'color', moduleId);

  // Combinational: can_walk
  const can_walk = createComb(() => ((phase() == Phase.Red) && walk_requested()), 'can_walk', moduleId);

  // Event handler: next_phase
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

  // Event handler: request_walk
  function request_walk() {
    batch(() => {
      setWalk_requested(true);
    });
  }

  // Event handler: toggle_emergency
  function toggle_emergency() {
    batch(() => {
      setEmergency(!emergency());
    });
  }

  // View
  function render() {
    const el1 = document.createElement('div');
    el1.setAttribute('class', 'traffic-light');
    const el2 = document.createElement('h1');
    const txt3 = document.createTextNode('Comb Traffic Light');
    el2.appendChild(txt3);
    el1.appendChild(el2);
    const el4 = document.createElement('div');
    el4.setAttribute('class', 'light-housing');
    const el5 = document.createElement('div');
    createEffect(() => { el5.setAttribute('class', ("lamp red " + ((color() == "red") ? "active" : ""))); }, 'attr_class', moduleId);
    el4.appendChild(el5);
    const el6 = document.createElement('div');
    createEffect(() => { el6.setAttribute('class', ("lamp yellow " + ((color() == "yellow") ? "active" : ""))); }, 'attr_class', moduleId);
    el4.appendChild(el6);
    const el7 = document.createElement('div');
    createEffect(() => { el7.setAttribute('class', ("lamp green " + ((color() == "green") ? "active" : ""))); }, 'attr_class', moduleId);
    el4.appendChild(el7);
    el1.appendChild(el4);
    const el8 = document.createElement('div');
    el8.setAttribute('class', 'status');
    const el9 = document.createElement('p');
    const txt10 = document.createTextNode('Phase:');
    el9.appendChild(txt10);
    const txt11 = document.createTextNode('');
    createEffect(() => { txt11.textContent = String(color()); }, 'text_txt11', moduleId);
    el9.appendChild(txt11);
    el8.appendChild(el9);
    const anchor12 = document.createComment('@if');
    el8.appendChild(anchor12);
    let ifBlock13 = null;
    createEffect(() => {
      if (ifBlock13) { ifBlock13.remove(); ifBlock13 = null; }
      if (can_walk()) {
        ifBlock13 = document.createElement('div');
        ifBlock13.style.display = 'contents';
        const el15 = document.createElement('p');
        el15.setAttribute('class', 'walk-signal');
        const txt16 = document.createTextNode('WALK');
        el15.appendChild(txt16);
        ifBlock13.appendChild(el15);
        anchor12.parentNode.insertBefore(ifBlock13, anchor12.nextSibling);
      }
    }, 'if_anchor12', moduleId);
    const anchor17 = document.createComment('@if');
    el8.appendChild(anchor17);
    let ifBlock18 = null;
    createEffect(() => {
      if (ifBlock18) { ifBlock18.remove(); ifBlock18 = null; }
      if (emergency()) {
        ifBlock18 = document.createElement('div');
        ifBlock18.style.display = 'contents';
        const el20 = document.createElement('p');
        el20.setAttribute('class', 'emergency');
        const txt21 = document.createTextNode('EMERGENCY MODE');
        el20.appendChild(txt21);
        ifBlock18.appendChild(el20);
        anchor17.parentNode.insertBefore(ifBlock18, anchor17.nextSibling);
      }
    }, 'if_anchor17', moduleId);
    el1.appendChild(el8);
    const el22 = document.createElement('div');
    el22.setAttribute('class', 'controls');
    const el23 = document.createElement('button');
    el23.addEventListener('click', next_phase);
    const txt24 = document.createTextNode('next clock');
    el23.appendChild(txt24);
    el22.appendChild(el23);
    const el25 = document.createElement('button');
    el25.addEventListener('click', request_walk);
    const txt26 = document.createTextNode('request walk');
    el25.appendChild(txt26);
    el22.appendChild(el25);
    const el27 = document.createElement('button');
    el27.addEventListener('click', toggle_emergency);
    const txt28 = document.createTextNode('');
    createEffect(() => { txt28.textContent = String((emergency() ? "clear emergency" : "emergency")); }, 'text_txt28', moduleId);
    el27.appendChild(txt28);
    el22.appendChild(el27);
    el1.appendChild(el22);
    root.appendChild(el1);
  }

  render();

}
