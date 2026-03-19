import { describe, it, expect, beforeEach } from 'vitest';
import { Arena } from '../src/engine/Arena';

const CELL = 12;
// 120px wide × 96px tall → 10 cols × 8 rows
const arena = () => new Arena(120, 96, CELL);

describe('Arena', () => {
  it('calculates correct dimensions', () => {
    const a = arena();
    expect(a.cols).toBe(10);
    expect(a.rows).toBe(8);
    expect(a.totalCells).toBe(80);
  });

  it('treats out-of-bounds as occupied', () => {
    const a = arena();
    expect(a.isOccupied({ x: -1, y: 0 })).toBe(true);
    expect(a.isOccupied({ x: 0, y: -1 })).toBe(true);
    expect(a.isOccupied({ x: 10, y: 0 })).toBe(true);
    expect(a.isOccupied({ x: 0, y: 8 })).toBe(true);
  });

  it('starts empty in-bounds', () => {
    const a = arena();
    expect(a.isOccupied({ x: 0, y: 0 })).toBe(false);
    expect(a.isOccupied({ x: 5, y: 4 })).toBe(false);
  });

  it('occupy marks a cell', () => {
    const a = arena();
    a.occupy({ x: 3, y: 3 }, 1);
    expect(a.isOccupied({ x: 3, y: 3 })).toBe(true);
    expect(a.isOccupied({ x: 3, y: 4 })).toBe(false);
  });

  it('free clears all cells for an owner', () => {
    const a = arena();
    a.occupy({ x: 1, y: 1 }, 2);
    a.occupy({ x: 2, y: 1 }, 2);
    a.occupy({ x: 3, y: 3 }, 1);
    a.free(2);
    expect(a.isOccupied({ x: 1, y: 1 })).toBe(false);
    expect(a.isOccupied({ x: 2, y: 1 })).toBe(false);
    // owner 1 cell untouched
    expect(a.isOccupied({ x: 3, y: 3 })).toBe(true);
  });

  it('free does not affect other owners', () => {
    const a = arena();
    a.occupy({ x: 0, y: 0 }, 1);
    a.occupy({ x: 1, y: 0 }, 2);
    a.free(1);
    expect(a.isOccupied({ x: 0, y: 0 })).toBe(false);
    expect(a.isOccupied({ x: 1, y: 0 })).toBe(true);
  });

  it('reset clears all cells', () => {
    const a = arena();
    a.occupy({ x: 2, y: 2 }, 1);
    a.occupy({ x: 5, y: 5 }, 3);
    a.reset();
    expect(a.isOccupied({ x: 2, y: 2 })).toBe(false);
    expect(a.isOccupied({ x: 5, y: 5 })).toBe(false);
  });

  it('inBounds is correct at corners', () => {
    const a = arena();
    expect(a.inBounds({ x: 0, y: 0 })).toBe(true);
    expect(a.inBounds({ x: 9, y: 7 })).toBe(true);
    expect(a.inBounds({ x: 10, y: 0 })).toBe(false);
    expect(a.inBounds({ x: 0, y: 8 })).toBe(false);
  });

  it('occupiedNeighborCount counts correctly', () => {
    const a = arena();
    a.occupy({ x: 5, y: 4 }, 1); // directly right of (4,4)
    a.occupy({ x: 3, y: 4 }, 1); // directly left
    const count = a.occupiedNeighborCount({ x: 4, y: 4 }, 1);
    expect(count).toBe(2);
  });
});
