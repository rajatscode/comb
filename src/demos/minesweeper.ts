// Minesweeper demo — hand-written against the Comb runtime
// Proves the runtime handles complex game state while compiler catches up.

import { createSignal, createComb, createEffect, batch, circuit } from '../runtime/index';
import { SignalInspector } from '../inspector';
import { CircuitVisualizer } from '../visualizer';
import { highlightComb } from '../highlight';

// ── Inline .comb source for the left panel ──────────────────────────
const MINESWEEPER_SOURCE = `module Cell(value: int, revealed: bool, flagged: bool) {
  comb display = revealed ? (value == -1 ? "💣" :
                             value == 0 ? "" :
                             str(value)) :
                 flagged ? "🚩" : "";

  comb cell_class = "cell" +
    (revealed ? " revealed" : "") +
    (flagged ? " flagged" : "") +
    (revealed && value == -1 ? " mine" : "") +
    (revealed && value > 0 ? " n" + str(value) : "");

  view {
    <div class={cell_class}>
      {display}
    </div>
  }
}

module Minesweeper {
  signal rows: int = 9;
  signal cols: int = 9;
  signal mine_count: int = 10;
  signal grid: int[][] = [];
  signal revealed: bool[][] = [];
  signal flagged: bool[][] = [];
  signal game_over: bool = false;
  signal won: bool = false;
  signal started: bool = false;
  signal time: int = 0;

  comb flags_placed = flagged.flat().filter(|f| f).len();
  comb remaining = mine_count - flags_placed;
  comb total_cells = rows * cols;
  comb revealed_count = revealed.flat().filter(|r| r).len();
  comb safe_cells = total_cells - mine_count;

  always @(reveal(r, c)) {
    @if !game_over && !flagged[r][c] && !revealed[r][c] {
      @if !started { started <= true; }
      @if grid[r][c] == -1 {
        revealed <= reveal_all(revealed);
        game_over <= true;
      } @else {
        revealed <= flood_reveal(grid, revealed, r, c);
        @if revealed_count + 1 >= safe_cells {
          won <= true;
          game_over <= true;
        }
      }
    }
  }

  always @(flag(r, c)) {
    @if !game_over && !revealed[r][c] {
      flagged[r][c] <= !flagged[r][c];
    }
  }

  view {
    <div class="minesweeper">
      <div class="toolbar">
        <span>🚩 {remaining}</span>
        <button @click=new_game>
          {game_over ? (won ? "😎" : "💀") : "🙂"}
        </button>
        <span>⏱ {time}</span>
      </div>
      <div class="grid">
        @for r in 0..rows {
          <div class="row">
            @for c in 0..cols {
              <Cell value={grid[r][c]}
                    revealed={revealed[r][c]}
                    flagged={flagged[r][c]}
                    @click=reveal(r, c)
                    @contextmenu=flag(r, c) />
            }
          </div>
        }
      </div>
    </div>
  }
}`;

// ── Difficulty presets ───────────────────────────────────────────────
interface Difficulty {
  rows: number;
  cols: number;
  mines: number;
}

const DIFFICULTIES: Record<string, Difficulty> = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 },
};

// ── Pure game helpers ───────────────────────────────────────────────

function make2D<T>(rows: number, cols: number, val: T): T[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(val));
}

function generateGrid(rows: number, cols: number, mines: number, safeR: number, safeC: number): number[][] {
  const grid = make2D(rows, cols, 0);
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    // Keep safe cell and its neighbours mine-free
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    if (grid[r][c] === -1) continue;
    grid[r][c] = -1;
    placed++;
  }
  // Compute adjacency counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === -1) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === -1) count++;
        }
      }
      grid[r][c] = count;
    }
  }
  return grid;
}

function floodReveal(grid: number[][], revealed: boolean[][], startR: number, startC: number): boolean[][] {
  const rows = grid.length, cols = grid[0].length;
  const next = revealed.map(row => [...row]);
  const stack: [number, number][] = [[startR, startC]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    if (next[r][c]) continue;
    if (grid[r][c] === -1) continue;
    next[r][c] = true;
    if (grid[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) stack.push([r + dr, c + dc]);
        }
      }
    }
  }
  return next;
}

function countRevealed(revealed: boolean[][]): number {
  let n = 0;
  for (const row of revealed) for (const v of row) if (v) n++;
  return n;
}

function countFlags(flagged: boolean[][]): number {
  let n = 0;
  for (const row of flagged) for (const v of row) if (v) n++;
  return n;
}

// ── Mount ───────────────────────────────────────────────────────────

