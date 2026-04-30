import { createSignal, createComb, createEffect, batch, createScope, circuit, X, createCell, createPropagator } from '../runtime/index.js';
import { rgbToHsv, hsvToRgb, rgbToHex } from '../runtime/color.js';

export const __graph = {
  "nodes": [
    {
      "id": "r",
      "name": "r",
      "type": "cell"
    },
    {
      "id": "g",
      "name": "g",
      "type": "cell"
    },
    {
      "id": "b",
      "name": "b",
      "type": "cell"
    },
    {
      "id": "h",
      "name": "h",
      "type": "cell"
    },
    {
      "id": "s",
      "name": "s",
      "type": "cell"
    },
    {
      "id": "v",
      "name": "v",
      "type": "cell"
    },
    {
      "id": "constraint:rgbToHsvProp:0",
      "name": "rgbToHsvProp[0]",
      "type": "constraint"
    },
    {
      "id": "constraint:hsvToRgbProp:0",
      "name": "hsvToRgbProp[0]",
      "type": "constraint"
    },
    {
      "id": "hexColor",
      "name": "hexColor",
      "type": "comb"
    },
    {
      "id": "previewStyle",
      "name": "previewStyle",
      "type": "comb"
    },
    {
      "id": "view:attr:style",
      "name": "view:attr:style",
      "type": "view-effect",
      "viewTarget": {
        "element": "div.color-preview",
        "binding": "attr:style"
      }
    },
    {
      "id": "view:hexColor",
      "name": "view:hexColor",
      "type": "view-effect",
      "viewTarget": {
        "element": "p.hex-display",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:r",
      "name": "view:bind:r",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:bind:g",
      "name": "view:bind:g",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:bind:b",
      "name": "view:bind:b",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:bind:h",
      "name": "view:bind:h",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:bind:s",
      "name": "view:bind:s",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:bind:v",
      "name": "view:bind:v",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    }
  ],
  "edges": [
    {
      "from": "r",
      "to": "constraint:rgbToHsvProp:0",
      "type": "data"
    },
    {
      "from": "g",
      "to": "constraint:rgbToHsvProp:0",
      "type": "data"
    },
    {
      "from": "b",
      "to": "constraint:rgbToHsvProp:0",
      "type": "data"
    },
    {
      "from": "constraint:rgbToHsvProp:0",
      "to": "h",
      "type": "write"
    },
    {
      "from": "constraint:rgbToHsvProp:0",
      "to": "s",
      "type": "write"
    },
    {
      "from": "constraint:rgbToHsvProp:0",
      "to": "v",
      "type": "write"
    },
    {
      "from": "h",
      "to": "constraint:hsvToRgbProp:0",
      "type": "data"
    },
    {
      "from": "s",
      "to": "constraint:hsvToRgbProp:0",
      "type": "data"
    },
    {
      "from": "v",
      "to": "constraint:hsvToRgbProp:0",
      "type": "data"
    },
    {
      "from": "constraint:hsvToRgbProp:0",
      "to": "r",
      "type": "write"
    },
    {
      "from": "constraint:hsvToRgbProp:0",
      "to": "g",
      "type": "write"
    },
    {
      "from": "constraint:hsvToRgbProp:0",
      "to": "b",
      "type": "write"
    },
    {
      "from": "r",
      "to": "hexColor",
      "type": "data"
    },
    {
      "from": "g",
      "to": "hexColor",
      "type": "data"
    },
    {
      "from": "b",
      "to": "hexColor",
      "type": "data"
    },
    {
      "from": "r",
      "to": "previewStyle",
      "type": "data"
    },
    {
      "from": "g",
      "to": "previewStyle",
      "type": "data"
    },
    {
      "from": "b",
      "to": "previewStyle",
      "type": "data"
    },
    {
      "from": "previewStyle",
      "to": "view:attr:style",
      "type": "data"
    },
    {
      "from": "hexColor",
      "to": "view:hexColor",
      "type": "data"
    },
    {
      "from": "r",
      "to": "view:bind:r",
      "type": "data"
    },
    {
      "from": "g",
      "to": "view:bind:g",
      "type": "data"
    },
    {
      "from": "b",
      "to": "view:bind:b",
      "type": "data"
    },
    {
      "from": "h",
      "to": "view:bind:h",
      "type": "data"
    },
    {
      "from": "s",
      "to": "view:bind:s",
      "type": "data"
    },
    {
      "from": "v",
      "to": "view:bind:v",
      "type": "data"
    }
  ]
};

export function ColorPicker(root) {
  const $m = 'ColorPicker';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [r, setR] = createCell(255, { name: 'r', module: $m });

  const [g, setG] = createCell(0, { name: 'g', module: $m });

  const [b, setB] = createCell(0, { name: 'b', module: $m });

  const [h, setH] = createCell(0, { name: 'h', module: $m });

  const [s, setS] = createCell(100, { name: 's', module: $m });

  const [v, setV] = createCell(100, { name: 'v', module: $m });

  createPropagator(() => {
    // Read inputs: r, g, b
    const __r = r();
    const __g = g();
    const __b = b();
    batch(() => {
      setH(rgbToHsv(__r, __g, __b).h);
      setS(rgbToHsv(__r, __g, __b).s);
      setV(rgbToHsv(__r, __g, __b).v);
    });
  }, { name: 'rgbToHsvProp:0', module: $m, deps: ['r', 'g', 'b'], writes: ['h', 's', 'v'] });

  createPropagator(() => {
    // Read inputs: h, s, v
    const __h = h();
    const __s = s();
    const __v = v();
    batch(() => {
      setR(hsvToRgb(__h, __s, __v).r);
      setG(hsvToRgb(__h, __s, __v).g);
      setB(hsvToRgb(__h, __s, __v).b);
    });
  }, { name: 'hsvToRgbProp:0', module: $m, deps: ['h', 's', 'v'], writes: ['r', 'g', 'b'] });

  const hexColor = createComb(() => rgbToHex(r(), g(), b()), { name: 'hexColor', module: $m, deps: ["r","g","b"] });

  const previewStyle = createComb(() => (((((("background-color: rgb(" + String(r())) + ", ") + String(g())) + ", ") + String(b())) + ")"), { name: 'previewStyle', module: $m, deps: ["r","g","b"] });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'color-picker');
  const el1 = document.createElement('div');
  el1.setAttribute('class', 'color-preview');
  createEffect(() => { el1.setAttribute('style', previewStyle()); }, { name: 'view:attr:previewStyle', module: $m, viewTarget: { element: 'div.color-preview', binding: 'attr:style' } });
  el0.appendChild(el1);
  const el2 = document.createElement('p');
  el2.setAttribute('class', 'hex-display');
  const txt0 = document.createTextNode('');
  createEffect(() => { txt0.data = String(hexColor()); }, { name: 'view:hexColor', module: $m, viewTarget: { element: 'p.hex-display', binding: 'text' } });
  el2.appendChild(txt0);
  el0.appendChild(el2);
  const el3 = document.createElement('div');
  el3.setAttribute('class', 'slider-group');
  const el4 = document.createElement('h3');
  const txt1 = document.createTextNode('RGB');
  el4.appendChild(txt1);
  el3.appendChild(el4);
  const el5 = document.createElement('label');
  const txt2 = document.createTextNode('R');
  el5.appendChild(txt2);
  const el6 = document.createElement('input');
  el6.setAttribute('type', 'range');
  el6.setAttribute('min', '0');
  el6.setAttribute('max', '255');
  el6.value = r();
  createEffect(() => { el6.value = r(); }, { name: 'view:bind:r', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el6.addEventListener('input', (e) => { setR(Number(e.target.value)); });
  el5.appendChild(el6);
  el3.appendChild(el5);
  const el7 = document.createElement('label');
  const txt3 = document.createTextNode('G');
  el7.appendChild(txt3);
  const el8 = document.createElement('input');
  el8.setAttribute('type', 'range');
  el8.setAttribute('min', '0');
  el8.setAttribute('max', '255');
  el8.value = g();
  createEffect(() => { el8.value = g(); }, { name: 'view:bind:g', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el8.addEventListener('input', (e) => { setG(Number(e.target.value)); });
  el7.appendChild(el8);
  el3.appendChild(el7);
  const el9 = document.createElement('label');
  const txt4 = document.createTextNode('B');
  el9.appendChild(txt4);
  const el10 = document.createElement('input');
  el10.setAttribute('type', 'range');
  el10.setAttribute('min', '0');
  el10.setAttribute('max', '255');
  el10.value = b();
  createEffect(() => { el10.value = b(); }, { name: 'view:bind:b', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el10.addEventListener('input', (e) => { setB(Number(e.target.value)); });
  el9.appendChild(el10);
  el3.appendChild(el9);
  el0.appendChild(el3);
  const el11 = document.createElement('div');
  el11.setAttribute('class', 'slider-group');
  const el12 = document.createElement('h3');
  const txt5 = document.createTextNode('HSV');
  el12.appendChild(txt5);
  el11.appendChild(el12);
  const el13 = document.createElement('label');
  const txt6 = document.createTextNode('H');
  el13.appendChild(txt6);
  const el14 = document.createElement('input');
  el14.setAttribute('type', 'range');
  el14.setAttribute('min', '0');
  el14.setAttribute('max', '360');
  el14.value = h();
  createEffect(() => { el14.value = h(); }, { name: 'view:bind:h', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el14.addEventListener('input', (e) => { setH(Number(e.target.value)); });
  el13.appendChild(el14);
  el11.appendChild(el13);
  const el15 = document.createElement('label');
  const txt7 = document.createTextNode('S');
  el15.appendChild(txt7);
  const el16 = document.createElement('input');
  el16.setAttribute('type', 'range');
  el16.setAttribute('min', '0');
  el16.setAttribute('max', '100');
  el16.value = s();
  createEffect(() => { el16.value = s(); }, { name: 'view:bind:s', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el16.addEventListener('input', (e) => { setS(Number(e.target.value)); });
  el15.appendChild(el16);
  el11.appendChild(el15);
  const el17 = document.createElement('label');
  const txt8 = document.createTextNode('V');
  el17.appendChild(txt8);
  const el18 = document.createElement('input');
  el18.setAttribute('type', 'range');
  el18.setAttribute('min', '0');
  el18.setAttribute('max', '100');
  el18.value = v();
  createEffect(() => { el18.value = v(); }, { name: 'view:bind:v', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el18.addEventListener('input', (e) => { setV(Number(e.target.value)); });
  el17.appendChild(el18);
  el11.appendChild(el17);
  el0.appendChild(el11);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'ColorPicker';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [r, setR] = createCell(255, { name: 'r', module: $m });

  const [g, setG] = createCell(0, { name: 'g', module: $m });

  const [b, setB] = createCell(0, { name: 'b', module: $m });

  const [h, setH] = createCell(0, { name: 'h', module: $m });

  const [s, setS] = createCell(100, { name: 's', module: $m });

  const [v, setV] = createCell(100, { name: 'v', module: $m });

  createPropagator(() => {
    // Read inputs: r, g, b
    const __r = r();
    const __g = g();
    const __b = b();
    batch(() => {
      setH(rgbToHsv(__r, __g, __b).h);
      setS(rgbToHsv(__r, __g, __b).s);
      setV(rgbToHsv(__r, __g, __b).v);
    });
  }, { name: 'rgbToHsvProp:0', module: $m, deps: ['r', 'g', 'b'], writes: ['h', 's', 'v'] });

  createPropagator(() => {
    // Read inputs: h, s, v
    const __h = h();
    const __s = s();
    const __v = v();
    batch(() => {
      setR(hsvToRgb(__h, __s, __v).r);
      setG(hsvToRgb(__h, __s, __v).g);
      setB(hsvToRgb(__h, __s, __v).b);
    });
  }, { name: 'hsvToRgbProp:0', module: $m, deps: ['h', 's', 'v'], writes: ['r', 'g', 'b'] });

  const hexColor = createComb(() => rgbToHex(r(), g(), b()), { name: 'hexColor', module: $m, deps: ["r","g","b"] });

  const previewStyle = createComb(() => (((((("background-color: rgb(" + String(r())) + ", ") + String(g())) + ", ") + String(b())) + ")"), { name: 'previewStyle', module: $m, deps: ["r","g","b"] });

  return {
    signals: { r: { get: r, set: setR }, g: { get: g, set: setG }, b: { get: b, set: setB }, h: { get: h, set: setH }, s: { get: s, set: setS }, v: { get: v, set: setV } },
    combs: { hexColor, previewStyle },
    dispose: __scope.dispose,
  };
}