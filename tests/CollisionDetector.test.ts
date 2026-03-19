import { describe, it, expect } from 'vitest';
import { Arena } from '../src/engine/Arena';
import { nextPos, willCollide, isDeadly, floodFill } from '../src/engine/CollisionDetector';

const arena = () => new Arena(120, 96, 12); // 10×8 grid

describe('nextPos', () => {
  it('moves correctly in all directions', () => {
    const p = { x: 5, y: 5 };
    expect(nextPos(p, 'UP')).toEqual({ x: 5, y: 4 });
    expect(nextPos(p, 'DOWN')).toEqual({ x: 5, y: 6 });
    expect(nextPos(p, 'LEFT')).toEqual({ x: 4, y: 5 });
    expect(nextPos(p, 'RIGHT')).toEqual({ x: 6, y: 5 });
  });
});

describe('willCollide', () => {
  it('returns false for empty in-bounds cell', () => {
    const a = arena();
    expect(willCollide({ x: 3, y: 3 }, a)).toBe(false);
  });

  it('returns true for occupied cell', () => {
    const a = arena();
    a.occupy({ x: 4, y: 4 }, 1);
    expect(willCollide({ x: 4, y: 4 }, a)).toBe(true);
  });

  it('returns true for out-of-bounds', () => {
    const a = arena();
    expect(willCollide({ x: -1, y: 0 }, a)).toBe(true);
    expect(willCollide({ x: 10, y: 0 }, a)).toBe(true);
  });
});

describe('isDeadly', () => {
  it('returns false when path is clear', () => {
    const a = arena();
    expect(isDeadly({ x: 5, y: 5 }, 'RIGHT', a)).toBe(false);
  });

  it('returns true when next cell is occupied', () => {
    const a = arena();
    a.occupy({ x: 6, y: 5 }, 2);
    expect(isDeadly({ x: 5, y: 5 }, 'RIGHT', a)).toBe(true);
  });

  it('returns true when moving into boundary', () => {
    const a = arena();
    expect(isDeadly({ x: 0, y: 3 }, 'LEFT', a)).toBe(true);
    expect(isDeadly({ x: 9, y: 3 }, 'RIGHT', a)).toBe(true);
    expect(isDeadly({ x: 3, y: 0 }, 'UP', a)).toBe(true);
    expect(isDeadly({ x: 3, y: 7 }, 'DOWN', a)).toBe(true);
  });
});

describe('floodFill', () => {
  it('returns 0 when start is occupied', () => {
    const a = arena();
    a.occupy({ x: 5, y: 5 }, 1);
    expect(floodFill({ x: 5, y: 5 }, a)).toBe(0);
  });

  it('counts total empty cells in open arena', () => {
    const a = arena(); // 10×8 = 80 cells
    const result = floodFill({ x: 5, y: 5 }, a, 1000);
    expect(result).toBe(80);
  });

  it('respects occupied walls (corridor)', () => {
    const a = arena();
    // Seal off x=0..9, y=4 (full horizontal wall)
    for (let x = 0; x < 10; x++) a.occupy({ x, y: 4 }, 99);
    // From top half: 4 rows × 10 cols = 40 cells
    const topResult = floodFill({ x: 5, y: 2 }, a, 1000);
    expect(topResult).toBe(40);
    // From bottom half: 3 rows × 10 cols = 30 cells
    const botResult = floodFill({ x: 5, y: 6 }, a, 1000);
    expect(botResult).toBe(30);
  });

  it('respects maxCells cap', () => {
    const a = arena();
    const result = floodFill({ x: 0, y: 0 }, a, 10);
    expect(result).toBe(10);
  });
});
