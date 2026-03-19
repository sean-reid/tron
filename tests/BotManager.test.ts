import { describe, it, expect } from 'vitest';
import { Arena } from '../src/engine/Arena';
import { BotManager } from '../src/systems/BotManager';
import { CONFIG } from '../src/config';

// 480×360 → 40×30 = 1200 cells → floor(1200/350) = 3 bots
const largeArena = () => new Arena(480, 360, 12);
// 120×96 → 10×8 = 80 cells → floor(80/350) = 0 → max(1,0) = 1 bot
const smallArena = () => new Arena(120, 96, 12);

describe('BotManager', () => {
  it('calculates target count correctly for large arena', () => {
    const a = largeArena();
    const bm = new BotManager(a);
    const expected = Math.max(1, Math.floor(1200 / CONFIG.BOT_CELLS_PER_BOT));
    expect(bm.targetCount).toBe(expected);
  });

  it('ensures at least 1 bot for small arenas', () => {
    const a = smallArena();
    const bm = new BotManager(a);
    expect(bm.targetCount).toBeGreaterThanOrEqual(1);
  });

  it('creates correct number of bots', () => {
    const a = largeArena();
    const bm = new BotManager(a);
    const playerPos = { x: 20, y: 15 };
    const bots = bm.createBots(a, playerPos);
    expect(bots.length).toBe(bm.targetCount);
  });

  it('bots are alive after creation', () => {
    const a = largeArena();
    const bm = new BotManager(a);
    const bots = bm.createBots(a, { x: 20, y: 15 });
    for (const bot of bots) {
      expect(bot.alive).toBe(true);
    }
  });

  it('bots occupy unique positions', () => {
    const a = largeArena();
    const bm = new BotManager(a);
    const bots = bm.createBots(a, { x: 20, y: 15 });
    const positions = bots.map(b => `${b.pos.x},${b.pos.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(positions.length);
  });

  it('bots spawn in-bounds', () => {
    const a = largeArena();
    const bm = new BotManager(a);
    const bots = bm.createBots(a, { x: 20, y: 15 });
    for (const bot of bots) {
      expect(a.inBounds(bot.pos)).toBe(true);
    }
  });

  it('getLivingBots returns only alive bots', () => {
    const a = largeArena();
    const bm = new BotManager(a);
    const bots = bm.createBots(a, { x: 20, y: 15 });
    bots[0]!.die();
    const living = bm.getLivingBots();
    expect(living.length).toBe(bm.targetCount - 1);
    expect(living.every(b => b.alive)).toBe(true);
  });
});
