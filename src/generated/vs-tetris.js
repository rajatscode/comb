import { createSignal, createComb, createEffect, batch, createScope, circuit, X, createEdgeEffect, deferredBatch, createTemporalAssert } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "tick",
      "name": "tick",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "gameTick",
      "name": "gameTick",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p1_board",
      "name": "p1_board",
      "type": "signal"
    },
    {
      "id": "p2_board",
      "name": "p2_board",
      "type": "signal"
    },
    {
      "id": "p1_piece",
      "name": "p1_piece",
      "type": "signal",
      "valueType": "PieceType",
      "states": [
        "PieceType.I",
        "PieceType.O",
        "PieceType.T",
        "PieceType.S",
        "PieceType.Z",
        "PieceType.L",
        "PieceType.J",
        "PieceType.None"
      ]
    },
    {
      "id": "p1_x",
      "name": "p1_x",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p1_y",
      "name": "p1_y",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p1_rot",
      "name": "p1_rot",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p1_score",
      "name": "p1_score",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p1_lines",
      "name": "p1_lines",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p1_pendingGarbage",
      "name": "p1_pendingGarbage",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p1_gameOver",
      "name": "p1_gameOver",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "p2_piece",
      "name": "p2_piece",
      "type": "signal",
      "valueType": "PieceType",
      "states": [
        "PieceType.I",
        "PieceType.O",
        "PieceType.T",
        "PieceType.S",
        "PieceType.Z",
        "PieceType.L",
        "PieceType.J",
        "PieceType.None"
      ]
    },
    {
      "id": "p2_x",
      "name": "p2_x",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p2_y",
      "name": "p2_y",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p2_rot",
      "name": "p2_rot",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p2_score",
      "name": "p2_score",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p2_lines",
      "name": "p2_lines",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p2_pendingGarbage",
      "name": "p2_pendingGarbage",
      "type": "signal",
      "valueType": "int"
    },
    {
      "id": "p2_gameOver",
      "name": "p2_gameOver",
      "type": "signal",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "p1_linesCleared",
      "name": "p1_linesCleared",
      "type": "signal",
      "valueType": "int",
      "states": [
        "0"
      ]
    },
    {
      "id": "p2_linesCleared",
      "name": "p2_linesCleared",
      "type": "signal",
      "valueType": "int",
      "states": [
        "0"
      ]
    },
    {
      "id": "gameActive",
      "name": "gameActive",
      "type": "comb",
      "valueType": "bool",
      "states": [
        "true",
        "false"
      ]
    },
    {
      "id": "p1_scoreLabel",
      "name": "p1_scoreLabel",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "p2_scoreLabel",
      "name": "p2_scoreLabel",
      "type": "comb",
      "valueType": "string"
    },
    {
      "id": "posedge:tick",
      "name": "posedge(tick)",
      "type": "sensitivity"
    },
    {
      "id": "posedge(p1_linesCleared) eventually(p2_pendingGarbage > 0) within 3",
      "name": "posedge(p1_linesCleared) eventually(p2_pendingGarbage > 0) within 3",
      "type": "assert",
      "expr": "posedge(p1_linesCleared) eventually(p2_pendingGarbage > 0) within 3"
    },
    {
      "id": "posedge(p2_linesCleared) eventually(p1_pendingGarbage > 0) within 3",
      "name": "posedge(p2_linesCleared) eventually(p1_pendingGarbage > 0) within 3",
      "type": "assert",
      "expr": "posedge(p2_linesCleared) eventually(p1_pendingGarbage > 0) within 3"
    },
    {
      "id": "assert:0",
      "name": "assert:0",
      "type": "assert",
      "expr": "p1_score >= 0"
    },
    {
      "id": "assert:1",
      "name": "assert:1",
      "type": "assert",
      "expr": "p2_score >= 0"
    },
    {
      "id": "view:p1_scoreLabel",
      "name": "view:p1_scoreLabel",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.vs-score",
        "binding": "text"
      }
    },
    {
      "id": "view:p1_lines",
      "name": "view:p1_lines",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.vs-score",
        "binding": "text"
      }
    },
    {
      "id": "view:p2_scoreLabel",
      "name": "view:p2_scoreLabel",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.vs-score",
        "binding": "text"
      }
    },
    {
      "id": "view:p2_lines",
      "name": "view:p2_lines",
      "type": "view-effect",
      "viewTarget": {
        "element": "span.vs-score",
        "binding": "text"
      }
    },
    {
      "id": "view:gameTick",
      "name": "view:gameTick",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:p1_pendingGarbage",
      "name": "view:p1_pendingGarbage",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:p2_pendingGarbage",
      "name": "view:p2_pendingGarbage",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:gameActive",
      "name": "view:gameActive",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    }
  ],
  "edges": [
    {
      "from": "p1_gameOver",
      "to": "gameActive",
      "type": "data"
    },
    {
      "from": "p2_gameOver",
      "to": "gameActive",
      "type": "data"
    },
    {
      "from": "p1_score",
      "to": "p1_scoreLabel",
      "type": "data"
    },
    {
      "from": "p2_score",
      "to": "p2_scoreLabel",
      "type": "data"
    },
    {
      "from": "tick",
      "to": "posedge:tick",
      "type": "data"
    },
    {
      "from": "posedge:tick",
      "to": "gameTick",
      "type": "write"
    },
    {
      "from": "posedge:tick",
      "to": "p1_pendingGarbage",
      "type": "write"
    },
    {
      "from": "posedge:tick",
      "to": "p2_pendingGarbage",
      "type": "write"
    },
    {
      "from": "posedge:tick",
      "to": "p1_linesCleared",
      "type": "write"
    },
    {
      "from": "posedge:tick",
      "to": "p2_linesCleared",
      "type": "write"
    },
    {
      "from": "p1_linesCleared",
      "to": "posedge(p1_linesCleared) eventually(p2_pendingGarbage > 0) within 3",
      "type": "data"
    },
    {
      "from": "p2_pendingGarbage",
      "to": "posedge(p1_linesCleared) eventually(p2_pendingGarbage > 0) within 3",
      "type": "data"
    },
    {
      "from": "p2_linesCleared",
      "to": "posedge(p2_linesCleared) eventually(p1_pendingGarbage > 0) within 3",
      "type": "data"
    },
    {
      "from": "p1_pendingGarbage",
      "to": "posedge(p2_linesCleared) eventually(p1_pendingGarbage > 0) within 3",
      "type": "data"
    },
    {
      "from": "p1_score",
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "p2_score",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "p1_scoreLabel",
      "to": "view:p1_scoreLabel",
      "type": "data"
    },
    {
      "from": "p1_lines",
      "to": "view:p1_lines",
      "type": "data"
    },
    {
      "from": "p2_scoreLabel",
      "to": "view:p2_scoreLabel",
      "type": "data"
    },
    {
      "from": "p2_lines",
      "to": "view:p2_lines",
      "type": "data"
    },
    {
      "from": "gameTick",
      "to": "view:gameTick",
      "type": "data"
    },
    {
      "from": "p1_pendingGarbage",
      "to": "view:p1_pendingGarbage",
      "type": "data"
    },
    {
      "from": "p2_pendingGarbage",
      "to": "view:p2_pendingGarbage",
      "type": "data"
    },
    {
      "from": "gameActive",
      "to": "view:gameActive",
      "type": "data"
    }
  ],
  "enums": {
    "PieceType": [
      "I",
      "O",
      "T",
      "S",
      "Z",
      "L",
      "J",
      "None"
    ]
  }
};

