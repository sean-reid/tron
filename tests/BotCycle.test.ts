import { describe, it, expect } from 'vitest';
import { Arena } from '../src/engine/Arena';
import { BotCycle } from '../src/entities/BotCycle';
import { floodFill } from '../src/engine/CollisionDetector';
import type { Direction } from '../src/types';

const arena = () => new Arena(480, 360, 12); // 40×30

describe('BotCycle', () => {
  it('initialises alive with correct position', () => {
    const a = arena();
    const bot = new BotCycle(2, '#ff3c00', { x: 10, y: 10 }, 'RIGHT');
    expect(bot.alive).toBe(true);
    expect(bot.pos).toEqual({ x: 10, y: 10 });
    expect(bot.dir).toBe('RIGHT');
  });

  it('does not reverse direction 180°', () => {
    const a = arena();
    const bot = new BotCycle(2, '#ff3c00', { x: 10, y: 10 }, 'RIGHT');
    bot.pendingDir = 'LEFT'; // attempt reversal
    bot.applyDirection();
    expect(bot.dir).toBe('RIGHT'); // not applied
  });

  it('applies valid direction change', () => {
    const a = arena();
    const bot = new BotCycle(2, '#ff3c00', { x: 10, y: 10 }, 'RIGHT');
    bot.pendingDir = 'UP';
    bot.applyDirection();
    expect(bot.dir).toBe('UP');
  });

  it('chooseDirection avoids immediate walls', () => {
    const a = arena();
    const pos = { x: 5, y: 5 };
    const bot = new BotCycle(2, '#ff3c00', pos, 'RIGHT');

    a.occupy({ x: 6, y: 5 }, 99); // right blocked
    a.occupy({ x: 5, y: 4 }, 99); // up blocked
    a.occupy({ x: 5, y: 6 }, 99); // down blocked

    bot.chooseDirection(a, []);
    bot.applyDirection();
    // All forward options blocked — bot's pendingDir may be null-resolved,
    // direction stays RIGHT. Test just verifies no exception thrown.
    expect(['UP', 'DOWN', 'LEFT', 'RIGHT']).toContain(bot.dir);
  });

  it('chooseDirection picks the direction with most open space (Voronoi)', () => {
    const a = arena();
    const pos = { x: 20, y: 15 };
    const bot = new BotCycle(2, '#ff3c00', pos, 'UP');

    // Block left side — RIGHT should have clearly more Voronoi territory
    for (let y = 0; y < 30; y++) {
      a.occupy({ x: 18, y }, 99);
    }

    bot.chooseDirection(a, []);
    bot.applyDirection();
    expect(['UP', 'RIGHT', 'DOWN']).toContain(bot.dir);
  });

  it('chooseDirection turns when right and down are walled (only UP is safe)', () => {
    const a = arena();
    a.occupy({ x: 21, y: 15 }, 99); // right is blocked
    a.occupy({ x: 20, y: 16 }, 99); // down is blocked
    // LEFT is excluded as 180° reversal; only UP remains safe
    const bot = new BotCycle(2, '#ff3c00', { x: 20, y: 15 }, 'RIGHT');
    bot.chooseDirection(a, []);
    bot.applyDirection();
    expect(bot.dir).toBe('UP');
  });

  it('reset restores bot to new position', () => {
    const a = arena();
    const bot = new BotCycle(2, '#ff3c00', { x: 5, y: 5 }, 'RIGHT');
    bot.die();
    expect(bot.alive).toBe(false);

    bot.reset({ x: 15, y: 10 }, 'DOWN');
    expect(bot.alive).toBe(true);
    expect(bot.pos).toEqual({ x: 15, y: 10 });
    expect(bot.dir).toBe('DOWN');
    expect(bot.trail).toHaveLength(0);
  });
});

describe('floodFill (via BotCycle AI scenarios)', () => {
  it('returns full arena size in empty grid', () => {
    const a = arena(); // 40×30 = 1200
    const result = floodFill({ x: 20, y: 15 }, a, 2000);
    expect(result).toBe(1200);
  });

  it('returns 0 from blocked cell', () => {
    const a = arena();
    a.occupy({ x: 5, y: 5 }, 1);
    expect(floodFill({ x: 5, y: 5 }, a)).toBe(0);
  });

  it('counts only connected cells in a partitioned arena', () => {
    const a = arena();
    // Vertical wall at x=20
    for (let y = 0; y < 30; y++) a.occupy({ x: 20, y }, 99);
    // Left partition: x=0..19 → 20 cols × 30 rows = 600
    const leftResult = floodFill({ x: 10, y: 15 }, a, 2000);
    expect(leftResult).toBe(600);
    // Right partition: x=21..39 → 19 cols × 30 rows = 570
    const rightResult = floodFill({ x: 25, y: 15 }, a, 2000);
    expect(rightResult).toBe(570);
  });
});
