import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "price",
      "name": "price",
      "type": "signal"
    },
    {
      "id": "threshold",
      "name": "threshold",
      "type": "signal"
    },
    {
      "id": "history",
      "name": "history",
      "type": "signal"
    },
    {
      "id": "historyLen",
      "name": "historyLen",
      "type": "signal"
    },
    {
      "id": "movingAvg",
      "name": "movingAvg",
      "type": "signal"
    },
    {
      "id": "alertFired",
      "name": "alertFired",
      "type": "comb"
    },
    {
      "id": "priceDisplay",
      "name": "priceDisplay",
      "type": "comb"
    },
    {
      "id": "avgDisplay",
      "name": "avgDisplay",
      "type": "comb"
    },
    {
      "id": "statusClass",
      "name": "statusClass",
      "type": "comb"
    },
    {
      "id": "statusText",
      "name": "statusText",
      "type": "comb"
    },
    {
      "id": "view:priceDisplay",
      "name": "view:priceDisplay",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.price",
        "binding": "text"
      }
    },
    {
      "id": "view:avgDisplay",
      "name": "view:avgDisplay",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.avg",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:statusText",
      "name": "view:statusText",
      "type": "view-effect",
      "viewTarget": {
        "element": "p",
        "binding": "text"
      }
    },
    {
      "id": "view:str",
      "name": "view:str",
      "type": "view-effect",
      "viewTarget": {
        "element": "label",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:threshold",
      "name": "view:bind:threshold",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    }
  ],
  "edges": [
    {
      "from": "movingAvg",
      "to": "alertFired",
      "type": "data"
    },
    {
      "from": "threshold",
      "to": "alertFired",
      "type": "data"
    },
    {
      "from": "price",
      "to": "priceDisplay",
      "type": "data"
    },
    {
      "from": "movingAvg",
      "to": "avgDisplay",
      "type": "data"
    },
    {
      "from": "alertFired",
      "to": "statusClass",
      "type": "data"
    },
    {
      "from": "alertFired",
      "to": "statusText",
      "type": "data"
    },
    {
      "from": "avgDisplay",
      "to": "statusText",
      "type": "data"
    },
    {
      "from": "threshold",
      "to": "statusText",
      "type": "data"
    },
    {
      "from": "priceDisplay",
      "to": "view:priceDisplay",
      "type": "data"
    },
    {
      "from": "avgDisplay",
      "to": "view:avgDisplay",
      "type": "data"
    },
    {
      "from": "statusClass",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "statusText",
      "to": "view:statusText",
      "type": "data"
    },
    {
      "from": "threshold",
      "to": "view:str",
      "type": "data"
    },
    {
      "from": "threshold",
      "to": "view:bind:threshold",
      "type": "data"
    }
  ]
};

