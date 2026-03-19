import type { GridPos, Direction } from '../types';
import type { Arena } from '../engine/Arena';
import { CONFIG } from '../config';

const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
const DELTA: Record<Direction, GridPos> = {
  UP:    { x: 0,  y: -1 },
  DOWN:  { x: 0,  y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x: 1,  y:  0 },
};

/**
 * Returns true when any wall or ANOTHER cycle's trail is within BOOST_PROXIMITY
 * cells in any cardinal direction from pos.
 *
 * Own trail is excluded via ownerId — without this, the cycle would detect its
 * freshly-laid trail one cell behind it and boost permanently.
 */
export function evaluateBoost(pos: GridPos, _dir: Direction, arena: Arena, ownerId: number): boolean {
  const r = CONFIG.BOOST_PROXIMITY;
  for (const d of DIRS) {
    const { x: dx, y: dy } = DELTA[d];
    for (let step = 1; step <= r; step++) {
      const cell = { x: pos.x + dx * step, y: pos.y + dy * step };
      if (arena.isOccupiedByOther(cell, ownerId)) {
        return true;
      }
    }
  }
  return false;
}
