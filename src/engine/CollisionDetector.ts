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

  const stride = arena.cols;
  const key = (p: GridPos) => p.y * stride + p.x;

  // claimed[k]: 0 = unclaimed, 1 = mine, 2 = opponent
  const claimed = new Uint8Array(arena.cols * arena.rows);
  const queue: Array<GridPos & { owner: number }> = [];

  const enqueue = (pos: GridPos, owner: number) => {
    const k = key(pos);
    if (claimed[k] || arena.isOccupied(pos)) return;
    claimed[k] = owner;
    queue.push({ ...pos, owner });
  };

  enqueue(myNextPos, 1);
  for (const op of opponentPositions) enqueue(op, 2);

  let myCells = claimed[key(myNextPos)] === 1 ? 1 : 0;

  const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  let head = 0;
  while (head < queue.length) {
    const { x, y, owner } = queue[head++]!;
    for (const d of DIRS) {
      const n = nextPos({ x, y }, d);
      if (!arena.inBounds(n)) continue;
      const k = key(n);
      if (claimed[k] || arena.isOccupied(n)) continue;
      claimed[k] = owner;
      if (owner === 1) myCells++;
      queue.push({ ...n, owner });
    }
  }

  return myCells;
}