export function mount(container: HTMLElement) {
  circuit.reset();

  const MOD = 'Minesweeper';

  // ─── Signals ────────────────────────────────────────────────
  const [getDifficulty, setDifficulty] = createSignal<string>('easy', 'difficulty', MOD);
  const [getGrid, setGrid]             = createSignal<number[][]>([], 'grid', MOD);
  const [getRevealed, setRevealed]     = createSignal<boolean[][]>([], 'revealed', MOD);
  const [getFlagged, setFlagged]       = createSignal<boolean[][]>([], 'flagged', MOD);
  const [getGameState, setGameState]   = createSignal<'playing' | 'won' | 'lost'>('playing', 'gameState', MOD);
  const [getTime, setTime]             = createSignal<number>(0, 'time', MOD);
  const [getFirstClick, setFirstClick] = createSignal<boolean>(true, 'firstClick', MOD);

  // ─── Combs (derived) ───────────────────────────────────────
  const getMinesRemaining = createComb(() => {
    const diff = DIFFICULTIES[getDifficulty()];
    return diff.mines - countFlags(getFlagged());
  }, 'minesRemaining', MOD);

  const getRevealedCount = createComb(() => countRevealed(getRevealed()), 'revealedCount', MOD);

  const getSafeCells = createComb(() => {
    const diff = DIFFICULTIES[getDifficulty()];
    return diff.rows * diff.cols - diff.mines;
  }, 'safeCells', MOD);

  const getEmoji = createComb(() => {
    const state = getGameState();
    return state === 'won' ? '😎' : state === 'lost' ? '💀' : '🙂';
  }, 'emoji', MOD);

  // ─── Game logic ─────────────────────────────────────────────

  function initGame(diffKey?: string) {
    batch(() => {
      if (diffKey) setDifficulty(diffKey);
      const diff = DIFFICULTIES[diffKey ?? getDifficulty()];
      setGrid(make2D(diff.rows, diff.cols, 0));
      setRevealed(make2D(diff.rows, diff.cols, false));
      setFlagged(make2D(diff.rows, diff.cols, false));
      setGameState('playing');
      setTime(0);
      setFirstClick(true);
    });
  }

  function revealCell(r: number, c: number) {
    if (getGameState() !== 'playing') return;
    if (getRevealed()[r]?.[c] || getFlagged()[r]?.[c]) return;

    batch(() => {
      let grid = getGrid();

      // First click: generate grid ensuring safety
      if (getFirstClick()) {
        const diff = DIFFICULTIES[getDifficulty()];
        grid = generateGrid(diff.rows, diff.cols, diff.mines, r, c);
        setGrid(grid);
        setFirstClick(false);
      }

      // Hit a mine?
      if (grid[r][c] === -1) {
        // Reveal all cells
        const allRevealed = getRevealed().map(row => row.map(() => true));
        setRevealed(allRevealed);
        setGameState('lost');
        return;
      }

      // Flood-fill reveal
      const newRevealed = floodReveal(grid, getRevealed(), r, c);
      setRevealed(newRevealed);

      // Win check
      if (countRevealed(newRevealed) >= getSafeCells()) {
        setGameState('won');
      }
    });
  }

  function toggleFlag(r: number, c: number) {
    if (getGameState() !== 'playing') return;
    if (getRevealed()[r]?.[c]) return;
    batch(() => {
      const next = getFlagged().map(row => [...row]);
      next[r][c] = !next[r][c];
      setFlagged(next);
    });
  }

  // ─── DOM construction ───────────────────────────────────────

  container.innerHTML = '';
  container.className = 'split-view three-pane';

  // Source panel (left)
  const sourcePanel = document.createElement('div');
  sourcePanel.className = 'source-panel';
  sourcePanel.innerHTML = `
    <div class="panel-header">minesweeper.comb</div>
    <pre>${highlightComb(MINESWEEPER_SOURCE)}</pre>
  `;
  container.appendChild(sourcePanel);

  // App panel (center)
  const appPanel = document.createElement('div');
  appPanel.className = 'app-panel';
  appPanel.style.justifyContent = 'flex-start';
  appPanel.style.overflow = 'auto';

  const msRoot = document.createElement('div');
  msRoot.className = 'minesweeper';

  // Title
  const title = document.createElement('h2');
  title.textContent = 'Comb Minesweeper';
  title.style.marginBottom = '0.75rem';
  msRoot.appendChild(title);

  // Difficulty selector
  const diffBar = document.createElement('div');
  diffBar.style.cssText = 'display:flex;gap:0.5rem;justify-content:center;margin-bottom:0.75rem;';
  for (const key of ['easy', 'medium', 'hard']) {
    const btn = document.createElement('button');
    btn.textContent = key[0].toUpperCase() + key.slice(1);
    btn.addEventListener('click', () => initGame(key));
    diffBar.appendChild(btn);
  }
  msRoot.appendChild(diffBar);

  // Toolbar: mines remaining | emoji | timer
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  const minesDisplay = document.createElement('span');
  minesDisplay.style.minWidth = '3.5rem';

  const emojiBtn = document.createElement('button');
  emojiBtn.style.cssText = 'font-size:1.4rem;padding:0.2rem 0.6rem;line-height:1;';
  emojiBtn.addEventListener('click', () => initGame());

  const timerDisplay = document.createElement('span');
  timerDisplay.style.minWidth = '3.5rem';
  timerDisplay.style.textAlign = 'right';

  toolbar.appendChild(minesDisplay);
  toolbar.appendChild(emojiBtn);
  toolbar.appendChild(timerDisplay);
  msRoot.appendChild(toolbar);

  // Grid container
  const gridEl = document.createElement('div');
  gridEl.className = 'grid';
  msRoot.appendChild(gridEl);

  // Game-over overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'margin-top:1rem;font-size:1.1rem;font-weight:600;min-height:1.6rem;';
  msRoot.appendChild(overlay);

  appPanel.appendChild(msRoot);
  container.appendChild(appPanel);

  // Right panel: circuit viz + inspector
  const rightPanel = document.createElement('div');
  rightPanel.style.display = 'flex';
  rightPanel.style.flexDirection = 'column';
  rightPanel.style.gap = '1rem';

  const circuitContainer = document.createElement('div');
  circuitContainer.className = 'circuit-panel';
  circuitContainer.style.flex = '1';
  rightPanel.appendChild(circuitContainer);

  const inspectorContainer = document.createElement('div');
  rightPanel.appendChild(inspectorContainer);
  container.appendChild(rightPanel);

  // ─── Cell DOM pool ──────────────────────────────────────────
  let cellEls: HTMLDivElement[][] = [];

  function rebuildGrid() {
    gridEl.innerHTML = '';
    const diff = DIFFICULTIES[getDifficulty()];
    gridEl.style.gridTemplateColumns = `repeat(${diff.cols}, 32px)`;
    cellEls = [];
    for (let r = 0; r < diff.rows; r++) {
      const rowArr: HTMLDivElement[] = [];
      for (let c = 0; c < diff.cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        // capture r,c
        const cr = r, cc = c;
        cell.addEventListener('click', () => revealCell(cr, cc));
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          toggleFlag(cr, cc);
        });
        gridEl.appendChild(cell);
        rowArr.push(cell);
      }
      cellEls.push(rowArr);
    }
  }

  // ─── Effects (reactive DOM updates) ─────────────────────────

  // Rebuild grid when difficulty changes
  createEffect(() => {
    getDifficulty(); // track
    rebuildGrid();
  }, 'rebuildGrid', MOD);

  // Update cell visuals when grid/revealed/flagged change
  createEffect(() => {
    const grid = getGrid();
    const revealed = getRevealed();
    const flagged = getFlagged();
    const state = getGameState();

    for (let r = 0; r < cellEls.length; r++) {
      for (let c = 0; c < (cellEls[r]?.length ?? 0); c++) {
        const el = cellEls[r][c];
        const isRevealed = revealed[r]?.[c] ?? false;
        const isFlagged = flagged[r]?.[c] ?? false;
        const val = grid[r]?.[c] ?? 0;

        let cls = 'cell';
        let text = '';

        if (isRevealed) {
          cls += ' revealed';
          if (val === -1) {
            cls += ' mine';
            text = '💣';
          } else if (val > 0) {
            cls += ` n${val}`;
            text = String(val);
          }
        } else if (isFlagged) {
          cls += ' flagged';
          text = '🚩';
        }

        // Dim cells when game is over
        if (state !== 'playing' && !isRevealed) {
          el.style.opacity = '0.5';
        } else {
          el.style.opacity = '';
        }

        el.className = cls;
        el.textContent = text;
      }
    }
  }, 'renderCells', MOD);

  // Update toolbar displays
  createEffect(() => {
    minesDisplay.textContent = `🚩 ${getMinesRemaining()}`;
  }, 'renderMines', MOD);

  createEffect(() => {
    emojiBtn.textContent = getEmoji();
  }, 'renderEmoji', MOD);

  createEffect(() => {
    timerDisplay.textContent = `⏱ ${getTime()}`;
  }, 'renderTimer', MOD);

  // Game-over overlay
  createEffect(() => {
    const state = getGameState();
    if (state === 'won') {
      overlay.textContent = '🎉 You Win!';
      overlay.style.color = 'var(--signal-green)';
    } else if (state === 'lost') {
      overlay.textContent = '💥 Game Over';
      overlay.style.color = 'var(--signal-red)';
    } else {
      overlay.textContent = '';
    }
  }, 'renderOverlay', MOD);

  // Timer interval
  createEffect(() => {
    const first = getFirstClick();
    const state = getGameState();
    if (first || state !== 'playing') return;
    const id = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(id);
  }, 'timerInterval', MOD);

  // ─── Inspector + Visualizer ─────────────────────────────────

  const inspector = new SignalInspector(inspectorContainer);
  inspector.attach(circuit);

  const viz = new CircuitVisualizer(circuitContainer);
  const graphData = circuit.getModule(MOD);
  if (graphData.nodes.length > 0) {
    viz.renderStatic({
      modules: [{
        name: MOD,
        nodes: graphData.nodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          deps: Array.from(n.dependencies),
        })),
        wires: graphData.wires.map(w => ({ from: w.from, to: w.to })),
      }],
    });
    circuit.subscribe((event) => {
      if (event.type === 'signal-change' || event.type === 'comb-recompute') {
        viz.onSignalChange(event.nodeId, event.newValue);
      }
    });
  }

  // ─── Init ───────────────────────────────────────────────────
  initGame('easy');
}
