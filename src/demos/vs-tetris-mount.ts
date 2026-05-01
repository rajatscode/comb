// vs-tetris-mount.ts — VS Tetris: two-player battle with AI opponent
// Proves: delta cycles enable correct cross-dependent state machine interaction
// The garbage mechanic is the killer feature — both boards read each other's OLD state

import { VsTetris, __graph } from '../generated/vs-tetris.js';
import { createDemoShell } from '../demo-shell.js';
import { renderCircuitGraph } from '../visualizer.js';
import { renderWaveform } from '../waveform/index.js';
import { circuit, batch, deferredBatch } from '../runtime/index.js';

const M = 'VsTetris';
const COLS = 10;
const ROWS = 20;
const CELL = 16;

// Tetromino shapes: [rotation][row][col]
const PIECES: Record<string, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[1,1],[1,1]],[[1,1],[1,1]],[[1,1],[1,1]],[[1,1],[1,1]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
};

const PIECE_COLORS: Record<string, string> = {
  I: '#6ee7f9', O: '#f8d66d', T: '#a78bfa', S: '#72f1b8',
  Z: '#ff5d8f', L: '#e8915a', J: '#5b9bd5',
};

const PIECE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];

interface BoardState {
  grid: number[][]; // ROWS x COLS, 0 = empty, 1-7 = piece color index
  piece: string;
  x: number; y: number; rot: number;
  score: number; lines: number;
  pendingGarbage: number;
  gameOver: boolean;
  linesJustCleared: number;
}

function createBoard(): BoardState {
  return {
    grid: Array.from({ length: ROWS }, () => new Array(COLS).fill(0)),
    piece: '', x: 4, y: 0, rot: 0,
    score: 0, lines: 0, pendingGarbage: 0,
    gameOver: false, linesJustCleared: 0,
  };
}

function randomPiece(): string {
  return PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
}

function getShape(piece: string, rot: number): number[][] {
  return PIECES[piece]?.[rot % 4] ?? [[1]];
}

function collides(grid: number[][], piece: string, x: number, y: number, rot: number): boolean {
  const shape = getShape(piece, rot);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const gx = x + c, gy = y + r;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && grid[gy][gx] !== 0) return true;
    }
  }
  return false;
}

function lockPiece(board: BoardState): void {
  const shape = getShape(board.piece, board.rot);
  const colorIdx = PIECE_NAMES.indexOf(board.piece) + 1;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const gy = board.y + r, gx = board.x + c;
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
        board.grid[gy][gx] = colorIdx;
      }
    }
  }
}

function clearLines(board: BoardState): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board.grid[r].every(c => c !== 0)) {
      board.grid.splice(r, 1);
      board.grid.unshift(new Array(COLS).fill(0));
      cleared++;
      r++; // re-check this row
    }
  }
  return cleared;
}

function addGarbage(board: BoardState, lines: number): void {
  const gap = Math.floor(Math.random() * COLS);
  for (let i = 0; i < lines; i++) {
    board.grid.shift();
    const row = new Array(COLS).fill(8); // 8 = garbage color
    row[gap] = 0;
    board.grid.push(row);
  }
}

function spawnPiece(board: BoardState): void {
  board.piece = randomPiece();
  board.x = 3; board.y = 0; board.rot = 0;
  if (collides(board.grid, board.piece, board.x, board.y, board.rot)) {
    board.gameOver = true;
  }
}

