import { ArenaRenderer } from './ArenaRenderer';
import { CycleRenderer } from './CycleRenderer';
import { GlowSpriteCache } from './GlowSpriteCache';
import type { CycleSnapshot } from '../types';
import type { Arena } from '../engine/Arena';
import { CONFIG } from '../config';

const CELL = CONFIG.CELL_SIZE;

interface CycleTrailState {
  drawnCount: number;
  wasAlive: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private arenaRenderer: ArenaRenderer;
  private cycleRenderer: CycleRenderer;
  private sprites: GlowSpriteCache;

  private trailCanvas: HTMLCanvasElement;
  private trailCtx: CanvasRenderingContext2D;
  private cycleState = new Map<number, CycleTrailState>();

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    this.arenaRenderer = new ArenaRenderer();
    this.sprites = new GlowSpriteCache();
    this.cycleRenderer = new CycleRenderer(this.sprites);

    this.trailCanvas = document.createElement('canvas');
    this.trailCtx = this.trailCanvas.getContext('2d')!;
  }

  /** Resize the canvas to match the physical pixel dimensions. */
  resize(width: number, height: number): void {
    this.ctx.canvas.width = width;
    this.ctx.canvas.height = height;
    this.trailCanvas.width = width;
    this.trailCanvas.height = height;
    this.arenaRenderer.invalidate();
    this.cycleState.clear();
  }

  draw(snapshots: CycleSnapshot[], arena: Arena, now: number): void {
    const ctx = this.ctx;

    // Update trail canvas incrementally (or rebuild on structural change)
    if (this.detectStructuralChanges(snapshots)) {
      this.rebuildTrailCanvas(snapshots);
    } else {
      this.drawNewTrailSegments(snapshots);
    }

    // Composite layers: background → trails → heads + highlights
    const bg = this.arenaRenderer.getBackground(arena, CELL);
    ctx.drawImage(bg, 0, 0);
    ctx.drawImage(this.trailCanvas, 0, 0);

    // Draw recent-segment highlights and heads for alive cycles
    ctx.save();
    for (const snap of snapshots) {
      if (!snap.alive) continue;

      // Highlight on most recent trail segment
      if (snap.trail.length > 0) {
        const last = snap.trail[snap.trail.length - 1]!;
        const hl = this.sprites.getHighlight(snap.color);
        ctx.drawImage(hl.canvas, last.x * CELL + hl.offsetX, last.y * CELL + hl.offsetY);
      }

      this.cycleRenderer.drawHead(ctx, snap, now);
    }
    ctx.restore();
  }

  /** Detect if any cycle died, trail was cleared, or a new cycle appeared with existing trail. */
  private detectStructuralChanges(snapshots: CycleSnapshot[]): boolean {
    // Check for removed cycles
    for (const [id] of this.cycleState) {
      if (!snapshots.find(s => s.id === id)) return true;
    }

    for (const snap of snapshots) {
      const state = this.cycleState.get(snap.id);
      if (!state) {
        // New cycle with pre-existing trail requires rebuild
        if (snap.trail.length > 0) return true;
        continue;
      }
      // Cycle just died — redraw its trail at dead alpha
      if (state.wasAlive && !snap.alive) return true;
      // Trail was cleared (respawn) — need rebuild
      if (snap.trail.length < state.drawnCount) return true;
    }
    return false;
  }

  /** Full redraw of the trail canvas from all cycle trail data. */
  private rebuildTrailCanvas(snapshots: CycleSnapshot[]): void {
    const tctx = this.trailCtx;
    tctx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
    this.cycleState.clear();

    for (const snap of snapshots) {
      const sprite = snap.alive
        ? this.sprites.getTrail(snap.color)
        : this.sprites.getDeadTrail(snap.color);

      for (const p of snap.trail) {
        tctx.drawImage(sprite.canvas, p.x * CELL + sprite.offsetX, p.y * CELL + sprite.offsetY);
      }

      this.cycleState.set(snap.id, {
        drawnCount: snap.trail.length,
        wasAlive: snap.alive,
      });
    }
  }

  /** Incrementally draw only new trail segments since last frame. */
  private drawNewTrailSegments(snapshots: CycleSnapshot[]): void {
    const tctx = this.trailCtx;

    for (const snap of snapshots) {
      let state = this.cycleState.get(snap.id);
      if (!state) {
        state = { drawnCount: 0, wasAlive: snap.alive };
        this.cycleState.set(snap.id, state);
      }

      const sprite = snap.alive
        ? this.sprites.getTrail(snap.color)
        : this.sprites.getDeadTrail(snap.color);

      // Draw only new segments
      for (let i = state.drawnCount; i < snap.trail.length; i++) {
        const p = snap.trail[i]!;
        tctx.drawImage(sprite.canvas, p.x * CELL + sprite.offsetX, p.y * CELL + sprite.offsetY);
      }

      state.drawnCount = snap.trail.length;
      state.wasAlive = snap.alive;
    }
  }
}
