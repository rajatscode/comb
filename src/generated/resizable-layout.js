import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "sidebarWidth",
      "name": "sidebarWidth",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "mainWidth",
      "name": "mainWidth",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "inspectorWidth",
      "name": "inspectorWidth",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "sidebarStyle",
      "name": "sidebarStyle",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "mainStyle",
      "name": "mainStyle",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "inspectorStyle",
      "name": "inspectorStyle",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "view:attr:style",
      "name": "view:attr:style",
      "type": "view-effect",
      "viewTarget": {
        "element": "div.pane",
        "binding": "attr:style"
      }
    },
    {
      "id": "view:str",
      "name": "view:str",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:style",
      "name": "view:attr:style",
      "type": "view-effect",
      "viewTarget": {
        "element": "div.pane",
        "binding": "attr:style"
      }
    },
    {
      "id": "view:str",
      "name": "view:str",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:style",
      "name": "view:attr:style",
      "type": "view-effect",
      "viewTarget": {
        "element": "div.pane",
        "binding": "attr:style"
      }
    },
    {
      "id": "view:str",
      "name": "view:str",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "sidebarWidth",
      "to": "sidebarStyle",
      "type": "data"
    },
    {
      "from": "mainWidth",
      "to": "mainStyle",
      "type": "data"
    },
    {
      "from": "inspectorWidth",
      "to": "inspectorStyle",
      "type": "data"
    },
    {
      "from": "sidebarStyle",
      "to": "view:attr:style",
      "type": "data"
    },
    {
      "from": "sidebarWidth",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "mainStyle",
      "to": "view:attr:style",
      "type": "data"
    },
    {
      "from": "mainWidth",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "inspectorStyle",
      "to": "view:attr:style",
      "type": "data"
    },
    {
      "from": "inspectorWidth",
      "to": "view:str",
      "type": "data"
    }
  ]
};

export function ResizableLayout(root) {
  const $m = 'ResizableLayout';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [sidebarWidth, setSidebarWidth] = createSignal(220, { name: 'sidebarWidth', module: $m, type: 'int' });

  const [mainWidth, setMainWidth] = createSignal(460, { name: 'mainWidth', module: $m, type: 'int' });

  const [inspectorWidth, setInspectorWidth] = createSignal(220, { name: 'inspectorWidth', module: $m, type: 'int' });

  const sidebarStyle = createComb(() => (("width: " + String(sidebarWidth())) + "px"), { name: 'sidebarStyle', module: $m, deps: ["sidebarWidth"] });

  const mainStyle = createComb(() => (("width: " + String(mainWidth())) + "px"), { name: 'mainStyle', module: $m, deps: ["mainWidth"] });

  const inspectorStyle = createComb(() => (("width: " + String(inspectorWidth())) + "px"), { name: 'inspectorStyle', module: $m, deps: ["inspectorWidth"] });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'resizable-layout');
  const el1 = document.createElement('div');
  el1.setAttribute('class', 'pane sidebar');
  createEffect(() => { el1.setAttribute('style', sidebarStyle()); }, { name: 'view:attr:sidebarStyle', module: $m, viewTarget: { element: 'div.pane', binding: 'attr:style' } });
  const el2 = document.createElement('h3');
  const txt0 = document.createTextNode('Sidebar');
  el2.appendChild(txt0);
  el1.appendChild(el2);
  const el3 = document.createElement('p');
  const txt1 = document.createTextNode('Width:');
  el3.appendChild(txt1);
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String(String(sidebarWidth())); }, { name: 'view:str', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el3.appendChild(txt2);
  const txt3 = document.createTextNode('px');
  el3.appendChild(txt3);
  el1.appendChild(el3);
  el0.appendChild(el1);
  const el4 = document.createElement('div');
  el4.setAttribute('class', 'divider');
  el4.setAttribute('divider', 'left');
  el0.appendChild(el4);
  const el5 = document.createElement('div');
  el5.setAttribute('class', 'pane main');
  createEffect(() => { el5.setAttribute('style', mainStyle()); }, { name: 'view:attr:mainStyle', module: $m, viewTarget: { element: 'div.pane', binding: 'attr:style' } });
  const el6 = document.createElement('h3');
  const txt4 = document.createTextNode('Main Editor');
  el6.appendChild(txt4);
  el5.appendChild(el6);
  const el7 = document.createElement('p');
  const txt5 = document.createTextNode('Width:');
  el7.appendChild(txt5);
  const txt6 = document.createTextNode('');
  createEffect(() => { txt6.data = String(String(mainWidth())); }, { name: 'view:str', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el7.appendChild(txt6);
  const txt7 = document.createTextNode('px');
  el7.appendChild(txt7);
  el5.appendChild(el7);
  el0.appendChild(el5);
  const el8 = document.createElement('div');
  el8.setAttribute('class', 'divider');
  el8.setAttribute('divider', 'right');
  el0.appendChild(el8);
  const el9 = document.createElement('div');
  el9.setAttribute('class', 'pane inspector');
  createEffect(() => { el9.setAttribute('style', inspectorStyle()); }, { name: 'view:attr:inspectorStyle', module: $m, viewTarget: { element: 'div.pane', binding: 'attr:style' } });
  const el10 = document.createElement('h3');
  const txt8 = document.createTextNode('Inspector');
  el10.appendChild(txt8);
  el9.appendChild(el10);
  const el11 = document.createElement('p');
  const txt9 = document.createTextNode('Width:');
  el11.appendChild(txt9);
  const txt10 = document.createTextNode('');
  createEffect(() => { txt10.data = String(String(inspectorWidth())); }, { name: 'view:str', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el11.appendChild(txt10);
  const txt11 = document.createTextNode('px');
  el11.appendChild(txt11);
  el9.appendChild(el11);
  el0.appendChild(el9);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'ResizableLayout';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [sidebarWidth, setSidebarWidth] = createSignal(220, { name: 'sidebarWidth', module: $m, type: 'int' });

  const [mainWidth, setMainWidth] = createSignal(460, { name: 'mainWidth', module: $m, type: 'int' });

  const [inspectorWidth, setInspectorWidth] = createSignal(220, { name: 'inspectorWidth', module: $m, type: 'int' });

  const sidebarStyle = createComb(() => (("width: " + String(sidebarWidth())) + "px"), { name: 'sidebarStyle', module: $m, deps: ["sidebarWidth"] });

  const mainStyle = createComb(() => (("width: " + String(mainWidth())) + "px"), { name: 'mainStyle', module: $m, deps: ["mainWidth"] });

  const inspectorStyle = createComb(() => (("width: " + String(inspectorWidth())) + "px"), { name: 'inspectorStyle', module: $m, deps: ["inspectorWidth"] });

  return {
    signals: { sidebarWidth: { get: sidebarWidth, set: setSidebarWidth }, mainWidth: { get: mainWidth, set: setMainWidth }, inspectorWidth: { get: inspectorWidth, set: setInspectorWidth } },
    combs: { sidebarStyle, mainStyle, inspectorStyle },
    dispose: __scope.dispose,
  };
}