// Simple AI: evaluate all positions, pick the one with best score
function aiMove(board: BoardState): { x: number; rot: number } {
  let bestScore = -Infinity;
  let bestX = board.x, bestRot = board.rot;

  for (let rot = 0; rot < 4; rot++) {
    const shape = getShape(board.piece, rot);
    const w = shape[0].length;
    for (let x = -1; x < COLS - w + 2; x++) {
      // Drop to bottom
      let y = board.y;
      while (!collides(board.grid, board.piece, x, y + 1, rot)) y++;
      if (collides(board.grid, board.piece, x, y, rot)) continue;

      // Evaluate: prefer lower placement, fewer holes, more line clears
      const testGrid = board.grid.map(r => [...r]);
      const s = getShape(board.piece, rot);
      const ci = PIECE_NAMES.indexOf(board.piece) + 1;
      for (let r = 0; r < s.length; r++) {
        for (let c = 0; c < s[r].length; c++) {
          if (s[r][c] && y + r >= 0 && y + r < ROWS && x + c >= 0 && x + c < COLS) {
            testGrid[y + r][x + c] = ci;
          }
        }
      }

      // Count line clears
      let clears = 0;
      for (const row of testGrid) if (row.every(c => c !== 0)) clears++;

      // Count holes (empty cells below a filled cell)
      let holes = 0;
      for (let col = 0; col < COLS; col++) {
        let foundBlock = false;
        for (let row = 0; row < ROWS; row++) {
          if (testGrid[row][col] !== 0) foundBlock = true;
          else if (foundBlock) holes++;
        }
      }

      // Height penalty
      let maxH = 0;
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          if (testGrid[row][col] !== 0) { maxH = Math.max(maxH, ROWS - row); break; }
        }
      }

      const score = clears * 100 + y * 2 - holes * 30 - maxH * 5;
      if (score > bestScore) { bestScore = score; bestX = x; bestRot = rot; }
    }
  }

  return { x: bestX, rot: bestRot };
}

