(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChuntrisEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BOARD_WIDTH = 10;
  const VISIBLE_ROWS = 20;
  const HIDDEN_ROWS = 2;
  const BOARD_ROWS = VISIBLE_ROWS + HIDDEN_ROWS;
  const PIECE_TYPES = Object.freeze(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
  const LOCK_DELAY_MS = 500;
  const SCORE_ATTACK_MS = 180000;
  const EXTREME_GIMMICK_INTERVAL_MS = 9000;

  const SHAPES = Object.freeze({
    I: [
      [[0,1],[1,1],[2,1],[3,1]],
      [[2,0],[2,1],[2,2],[2,3]],
      [[0,2],[1,2],[2,2],[3,2]],
      [[1,0],[1,1],[1,2],[1,3]]
    ],
    O: [
      [[1,0],[2,0],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[2,1]]
    ],
    T: [
      [[1,0],[0,1],[1,1],[2,1]],
      [[1,0],[1,1],[2,1],[1,2]],
      [[0,1],[1,1],[2,1],[1,2]],
      [[1,0],[0,1],[1,1],[1,2]]
    ],
    S: [
      [[1,0],[2,0],[0,1],[1,1]],
      [[1,0],[1,1],[2,1],[2,2]],
      [[1,1],[2,1],[0,2],[1,2]],
      [[0,0],[0,1],[1,1],[1,2]]
    ],
    Z: [
      [[0,0],[1,0],[1,1],[2,1]],
      [[2,0],[1,1],[2,1],[1,2]],
      [[0,1],[1,1],[1,2],[2,2]],
      [[1,0],[0,1],[1,1],[0,2]]
    ],
    J: [
      [[0,0],[0,1],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[1,2]],
      [[0,1],[1,1],[2,1],[2,2]],
      [[1,0],[1,1],[0,2],[1,2]]
    ],
    L: [
      [[2,0],[0,1],[1,1],[2,1]],
      [[1,0],[1,1],[1,2],[2,2]],
      [[0,1],[1,1],[2,1],[0,2]],
      [[0,0],[1,0],[1,1],[1,2]]
    ]
  });

  const JLSTZ_KICKS = Object.freeze({
    '0>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '1>0': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '1>2': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '2>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '2>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '3>2': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '3>0': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '0>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]]
  });

  const I_KICKS = Object.freeze({
    '0>1': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]]
  });

  function createEmptyBoard() {
    return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_WIDTH).fill(null));
  }

  function cloneBoard(board) {
    return board.map(row => row.slice());
  }

  function createSevenBag(random = Math.random) {
    const bag = PIECE_TYPES.slice();
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    return bag;
  }

  function cellsFor(piece) {
    if (!piece || !SHAPES[piece.type]) return [];
    const shape = SHAPES[piece.type][((piece.rotation || 0) % 4 + 4) % 4];
    return shape.map(([x, y]) => [piece.x + x, piece.y + y]);
  }

  function collides(board, piece) {
    for (const [x, y] of cellsFor(piece)) {
      if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_ROWS) return true;
      if (y >= 0 && board[y] && board[y][x]) return true;
    }
    return false;
  }

  function ghostY(board, piece) {
    if (!piece) return 0;
    let y = piece.y;
    while (!collides(board, { ...piece, y: y + 1 })) y += 1;
    return y;
  }

  function normalizeMode(mode) {
    return mode === 'sprint40' || mode === 'score180' ? mode : 'classic';
  }

  function normalizeDifficulty(difficulty) {
    return difficulty === 'hard' || difficulty === 'extreme' ? difficulty : 'normal';
  }

  function resolveConfig(mode = 'classic', difficulty = null) {
    const legacyHard = mode === 'hard' && difficulty == null;
    return {
      mode: normalizeMode(mode),
      difficulty: normalizeDifficulty(legacyHard ? 'hard' : difficulty)
    };
  }

  function gravityMs(level, mode = 'classic', difficulty = 'normal') {
    const safeMode = normalizeMode(mode);
    const safeDifficulty = normalizeDifficulty(difficulty);
    const safeLevel = Math.max(1, Number(level) || 1);
    if (safeDifficulty === 'extreme') return Math.max(18, Math.round(220 * Math.pow(0.72, safeLevel - 1)));
    if (safeDifficulty === 'hard') return Math.max(45, Math.round(420 * Math.pow(0.80, safeLevel - 1)));
    if (safeMode === 'sprint40') return 1000;
    return Math.max(80, Math.round(1000 * Math.pow(0.85, safeLevel - 1)));
  }

  function lockDelayMs(difficulty = 'normal') {
    const safeDifficulty = normalizeDifficulty(difficulty);
    if (safeDifficulty === 'extreme') return 140;
    if (safeDifficulty === 'hard') return 300;
    return LOCK_DELAY_MS;
  }

  function levelForLines(lines = 0, mode = 'classic', difficulty = 'normal') {
    const safeLines = Math.max(0, Number(lines) || 0);
    const safeDifficulty = normalizeDifficulty(difficulty);
    if (safeDifficulty === 'extreme') return Math.floor(safeLines / 4) + 1;
    if (safeDifficulty === 'hard') return Math.floor(safeLines / 6) + 1;
    if (normalizeMode(mode) === 'sprint40') return 1;
    return Math.floor(safeLines / 10) + 1;
  }

  function extremeGimmickForSlot(slot) {
    const kinds = ['blink', 'phantom', 'garbage'];
    return kinds[(Math.max(1, Number(slot) || 1) - 1) % kinds.length];
  }

  function deterministicHoles(seed, slot, count, width = BOARD_WIDTH) {
    let value = ((Number(seed) || 0) ^ Math.imul(Math.max(1, Number(slot) || 1), 0x9E3779B1)) >>> 0;
    const holes = [];
    while (holes.length < Math.max(1, Math.min(width - 1, count))) {
      value = (Math.imul(value ^ (value >>> 16), 0x45d9f3b) + 0x27100001) >>> 0;
      const col = value % width;
      if (!holes.includes(col)) holes.push(col);
    }
    return holes.sort((a, b) => a - b);
  }

  function injectGarbageRow(board, holes = [4]) {
    const topOccupied = board[0].some(Boolean);
    const next = board.slice(1).map(row => row.slice());
    const holeSet = new Set(holes);
    next.push(Array.from({ length: BOARD_WIDTH }, (_, x) => holeSet.has(x) ? null : 'G'));
    return { board: next, toppedOut: topOccupied };
  }

  function clearCompletedLines(board) {
    const kept = [];
    const clearedRows = [];
    for (let y = 0; y < BOARD_ROWS; y += 1) {
      if (board[y].every(Boolean)) clearedRows.push(y);
      else kept.push(board[y].slice());
    }
    while (kept.length < BOARD_ROWS) kept.unshift(Array(BOARD_WIDTH).fill(null));
    return { board: kept, lines: clearedRows.length, clearedRows };
  }

  function scoreClear({ lines = 0, tSpin = false, level = 1, combo = -1, backToBack = false } = {}) {
    const safeLevel = Math.max(1, Number(level) || 1);
    const count = Math.max(0, Math.min(4, Number(lines) || 0));
    let base = 0;
    if (tSpin) base = [400, 800, 1200, 1600][count] || 0;
    else base = [0, 100, 300, 500, 800][count] || 0;

    const eligible = count === 4 || (tSpin && count > 0);
    const b2bApplied = eligible && Boolean(backToBack);
    if (b2bApplied) base = Math.floor(base * 1.5);

    const nextCombo = count > 0 ? (Number(combo) || 0) + 1 : -1;
    const comboBonus = count > 0 && nextCombo > 0 ? 50 * nextCombo * safeLevel : 0;
    const points = base * safeLevel + comboBonus;

    let nextBackToBack = Boolean(backToBack);
    if (eligible) nextBackToBack = true;
    else if (count > 0) nextBackToBack = false;

    return { points, nextCombo, nextBackToBack, b2bApplied, eligible };
  }

  function spawnPiece(type) {
    return { type, rotation: 0, x: 3, y: 0 };
  }

  function occupiedOrOutside(board, x, y) {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_ROWS) return true;
    return Boolean(board[y][x]);
  }

  class ChuntrisGame {
    constructor({ mode = 'classic', difficulty = null, random = Math.random } = {}) {
      this.random = typeof random === 'function' ? random : Math.random;
      this.gimmickSeed = Math.floor(this.random() * 0x100000000) >>> 0;
      const config = resolveConfig(mode, difficulty);
      this.state = {
        board: createEmptyBoard(), active: null, hold: null, next: [], canHold: true,
        score: 0, lines: 0, level: 1, combo: -1, backToBack: false,
        mode: config.mode, difficulty: config.difficulty, elapsedMs: 0,
        status: 'idle', startedAt: 0, pausedAt: null, pausedDurationMs: 0,
        lastAdvanceAt: 0, lastGravityAt: 0, groundedAt: null,
        lastAction: null, lastClear: null,
        gimmickSlot: 0, gimmick: null, lastGimmick: null
      };
      this.ensureQueue(7);
      this.spawnNext();
      this.state.status = 'idle';
    }

    ensureQueue(minimum = 5) {
      while (this.state.next.length < minimum) this.state.next.push(...createSevenBag(this.random));
    }

    spawnNext() {
      this.ensureQueue(6);
      const type = this.state.next.shift();
      this.ensureQueue(5);
      const piece = spawnPiece(type);
      this.state.active = piece;
      this.state.groundedAt = null;
      this.state.lastAction = 'spawn';
      if (collides(this.state.board, piece)) {
        this.state.status = 'gameover';
        return false;
      }
      return true;
    }

    reset(mode = this.state.mode, difficulty = this.state.difficulty) {
      const config = resolveConfig(mode, difficulty);
      this.state = {
        board: createEmptyBoard(), active: null, hold: null, next: [], canHold: true,
        score: 0, lines: 0, level: 1, combo: -1, backToBack: false,
        mode: config.mode, difficulty: config.difficulty, elapsedMs: 0, status: 'idle', startedAt: 0,
        pausedAt: null, pausedDurationMs: 0, lastAdvanceAt: 0, lastGravityAt: 0,
        groundedAt: null, lastAction: null, lastClear: null,
        gimmickSlot: 0, gimmick: null, lastGimmick: null
      };
      this.ensureQueue(7);
      this.spawnNext();
      this.state.status = 'idle';
      return this.getSnapshot();
    }

    start(nowMs = Date.now()) {
      if (this.state.status === 'gameover' || this.state.status === 'completed') this.reset(this.state.mode, this.state.difficulty);
      this.state.status = 'playing';
      this.state.startedAt = nowMs;
      this.state.elapsedMs = 0;
      this.state.pausedDurationMs = 0;
      this.state.lastAdvanceAt = nowMs;
      this.state.lastGravityAt = nowMs;
      this.state.pausedAt = null;
      if (!this.state.active || collides(this.state.board, this.state.active)) this.spawnNext();
      return this.getSnapshot();
    }

    setMode(mode) { return this.reset(mode, this.state.difficulty); }

    setDifficulty(difficulty) { return this.reset(this.state.mode, difficulty); }

    pause(nowMs = Date.now()) {
      if (this.state.status !== 'playing') return false;
      this.updateElapsed(nowMs);
      this.state.status = 'paused';
      this.state.pausedAt = nowMs;
      return true;
    }

    resume(nowMs = Date.now()) {
      if (this.state.status !== 'paused') return false;
      if (this.state.pausedAt != null) this.state.pausedDurationMs += Math.max(0, nowMs - this.state.pausedAt);
      this.state.pausedAt = null;
      this.state.status = 'playing';
      this.state.lastAdvanceAt = nowMs;
      this.state.lastGravityAt = nowMs;
      if (this.state.groundedAt != null) this.state.groundedAt = nowMs;
      return true;
    }

    togglePause(nowMs = Date.now()) {
      return this.state.status === 'paused' ? this.resume(nowMs) : this.pause(nowMs);
    }

    updateElapsed(nowMs) {
      if (this.state.status === 'idle') return;
      const end = this.state.pausedAt != null ? this.state.pausedAt : nowMs;
      this.state.elapsedMs = Math.max(0, end - this.state.startedAt - this.state.pausedDurationMs);
    }

    getSnapshot() {
      return {
        ...this.state,
        board: cloneBoard(this.state.board),
        active: this.state.active ? { ...this.state.active } : null,
        next: this.state.next.slice(0, 5),
        hold: this.state.hold
      };
    }

    isPlaying() { return this.state.status === 'playing'; }

    moveHorizontal(direction) {
      if (!this.isPlaying() || !this.state.active) return false;
      const dx = direction < 0 ? -1 : 1;
      const candidate = { ...this.state.active, x: this.state.active.x + dx };
      if (collides(this.state.board, candidate)) return false;
      this.state.active = candidate;
      this.state.lastAction = 'move';
      this.refreshGrounded(Date.now());
      return true;
    }

    softDrop() {
      if (!this.isPlaying() || !this.state.active) return false;
      const candidate = { ...this.state.active, y: this.state.active.y + 1 };
      if (collides(this.state.board, candidate)) {
        if (this.state.groundedAt == null) this.state.groundedAt = Date.now();
        return false;
      }
      this.state.active = candidate;
      this.state.score += 1;
      this.state.lastAction = 'softDrop';
      this.refreshGrounded(Date.now());
      return true;
    }

    hardDrop(nowMs = Date.now()) {
      if (!this.isPlaying() || !this.state.active) return 0;
      const landing = ghostY(this.state.board, this.state.active);
      const moved = Math.max(0, landing - this.state.active.y);
      this.state.active = { ...this.state.active, y: landing };
      this.state.score += moved * 2;
      if (moved > 0) this.state.lastAction = 'hardDrop';
      this.lockActive(nowMs);
      return moved;
    }

    rotate(direction = 1) {
      if (!this.isPlaying() || !this.state.active) return false;
      const from = this.state.active.rotation;
      const to = (from + (direction < 0 ? 3 : 1)) % 4;
      if (this.state.active.type === 'O') {
        this.state.active = { ...this.state.active, rotation: to };
        this.state.lastAction = 'rotate';
        this.refreshGrounded(Date.now());
        return true;
      }
      const table = this.state.active.type === 'I' ? I_KICKS : JLSTZ_KICKS;
      const kicks = table[`${from}>${to}`] || [[0,0]];
      for (const [dx, dy] of kicks) {
        const candidate = {
          ...this.state.active, rotation: to,
          x: this.state.active.x + dx, y: this.state.active.y + dy
        };
        if (!collides(this.state.board, candidate)) {
          this.state.active = candidate;
          this.state.lastAction = 'rotate';
          this.refreshGrounded(Date.now());
          return true;
        }
      }
      return false;
    }

    holdPiece() {
      if (!this.isPlaying() || !this.state.active || !this.state.canHold) return false;
      const current = this.state.active.type;
      if (this.state.hold) {
        const swap = this.state.hold;
        this.state.hold = current;
        this.state.active = spawnPiece(swap);
        if (collides(this.state.board, this.state.active)) this.state.status = 'gameover';
      } else {
        this.state.hold = current;
        this.spawnNext();
      }
      this.state.canHold = false;
      this.state.groundedAt = null;
      this.state.lastAction = 'hold';
      return true;
    }

    refreshGrounded(nowMs) {
      if (!this.state.active) return;
      const below = { ...this.state.active, y: this.state.active.y + 1 };
      if (collides(this.state.board, below)) {
        if (this.state.groundedAt == null) this.state.groundedAt = nowMs;
      } else {
        this.state.groundedAt = null;
      }
    }

    detectTSpin(piece) {
      if (!piece || piece.type !== 'T' || this.state.lastAction !== 'rotate') return false;
      const cx = piece.x + 1;
      const cy = piece.y + 1;
      const corners = [[cx-1,cy-1],[cx+1,cy-1],[cx-1,cy+1],[cx+1,cy+1]];
      return corners.filter(([x,y]) => occupiedOrOutside(this.state.board, x, y)).length >= 3;
    }

    lockActive(nowMs = Date.now()) {
      if (!this.state.active || this.state.status !== 'playing') return false;
      const piece = { ...this.state.active };
      const tSpin = this.detectTSpin(piece);
      for (const [x, y] of cellsFor(piece)) {
        if (y >= 0 && y < BOARD_ROWS && x >= 0 && x < BOARD_WIDTH) this.state.board[y][x] = piece.type;
      }
      const cleared = clearCompletedLines(this.state.board);
      this.state.board = cleared.board;
      this.applyClearEvent({ lines: cleared.lines, tSpin, clearedRows: cleared.clearedRows }, nowMs);
      if (this.state.status === 'completed') return true;
      this.state.canHold = true;
      this.state.groundedAt = null;
      const spawned = this.spawnNext();
      if (!spawned) this.updateElapsed(nowMs);
      return true;
    }

    applyClearEvent({ lines = 0, tSpin = false, clearedRows = [] } = {}, nowMs = Date.now()) {
      const result = scoreClear({
        lines, tSpin, level: this.state.level,
        combo: this.state.combo, backToBack: this.state.backToBack
      });
      this.state.score += result.points;
      this.state.combo = result.nextCombo;
      this.state.backToBack = result.nextBackToBack;
      this.state.lines += Math.max(0, Number(lines) || 0);
      this.state.level = levelForLines(this.state.lines, this.state.mode, this.state.difficulty);
      this.state.lastClear = {
        lines: Math.max(0, Number(lines) || 0), tSpin: Boolean(tSpin),
        points: result.points, combo: this.state.combo,
        backToBack: result.b2bApplied, at: nowMs,
        clearedRows: Array.isArray(clearedRows) ? clearedRows.filter(row => Number.isInteger(row) && row >= 0 && row < BOARD_ROWS).slice(0, 4) : []
      };
      if (this.state.mode === 'sprint40' && this.state.lines >= 40) {
        this.state.lines = 40;
        this.updateElapsed(nowMs);
        this.state.status = 'completed';
      } else {
        this.updateElapsed(nowMs);
      }
      return result;
    }

    updateExtremeGimmick(nowMs = Date.now()) {
      if (this.state.difficulty !== 'extreme' || this.state.status !== 'playing') {
        this.state.gimmick = null;
        return null;
      }
      const slot = Math.floor(this.state.elapsedMs / EXTREME_GIMMICK_INTERVAL_MS);
      if (slot <= 0 || slot <= this.state.gimmickSlot) {
        if (this.state.gimmick && Number(this.state.gimmick.until) <= nowMs) this.state.gimmick = null;
        return this.state.gimmick;
      }

      this.state.gimmickSlot = slot;
      const kind = extremeGimmickForSlot(slot);
      const event = { kind, slot, at: nowMs, until: nowMs };

      if (kind === 'blink') {
        event.until = nowMs + 1900;
      } else if (kind === 'phantom') {
        event.until = nowMs + 1350;
      } else if (kind === 'garbage') {
        const holeCount = this.state.level >= 7 ? 1 : 2;
        const holes = deterministicHoles(this.gimmickSeed, slot, holeCount);
        const injected = injectGarbageRow(this.state.board, holes);
        this.state.board = injected.board;
        event.holes = holes;
        event.until = nowMs + 1100;
        if (injected.toppedOut || (this.state.active && collides(this.state.board, this.state.active))) {
          this.state.status = 'gameover';
          this.updateElapsed(nowMs);
        }
      }

      this.state.gimmick = event;
      this.state.lastGimmick = { ...event };
      return event;
    }

    advance(nowMs = Date.now()) {
      if (!this.isPlaying()) return this.getSnapshot();
      this.updateElapsed(nowMs);
      if (this.state.mode === 'score180' && this.state.elapsedMs >= SCORE_ATTACK_MS) {
        this.state.elapsedMs = SCORE_ATTACK_MS;
        this.state.status = 'completed';
        return this.getSnapshot();
      }
      this.updateExtremeGimmick(nowMs);
      if (this.state.status !== 'playing') return this.getSnapshot();
      const interval = gravityMs(this.state.level, this.state.mode, this.state.difficulty);
      if (this.state.lastGravityAt == null) this.state.lastGravityAt = nowMs;

      let safety = 0;
      while (nowMs - this.state.lastGravityAt >= interval && safety < 24 && this.state.status === 'playing') {
        safety += 1;
        this.state.lastGravityAt += interval;
        const candidate = { ...this.state.active, y: this.state.active.y + 1 };
        if (!collides(this.state.board, candidate)) {
          this.state.active = candidate;
          this.state.lastAction = 'gravity';
          this.state.groundedAt = null;
        } else {
          if (this.state.groundedAt == null) this.state.groundedAt = this.state.lastGravityAt;
          break;
        }
      }

      this.refreshGrounded(nowMs);
      if (this.state.groundedAt != null && nowMs - this.state.groundedAt >= lockDelayMs(this.state.difficulty)) this.lockActive(nowMs);
      this.state.lastAdvanceAt = nowMs;
      return this.getSnapshot();
    }
  }

  return {
    BOARD_WIDTH, VISIBLE_ROWS, HIDDEN_ROWS, BOARD_ROWS, LOCK_DELAY_MS, SCORE_ATTACK_MS, EXTREME_GIMMICK_INTERVAL_MS,
    PIECE_TYPES, SHAPES, createSevenBag, createEmptyBoard, cellsFor,
    collides, ghostY, normalizeMode, normalizeDifficulty, resolveConfig, gravityMs, lockDelayMs, levelForLines, extremeGimmickForSlot, deterministicHoles, injectGarbageRow, clearCompletedLines, scoreClear, ChuntrisGame
  };
});
