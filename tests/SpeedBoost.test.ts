import { describe, it, expect } from 'vitest';
import { Arena } from '../src/engine/Arena';
import { evaluateBoost } from '../src/systems/SpeedBoost';
import { CONFIG } from '../src/config';

// Use a larger arena so we have room to manoeuvre
const arena = () => new Arena(480, 360, 12); // 40×30

describe('evaluateBoost', () => {
  const r = CONFIG.BOOST_PROXIMITY; // 3

  it('returns false in open space', () => {
    const a = arena();
    expect(evaluateBoost({ x: 20, y: 15 }, 'RIGHT', a)).toBe(false);
  });

  it('returns true when trail wall is within proximity to the right', () => {
    const a = arena();
    // Place wall at x = 20+r = 23
    a.occupy({ x: 20 + r, y: 15 }, 2);
    expect(evaluateBoost({ x: 20, y: 15 }, 'RIGHT', a)).toBe(true);
  });

  it('returns true when arena boundary is within proximity above', () => {
    const a = arena();
    // y=0 is boundary; y=r-1 = 2 should trigger boost from y=2 upward
    expect(evaluateBoost({ x: 20, y: r - 1 }, 'UP', a)).toBe(true);
  });

  it('returns true when arena boundary is exactly at proximity distance', () => {
    const a = arena();
    // From y=r-1=2, step r=3 up hits y=-1 which is OOB → isOccupied=true
    expect(evaluateBoost({ x: 20, y: r - 1 }, 'UP', a)).toBe(true);
  });

  it('returns false when wall is just beyond proximity', () => {
    const a = arena();
    // Place wall at exactly r+1 cells away
    a.occupy({ x: 20 + r + 1, y: 15 }, 2);
    expect(evaluateBoost({ x: 20, y: 15 }, 'RIGHT', a)).toBe(false);
  });

  it('detects walls in all cardinal directions', () => {
    const a = arena();
    const pos = { x: 20, y: 15 };
    // Test each direction independently
    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;
    const offsets: Record<string, [number, number]> = {
      UP:    [0, -r],
      DOWN:  [0,  r],
      LEFT:  [-r, 0],
      RIGHT: [ r, 0],
    };
    for (const d of dirs) {
      const fresh = arena();
      const [dx, dy] = offsets[d]!;
      fresh.occupy({ x: pos.x + dx, y: pos.y + dy }, 2);
      expect(evaluateBoost(pos, d, fresh)).toBe(true);
    }
  });
});
