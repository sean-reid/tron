/**
 * Generative ambient TRON-style music.
 * Consists of:
 *   - A sub-bass drone
 *   - A rhythmic pulse
 *   - A slow arpeggio pattern
 */
export class Music {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private oscillators: OscillatorNode[] = [];
  private pulseInterval: ReturnType<typeof setInterval> | null = null;
  private arpeggioInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.18;
    this.masterGain.connect(ctx.destination);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startDrone();
    this.startPulse();
    this.startArpeggio();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.pulseInterval) clearInterval(this.pulseInterval);
    if (this.arpeggioInterval) clearInterval(this.arpeggioInterval);
    this.pulseInterval = null;
    this.arpeggioInterval = null;
    this.oscillators.forEach(o => {
      try { o.stop(); } catch { /* already stopped */ }
    });
    this.oscillators = [];
  }

  private startDrone(): void {
    const t = this.ctx.currentTime;
    for (const freq of [55, 82.5]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      filter.Q.value = 2;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.15;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      this.oscillators.push(osc);
    }
  }

  private startPulse(): void {
    const INTERVAL_MS = 500;
    this.pulseInterval = setInterval(() => {
      if (!this.running) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 110;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 150;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    }, INTERVAL_MS);
  }

  private startArpeggio(): void {
    const NOTES = [220, 262, 330, 392, 440, 392, 330, 262];
    let idx = 0;
    this.arpeggioInterval = setInterval(() => {
      if (!this.running) return;
      const t = this.ctx.currentTime;
      const freq = NOTES[idx % NOTES.length] as number;
      idx++;

      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    }, 250);
  }

  setVolume(v: number): void {
    this.masterGain.gain.value = v;
  }
}
