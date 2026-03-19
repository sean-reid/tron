import type { Arena } from '../engine/Arena';
import { nextPos } from '../engine/CollisionDetector';
import { oppositeDir } from '../types';
import type { Direction, GridPos, CycleSnapshot } from '../types';

/**
 * Base class for all lightcycles. Manages position, direction, trail, and boost.
 * Subclasses implement chooseDirection() with player input or bot AI.
 */
export abstract class Cycle {
  readonly id: number;
  readonly color: string;

  pos: GridPos;
  prevPos: GridPos;
  dir: Direction;
  pendingDir: Direction;
  trail: GridPos[];
  alive: boolean;
  boosting: boolean;
  /** 0 = no boost, 1 = full boost. Ramps per tick for smooth speed transition. */
  boostLevel: number;

  /** Accumulates elapsed ms; triggers a tick when >= tickInterval. */
  tickAccumulator: number;

  constructor(id: number, color: string, startPos: GridPos, startDir: Direction) {
    this.id = id;
    this.color = color;
    this.pos = { ...startPos };
    this.prevPos = { ...startPos };
    this.dir = startDir;
    this.pendingDir = startDir;
    this.trail = [];
    this.alive = true;
    this.boosting = false;
    this.boostLevel = 0;
    this.tickAccumulator = 0;
  }

  /** Subclass sets this.pendingDir based on input or AI. */
  abstract chooseDirection(arena: Arena, opponents: GridPos[]): void;

  /** Commits pendingDir (blocks 180° reversals). */
  applyDirection(): void {
    if (this.pendingDir !== oppositeDir(this.dir)) {
      this.dir = this.pendingDir;
    }
  }

  /**
   * Advance one cell in the current direction.
   * Registers the current pos as trail in the arena.
   * Called by GameEngine after a collision-free check.
   */
  advance(arena: Arena): void {
    arena.occupy(this.pos, this.id);
    this.trail.push({ ...this.pos });
    this.prevPos = { ...this.pos };
    this.pos = nextPos(this.pos, this.dir);
  }

  die(): void {
    this.alive = false;
  }

  snapshot(tickInterval: number): CycleSnapshot {
    const alpha = Math.min(this.tickAccumulator / tickInterval, 1);
    return {
      id: this.id,
      pos: { ...this.pos },
      prevPos: { ...this.prevPos },
      dir: this.dir,
      trail: this.trail.map(p => ({ ...p })),
      boosting: this.boosting,
      alive: this.alive,
      color: this.color,
      alpha,
    };
  }
}
