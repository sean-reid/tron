import type { Arena } from '../engine/Arena';
import { CONFIG } from '../config';

export class ArenaRenderer {
  private cache: HTMLCanvasElement | null = null;
  private cachedCols = 0;
  private cachedRows = 0;

  /** Returns a cached offscreen canvas with the arena background. Redraws only on resize. */
  getBackground(arena: Arena, cellSize: number): HTMLCanvasElement {
    if (this.cache && this.cachedCols === arena.cols && this.cachedRows === arena.rows) {
      return this.cache;
    }
    this.cachedCols = arena.cols;
    this.cachedRows = arena.rows;
    this.cache = this.render(arena, cellSize);
    return this.cache;
  }

  invalidate(): void {
    this.cache = null;
  }

  private render(arena: Arena, cellSize: number): HTMLCanvasElement {
    const { cols, rows } = arena;
    const w = cols * cellSize;
    const h = rows * cellSize;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = CONFIG.COLORS.ARENA_BG;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = CONFIG.COLORS.GRID_LINE;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= cols; x++) {
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, h);
    }
    for (let y = 0; y <= rows; y++) {
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(w, y * cellSize);
    }
    ctx.stroke();

    // Arena boundary glow
    ctx.strokeStyle = '#1a3a5a';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#003366';
    ctx.shadowBlur = 8;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.shadowBlur = 0;

    return canvas;
  }
}
