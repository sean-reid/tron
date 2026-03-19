import { describe, it, expect } from 'vitest';
import { Arena } from '../src/engine/Arena';
import { evaluateBoost } from '../src/systems/SpeedBoost';
import { CONFIG } from '../src/config';

const arena = () => new Arena(480, 360, 12); // 40×30
const OWNER = 1;
const OTHER = 2;

describe('evaluateBoost', () => {
  const r = CONFIG.BOOST_PROXIMITY; // 3

  it('returns false in open space', () => {
    const a = arena();
    expect(evaluateBoost({ x: 20, y: 15 }, 'RIGHT', a, OWNER)).toBe(false);
  });

  it('returns true when another cycle trail is within proximity', () => {
    const a = arena();
    a.occupy({ x: 20 + r, y: 15 }, OTHER);
    expect(evaluateBoost({ x: 20, y: 15 }, 'RIGHT', a, OWNER)).toBe(true);
  });

  it('ignores own trail — does not boost from cells owned by self', () => {
    const a = arena();
    // Own trail one cell behind (the exact scenario that caused always-boosting)
    a.occupy({ x: 19, y: 15 }, OWNER);
    expect(evaluateBoost({ x: 20, y: 15 }, 'RIGHT', a, OWNER)).toBe(false);
  });

  it('ignores own trail even within full proximity radius', () => {
    const a = arena();
    for (let i = 1; i <= r; i++) a.occupy({ x: 20 - i, y: 15 }, OWNER);
    expect(evaluateBoost({ x: 20, y: 15 }, 'RIGHT', a, OWNER)).toBe(false);
  });

  it('returns true when arena boundary is within proximity', () => {
    const a = arena();
    // From y=r-1=2, step r=3 up hits y=-1 (OOB) → boundary always counts
    expect(evaluateBoost({ x: 20, y: r - 1 }, 'UP', a, OWNER)).toBe(true);
  });

  it('returns false when wall is just beyond proximity', () => {
    const a = arena();
    a.occupy({ x: 20 + r + 1, y: 15 }, OTHER);
    expect(evaluateBoost({ x: 20, y: 15 }, 'RIGHT', a, OWNER)).toBe(false);
  });

  it('detects other-owned walls in all cardinal directions', () => {
    const pos = { x: 20, y: 15 };
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
      fresh.occupy({ x: pos.x + dx, y: pos.y + dy }, OTHER);
      expect(evaluateBoost(pos, d, fresh, OWNER)).toBe(true);
    }
  });
});