export function StockTicker(root) {
  const $m = 'StockTicker';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [price, setPrice] = createSignal(100, { name: 'price', module: $m, type: 'float' });

  const [threshold, setThreshold] = createSignal(105, { name: 'threshold', module: $m, type: 'float' });

  const [history, setHistory] = createSignal("", { name: 'history', module: $m, type: 'string' });

  const [historyLen, setHistoryLen] = createSignal(0, { name: 'historyLen', module: $m, type: 'int' });

  const [movingAvg, setMovingAvg] = createSignal(100, { name: 'movingAvg', module: $m, type: 'float' });

  const alertFired = createComb(() => (movingAvg() > threshold()), { name: 'alertFired', module: $m, deps: ["movingAvg","threshold"] });

  const priceDisplay = createComb(() => ("$" + String(price())), { name: 'priceDisplay', module: $m, deps: ["price"] });

  const avgDisplay = createComb(() => ("$" + String(movingAvg())), { name: 'avgDisplay', module: $m, deps: ["movingAvg"] });

  const statusClass = createComb(() => (alertFired() ? "status alert" : "status normal"), { name: 'statusClass', module: $m, deps: ["alertFired"] });

  const statusText = createComb(() => (alertFired() ? ((("ALERT: avg " + avgDisplay()) + " > $") + String(threshold())) : ((("Normal: avg " + avgDisplay()) + " ≤ $") + String(threshold()))), { name: 'statusText', module: $m, deps: ["alertFired","avgDisplay","threshold"] });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'stock-ticker');
  const el1 = document.createElement('h2');
  const txt0 = document.createTextNode('Stock Ticker');
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('div');
  el2.setAttribute('class', 'price-display');
  const el3 = document.createElement('span');
  el3.setAttribute('class', 'price');
  const txt1 = document.createTextNode('');
  createEffect(() => { txt1.data = String(priceDisplay()); }, { name: 'view:priceDisplay', module: $m, viewTarget: { element: 'span.price', binding: 'text' } });
  el3.appendChild(txt1);
  el2.appendChild(el3);
  const el4 = document.createElement('span');
  el4.setAttribute('class', 'avg');
  const txt2 = document.createTextNode('avg:');
  el4.appendChild(txt2);
  const txt3 = document.createTextNode('');
  createEffect(() => { txt3.data = String(avgDisplay()); }, { name: 'view:avgDisplay', module: $m, viewTarget: { element: 'span.avg', binding: 'text' } });
  el4.appendChild(txt3);
  el2.appendChild(el4);
  el0.appendChild(el2);
  const el5 = document.createElement('p');
  createEffect(() => { el5.setAttribute('class', statusClass()); }, { name: 'view:attr:statusClass', module: $m, viewTarget: { element: 'p', binding: 'attr:class' } });
  const txt4 = document.createTextNode('');
  createEffect(() => { txt4.data = String(statusText()); }, { name: 'view:statusText', module: $m, viewTarget: { element: 'p', binding: 'text' } });
  el5.appendChild(txt4);
  el0.appendChild(el5);
  const el6 = document.createElement('div');
  el6.setAttribute('class', 'controls');
  const el7 = document.createElement('label');
  const txt5 = document.createTextNode('Alert Threshold: $');
  el7.appendChild(txt5);
  const txt6 = document.createTextNode('');
  createEffect(() => { txt6.data = String(String(threshold())); }, { name: 'view:str', module: $m, viewTarget: { element: 'label', binding: 'text' } });
  el7.appendChild(txt6);
  const el8 = document.createElement('input');
  el8.setAttribute('type', 'range');
  el8.setAttribute('min', '90');
  el8.setAttribute('max', '120');
  el8.setAttribute('step', '0.5');
  el8.value = threshold();
  createEffect(() => { el8.value = threshold(); }, { name: 'view:bind:threshold', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el8.addEventListener('input', (e) => { setThreshold(Number(e.target.value)); });
  el7.appendChild(el8);
  el6.appendChild(el7);
  el0.appendChild(el6);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'StockTicker';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [price, setPrice] = createSignal(100, { name: 'price', module: $m, type: 'float' });

  const [threshold, setThreshold] = createSignal(105, { name: 'threshold', module: $m, type: 'float' });

  const [history, setHistory] = createSignal("", { name: 'history', module: $m, type: 'string' });

  const [historyLen, setHistoryLen] = createSignal(0, { name: 'historyLen', module: $m, type: 'int' });

  const [movingAvg, setMovingAvg] = createSignal(100, { name: 'movingAvg', module: $m, type: 'float' });

  const alertFired = createComb(() => (movingAvg() > threshold()), { name: 'alertFired', module: $m, deps: ["movingAvg","threshold"] });

  const priceDisplay = createComb(() => ("$" + String(price())), { name: 'priceDisplay', module: $m, deps: ["price"] });

  const avgDisplay = createComb(() => ("$" + String(movingAvg())), { name: 'avgDisplay', module: $m, deps: ["movingAvg"] });

  const statusClass = createComb(() => (alertFired() ? "status alert" : "status normal"), { name: 'statusClass', module: $m, deps: ["alertFired"] });

  const statusText = createComb(() => (alertFired() ? ((("ALERT: avg " + avgDisplay()) + " > $") + String(threshold())) : ((("Normal: avg " + avgDisplay()) + " ≤ $") + String(threshold()))), { name: 'statusText', module: $m, deps: ["alertFired","avgDisplay","threshold"] });

  return {
    signals: { price: { get: price, set: setPrice }, threshold: { get: threshold, set: setThreshold }, history: { get: history, set: setHistory }, historyLen: { get: historyLen, set: setHistoryLen }, movingAvg: { get: movingAvg, set: setMovingAvg } },
    combs: { alertFired, priceDisplay, avgDisplay, statusClass, statusText },
    dispose: __scope.dispose,
  };
}