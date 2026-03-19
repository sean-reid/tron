import type { StatsSnapshot } from '../types';

export class ScoreManager {
  points = 0;
  longestSurvival = 0; // ms
  totalGames = 0;

  recordGame(survivalMs: number): void {
    this.totalGames++;
    this.points += Math.floor(survivalMs / 1000);
    if (survivalMs > this.longestSurvival) this.longestSurvival = survivalMs;
  }

  snapshot(): StatsSnapshot {
    return {
      points: this.points,
      longestSurvival: this.longestSurvival,
      totalGames: this.totalGames,
    };
  }
}
