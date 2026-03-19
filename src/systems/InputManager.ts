import type { Direction } from '../types';

const MIN_SWIPE_PX = 20;

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'UP',    w: 'UP',    W: 'UP',
  ArrowDown: 'DOWN', s: 'DOWN',  S: 'DOWN',
  ArrowLeft: 'LEFT', a: 'LEFT',  A: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
};

export class InputManager {
  private buffered: Direction | null = null;
  private touchStartX = 0;
  private touchStartY = 0;

  attachKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const dir = KEY_MAP[e.key];
      if (dir) {
        e.preventDefault();
        this.buffered = dir;
      }
    });
  }

  attachTouch(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) {
        this.touchStartX = t.clientX;
        this.touchStartY = t.clientY;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - this.touchStartX;
      const dy = t.clientY - this.touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < MIN_SWIPE_PX) return;
      this.buffered = absDx > absDy
        ? (dx > 0 ? 'RIGHT' : 'LEFT')
        : (dy > 0 ? 'DOWN' : 'UP');
    }, { passive: false });
  }

  /** Called once per cycle tick; clears the buffer after reading. */
  consumeDirection(): Direction | null {
    const d = this.buffered;
    this.buffered = null;
    return d;
  }
}
