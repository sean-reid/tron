export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameState = 'RUNNING' | 'LOSE_PAUSE';

export interface GridPos {
  x: number;
  y: number;
}

export interface CycleSnapshot {
  id: number;
  pos: GridPos;
  prevPos: GridPos;
  dir: Direction;
  trail: GridPos[];
  boosting: boolean;
  alive: boolean;
  color: string;
  /** 0–1 interpolation factor between prevPos and pos */
  alpha: number;
}

export interface StatsSnapshot {
  points: number;
  longestSurvival: number; // ms
  totalGames: number;
}

export function oppositeDir(dir: Direction): Direction {
  switch (dir) {
    case 'UP':    return 'DOWN';
    case 'DOWN':  return 'UP';
    case 'LEFT':  return 'RIGHT';
    case 'RIGHT': return 'LEFT';
  }
}
