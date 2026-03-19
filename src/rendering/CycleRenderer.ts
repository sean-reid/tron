import type { CycleSnapshot } from '../types';
import { CONFIG } from '../config';

const CELL = CONFIG.CELL_SIZE;
const TRAIL_GLOW = 10;
const HEAD_GLOW = 20;
const BOOST_EXTRA_GLOW = 18;

export class CycleRenderer {
  draw(ctx: CanvasRenderingContext2D, snap: CycleSnapshot, now: number): void {
    if (!snap.alive) return;

    // Draw trail first (underneath head)
    this.drawTrail(ctx, snap);
    this.drawHead(ctx, snap, now);
  }

  /** Draw dead trail (no head, fading slightly) — called for dead cycles. */
  drawDeadTrail(ctx: CanvasRenderingContext2D, snap: CycleSnapshot): void {
    if (snap.trail.length === 0) return;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = snap.color;
    ctx.shadowColor = snap.color;
    ctx.shadowBlur = 4;
    for (const p of snap.trail) {
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
    }
    ctx.restore();
  }

  private drawTrail(ctx: CanvasRenderingContext2D, snap: CycleSnapshot): void {
    if (snap.trail.length === 0) return;
    const color = snap.color;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = TRAIL_GLOW;

    // Draw all trail segments
    for (const p of snap.trail) {
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
    }

    // Brighter inner core on recent trail segment
    if (snap.trail.length > 0) {
      const last = snap.trail[snap.trail.length - 1]!;
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#ffffff88';
      ctx.fillRect(last.x * CELL + 2, last.y * CELL + 2, CELL - 4, CELL - 4);
    }

    ctx.shadowBlur = 0;
  }

  private drawHead(ctx: CanvasRenderingContext2D, snap: CycleSnapshot, now: number): void {
    const color = snap.color;
    const { pos, prevPos, alpha, boosting } = snap;

    // Interpolated render position
    const rx = (prevPos.x + (pos.x - prevPos.x) * alpha) * CELL;
    const ry = (prevPos.y + (pos.y - prevPos.y) * alpha) * CELL;

    let glow = HEAD_GLOW;
    if (boosting) {
      const pulse = Math.sin(now * CONFIG.BOOST_PULSE_HZ * Math.PI * 2 / 1000) * 0.5 + 0.5;
      glow += BOOST_EXTRA_GLOW * pulse;
    }

    // Outer glow
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fillRect(rx + 1, ry + 1, CELL - 2, CELL - 2);

    // Bright inner core
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffffffcc';
    ctx.fillRect(rx + 3, ry + 3, CELL - 6, CELL - 6);

    ctx.shadowBlur = 0;
  }
}