export function VsTetris(root) {
  const $m = 'VsTetris';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [tick, setTick] = createSignal(false, { name: 'tick', module: $m, type: 'bool' });

  const [gameTick, setGameTick] = createSignal(0, { name: 'gameTick', module: $m, type: 'int' });

  const [p1_board, setP1_board] = createSignal([], { name: 'p1_board', module: $m });

  const [p2_board, setP2_board] = createSignal([], { name: 'p2_board', module: $m });

  const PieceType = Object.freeze({
    I: 'PieceType.I',
    O: 'PieceType.O',
    T: 'PieceType.T',
    S: 'PieceType.S',
    Z: 'PieceType.Z',
    L: 'PieceType.L',
    J: 'PieceType.J',
    None: 'PieceType.None',
  });

  const [p1_piece, setP1_piece] = createSignal(PieceType.None, { name: 'p1_piece', module: $m, type: 'PieceType' });

  const [p1_x, setP1_x] = createSignal(4, { name: 'p1_x', module: $m, type: 'int' });

  const [p1_y, setP1_y] = createSignal(0, { name: 'p1_y', module: $m, type: 'int' });

  const [p1_rot, setP1_rot] = createSignal(0, { name: 'p1_rot', module: $m, type: 'int' });

  const [p1_score, setP1_score] = createSignal(0, { name: 'p1_score', module: $m, type: 'int' });

  const [p1_lines, setP1_lines] = createSignal(0, { name: 'p1_lines', module: $m, type: 'int' });

  const [p1_pendingGarbage, setP1_pendingGarbage] = createSignal(0, { name: 'p1_pendingGarbage', module: $m, type: 'int' });

  const [p1_gameOver, setP1_gameOver] = createSignal(false, { name: 'p1_gameOver', module: $m, type: 'bool' });

  const [p2_piece, setP2_piece] = createSignal(PieceType.None, { name: 'p2_piece', module: $m, type: 'PieceType' });

  const [p2_x, setP2_x] = createSignal(4, { name: 'p2_x', module: $m, type: 'int' });

  const [p2_y, setP2_y] = createSignal(0, { name: 'p2_y', module: $m, type: 'int' });

  const [p2_rot, setP2_rot] = createSignal(0, { name: 'p2_rot', module: $m, type: 'int' });

  const [p2_score, setP2_score] = createSignal(0, { name: 'p2_score', module: $m, type: 'int' });

  const [p2_lines, setP2_lines] = createSignal(0, { name: 'p2_lines', module: $m, type: 'int' });

  const [p2_pendingGarbage, setP2_pendingGarbage] = createSignal(0, { name: 'p2_pendingGarbage', module: $m, type: 'int' });

  const [p2_gameOver, setP2_gameOver] = createSignal(false, { name: 'p2_gameOver', module: $m, type: 'bool' });

  const [p1_linesCleared, setP1_linesCleared] = createSignal(0, { name: 'p1_linesCleared', module: $m, type: 'int' });

  const [p2_linesCleared, setP2_linesCleared] = createSignal(0, { name: 'p2_linesCleared', module: $m, type: 'int' });

  const gameActive = createComb(() => !(p1_gameOver() || p2_gameOver()), { name: 'gameActive', module: $m, deps: ["p1_gameOver","p2_gameOver"] });

  const p1_scoreLabel = createComb(() => ("P1: " + String(p1_score())), { name: 'p1_scoreLabel', module: $m, deps: ["p1_score"] });

  const p2_scoreLabel = createComb(() => ("P2: " + String(p2_score())), { name: 'p2_scoreLabel', module: $m, deps: ["p2_score"] });

  createEdgeEffect(() => tick(), 'posedge', () => {
    deferredBatch(() => {
      if (gameActive()) {
        setGameTick((gameTick() + 1));
        if ((p2_linesCleared() > 0)) {
          setP1_pendingGarbage((p1_pendingGarbage() + p2_linesCleared()));
        }
        if ((p1_linesCleared() > 0)) {
          setP2_pendingGarbage((p2_pendingGarbage() + p1_linesCleared()));
        }
        setP1_linesCleared(0);
        setP2_linesCleared(0);
      }
    });
  }, { name: 'posedge_tick', module: $m });

  createTemporalAssert(
    () => p1_linesCleared(),
    'eventually',
    () => (p2_pendingGarbage() > 0),
    { name: 'posedge(p1_linesCleared) eventually((p2_pendingGarbage > 0)) within 3', module: $m, duration: 3 }
  );

  createTemporalAssert(
    () => p2_linesCleared(),
    'eventually',
    () => (p1_pendingGarbage() > 0),
    { name: 'posedge(p2_linesCleared) eventually((p1_pendingGarbage > 0)) within 3', module: $m, duration: 3 }
  );

  createEffect(() => {
    const __ok = (p1_score() >= 0);
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(p1_score >= 0)',
        module: $m,
        values: { p1_score: p1_score() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createEffect(() => {
    const __ok = (p2_score() >= 0);
    if (!__ok) {
      circuit.assertionFailed('assert:1', {
        expr: '(p2_score >= 0)',
        module: $m,
        values: { p2_score: p2_score() },
      });
    }
  }, { name: 'assert:1', module: $m });

  const el0 = document.createElement('div');
  el0.setAttribute('class', 'vs-tetris');
  const el1 = document.createElement('div');
  el1.setAttribute('class', 'vs-header');
  const el2 = document.createElement('span');
  el2.setAttribute('class', 'vs-score p1');
  const txt0 = document.createTextNode('');
  createEffect(() => { txt0.data = String(p1_scoreLabel()); }, { name: 'view:p1_scoreLabel', module: $m, viewTarget: { element: 'span.vs-score', binding: 'text' } });
  el2.appendChild(txt0);
  const txt1 = document.createTextNode('(');
  el2.appendChild(txt1);
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String(p1_lines()); }, { name: 'view:p1_lines', module: $m, viewTarget: { element: 'span.vs-score', binding: 'text' } });
  el2.appendChild(txt2);
  const txt3 = document.createTextNode('lines)');
  el2.appendChild(txt3);
  el1.appendChild(el2);
  const el3 = document.createElement('span');
  el3.setAttribute('class', 'vs-title');
  const txt4 = document.createTextNode('VS TETRIS');
  el3.appendChild(txt4);
  el1.appendChild(el3);
  const el4 = document.createElement('span');
  el4.setAttribute('class', 'vs-score p2');
  const txt5 = document.createTextNode('');
  createEffect(() => { txt5.data = String(p2_scoreLabel()); }, { name: 'view:p2_scoreLabel', module: $m, viewTarget: { element: 'span.vs-score', binding: 'text' } });
  el4.appendChild(txt5);
  const txt6 = document.createTextNode('(');
  el4.appendChild(txt6);
  const txt7 = document.createTextNode('');
  createEffect(() => { txt7.data = String(p2_lines()); }, { name: 'view:p2_lines', module: $m, viewTarget: { element: 'span.vs-score', binding: 'text' } });
  el4.appendChild(txt7);
  const txt8 = document.createTextNode('lines)');
  el4.appendChild(txt8);
  el1.appendChild(el4);
  el0.appendChild(el1);
  const el5 = document.createElement('div');
  el5.setAttribute('class', 'vs-status');
  const el6 = document.createElement('span');
  const txt9 = document.createTextNode('Tick:');
  el6.appendChild(txt9);
  const txt10 = document.createTextNode('');
  createEffect(() => { txt10.data = String(gameTick()); }, { name: 'view:gameTick', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el6.appendChild(txt10);
  el5.appendChild(el6);
  const el7 = document.createElement('span');
  const txt11 = document.createTextNode('P1 garbage:');
  el7.appendChild(txt11);
  const txt12 = document.createTextNode('');
  createEffect(() => { txt12.data = String(p1_pendingGarbage()); }, { name: 'view:p1_pendingGarbage', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el7.appendChild(txt12);
  el5.appendChild(el7);
  const el8 = document.createElement('span');
  const txt13 = document.createTextNode('P2 garbage:');
  el8.appendChild(txt13);
  const txt14 = document.createTextNode('');
  createEffect(() => { txt14.data = String(p2_pendingGarbage()); }, { name: 'view:p2_pendingGarbage', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el8.appendChild(txt14);
  el5.appendChild(el8);
  const el9 = document.createElement('span');
  const txt15 = document.createTextNode('');
  createEffect(() => { txt15.data = String((gameActive() ? "PLAYING" : "GAME OVER")); }, { name: 'view:gameActive', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el9.appendChild(txt15);
  el5.appendChild(el9);
  el0.appendChild(el5);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
  const $m = 'VsTetris';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [tick, setTick] = createSignal(false, { name: 'tick', module: $m, type: 'bool' });

  const [gameTick, setGameTick] = createSignal(0, { name: 'gameTick', module: $m, type: 'int' });

  const [p1_board, setP1_board] = createSignal([], { name: 'p1_board', module: $m });

  const [p2_board, setP2_board] = createSignal([], { name: 'p2_board', module: $m });

  const PieceType = Object.freeze({
    I: 'PieceType.I',
    O: 'PieceType.O',
    T: 'PieceType.T',
    S: 'PieceType.S',
    Z: 'PieceType.Z',
    L: 'PieceType.L',
    J: 'PieceType.J',
    None: 'PieceType.None',
  });

  const [p1_piece, setP1_piece] = createSignal(PieceType.None, { name: 'p1_piece', module: $m, type: 'PieceType' });

  const [p1_x, setP1_x] = createSignal(4, { name: 'p1_x', module: $m, type: 'int' });

  const [p1_y, setP1_y] = createSignal(0, { name: 'p1_y', module: $m, type: 'int' });

  const [p1_rot, setP1_rot] = createSignal(0, { name: 'p1_rot', module: $m, type: 'int' });

  const [p1_score, setP1_score] = createSignal(0, { name: 'p1_score', module: $m, type: 'int' });

  const [p1_lines, setP1_lines] = createSignal(0, { name: 'p1_lines', module: $m, type: 'int' });

  const [p1_pendingGarbage, setP1_pendingGarbage] = createSignal(0, { name: 'p1_pendingGarbage', module: $m, type: 'int' });

  const [p1_gameOver, setP1_gameOver] = createSignal(false, { name: 'p1_gameOver', module: $m, type: 'bool' });

  const [p2_piece, setP2_piece] = createSignal(PieceType.None, { name: 'p2_piece', module: $m, type: 'PieceType' });

  const [p2_x, setP2_x] = createSignal(4, { name: 'p2_x', module: $m, type: 'int' });

  const [p2_y, setP2_y] = createSignal(0, { name: 'p2_y', module: $m, type: 'int' });

  const [p2_rot, setP2_rot] = createSignal(0, { name: 'p2_rot', module: $m, type: 'int' });

  const [p2_score, setP2_score] = createSignal(0, { name: 'p2_score', module: $m, type: 'int' });

  const [p2_lines, setP2_lines] = createSignal(0, { name: 'p2_lines', module: $m, type: 'int' });

  const [p2_pendingGarbage, setP2_pendingGarbage] = createSignal(0, { name: 'p2_pendingGarbage', module: $m, type: 'int' });

  const [p2_gameOver, setP2_gameOver] = createSignal(false, { name: 'p2_gameOver', module: $m, type: 'bool' });

  const [p1_linesCleared, setP1_linesCleared] = createSignal(0, { name: 'p1_linesCleared', module: $m, type: 'int' });

  const [p2_linesCleared, setP2_linesCleared] = createSignal(0, { name: 'p2_linesCleared', module: $m, type: 'int' });

  const gameActive = createComb(() => !(p1_gameOver() || p2_gameOver()), { name: 'gameActive', module: $m, deps: ["p1_gameOver","p2_gameOver"] });

  const p1_scoreLabel = createComb(() => ("P1: " + String(p1_score())), { name: 'p1_scoreLabel', module: $m, deps: ["p1_score"] });

  const p2_scoreLabel = createComb(() => ("P2: " + String(p2_score())), { name: 'p2_scoreLabel', module: $m, deps: ["p2_score"] });

  createTemporalAssert(
    () => p1_linesCleared(),
    'eventually',
    () => (p2_pendingGarbage() > 0),
    { name: 'posedge(p1_linesCleared) eventually((p2_pendingGarbage > 0)) within 3', module: $m, duration: 3 }
  );

  createTemporalAssert(
    () => p2_linesCleared(),
    'eventually',
    () => (p1_pendingGarbage() > 0),
    { name: 'posedge(p2_linesCleared) eventually((p1_pendingGarbage > 0)) within 3', module: $m, duration: 3 }
  );

  createEffect(() => {
    const __ok = (p1_score() >= 0);
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(p1_score >= 0)',
        module: $m,
        values: { p1_score: p1_score() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createEffect(() => {
    const __ok = (p2_score() >= 0);
    if (!__ok) {
      circuit.assertionFailed('assert:1', {
        expr: '(p2_score >= 0)',
        module: $m,
        values: { p2_score: p2_score() },
      });
    }
  }, { name: 'assert:1', module: $m });

  return {
    signals: { tick: { get: tick, set: setTick }, gameTick: { get: gameTick, set: setGameTick }, p1_board: { get: p1_board, set: setP1_board }, p2_board: { get: p2_board, set: setP2_board }, p1_piece: { get: p1_piece, set: setP1_piece }, p1_x: { get: p1_x, set: setP1_x }, p1_y: { get: p1_y, set: setP1_y }, p1_rot: { get: p1_rot, set: setP1_rot }, p1_score: { get: p1_score, set: setP1_score }, p1_lines: { get: p1_lines, set: setP1_lines }, p1_pendingGarbage: { get: p1_pendingGarbage, set: setP1_pendingGarbage }, p1_gameOver: { get: p1_gameOver, set: setP1_gameOver }, p2_piece: { get: p2_piece, set: setP2_piece }, p2_x: { get: p2_x, set: setP2_x }, p2_y: { get: p2_y, set: setP2_y }, p2_rot: { get: p2_rot, set: setP2_rot }, p2_score: { get: p2_score, set: setP2_score }, p2_lines: { get: p2_lines, set: setP2_lines }, p2_pendingGarbage: { get: p2_pendingGarbage, set: setP2_pendingGarbage }, p2_gameOver: { get: p2_gameOver, set: setP2_gameOver }, p1_linesCleared: { get: p1_linesCleared, set: setP1_linesCleared }, p2_linesCleared: { get: p2_linesCleared, set: setP2_linesCleared } },
    combs: { gameActive, p1_scoreLabel, p2_scoreLabel },
    dispose: __scope.dispose,
  };
}