import type { CycleSnapshot } from '../types';
import { CONFIG } from '../config';

const CELL = CONFIG.CELL_SIZE;
const HEAD_GLOW = 20;
const BOOST_EXTRA_GLOW = 18;

/**
 * Draws cycle heads only. Trail rendering is handled by the layered
 * Renderer via pre-rendered glow sprites on an offscreen canvas.
 */
export class CycleRenderer {
  drawHead(ctx: CanvasRenderingContext2D, snap: CycleSnapshot, now: number): void {
    if (!snap.alive) return;

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
