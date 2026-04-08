import { BotCycle } from '../entities/BotCycle';
import type { Arena } from '../engine/Arena';
import type { GridPos, Direction } from '../types';
import { CONFIG } from '../config';

const DIRECTIONS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

function randomDir(): Direction {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)] as Direction;
}

/** Pick a random unoccupied cell at least minDist cells (Chebyshev) from the player. */
function pickSpawnPos(arena: Arena, playerPos: GridPos, minDist: number): GridPos {
  for (let attempt = 0; attempt < 300; attempt++) {
    const x = 1 + Math.floor(Math.random() * (arena.cols - 2));
    const y = 1 + Math.floor(Math.random() * (arena.rows - 2));
    const pos: GridPos = { x, y };
    if (arena.isOccupied(pos)) continue;
    if (Math.max(Math.abs(x - playerPos.x), Math.abs(y - playerPos.y)) >= minDist) {
      return pos;
    }
  }
  // Fallback: first unoccupied cell
  for (let y = 1; y < arena.rows - 1; y++) {
    for (let x = 1; x < arena.cols - 1; x++) {
      const pos: GridPos = { x, y };
      if (!arena.isOccupied(pos)) return pos;
    }
  }
  return { x: Math.floor(arena.cols / 2), y: Math.floor(arena.rows / 2) };
}

export class BotManager {
  private bots: BotCycle[];
  readonly targetCount: number;
  /** botId → timestamp (ms) when the bot should respawn */
  private respawnQueue: Map<number, number>;

  constructor(arena: Arena) {
    this.targetCount = Math.min(CONFIG.MAX_BOTS, Math.max(1, Math.floor(arena.totalCells / CONFIG.BOT_CELLS_PER_BOT)));
    this.bots = [];
    this.respawnQueue = new Map();
  }

  /** Spawn the initial set of bots at game start. */
  createBots(arena: Arena, playerPos: GridPos): BotCycle[] {
    this.bots = [];
    this.respawnQueue.clear();
    for (let i = 0; i < this.targetCount; i++) {
      const id = i + 2; // id 1 = player
      const color = CONFIG.COLORS.BOTS[i % CONFIG.COLORS.BOTS.length] as string;
      const pos = pickSpawnPos(arena, playerPos, CONFIG.MIN_SPAWN_DISTANCE);
      const dir = randomDir();
      const bot = new BotCycle(id, color, pos, dir);
      arena.occupy(pos, id);
      this.bots.push(bot);
    }
    return this.bots;
  }

  /**
   * Called immediately when a bot dies.
   * Trail stays in the arena (still blocks passage) until respawn.
   */
  onBotDied(bot: BotCycle, now: number): void {
    this.respawnQueue.set(bot.id, now + CONFIG.BOT_RESPAWN_DELAY_MS);
  }

  /**
   * Called each game frame. Respawns any bots whose timer has elapsed.
   * Clears the dead trail at the moment of respawn so it vanishes instantly.
   * Returns true if any bot was respawned (for audio cue).
   */
  tick(now: number, arena: Arena, playerPos: GridPos): boolean {
    let anyRespawned = false;
    for (const [botId, respawnAt] of this.respawnQueue) {
      if (now >= respawnAt) {
        this.respawnQueue.delete(botId);
        const bot = this.bots.find(b => b.id === botId);
        if (!bot) continue;
        arena.free(bot.id); // remove old trail at the instant of respawn
        const pos = pickSpawnPos(arena, playerPos, CONFIG.MIN_SPAWN_DISTANCE);
        bot.reset(pos, randomDir());
        arena.occupy(pos, bot.id);
        anyRespawned = true;
      }
    }
    return anyRespawned;
  }

  getActiveBots(): BotCycle[] {
    return this.bots;
  }

  getLivingBots(): BotCycle[] {
    return this.bots.filter(b => b.alive);
  }

}
