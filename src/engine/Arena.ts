import type { GridPos } from '../types';

/**
 * Grid occupancy map. Stores owner IDs in a flat Uint16Array for O(1) lookup.
 * Out-of-bounds positions are treated as occupied (boundary walls).
 */
export class Arena {
  readonly cols: number;
  readonly rows: number;
  private readonly cells: Uint16Array;

  constructor(canvasWidth: number, canvasHeight: number, cellSize: number) {
    this.cols = Math.floor(canvasWidth / cellSize);
    this.rows = Math.floor(canvasHeight / cellSize);
    this.cells = new Uint16Array(this.cols * this.rows);
  }

  private idx(pos: GridPos): number {
    return pos.y * this.cols + pos.x;
  }

  inBounds(pos: GridPos): boolean {
    return pos.x >= 0 && pos.x < this.cols && pos.y >= 0 && pos.y < this.rows;
  }

  /** Returns true when the position is a wall, trail, or out of bounds. */
  isOccupied(pos: GridPos): boolean {
    if (!this.inBounds(pos)) return true;
    return this.cells[this.idx(pos)] !== 0;
  }

  occupy(pos: GridPos, ownerId: number): void {
    if (!this.inBounds(pos)) return;
    this.cells[this.idx(pos)] = ownerId;
  }

  /** Remove every cell belonging to ownerId (called when a bot is cleared). */
  free(ownerId: number): void {
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] === ownerId) this.cells[i] = 0;
    }
  }

  /**
   * Returns how many cells within `radius` (Chebyshev / square neighbourhood)
   * around pos are occupied, not counting pos itself.
   */
  occupiedNeighborCount(pos: GridPos, radius: number): number {
    let count = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.isOccupied({ x: pos.x + dx, y: pos.y + dy })) count++;
      }
    }
    return count;
  }

  reset(): void {
    this.cells.fill(0);
  }

  get totalCells(): number {
    return this.cols * this.rows;
  }
}
