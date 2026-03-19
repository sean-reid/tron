import { Cycle } from './Cycle';
import type { Arena } from '../engine/Arena';
import { nextPos, voronoiScore } from '../engine/CollisionDetector';
import { oppositeDir } from '../types';
import type { Direction, GridPos } from '../types';
import { CONFIG } from '../config';

export class BotCycle extends Cycle {
  private commitCooldown: number;

  constructor(id: number, color: string, startPos: GridPos, startDir: Direction) {
    super(id, color, startPos, startDir);
    this.commitCooldown = 0;
  }

  /**
   * Voronoi territory evaluation: score each safe direction by how many cells
   * this bot can claim before any opponent reaches them. Pick the direction that
   * maximises territory. Tie-break: prefer current direction to avoid jitter.
   */
  chooseDirection(arena: Arena, opponents: GridPos[]): void {
    if (this.commitCooldown > 0) {
      this.commitCooldown--;
      return;
    }

    const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const opp = oppositeDir(this.dir);

    let bestDir: Direction | null = null;
    let bestScore = -1;

    for (const d of dirs) {
      if (d === opp) continue;
      const n = nextPos(this.pos, d);
      if (arena.isOccupied(n)) continue;
      const score = voronoiScore(n, opponents, arena);
      if (score > bestScore) {
        bestScore = score;
        bestDir = d;
      } else if (score === bestScore && d === this.dir) {
        // Tie-break: prefer current direction (stable, less jitter)
        bestDir = d;
      }
    }

    if (bestDir !== null) {
      this.pendingDir = bestDir;
    }
    // If bestDir is null every direction is blocked — pendingDir unchanged, bot crashes next tick

    this.commitCooldown = CONFIG.BOT_COMMIT_COOLDOWN_TICKS;
  }

  /** Reset this bot in-place for respawn at a new position/direction. */
  reset(startPos: GridPos, startDir: Direction): void {
    this.pos = { ...startPos };
    this.prevPos = { ...startPos };
    this.dir = startDir;
    this.pendingDir = startDir;
    this.trail = [];
    this.alive = true;
    this.boosting = false;
    this.boostLevel = 0;
    this.tickAccumulator = 0;
    this.commitCooldown = 0;
  }
}
