import { CONFIG } from '../config';

const CELL = CONFIG.CELL_SIZE;

export interface GlowSprite {
  canvas: HTMLCanvasElement;
  /** X offset from (gridX * CELL) to position the sprite correctly */
  offsetX: number;
  /** Y offset from (gridY * CELL) to position the sprite correctly */
  offsetY: number;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/**
 * Caches pre-rendered glow cell sprites to avoid per-frame shadowBlur costs.
 * Each sprite is a small canvas containing one trail cell with its glow baked in.
 */
export class GlowSpriteCache {
  private trail = new Map<string, GlowSprite>();
  private deadTrail = new Map<string, GlowSprite>();
  private highlight = new Map<string, GlowSprite>();

  getTrail(color: string): GlowSprite {
    let s = this.trail.get(color);
    if (!s) { s = buildTrailSprite(color); this.trail.set(color, s); }
    return s;
  }

  getDeadTrail(color: string): GlowSprite {
    let s = this.deadTrail.get(color);
    if (!s) { s = buildDeadTrailSprite(color); this.deadTrail.set(color, s); }
    return s;
  }

  getHighlight(color: string): GlowSprite {
    let s = this.highlight.get(color);
    if (!s) { s = buildHighlightSprite(color); this.highlight.set(color, s); }
    return s;
  }
}

function buildTrailSprite(color: string): GlowSprite {
  const blur = 10;
  const pad = blur * 2;
  const [c, ctx] = makeCanvas(CELL - 2 + pad * 2, CELL - 2 + pad * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillRect(pad, pad, CELL - 2, CELL - 2);
  return { canvas: c, offsetX: 1 - pad, offsetY: 1 - pad };
}

function buildDeadTrailSprite(color: string): GlowSprite {
  const blur = 4;
  const pad = blur * 2;
  const [c, ctx] = makeCanvas(CELL - 2 + pad * 2, CELL - 2 + pad * 2);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillRect(pad, pad, CELL - 2, CELL - 2);
  return { canvas: c, offsetX: 1 - pad, offsetY: 1 - pad };
}

function buildHighlightSprite(color: string): GlowSprite {
  const blur = 4;
  const pad = blur * 2;
  const [c, ctx] = makeCanvas(CELL - 4 + pad * 2, CELL - 4 + pad * 2);
  ctx.fillStyle = '#ffffff88';
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillRect(pad, pad, CELL - 4, CELL - 4);
  return { canvas: c, offsetX: 2 - pad, offsetY: 2 - pad };
}
