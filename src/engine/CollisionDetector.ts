import type { GridPos, Direction } from '../types';
import type { Arena } from './Arena';

/** Compute the next grid cell in the given direction. */
export function nextPos(pos: GridPos, dir: Direction): GridPos {
  switch (dir) {
    case 'UP':    return { x: pos.x,     y: pos.y - 1 };
    case 'DOWN':  return { x: pos.x,     y: pos.y + 1 };
    case 'LEFT':  return { x: pos.x - 1, y: pos.y     };
    case 'RIGHT': return { x: pos.x + 1, y: pos.y     };
  }
}

/** True if pos is occupied or out of bounds. */
export function willCollide(pos: GridPos, arena: Arena): boolean {
  return arena.isOccupied(pos);
}

/** True if advancing one step in dir from pos would be fatal. */
export function isDeadly(pos: GridPos, dir: Direction, arena: Arena): boolean {
  return willCollide(nextPos(pos, dir), arena);
}

/**
 * BFS flood fill from startPos. Returns the number of reachable empty cells,
 * capped at maxCells to keep AI evaluation cheap.
 */
export function floodFill(startPos: GridPos, arena: Arena, maxCells = 600): number {
  if (arena.isOccupied(startPos)) return 0;

  const visited = new Set<number>();
  const queue: GridPos[] = [startPos];
  const key = (p: GridPos) => p.y * arena.cols + p.x;

  while (queue.length > 0 && visited.size < maxCells) {
    const pos = queue.shift()!;
    const k = key(pos);
    if (visited.has(k)) continue;
    if (arena.isOccupied(pos)) continue;
    visited.add(k);

    const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    for (const d of dirs) {
      const n = nextPos(pos, d);
      if (!visited.has(key(n)) && !arena.isOccupied(n)) {
        queue.push(n);
      }
    }
  }
  return visited.size;
}

// Reusable buffers for voronoiScore to avoid per-call allocation / GC pressure.
let _vorBuf: Uint8Array | null = null;
let _vorBufSize = 0;
let _vorQueue: Int32Array | null = null;
let _vorQueueSize = 0;

/**
 * Multi-source Voronoi BFS. Returns the number of arena cells reachable by
 * myNextPos before any opponent can reach them. All sources start simultaneously,
 * so the result reflects true territorial advantage.
 */
export function voronoiScore(
  myNextPos: GridPos,
  opponentPositions: GridPos[],
  arena: Arena,
): number {
  if (arena.isOccupied(myNextPos)) return 0;

  const cols = arena.cols;
  const rows = arena.rows;
  const totalCells = cols * rows;

  // Reuse or grow the claimed buffer
  if (!_vorBuf || _vorBufSize < totalCells) {
    _vorBuf = new Uint8Array(totalCells);
    _vorBufSize = totalCells;
  } else {
    _vorBuf.fill(0);
  }
  const claimed = _vorBuf;

  // Flat queue: 3 ints per entry (x, y, owner)
  const queueCapacity = totalCells * 3;
  if (!_vorQueue || _vorQueueSize < queueCapacity) {
    _vorQueue = new Int32Array(queueCapacity);
    _vorQueueSize = queueCapacity;
  }
  const queue = _vorQueue;
  let queueTail = 0;

  const enqueue = (x: number, y: number, owner: number) => {
    const k = y * cols + x;
    if (claimed[k] || arena.isOccupied({ x, y })) return;
    claimed[k] = owner;
    queue[queueTail++] = x;
    queue[queueTail++] = y;
    queue[queueTail++] = owner;
  };

  enqueue(myNextPos.x, myNextPos.y, 1);
  for (const op of opponentPositions) enqueue(op.x, op.y, 2);

  let myCells = claimed[myNextPos.y * cols + myNextPos.x] === 1 ? 1 : 0;

  // Dx/Dy for UP, DOWN, LEFT, RIGHT
  const DX = [0, 0, -1, 1];
  const DY = [-1, 1, 0, 0];

  let head = 0;
  while (head < queueTail) {
    const x = queue[head++]!;
    const y = queue[head++]!;
    const owner = queue[head++]!;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d]!;
      const ny = y + DY[d]!;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const k = ny * cols + nx;
      if (claimed[k] || arena.isOccupied({ x: nx, y: ny })) continue;
      claimed[k] = owner;
      if (owner === 1) myCells++;
      queue[queueTail++] = nx;
      queue[queueTail++] = ny;
      queue[queueTail++] = owner;
    }
  }

  return myCells;
}
