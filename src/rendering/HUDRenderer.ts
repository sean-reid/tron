import type { StatsSnapshot } from '../types';

export class HUDRenderer {
  private elPoints: HTMLElement;
  private elBest: HTMLElement;
  private elGames: HTMLElement;
  private elSFX: HTMLElement;
  private elMusic: HTMLElement;

  constructor() {
    this.elPoints = document.getElementById('stat-points')!;
    this.elBest   = document.getElementById('stat-best')!;
    this.elGames  = document.getElementById('stat-games')!;
    this.elSFX    = document.getElementById('btn-sfx')!;
    this.elMusic  = document.getElementById('btn-music')!;
  }

  update(stats: StatsSnapshot): void {
    this.elPoints.textContent = String(stats.points);
    this.elBest.textContent   = (stats.longestSurvival / 1000).toFixed(1) + 's';
    this.elGames.textContent  = String(stats.totalGames);
  }

  setSFXState(enabled: boolean): void {
    this.elSFX.classList.toggle('muted', !enabled);
  }

  setMusicState(enabled: boolean): void {
    this.elMusic.classList.toggle('muted', !enabled);
  }

  onSFXClick(cb: () => void): void {
    this.elSFX.addEventListener('click', cb);
    this.elSFX.addEventListener('touchend', (e) => { e.preventDefault(); cb(); });
  }

  onMusicClick(cb: () => void): void {
    this.elMusic.addEventListener('click', cb);
    this.elMusic.addEventListener('touchend', (e) => { e.preventDefault(); cb(); });
  }
}
