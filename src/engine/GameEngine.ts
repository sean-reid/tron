import { Arena } from './Arena';
import { nextPos, willCollide } from './CollisionDetector';
import { PlayerCycle } from '../entities/PlayerCycle';
import { BotCycle } from '../entities/BotCycle';
import { BotManager } from '../systems/BotManager';
import { evaluateBoost } from '../systems/SpeedBoost';
import { ScoreManager } from '../systems/ScoreManager';
import { InputManager } from '../systems/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { Renderer } from '../rendering/Renderer';
import { HUDRenderer } from '../rendering/HUDRenderer';
import { BannerRenderer } from '../rendering/BannerRenderer';
import { CONFIG } from '../config';
import type { GameState, CycleSnapshot } from '../types';

const PLAYER_ID = 1;

function centerGridPos(arena: Arena) {
  return { x: Math.floor(arena.cols / 2), y: Math.floor(arena.rows / 2) };
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private hud: HUDRenderer;
  private banner: BannerRenderer;
  private audio: AudioManager;
  private input: InputManager;
  private scoreManager: ScoreManager;

  private arena!: Arena;
  private player!: PlayerCycle;
  private bots!: BotCycle[];
  private botManager!: BotManager;

  private state: GameState = 'RUNNING';
  private stateTimer = 0;
  private gameStartTime = 0;
  private lastFrameTs = 0;
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.hud = new HUDRenderer();
    this.banner = new BannerRenderer();
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.scoreManager = new ScoreManager();
  }

  start(): void {
    this.input.attachKeyboard();
    this.input.attachTouch(this.canvas);

    this.hud.onSFXClick(() => {
      this.audio.init();
      const on = this.audio.toggleSFX();
      this.hud.setSFXState(on);
    });

    this.hud.onMusicClick(() => {
      this.audio.init();
      const on = this.audio.toggleMusic();
      this.hud.setMusicState(on);
    });

    // Init audio on first user interaction
    const initAudio = () => {
      this.audio.init();
      window.removeEventListener('keydown', initAudio);
      this.canvas.removeEventListener('touchstart', initAudio);
      this.canvas.removeEventListener('click', initAudio);
    };
    window.addEventListener('keydown', initAudio);
    this.canvas.addEventListener('touchstart', initAudio);
    this.canvas.addEventListener('click', initAudio);

    window.addEventListener('resize', () => this.handleResize());

    this.initGame();
    this.lastFrameTs = performance.now();
    this.rafId = requestAnimationFrame(ts => this.loop(ts));
  }

  private handleResize(): void {
    this.initGame();
  }

  private initGame(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);

    this.arena = new Arena(w, h, CONFIG.CELL_SIZE);
    this.botManager = new BotManager(this.arena);

    const spawnPos = centerGridPos(this.arena);
    this.player = new PlayerCycle(PLAYER_ID, CONFIG.COLORS.PLAYER, spawnPos, 'RIGHT', this.input);
    this.arena.occupy(spawnPos, PLAYER_ID);

    this.bots = this.botManager.createBots(this.arena, spawnPos);

    this.state = 'RUNNING';
    this.stateTimer = 0;
    this.gameStartTime = performance.now();
  }

  private loop(ts: number): void {
    const delta = Math.min(ts - this.lastFrameTs, 100); // cap to avoid spiral
    this.lastFrameTs = ts;

    if (this.state !== 'RUNNING') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.banner.hide();
        this.initGame();
      }
    } else {
      this.updateCycles(ts, delta);
    }

    const snapshots = this.buildSnapshots();
    this.renderer.draw(snapshots, this.arena, ts);

    this.rafId = requestAnimationFrame(next => this.loop(next));
  }

  private updateCycles(now: number, delta: number): void {
    const allCycles = [this.player, ...this.bots];

    for (const cycle of allCycles) {
      if (!cycle.alive) continue;

      cycle.tickAccumulator += delta;
      const tickInterval = cycle.boosting
        ? CONFIG.TICK_MS / CONFIG.BOOST_MULTIPLIER
        : CONFIG.TICK_MS;

      while (cycle.tickAccumulator >= tickInterval) {
        cycle.tickAccumulator -= tickInterval;
        this.stepCycle(cycle, now);
        if (!cycle.alive) break;
      }
    }

    // Tick respawn queue — keeps bot count constant throughout the game
    if (this.botManager.tick(now, this.arena, this.player.pos)) {
      this.audio.playSFX('spawn');
    }
  }

  /** Positions of all alive cycles except the given one — used for Voronoi AI. */
  private opponentsOf(cycle: PlayerCycle | BotCycle): import('../types').GridPos[] {
    const all = [this.player, ...this.bots];
    return all.filter(c => c !== cycle && c.alive).map(c => ({ ...c.pos }));
  }

  private killCycle(cycle: PlayerCycle | BotCycle, now: number): void {
    this.arena.occupy(cycle.pos, cycle.id);
    cycle.trail.push({ ...cycle.pos });
    cycle.die();
    this.audio.playSFX('crash');
    if (cycle.id === PLAYER_ID) {
      this.handleLoss(now);
    } else {
      // Trail stays in arena (still blocks) until the bot respawns.
      this.botManager.onBotDied(cycle as BotCycle, now);
    }
  }

  private stepCycle(cycle: PlayerCycle | BotCycle, now: number): void {
    cycle.chooseDirection(this.arena, this.opponentsOf(cycle));
    cycle.applyDirection();

    const next = nextPos(cycle.pos, cycle.dir);

    // Standard wall / trail collision
    if (willCollide(next, this.arena)) {
      this.killCycle(cycle, now);
      return;
    }

    // Head-on collision: another cycle's head is at the cell we're moving into.
    // Also catches the swap case (A→B's pos, B→A's pos) because A checks B's
    // current head before either has advanced.
    const allCycles = [this.player, ...this.bots];
    const headOn = allCycles.find(
      c => c !== cycle && c.alive && c.pos.x === next.x && c.pos.y === next.y,
    );
    if (headOn) {
      this.killCycle(cycle, now);
      this.killCycle(headOn, now);
      return;
    }

    const wasBosting = cycle.boosting;
    cycle.advance(this.arena);
    cycle.boosting = evaluateBoost(cycle.pos, cycle.dir, this.arena);

    if (cycle.boosting && !wasBosting) this.audio.playSFX('boost_start');
    if (!cycle.boosting && wasBosting) this.audio.playSFX('boost_end');
  }

  private handleLoss(ts: number): void {
    const survivalMs = ts - this.gameStartTime;
    this.scoreManager.recordGame(survivalMs);
    this.hud.update(this.scoreManager.snapshot());
    this.audio.playSFX('lose');
    this.banner.show('DEREZZED', 'lose', CONFIG.LOSE_PAUSE_MS);
    this.state = 'LOSE_PAUSE';
    this.stateTimer = CONFIG.LOSE_PAUSE_MS;
  }

  private buildSnapshots(): CycleSnapshot[] {
    const allCycles = [this.player, ...this.bots];
    return allCycles.map(cycle => {
      const tickInterval = cycle.boosting
        ? CONFIG.TICK_MS / CONFIG.BOOST_MULTIPLIER
        : CONFIG.TICK_MS;
      return cycle.snapshot(tickInterval);
    });
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }
}
