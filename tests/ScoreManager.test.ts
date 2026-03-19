import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from '../src/systems/ScoreManager';

describe('ScoreManager', () => {
  let s: ScoreManager;
  beforeEach(() => { s = new ScoreManager(); });

  it('starts at zero', () => {
    expect(s.snapshot()).toEqual({ points: 0, longestSurvival: 0, totalGames: 0 });
  });

  it('recordGame increments totalGames', () => {
    s.recordGame(5000);
    expect(s.totalGames).toBe(1);
    s.recordGame(3000);
    expect(s.totalGames).toBe(2);
  });

  it('points = floor(survivalMs / 1000) per game, accumulated', () => {
    s.recordGame(5000);  // +5
    s.recordGame(3500);  // +3
    s.recordGame(10000); // +10
    expect(s.points).toBe(18);
  });

  it('sub-second survival adds 0 points', () => {
    s.recordGame(500);
    expect(s.points).toBe(0);
  });

  it('tracks longest survival across games', () => {
    s.recordGame(3000);
    s.recordGame(8000);
    s.recordGame(5000);
    expect(s.longestSurvival).toBe(8000);
  });

  it('longestSurvival updates only when beaten', () => {
    s.recordGame(10000);
    s.recordGame(4000);
    expect(s.longestSurvival).toBe(10000);
  });

  it('snapshot returns a plain object (not live state)', () => {
    const snap1 = s.snapshot();
    s.recordGame(7000);
    const snap2 = s.snapshot();
    expect(snap1.totalGames).toBe(0);
    expect(snap2.totalGames).toBe(1);
  });
});
