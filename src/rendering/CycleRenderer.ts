import type { CycleSnapshot } from '../types';
import type { GlowSpriteCache } from './GlowSpriteCache';
import { CONFIG } from '../config';

const CELL = CONFIG.CELL_SIZE;

/**
 * Draws cycle heads only. Trail rendering is handled by the layered
 * Renderer via pre-rendered glow sprites on an offscreen canvas.
 */
export class CycleRenderer {
  private sprites: GlowSpriteCache;

  constructor(sprites: GlowSpriteCache) {
    this.sprites = sprites;
  }

  drawHead(ctx: CanvasRenderingContext2D, snap: CycleSnapshot, now: number): void {
    if (!snap.alive) return;

    const color = snap.color;
    const { pos, prevPos, alpha, boosting } = snap;

    // Interpolated render position (rounded to avoid sub-pixel shimmer)
    const rx = Math.round((prevPos.x + (pos.x - prevPos.x) * alpha) * CELL);
    const ry = Math.round((prevPos.y + (pos.y - prevPos.y) * alpha) * CELL);

    const headSprite = this.sprites.getHead(color);

    if (boosting) {
      const boostSprite = this.sprites.getBoostHead(color);
      const pulse = Math.sin(now * CONFIG.BOOST_PULSE_HZ * Math.PI * 2 / 1000) * 0.5 + 0.5;
      // Blend between normal head and boost head using pulse alpha
      ctx.drawImage(headSprite.canvas, rx + headSprite.offsetX, ry + headSprite.offsetY);
      ctx.globalAlpha = pulse;
      ctx.drawImage(boostSprite.canvas, rx + boostSprite.offsetX, ry + boostSprite.offsetY);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(headSprite.canvas, rx + headSprite.offsetX, ry + headSprite.offsetY);
    }
  }
}
