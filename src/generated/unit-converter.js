import { createSignal, createComb, createEffect, batch, createScope, circuit, X, createCell, createPropagator } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "celsius",
      "name": "celsius",
      "type": "cell"
    },
    {
      "id": "fahrenheit",
      "name": "fahrenheit",
      "type": "cell"
    },
    {
      "id": "kelvin",
      "name": "kelvin",
      "type": "cell"
    },
    {
      "id": "rankine",
      "name": "rankine",
      "type": "cell"
    },
    {
      "id": "constraint:celToFah:0",
      "name": "celToFah[0]",
      "type": "constraint"
    },
    {
      "id": "constraint:celToKel:0",
      "name": "celToKel[0]",
      "type": "constraint"
    },
    {
      "id": "constraint:fahToCel:0",
      "name": "fahToCel[0]",
      "type": "constraint"
    },
    {
      "id": "constraint:kelToCel:0",
      "name": "kelToCel[0]",
      "type": "constraint"
    },
    {
      "id": "constraint:fahToRan:0",
      "name": "fahToRan[0]",
      "type": "constraint"
    },
    {
      "id": "constraint:kelToRan:0",
      "name": "kelToRan[0]",
      "type": "constraint"
    },
    {
      "id": "constraint:ranToFah:0",
      "name": "ranToFah[0]",
      "type": "constraint"
    },
    {
      "id": "constraint:ranToKel:0",
      "name": "ranToKel[0]",
      "type": "constraint"
    },
    {
      "id": "isFreezingC",
      "name": "isFreezingC",
      "type": "comb",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "isFreezingF",
      "name": "isFreezingF",
      "type": "comb",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "ranViaFah",
      "name": "ranViaFah",
      "type": "comb",
      "valueType": "int"
    },
    {
      "id": "ranViaKel",
      "name": "ranViaKel",
      "type": "comb",
      "valueType": "int"
    },
    {
      "id": "ranConverged",
      "name": "ranConverged",
      "type": "comb",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "tempColor",
      "name": "tempColor",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "view:bind:celsius",
      "name": "view:bind:celsius",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:celsius",
      "name": "view:celsius",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.converter-value",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:fahrenheit",
      "name": "view:bind:fahrenheit",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:fahrenheit",
      "name": "view:fahrenheit",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.converter-value",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:kelvin",
      "name": "view:bind:kelvin",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:kelvin",
      "name": "view:kelvin",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.converter-value",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:rankine",
      "name": "view:bind:rankine",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:rankine",
      "name": "view:rankine",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.converter-value",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:style",
      "name": "view:attr:style",
      "type": "view-effect",
      "viewTarget": {
        "element": "div.temp-preview",
        "binding": "attr:style"
      }
    },
    {
      "id": "view:ranViaFah",
      "name": "view:ranViaFah",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:ranViaKel",
      "name": "view:ranViaKel",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:ranConverged",
      "name": "view:ranConverged",
      "type": "view-effect",
      "viewTarget": {
        "element": "p.convergence-result",
        "binding": "text"
      }
    },
    {
      "id": "view:isFreezingC",
      "name": "view:isFreezingC",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:isFreezingF",
      "name": "view:isFreezingF",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "celsius",
      "to": "constraint:celToFah:0",
      "type": "data"
    },
    {
      "from": "constraint:celToFah:0",
      "to": "fahrenheit",
      "type": "write"
    },
    {
      "from": "celsius",
      "to": "constraint:celToKel:0",
      "type": "data"
    },
    {
      "from": "constraint:celToKel:0",
      "to": "kelvin",
      "type": "write"
    },
    {
      "from": "fahrenheit",
      "to": "constraint:fahToCel:0",
      "type": "data"
    },
    {
      "from": "constraint:fahToCel:0",
      "to": "celsius",
      "type": "write"
    },
    {
      "from": "kelvin",
      "to": "constraint:kelToCel:0",
      "type": "data"
    },
    {
      "from": "constraint:kelToCel:0",
      "to": "celsius",
      "type": "write"
    },
    {
      "from": "fahrenheit",
      "to": "constraint:fahToRan:0",
      "type": "data"
    },
    {
      "from": "constraint:fahToRan:0",
      "to": "rankine",
      "type": "write"
    },
    {
      "from": "kelvin",
      "to": "constraint:kelToRan:0",
      "type": "data"
    },
    {
      "from": "constraint:kelToRan:0",
      "to": "rankine",
      "type": "write"
    },
    {
      "from": "rankine",
      "to": "constraint:ranToFah:0",
      "type": "data"
    },
    {
      "from": "constraint:ranToFah:0",
      "to": "fahrenheit",
      "type": "write"
    },
    {
      "from": "rankine",
      "to": "constraint:ranToKel:0",
      "type": "data"
    },
    {
      "from": "constraint:ranToKel:0",
      "to": "kelvin",
      "type": "write"
    },
    {
      "from": "celsius",
      "to": "isFreezingC",
      "type": "data"
    },
    {
      "from": "fahrenheit",
      "to": "isFreezingF",
      "type": "data"
    },
    {
      "from": "fahrenheit",
      "to": "ranViaFah",
      "type": "data"
    },
    {
      "from": "kelvin",
      "to": "ranViaKel",
      "type": "data"
    },
    {
      "from": "ranViaFah",
      "to": "ranConverged",
      "type": "data"
    },
    {
      "from": "ranViaKel",
      "to": "ranConverged",
      "type": "data"
    },
    {
      "from": "celsius",
      "to": "tempColor",
      "type": "data"
    },
    {
      "from": "celsius",
      "to": "view:bind:celsius",
      "type": "data"
    },
    {
      "from": "celsius",
      "to": "view:celsius",
      "type": "data"
    },
    {
      "from": "fahrenheit",
      "to": "view:bind:fahrenheit",
      "type": "data"
    },
    {
      "from": "fahrenheit",
      "to": "view:fahrenheit",
      "type": "data"
    },
    {
      "from": "kelvin",
      "to": "view:bind:kelvin",
      "type": "data"
    },
    {
      "from": "kelvin",
      "to": "view:kelvin",
      "type": "data"
    },
    {
      "from": "rankine",
      "to": "view:bind:rankine",
      "type": "data"
    },
    {
      "from": "rankine",
      "to": "view:rankine",
      "type": "data"
    },
    {
      "from": "tempColor",
      "to": "view:attr:style",
      "type": "data"
    },
    {
      "from": "ranViaFah",
      "to": "view:ranViaFah",
      "type": "data"
    },
    {
      "from": "ranViaKel",
      "to": "view:ranViaKel",
      "type": "data"
    },
    {
      "from": "ranConverged",
      "to": "view:ranConverged",
      "type": "data"
    },
    {
      "from": "isFreezingC",
      "to": "view:isFreezingC",
      "type": "data"
    },
    {
      "from": "isFreezingF",
      "to": "view:isFreezingF",
      "type": "data"
    }
  ]
};

