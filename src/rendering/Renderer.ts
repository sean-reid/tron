import { ArenaRenderer } from './ArenaRenderer';
import { CycleRenderer } from './CycleRenderer';
import type { CycleSnapshot } from '../types';
import type { Arena } from '../engine/Arena';
import { CONFIG } from '../config';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private arena: ArenaRenderer;
  private cycle: CycleRenderer;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    this.arena = new ArenaRenderer();
    this.cycle = new CycleRenderer();
  }

  /** Resize the canvas to match the physical pixel dimensions. */
  resize(width: number, height: number): void {
    const canvas = this.ctx.canvas;
    canvas.width = width;
    canvas.height = height;
  }

  draw(snapshots: CycleSnapshot[], arena: Arena, now: number): void {
    const ctx = this.ctx;

    // Clear + arena background
    this.arena.draw(ctx, arena, CONFIG.CELL_SIZE);

    // Dead cycle trails (rendered behind living cycles)
    ctx.save();
    for (const snap of snapshots) {
      if (!snap.alive) this.cycle.drawDeadTrail(ctx, snap);
    }
    ctx.restore();

    // Living cycles (trails + heads)
    ctx.save();
    for (const snap of snapshots) {
      if (snap.alive) this.cycle.draw(ctx, snap, now);
    }
    ctx.restore();
  }
}
