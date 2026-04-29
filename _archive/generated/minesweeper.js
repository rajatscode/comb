import { createSignal, createComb, createEffect, batch } from '../runtime/signals.js';
import { circuit } from '../runtime/circuit.js';

export function Cell({ value, revealed, flagged }, root) {
  const moduleId = 'Cell';

  // Combinational: display
  const display = createComb(() => (revealed ? ((value == -1) ? "💣" : ((value == 0) ? "" : String(value))) : (flagged ? "🚩" : "")), 'display', moduleId);

  // Combinational: cell_class
  const cell_class = createComb(() => (((("cell" + (revealed ? " revealed" : "")) + (flagged ? " flagged" : "")) + ((revealed && (value == -1)) ? " mine" : "")) + ((revealed && (value > 0)) ? (" n" + String(value)) : "")), 'cell_class', moduleId);

  // View
  function render() {
    const el1 = document.createElement('div');
    createEffect(() => { el1.setAttribute('class', cell_class()); }, 'attr_class', moduleId);
    const txt2 = document.createTextNode('');
    createEffect(() => { txt2.textContent = String(display()); }, 'text_txt2', moduleId);
    el1.appendChild(txt2);
    root.appendChild(el1);
  }

  render();

}

export function Minesweeper(root) {
  const moduleId = 'Minesweeper';

  // Signal: rows
  const [rows, setRows] = createSignal(9, 'rows', moduleId);

  // Signal: cols
  const [cols, setCols] = createSignal(9, 'cols', moduleId);

  // Signal: mine_count
  const [mine_count, setMine_count] = createSignal(10, 'mine_count', moduleId);

  // Signal: grid
  const [grid, setGrid] = createSignal([], 'grid', moduleId);

  // Signal: revealed
  const [revealed, setRevealed] = createSignal([], 'revealed', moduleId);

  // Signal: flagged
  const [flagged, setFlagged] = createSignal([], 'flagged', moduleId);

  // Signal: game_over
  const [game_over, setGame_over] = createSignal(false, 'game_over', moduleId);

  // Signal: won
  const [won, setWon] = createSignal(false, 'won', moduleId);

  // Signal: started
  const [started, setStarted] = createSignal(false, 'started', moduleId);

  // Signal: time
  const [time, setTime] = createSignal(0, 'time', moduleId);

  // Combinational: flags_placed
  const flags_placed = createComb(() => flagged().flat().filter((f) => f).length, 'flags_placed', moduleId);

  // Combinational: remaining
  const remaining = createComb(() => (mine_count() - flags_placed()), 'remaining', moduleId);

  // Combinational: total_cells
  const total_cells = createComb(() => (rows() * cols()), 'total_cells', moduleId);

  // Combinational: revealed_count
  const revealed_count = createComb(() => revealed().flat().filter((r) => r).length, 'revealed_count', moduleId);

  // Combinational: safe_cells
  const safe_cells = createComb(() => (total_cells() - mine_count()), 'safe_cells', moduleId);

  // Event handler: init
  function init() {
    batch(() => {
      setGrid(generate_grid(rows(), cols(), mine_count()));
      setRevealed(make_2d(rows(), cols(), false));
      setFlagged(make_2d(rows(), cols(), false));
      setGame_over(false);
      setWon(false);
      setStarted(false);
      setTime(0);
    });
  }

  // Event handler: reveal
  function reveal(r, c) {
    batch(() => {
      if (((!game_over() && !flagged()[r][c]) && !revealed()[r][c])) {
        if (!started()) {
          setStarted(true);
        }
        if ((grid()[r][c] == -1)) {
          setRevealed(reveal_all(revealed()));
          setGame_over(true);
        } else {
          setRevealed(flood_reveal(grid(), revealed(), r, c));
          if (((revealed_count() + 1) >= safe_cells())) {
            setWon(true);
            setGame_over(true);
          }
        }
      }
    });
  }

  // Event handler: flag
  function flag(r, c) {
    batch(() => {
      if ((!game_over() && !revealed()[r][c])) {
        const arr1 = JSON.parse(JSON.stringify(flagged()));
        arr1[r][c] = !flagged()[r][c];
        setFlagged(arr1);
      }
    });
  }

  // Event handler: tick
  function tick() {
    batch(() => {
      if ((started() && !game_over())) {
        setTime((time() + 1));
      }
    });
  }

  // Event handler: new_game
  function new_game() {
    batch(() => {
      init();
    });
  }

  // Event handler: set_difficulty
  function set_difficulty(d) {
    batch(() => {
      if ((d == "easy")) {
        setRows(9);
        setCols(9);
        setMine_count(10);
      } else {
        if ((d == "medium")) {
          setRows(16);
          setCols(16);
          setMine_count(40);
        } else {
          setRows(16);
          setCols(30);
          setMine_count(99);
        }
      }
      init();
    });
  }

  // View
  function render() {
    const el2 = document.createElement('div');
    el2.setAttribute('class', 'minesweeper');
    const el3 = document.createElement('h1');
    const txt4 = document.createTextNode('Comb Minesweeper');
    el3.appendChild(txt4);
    el2.appendChild(el3);
    const el5 = document.createElement('div');
    el5.setAttribute('class', 'toolbar');
    const el6 = document.createElement('span');
    el6.setAttribute('class', 'mines-remaining');
    const txt7 = document.createTextNode('🚩');
    el6.appendChild(txt7);
    const txt8 = document.createTextNode('');
    createEffect(() => { txt8.textContent = String(remaining()); }, 'text_txt8', moduleId);
    el6.appendChild(txt8);
    el5.appendChild(el6);
    const el9 = document.createElement('button');
    el9.addEventListener('click', new_game);
    const txt10 = document.createTextNode('');
    createEffect(() => { txt10.textContent = String((game_over() ? (won() ? "😎" : "💀") : "🙂")); }, 'text_txt10', moduleId);
    el9.appendChild(txt10);
    el5.appendChild(el9);
    const el11 = document.createElement('span');
    el11.setAttribute('class', 'timer');
    const txt12 = document.createTextNode('⏱');
    el11.appendChild(txt12);
    const txt13 = document.createTextNode('');
    createEffect(() => { txt13.textContent = String(time()); }, 'text_txt13', moduleId);
    el11.appendChild(txt13);
    el5.appendChild(el11);
    el2.appendChild(el5);
    const el14 = document.createElement('div');
    el14.setAttribute('class', 'difficulty');
    const el15 = document.createElement('button');
    el15.addEventListener('click', () => set_difficulty("easy"));
    const txt16 = document.createTextNode('Easy');
    el15.appendChild(txt16);
    el14.appendChild(el15);
    const el17 = document.createElement('button');
    el17.addEventListener('click', () => set_difficulty("medium"));
    const txt18 = document.createTextNode('Medium');
    el17.appendChild(txt18);
    el14.appendChild(el17);
    const el19 = document.createElement('button');
    el19.addEventListener('click', () => set_difficulty("hard"));
    const txt20 = document.createTextNode('Hard');
    el19.appendChild(txt20);
    el14.appendChild(el19);
    el2.appendChild(el14);
    const el21 = document.createElement('div');
    el21.setAttribute('class', 'grid');
    const forAnchor22 = document.createComment('@for');
    el21.appendChild(forAnchor22);
    let forBlock23 = null;
    createEffect(() => {
      if (forBlock23) { forBlock23.remove(); forBlock23 = null; }
      forBlock23 = document.createElement('div');
      forBlock23.style.display = 'contents';
      for (let r = 0; r < rows(); r++) {
        const el24 = document.createElement('div');
        el24.setAttribute('class', 'row');
        const forAnchor25 = document.createComment('@for');
        el24.appendChild(forAnchor25);
        let forBlock26 = null;
        createEffect(() => {
          if (forBlock26) { forBlock26.remove(); forBlock26 = null; }
          forBlock26 = document.createElement('div');
          forBlock26.style.display = 'contents';
          for (let c = 0; c < cols(); c++) {
            const container27 = document.createElement('div');
            container27.style.display = 'contents';
            Cell({ value: grid()[r][c], revealed: revealed()[r][c], flagged: flagged()[r][c] }, container27);
            container27.addEventListener('click', () => reveal(r, c));
            container27.addEventListener('contextmenu', (e) => { e.preventDefault(); flag(r, c); });
            forBlock26.appendChild(container27);
          }
          forAnchor25.parentNode.insertBefore(forBlock26, forAnchor25.nextSibling);
        }, 'for_forAnchor25', moduleId);
        forBlock23.appendChild(el24);
      }
      forAnchor22.parentNode.insertBefore(forBlock23, forAnchor22.nextSibling);
    }, 'for_forAnchor22', moduleId);
    el2.appendChild(el21);
    const anchor28 = document.createComment('@if');
    el2.appendChild(anchor28);
    let ifBlock29 = null;
    createEffect(() => {
      if (ifBlock29) { ifBlock29.remove(); ifBlock29 = null; }
      if (game_over()) {
        ifBlock29 = document.createElement('div');
        ifBlock29.style.display = 'contents';
        const el31 = document.createElement('div');
        el31.setAttribute('class', 'game-over');
        const el32 = document.createElement('h2');
        const txt33 = document.createTextNode('');
        createEffect(() => { txt33.textContent = String((won() ? "You Win!" : "Game Over")); }, 'text_txt33', moduleId);
        el32.appendChild(txt33);
        el31.appendChild(el32);
        const el34 = document.createElement('button');
        el34.addEventListener('click', new_game);
        const txt35 = document.createTextNode('Play Again');
        el34.appendChild(txt35);
        el31.appendChild(el34);
        ifBlock29.appendChild(el31);
        anchor28.parentNode.insertBefore(ifBlock29, anchor28.nextSibling);
      }
    }, 'if_anchor28', moduleId);
    root.appendChild(el2);
  }

  render();

}