export function UnitConverter(root) {
  const $m = 'UnitConverter';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [celsius, setCelsius] = createCell(25, { name: 'celsius', module: $m });

  const [fahrenheit, setFahrenheit] = createCell(77, { name: 'fahrenheit', module: $m });

  const [kelvin, setKelvin] = createCell(298.15, { name: 'kelvin', module: $m });

  const [rankine, setRankine] = createCell(536.67, { name: 'rankine', module: $m });

  createPropagator(() => {
    // Read inputs: celsius
    const __celsius = celsius();
    batch(() => {
      setFahrenheit(Math.round((((__celsius * 9) / 5) + 32)));
    });
  }, { name: 'celToFah:0', module: $m, deps: ['celsius'], writes: ['fahrenheit'] });

  createPropagator(() => {
    // Read inputs: celsius
    const __celsius = celsius();
    batch(() => {
      setKelvin(Math.round((__celsius + 273.15)));
    });
  }, { name: 'celToKel:0', module: $m, deps: ['celsius'], writes: ['kelvin'] });

  createPropagator(() => {
    // Read inputs: fahrenheit
    const __fahrenheit = fahrenheit();
    batch(() => {
      setCelsius(Math.round((((__fahrenheit - 32) * 5) / 9)));
    });
  }, { name: 'fahToCel:0', module: $m, deps: ['fahrenheit'], writes: ['celsius'] });

  createPropagator(() => {
    // Read inputs: kelvin
    const __kelvin = kelvin();
    batch(() => {
      setCelsius(Math.round((__kelvin - 273.15)));
    });
  }, { name: 'kelToCel:0', module: $m, deps: ['kelvin'], writes: ['celsius'] });

  createPropagator(() => {
    // Read inputs: fahrenheit
    const __fahrenheit = fahrenheit();
    batch(() => {
      setRankine(Math.round((__fahrenheit + 459.67)));
    });
  }, { name: 'fahToRan:0', module: $m, deps: ['fahrenheit'], writes: ['rankine'] });

  createPropagator(() => {
    // Read inputs: kelvin
    const __kelvin = kelvin();
    batch(() => {
      setRankine(Math.round(((__kelvin * 9) / 5)));
    });
  }, { name: 'kelToRan:0', module: $m, deps: ['kelvin'], writes: ['rankine'] });

  createPropagator(() => {
    // Read inputs: rankine
    const __rankine = rankine();
    batch(() => {
      setFahrenheit(Math.round((__rankine - 459.67)));
    });
  }, { name: 'ranToFah:0', module: $m, deps: ['rankine'], writes: ['fahrenheit'] });

  createPropagator(() => {
    // Read inputs: rankine
    const __rankine = rankine();
    batch(() => {
      setKelvin(Math.round(((__rankine * 5) / 9)));
    });
  }, { name: 'ranToKel:0', module: $m, deps: ['rankine'], writes: ['kelvin'] });

  const isFreezingC = createComb(() => (celsius() <= 0), { name: 'isFreezingC', module: $m, deps: ["celsius"] });

  const isFreezingF = createComb(() => (fahrenheit() <= 32), { name: 'isFreezingF', module: $m, deps: ["fahrenheit"] });

  const ranViaFah = createComb(() => Math.round((fahrenheit() + 459.67)), { name: 'ranViaFah', module: $m, deps: ["fahrenheit"] });

  const ranViaKel = createComb(() => Math.round(((kelvin() * 9) / 5)), { name: 'ranViaKel', module: $m, deps: ["kelvin"] });

  const ranConverged = createComb(() => (ranViaFah() == ranViaKel()), { name: 'ranConverged', module: $m, deps: ["ranViaFah","ranViaKel"] });

  const tempColor = createComb(() => (("hsl(" + String(Math.round((240 - (celsius() * 2.4))))) + ", 80%, 50%)"), { name: 'tempColor', module: $m, deps: ["celsius"] });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'unit-converter');
  const el1 = document.createElement('h2');
  const txt0 = document.createTextNode('Temperature Unit Converter');
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('p');
  el2.setAttribute('class', 'converter-subtitle');
  const txt1 = document.createTextNode('Diamond constraint topology: C-F-R and C-K-R must converge');
  el2.appendChild(txt1);
  el0.appendChild(el2);
  const el3 = document.createElement('div');
  el3.setAttribute('class', 'converter-grid');
  const el4 = document.createElement('div');
  el4.setAttribute('class', 'converter-cell');
  const el5 = document.createElement('label');
  const txt2 = document.createTextNode('Celsius');
  el5.appendChild(txt2);
  el4.appendChild(el5);
  const el6 = document.createElement('input');
  el6.setAttribute('type', 'range');
  el6.setAttribute('min', '-100');
  el6.setAttribute('max', '200');
  el6.setAttribute('step', '1');
  el6.value = celsius();
  createEffect(() => { el6.value = celsius(); }, { name: 'view:bind:celsius', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el6.addEventListener('input', (e) => { setCelsius(Number(e.target.value)); });
  el4.appendChild(el6);
  const el7 = document.createElement('span');
  el7.setAttribute('class', 'converter-value');
  const txt3 = document.createTextNode('');
  createEffect(() => { txt3.data = String(celsius()); }, { name: 'view:celsius', module: $m, viewTarget: { element: 'span.converter-value', binding: 'text' } });
  el7.appendChild(txt3);
  el4.appendChild(el7);
  el3.appendChild(el4);
  const el8 = document.createElement('div');
  el8.setAttribute('class', 'converter-cell');
  const el9 = document.createElement('label');
  const txt4 = document.createTextNode('Fahrenheit');
  el9.appendChild(txt4);
  el8.appendChild(el9);
  const el10 = document.createElement('input');
  el10.setAttribute('type', 'range');
  el10.setAttribute('min', '-148');
  el10.setAttribute('max', '392');
  el10.setAttribute('step', '1');
  el10.value = fahrenheit();
  createEffect(() => { el10.value = fahrenheit(); }, { name: 'view:bind:fahrenheit', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el10.addEventListener('input', (e) => { setFahrenheit(Number(e.target.value)); });
  el8.appendChild(el10);
  const el11 = document.createElement('span');
  el11.setAttribute('class', 'converter-value');
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String(fahrenheit()); }, { name: 'view:fahrenheit', module: $m, viewTarget: { element: 'span.converter-value', binding: 'text' } });
  el11.appendChild(txt5);
  el8.appendChild(el11);
  el3.appendChild(el8);
  const el12 = document.createElement('div');
  el12.setAttribute('class', 'converter-cell');
  const el13 = document.createElement('label');
  const txt6 = document.createTextNode('Kelvin');
  el13.appendChild(txt6);
  el12.appendChild(el13);
  const el14 = document.createElement('input');
  el14.setAttribute('type', 'range');
  el14.setAttribute('min', '173');
  el14.setAttribute('max', '473');
  el14.setAttribute('step', '1');
  el14.value = kelvin();
  createEffect(() => { el14.value = kelvin(); }, { name: 'view:bind:kelvin', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el14.addEventListener('input', (e) => { setKelvin(Number(e.target.value)); });
  el12.appendChild(el14);
  const el15 = document.createElement('span');
  el15.setAttribute('class', 'converter-value');
  const txt7 = document.createTextNode('');
  createEffect(() => { txt7.data = String(kelvin()); }, { name: 'view:kelvin', module: $m, viewTarget: { element: 'span.converter-value', binding: 'text' } });
  el15.appendChild(txt7);
  el12.appendChild(el15);
  el3.appendChild(el12);
  const el16 = document.createElement('div');
  el16.setAttribute('class', 'converter-cell');
  const el17 = document.createElement('label');
  const txt8 = document.createTextNode('Rankine');
  el17.appendChild(txt8);
  el16.appendChild(el17);
  const el18 = document.createElement('input');
  el18.setAttribute('type', 'range');
  el18.setAttribute('min', '312');
  el18.setAttribute('max', '852');
  el18.setAttribute('step', '1');
  el18.value = rankine();
  createEffect(() => { el18.value = rankine(); }, { name: 'view:bind:rankine', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el18.addEventListener('input', (e) => { setRankine(Number(e.target.value)); });
  el16.appendChild(el18);
  const el19 = document.createElement('span');
  el19.setAttribute('class', 'converter-value');
  const txt9 = document.createTextNode('');
  createEffect(() => { txt9.data = String(rankine()); }, { name: 'view:rankine', module: $m, viewTarget: { element: 'span.converter-value', binding: 'text' } });
  el19.appendChild(txt9);
  el16.appendChild(el19);
  el3.appendChild(el16);
  el0.appendChild(el3);
  const el20 = document.createElement('div');
  el20.setAttribute('class', 'converter-status');
  const el21 = document.createElement('div');
  el21.setAttribute('class', 'temp-preview');
  createEffect(() => { el21.setAttribute('style', ("background:" + tempColor())); }, { name: 'view:attr:tempColor', module: $m, viewTarget: { element: 'div.temp-preview', binding: 'attr:style' } });
  el20.appendChild(el21);
  const el22 = document.createElement('div');
  el22.setAttribute('class', 'convergence-info');
  const el23 = document.createElement('p');
  const txt10 = document.createTextNode('Rankine via F:');
  el23.appendChild(txt10);
  const txt11 = document.createTextNode('');
  createEffect(() => { txt11.data = String(ranViaFah()); }, { name: 'view:ranViaFah', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el23.appendChild(txt11);
  el22.appendChild(el23);
  const el24 = document.createElement('p');
  const txt12 = document.createTextNode('Rankine via K:');
  el24.appendChild(txt12);
  const txt13 = document.createTextNode('');
  createEffect(() => { txt13.data = String(ranViaKel()); }, { name: 'view:ranViaKel', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el24.appendChild(txt13);
  el22.appendChild(el24);
  const el25 = document.createElement('p');
  el25.setAttribute('class', 'convergence-result');
  const txt14 = document.createTextNode('');
  createEffect(() => { txt14.data = String((ranConverged() ? "CONVERGED" : "DIVERGED")); }, { name: 'view:ranConverged', module: $m, viewTarget: { element: 'p.convergence-result', binding: 'text' } });
  el25.appendChild(txt14);
  el22.appendChild(el25);
  el20.appendChild(el22);
  const el26 = document.createElement('div');
  el26.setAttribute('class', 'freezing-info');
  const el27 = document.createElement('p');
  const txt15 = document.createTextNode('');
  createEffect(() => { txt15.data = String((isFreezingC() ? "FREEZING (C)" : "Above freezing")); }, { name: 'view:isFreezingC', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el27.appendChild(txt15);
  el26.appendChild(el27);
  const el28 = document.createElement('p');
  const txt16 = document.createTextNode('');
  createEffect(() => { txt16.data = String((isFreezingF() ? "FREEZING (F)" : "Above freezing")); }, { name: 'view:isFreezingF', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el28.appendChild(txt16);
  el26.appendChild(el28);
  el20.appendChild(el26);
  el0.appendChild(el20);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'UnitConverter';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [celsius, setCelsius] = createCell(25, { name: 'celsius', module: $m });

  const [fahrenheit, setFahrenheit] = createCell(77, { name: 'fahrenheit', module: $m });

  const [kelvin, setKelvin] = createCell(298.15, { name: 'kelvin', module: $m });

  const [rankine, setRankine] = createCell(536.67, { name: 'rankine', module: $m });

  createPropagator(() => {
    // Read inputs: celsius
    const __celsius = celsius();
    batch(() => {
      setFahrenheit(Math.round((((__celsius * 9) / 5) + 32)));
    });
  }, { name: 'celToFah:0', module: $m, deps: ['celsius'], writes: ['fahrenheit'] });

  createPropagator(() => {
    // Read inputs: celsius
    const __celsius = celsius();
    batch(() => {
      setKelvin(Math.round((__celsius + 273.15)));
    });
  }, { name: 'celToKel:0', module: $m, deps: ['celsius'], writes: ['kelvin'] });

  createPropagator(() => {
    // Read inputs: fahrenheit
    const __fahrenheit = fahrenheit();
    batch(() => {
      setCelsius(Math.round((((__fahrenheit - 32) * 5) / 9)));
    });
  }, { name: 'fahToCel:0', module: $m, deps: ['fahrenheit'], writes: ['celsius'] });

  createPropagator(() => {
    // Read inputs: kelvin
    const __kelvin = kelvin();
    batch(() => {
      setCelsius(Math.round((__kelvin - 273.15)));
    });
  }, { name: 'kelToCel:0', module: $m, deps: ['kelvin'], writes: ['celsius'] });

  createPropagator(() => {
    // Read inputs: fahrenheit
    const __fahrenheit = fahrenheit();
    batch(() => {
      setRankine(Math.round((__fahrenheit + 459.67)));
    });
  }, { name: 'fahToRan:0', module: $m, deps: ['fahrenheit'], writes: ['rankine'] });

  createPropagator(() => {
    // Read inputs: kelvin
    const __kelvin = kelvin();
    batch(() => {
      setRankine(Math.round(((__kelvin * 9) / 5)));
    });
  }, { name: 'kelToRan:0', module: $m, deps: ['kelvin'], writes: ['rankine'] });

  createPropagator(() => {
    // Read inputs: rankine
    const __rankine = rankine();
    batch(() => {
      setFahrenheit(Math.round((__rankine - 459.67)));
    });
  }, { name: 'ranToFah:0', module: $m, deps: ['rankine'], writes: ['fahrenheit'] });

  createPropagator(() => {
    // Read inputs: rankine
    const __rankine = rankine();
    batch(() => {
      setKelvin(Math.round(((__rankine * 5) / 9)));
    });
  }, { name: 'ranToKel:0', module: $m, deps: ['rankine'], writes: ['kelvin'] });

  const isFreezingC = createComb(() => (celsius() <= 0), { name: 'isFreezingC', module: $m, deps: ["celsius"] });

  const isFreezingF = createComb(() => (fahrenheit() <= 32), { name: 'isFreezingF', module: $m, deps: ["fahrenheit"] });

  const ranViaFah = createComb(() => Math.round((fahrenheit() + 459.67)), { name: 'ranViaFah', module: $m, deps: ["fahrenheit"] });

  const ranViaKel = createComb(() => Math.round(((kelvin() * 9) / 5)), { name: 'ranViaKel', module: $m, deps: ["kelvin"] });

  const ranConverged = createComb(() => (ranViaFah() == ranViaKel()), { name: 'ranConverged', module: $m, deps: ["ranViaFah","ranViaKel"] });

  const tempColor = createComb(() => (("hsl(" + String(Math.round((240 - (celsius() * 2.4))))) + ", 80%, 50%)"), { name: 'tempColor', module: $m, deps: ["celsius"] });

  return {
    signals: { celsius: { get: celsius, set: setCelsius }, fahrenheit: { get: fahrenheit, set: setFahrenheit }, kelvin: { get: kelvin, set: setKelvin }, rankine: { get: rankine, set: setRankine } },
    combs: { isFreezingC, isFreezingF, ranViaFah, ranViaKel, ranConverged, tempColor },
    dispose: __scope.dispose,
  };
}