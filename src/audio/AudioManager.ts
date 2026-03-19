import { SFX } from './SFX';
import type { SFXName } from './SFX';
import { Music } from './Music';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfx: SFX | null = null;
  private music: Music | null = null;
  private sfxEnabled = true;
  private musicEnabled = true;
  private initialized = false;

  /** Must be called from a user gesture to unlock AudioContext. */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.ctx = new AudioContext();
    this.sfx = new SFX(this.ctx);
    this.music = new Music(this.ctx);
    if (this.musicEnabled) this.music.start();
  }

  playSFX(name: SFXName): void {
    if (!this.sfxEnabled || !this.sfx) return;
    this.sfx.play(name);
  }

  startMusic(): void {
    if (!this.music) return;
    this.music.start();
  }

  stopMusic(): void {
    if (!this.music) return;
    this.music.stop();
  }

  toggleSFX(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }

  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (!this.music) return this.musicEnabled;
    if (this.musicEnabled) {
      this.music.start();
    } else {
      this.music.stop();
    }
    return this.musicEnabled;
  }

  isSFXEnabled(): boolean { return this.sfxEnabled; }
  isMusicEnabled(): boolean { return this.musicEnabled; }
}