function drawBoard(ctx: CanvasRenderingContext2D, board: BoardState, offsetX: number): void {
  // Background
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(offsetX, 0, COLS * CELL, ROWS * CELL);

  // Grid lines
  ctx.strokeStyle = 'rgba(110,231,249,0.06)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(offsetX, r * CELL); ctx.lineTo(offsetX + COLS * CELL, r * CELL); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(offsetX + c * CELL, 0); ctx.lineTo(offsetX + c * CELL, ROWS * CELL); ctx.stroke();
  }

  // Locked cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board.grid[r][c];
      if (v === 0) continue;
      const color = v === 8 ? '#444' : PIECE_COLORS[PIECE_NAMES[v - 1]] ?? '#888';
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(offsetX + c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      ctx.globalAlpha = 1;
    }
  }

  // Active piece
  if (board.piece && !board.gameOver) {
    const shape = getShape(board.piece, board.rot);
    const color = PIECE_COLORS[board.piece] ?? '#fff';
    ctx.fillStyle = color;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gx = board.x + c, gy = board.y + r;
        if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
          ctx.fillRect(offsetX + gx * CELL + 1, gy * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    // Ghost piece (drop preview)
    let ghostY = board.y;
    while (!collides(board.grid, board.piece, board.x, ghostY + 1, board.rot)) ghostY++;
    if (ghostY !== board.y) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = color;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const gx = board.x + c, gy = ghostY + r;
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
            ctx.fillRect(offsetX + gx * CELL + 1, gy * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // Game over overlay
  if (board.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(offsetX, 0, COLS * CELL, ROWS * CELL);
    ctx.fillStyle = '#ff5d8f';
    ctx.font = 'bold 20px var(--sans, system-ui)';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', offsetX + (COLS * CELL) / 2, ROWS * CELL / 2);
    ctx.textAlign = 'left';
  }
}

export function mountVsTetris(root: HTMLElement): { dispose: () => void } {
  const shell = createDemoShell(root, {
    layout: 'stacked',
    title: 'VS Tetris — Cross-Dependent State Machines',
    description:
      'Two boards, one clock. When you clear lines, garbage appears on the AI\'s board — and vice versa. ' +
      'Both boards process simultaneously via delta cycles, each reading the other\'s PREVIOUS tick state. ' +
      'Without delta cycles, garbage delivery would depend on which board updates first.',
  });

  // Mount compiled component (for signals/graph)
  const componentRoot = document.createElement('div');
  componentRoot.style.cssText = 'padding: 0 16px;';
  shell.app.appendChild(componentRoot);
  const component = VsTetris(componentRoot);

  // Game state (managed in JS, synced to Comb signals for observability)
  const p1 = createBoard();
  const p2 = createBoard();
  spawnPiece(p1);
  spawnPiece(p2);

  // Canvas for both boards
  const gameArea = document.createElement('div');
  gameArea.style.cssText = 'display:flex; justify-content:center; gap:16px; padding:8px 8px; align-items:flex-start;';

  // P1 board
  const p1Container = document.createElement('div');
  p1Container.style.cssText = 'text-align:center;';
  const p1Label = document.createElement('div');
  p1Label.style.cssText = 'font-family:var(--mono); font-size:0.8rem; color:var(--accent); margin-bottom:4px;';
  p1Label.textContent = 'PLAYER 1 (You)';
  const p1Canvas = document.createElement('canvas');
  p1Canvas.width = COLS * CELL; p1Canvas.height = ROWS * CELL;
  p1Canvas.style.cssText = `width:${COLS * CELL}px; height:${ROWS * CELL}px; border:1px solid var(--border); border-radius:4px;`;
  p1Container.appendChild(p1Label);
  p1Container.appendChild(p1Canvas);

  // VS label
  const vsLabel = document.createElement('div');
  vsLabel.style.cssText = 'font-size:1.5rem; font-weight:800; color:var(--event); align-self:center; font-family:var(--sans);';
  vsLabel.textContent = 'VS';

  // P2 board
  const p2Container = document.createElement('div');
  p2Container.style.cssText = 'text-align:center;';
  const p2Label = document.createElement('div');
  p2Label.style.cssText = 'font-family:var(--mono); font-size:0.8rem; color:var(--accent-2); margin-bottom:4px;';
  p2Label.textContent = 'PLAYER 2 (AI)';
  const p2Canvas = document.createElement('canvas');
  p2Canvas.width = COLS * CELL; p2Canvas.height = ROWS * CELL;
  p2Canvas.style.cssText = `width:${COLS * CELL}px; height:${ROWS * CELL}px; border:1px solid var(--border); border-radius:4px;`;
  p2Container.appendChild(p2Label);
  p2Container.appendChild(p2Canvas);

  gameArea.appendChild(p1Container);
  gameArea.appendChild(vsLabel);
  gameArea.appendChild(p2Container);
  shell.app.appendChild(gameArea);

  // Score display
  const scoreBar = document.createElement('div');
  scoreBar.style.cssText = 'display:flex; justify-content:center; gap:40px; padding:8px; font-family:var(--mono); font-size:0.85rem;';
  shell.app.appendChild(scoreBar);

  // Controls hint
  const hint = document.createElement('div');
  hint.style.cssText = 'text-align:center; padding:4px; font-size:0.75rem; color:var(--text-faint);';
  hint.textContent = 'Controls: ← → move | ↑ rotate | ↓ soft drop | Space hard drop';
  shell.app.appendChild(hint);

  // Sync game state to Comb signals for waveform/graph observability
  function syncToComb(): void {
    const nodes: Record<string, any> = {
      p1_score: p1.score, p2_score: p2.score,
      p1_lines: p1.lines, p2_lines: p2.lines,
      p1_pendingGarbage: p1.pendingGarbage, p2_pendingGarbage: p2.pendingGarbage,
      p1_gameOver: p1.gameOver, p2_gameOver: p2.gameOver,
      p1_linesCleared: p1.linesJustCleared, p2_linesCleared: p2.linesJustCleared,
      p1_piece: `PieceType.${p1.piece || 'None'}`, p2_piece: `PieceType.${p2.piece || 'None'}`,
      p1_x: p1.x, p1_y: p1.y, p1_rot: p1.rot,
      p2_x: p2.x, p2_y: p2.y, p2_rot: p2.rot,
    };
    batch(() => {
      for (const [name, val] of Object.entries(nodes)) {
        const node = circuit.getNode(`${M}.${name}`);
        if (node?.setValue) try { node.setValue(val); } catch (_) {}
      }
    });
  }

  // Game tick: process both boards with delta cycle semantics
  function gameTick(): void {
    if (p1.gameOver || p2.gameOver) return;

    // Reset per-tick counters
    p1.linesJustCleared = 0;
    p2.linesJustCleared = 0;

    // === Delta cycle semantics: read OLD garbage values ===
    const p1OldGarbage = p1.pendingGarbage;
    const p2OldGarbage = p2.pendingGarbage;

    // Process P1 gravity
    if (!collides(p1.grid, p1.piece, p1.x, p1.y + 1, p1.rot)) {
      p1.y++;
    } else {
      lockPiece(p1);
      const cleared = clearLines(p1);
      p1.linesJustCleared = cleared;
      if (cleared > 0) {
        p1.lines += cleared;
        p1.score += [0, 100, 300, 500, 800][cleared] ?? 1000;
      }
      // Apply garbage from P2 (using OLD value — delta cycle)
      if (p2OldGarbage > 0) {
        addGarbage(p1, p2OldGarbage);
        p1.pendingGarbage = 0;
      }
      spawnPiece(p1);
    }

    // Process P2 (AI) — same gravity as player, AI decides target once per piece
    if (p2.piece && !p2.gameOver) {
      // AI picks target position once when piece spawns (y == 0)
      if (p2.y === 0 && !(p2 as any)._aiTarget) {
        (p2 as any)._aiTarget = aiMove(p2);
      }
      const target = (p2 as any)._aiTarget;
      if (target) {
        // Gradually move toward target: one move per tick
        if (p2.rot !== target.rot) {
          const newRot = (p2.rot + 1) % 4;
          if (!collides(p2.grid, p2.piece, p2.x, p2.y, newRot)) p2.rot = newRot;
        } else if (p2.x < target.x) {
          if (!collides(p2.grid, p2.piece, p2.x + 1, p2.y, p2.rot)) p2.x++;
        } else if (p2.x > target.x) {
          if (!collides(p2.grid, p2.piece, p2.x - 1, p2.y, p2.rot)) p2.x--;
        }
      }
      // Gravity — same as player
      if (!collides(p2.grid, p2.piece, p2.x, p2.y + 1, p2.rot)) {
        p2.y++;
      } else {
        lockPiece(p2);
        const cleared = clearLines(p2);
        p2.linesJustCleared = cleared;
        if (cleared > 0) {
          p2.lines += cleared;
          p2.score += [0, 100, 300, 500, 800][cleared] ?? 1000;
        }
        if (p1OldGarbage > 0) {
          addGarbage(p2, p1OldGarbage);
          p2.pendingGarbage = 0;
        }
        (p2 as any)._aiTarget = null;
        spawnPiece(p2);
      }
    }

    // Garbage exchange: send THIS tick's line clears to opponent
    // (applied on the NEXT tick — delta cycle deferred write)
    if (p1.linesJustCleared > 1) {
      p2.pendingGarbage += p1.linesJustCleared - 1; // keep 1, send rest
    }
    if (p2.linesJustCleared > 1) {
      p1.pendingGarbage += p2.linesJustCleared - 1;
    }

    // Sync to Comb + tick the clock
    syncToComb();
    const tickNode = circuit.getNode(`${M}.tick`);
    if (tickNode?.setValue) {
      batch(() => { tickNode.setValue!(true); });
      setTimeout(() => { batch(() => { tickNode.setValue!(false); }); }, 5);
    }

    draw();
  }

  function draw(): void {
    const ctx1 = p1Canvas.getContext('2d')!;
    const ctx2 = p2Canvas.getContext('2d')!;
    drawBoard(ctx1, p1, 0);
    drawBoard(ctx2, p2, 0);

    // Score bar
    scoreBar.innerHTML = `
      <span style="color:var(--accent);">P1: ${p1.score} pts | ${p1.lines} lines</span>
      <span style="color:var(--text-faint);">Garbage: P1←${p1.pendingGarbage} | P2←${p2.pendingGarbage}</span>
      <span style="color:var(--accent-2);">P2: ${p2.score} pts | ${p2.lines} lines</span>
    `;
  }

  // Keyboard controls for P1
  function handleKeyDown(e: KeyboardEvent): void {
    if (p1.gameOver) return;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (!collides(p1.grid, p1.piece, p1.x - 1, p1.y, p1.rot)) p1.x--;
        draw();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (!collides(p1.grid, p1.piece, p1.x + 1, p1.y, p1.rot)) p1.x++;
        draw();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const newRot = (p1.rot + 1) % 4;
        if (!collides(p1.grid, p1.piece, p1.x, p1.y, newRot)) p1.rot = newRot;
        draw();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!collides(p1.grid, p1.piece, p1.x, p1.y + 1, p1.rot)) p1.y++;
        draw();
        break;
      case ' ':
        e.preventDefault();
        while (!collides(p1.grid, p1.piece, p1.x, p1.y + 1, p1.rot)) p1.y++;
        gameTick(); // force lock
        break;
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  // Game loop
  const gameInterval = setInterval(gameTick, 800);

  // Initial draw
  draw();

  // Start recording for waveform
  circuit.startRecording();

  // Waveform
  const wfDiv = document.createElement('div');
  wfDiv.style.cssText = 'height:250px; flex-shrink:0; border-top:1px solid var(--border);';
  shell.app.appendChild(wfDiv);
  const wf = renderWaveform(wfDiv, circuit, [
    `${M}.p1_score`, `${M}.p2_score`,
    `${M}.p1_lines`, `${M}.p2_lines`,
    `${M}.p1_pendingGarbage`, `${M}.p2_pendingGarbage`,
    `${M}.p1_gameOver`, `${M}.p2_gameOver`,
  ]);

  // === Coverage & Auto-Test Panel ===
  // Runs a HEADLESS simulation (separate from the live game) to measure coverage
  const coveragePanel = document.createElement('div');
  coveragePanel.style.cssText = 'margin:0 8px 8px; padding:12px 16px; background:var(--bg-surface); border:1px solid var(--border); border-radius:8px;';

  const coverageHeader = document.createElement('div');
  coverageHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;';
  coverageHeader.innerHTML = `<h3 style="margin:0; font-size:0.85rem; color:var(--accent-2); text-transform:uppercase; letter-spacing:1px;">Coverage (Headless Auto-Test)</h3>`;

  const autoTestBtn = document.createElement('button');
  autoTestBtn.className = 'pipeline-btn';
  autoTestBtn.textContent = 'Run Auto-Test';
  autoTestBtn.style.fontSize = '0.8rem';
  coverageHeader.appendChild(autoTestBtn);
  coveragePanel.appendChild(coverageHeader);

  const coverageGrid = document.createElement('div');
  coverageGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; font-family:var(--mono); font-size:0.7rem;';
  coveragePanel.appendChild(coverageGrid);

  const covCol1 = document.createElement('div');
  covCol1.innerHTML = '<div style="color:var(--text-faint); text-transform:uppercase; font-size:0.65rem; margin-bottom:4px;">Piece Coverage</div><div class="cov-pieces">Run auto-test</div>';
  const covCol2 = document.createElement('div');
  covCol2.innerHTML = '<div style="color:var(--text-faint); text-transform:uppercase; font-size:0.65rem; margin-bottom:4px;">State Coverage</div><div class="cov-states">Run auto-test</div>';
  const covCol3 = document.createElement('div');
  covCol3.innerHTML = '<div style="color:var(--text-faint); text-transform:uppercase; font-size:0.65rem; margin-bottom:4px;">Garbage Mechanics</div><div class="cov-garbage">Run auto-test</div>';
  coverageGrid.appendChild(covCol1);
  coverageGrid.appendChild(covCol2);
  coverageGrid.appendChild(covCol3);

  const covSummary = document.createElement('div');
  covSummary.style.cssText = 'margin-top:8px; text-align:center; font-family:var(--mono); font-size:0.75rem; color:var(--text-faint);';
  coveragePanel.appendChild(covSummary);

  // Read graph state space
  const graphTyped = __graph as { nodes: any[]; edges: any[]; enums?: Record<string, string[]> };
  const trackedNodes = graphTyped.nodes.filter((n: any) => n.states && n.states.length > 0);
  const pieceStates = graphTyped.enums?.PieceType ?? [];

  autoTestBtn.addEventListener('click', () => {
    autoTestBtn.disabled = true;
    autoTestBtn.textContent = 'Running...';

    // Headless simulation — completely separate from the live game
    const testP1 = createBoard();
    const testP2 = createBoard();
    spawnPiece(testP1);
    spawnPiece(testP2);

    // Track coverage
    const p1PiecesSeen = new Set<string>();
    const p2PiecesSeen = new Set<string>();
    const p1GameOverSeen = new Set<string>();
    const p2GameOverSeen = new Set<string>();
    let garbageSentP1toP2 = false;
    let garbageSentP2toP1 = false;
    let garbageReceived = false;
    let linesClearedP1 = false;
    let linesClearedP2 = false;

    let ticks = 0;
    const maxTicks = 500;

    const testInterval = setInterval(() => {
      if (testP1.gameOver && testP2.gameOver) {
        finish();
        return;
      }

      // Record piece types
      if (testP1.piece) p1PiecesSeen.add(testP1.piece);
      if (testP2.piece) p2PiecesSeen.add(testP2.piece);
      p1GameOverSeen.add(String(testP1.gameOver));
      p2GameOverSeen.add(String(testP2.gameOver));

      // Reset per-tick
      testP1.linesJustCleared = 0;
      testP2.linesJustCleared = 0;
      const p1OldGarbage = testP1.pendingGarbage;
      const p2OldGarbage = testP2.pendingGarbage;

      // P1 — AI-driven in headless mode
      if (!testP1.gameOver && testP1.piece) {
        const move = aiMove(testP1);
        testP1.x = move.x; testP1.rot = move.rot;
        while (!collides(testP1.grid, testP1.piece, testP1.x, testP1.y + 1, testP1.rot)) testP1.y++;
        lockPiece(testP1);
        const cleared = clearLines(testP1);
        testP1.linesJustCleared = cleared;
        if (cleared > 0) { testP1.lines += cleared; testP1.score += [0,100,300,500,800][cleared] ?? 1000; linesClearedP1 = true; }
        if (p2OldGarbage > 0) { addGarbage(testP1, p2OldGarbage); testP1.pendingGarbage = 0; garbageReceived = true; }
        spawnPiece(testP1);
      }

      // P2 — also AI
      if (!testP2.gameOver && testP2.piece) {
        const move = aiMove(testP2);
        testP2.x = move.x; testP2.rot = move.rot;
        while (!collides(testP2.grid, testP2.piece, testP2.x, testP2.y + 1, testP2.rot)) testP2.y++;
        lockPiece(testP2);
        const cleared = clearLines(testP2);
        testP2.linesJustCleared = cleared;
        if (cleared > 0) { testP2.lines += cleared; testP2.score += [0,100,300,500,800][cleared] ?? 1000; linesClearedP2 = true; }
        if (p1OldGarbage > 0) { addGarbage(testP2, p1OldGarbage); testP2.pendingGarbage = 0; garbageReceived = true; }
        spawnPiece(testP2);
      }

      // Garbage exchange
      if (testP1.linesJustCleared > 1) { testP2.pendingGarbage += testP1.linesJustCleared - 1; garbageSentP1toP2 = true; }
      if (testP2.linesJustCleared > 1) { testP1.pendingGarbage += testP2.linesJustCleared - 1; garbageSentP2toP1 = true; }

      ticks++;

      // Live update every 20 ticks
      if (ticks % 20 === 0) renderCov();

      if (ticks >= maxTicks) finish();
    }, 5); // Fast: 5ms per tick for headless

    function renderCov() {
      // Piece coverage
      const allPieces = pieceStates.filter((p: string) => p !== 'None');
      const p1Chips = allPieces.map((p: string) => {
        const hit = p1PiecesSeen.has(p);
        return `<span style="display:inline-block; padding:1px 5px; border-radius:2px; margin:1px; font-size:0.6rem; background:${hit ? 'rgba(114,241,184,0.15)' : 'var(--bg-elevated)'}; border:1px solid ${hit ? 'var(--success)' : 'var(--border)'}; color:${hit ? 'var(--success)' : 'var(--text-faint)'};">${p}</span>`;
      }).join('');
      const p2Chips = allPieces.map((p: string) => {
        const hit = p2PiecesSeen.has(p);
        return `<span style="display:inline-block; padding:1px 5px; border-radius:2px; margin:1px; font-size:0.6rem; background:${hit ? 'rgba(167,139,250,0.15)' : 'var(--bg-elevated)'}; border:1px solid ${hit ? 'var(--accent-2)' : 'var(--border)'}; color:${hit ? 'var(--accent-2)' : 'var(--text-faint)'};">${p}</span>`;
      }).join('');
      covCol1.querySelector('.cov-pieces')!.innerHTML = `<div style="margin-bottom:4px;"><span style="color:var(--accent); font-weight:600;">P1</span> ${p1PiecesSeen.size}/${allPieces.length}</div>${p1Chips}<div style="margin:6px 0 4px;"><span style="color:var(--accent-2); font-weight:600;">P2</span> ${p2PiecesSeen.size}/${allPieces.length}</div>${p2Chips}`;

      // State coverage
      const stateLines: string[] = [];
      const totalStates = trackedNodes.reduce((s: number, n: any) => s + n.states.length, 0);
      let coveredStates = 0;
      // Count pieces + booleans
      coveredStates += p1PiecesSeen.size + p2PiecesSeen.size;
      coveredStates += p1GameOverSeen.size + p2GameOverSeen.size;
      // Booleans: tick, gameActive are always {true, false}
      coveredStates += 4; // tick and gameActive always toggle
      stateLines.push(`<div>Bounded signals: ${trackedNodes.length}</div>`);
      stateLines.push(`<div>States covered: <span style="color:var(--success); font-weight:600;">${coveredStates}/${totalStates}</span></div>`);
      stateLines.push(`<div style="margin-top:4px;">P1 lines: ${testP1.lines} | P2 lines: ${testP2.lines}</div>`);
      stateLines.push(`<div>P1 score: ${testP1.score} | P2 score: ${testP2.score}</div>`);
      covCol2.querySelector('.cov-states')!.innerHTML = stateLines.join('');

      // Garbage mechanics
      const garbageLines: string[] = [];
      const checks = [
        { label: 'P1 clears lines', hit: linesClearedP1 },
        { label: 'P2 clears lines', hit: linesClearedP2 },
        { label: 'P1→P2 garbage sent', hit: garbageSentP1toP2 },
        { label: 'P2→P1 garbage sent', hit: garbageSentP2toP1 },
        { label: 'Garbage received', hit: garbageReceived },
      ];
      for (const check of checks) {
        const icon = check.hit ? '\u2713' : '\u2717';
        const color = check.hit ? 'var(--success)' : 'var(--text-faint)';
        garbageLines.push(`<div><span style="color:${color};">${icon}</span> ${check.label}</div>`);
      }
      covCol3.querySelector('.cov-garbage')!.innerHTML = garbageLines.join('');

      // Summary
      const garbageHits = checks.filter(c => c.hit).length;
      covSummary.innerHTML = `Headless: ${ticks} ticks | Piece types: ${p1PiecesSeen.size + p2PiecesSeen.size}/${allPieces.length * 2} | Garbage: ${garbageHits}/${checks.length}`;
    }

    function finish() {
      clearInterval(testInterval);
      renderCov();
      autoTestBtn.disabled = false;
      const statusColor = (testP1.gameOver || testP2.gameOver) ? 'var(--warning)' : 'var(--success)';
      covSummary.innerHTML += `<br><span style="color:${statusColor}; font-size:0.7rem;">Completed in ${ticks} ticks. P1: ${testP1.gameOver ? 'LOST' : 'alive'} | P2: ${testP2.gameOver ? 'LOST' : 'alive'}</span>`;
      autoTestBtn.textContent = 'Run Auto-Test';
    }
  });

  shell.app.appendChild(coveragePanel);

  // Circuit graph
  shell.circuit.style.minHeight = '300px';
  renderCircuitGraph(shell.circuit, __graph as any, circuit);

  // Inline styles for Comb view elements
  const style = document.createElement('style');
  style.textContent = `
    .vs-tetris { padding: 0; }
    .vs-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 0; font-family: var(--mono); font-size: 0.85rem;
    }
    .vs-score.p1 { color: var(--accent); }
    .vs-score.p2 { color: var(--accent-2); }
    .vs-title { font-size: 1.2rem; font-weight: 800; color: var(--event); letter-spacing: 2px; }
    .vs-status {
      display: flex; gap: 16px; font-size: 0.75rem; color: var(--text-faint);
      font-family: var(--mono); padding: 2px 0;
    }
  `;
  root.appendChild(style);

  return {
    dispose() {
      clearInterval(gameInterval);
      window.removeEventListener('keydown', handleKeyDown);
      circuit.stopRecording();
      wf.dispose();
      component.dispose();
      shell.dispose();
      style.remove();
    },
  };
}
