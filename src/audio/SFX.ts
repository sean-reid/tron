export type SFXName = 'crash' | 'boost_start' | 'boost_end' | 'spawn' | 'win' | 'lose';

export class SFX {
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  play(name: SFXName): void {
    switch (name) {
      case 'crash':      this.crash();      break;
      case 'boost_start':this.boostStart(); break;
      case 'boost_end':  this.boostEnd();   break;
      case 'spawn':      this.spawn();      break;
      case 'win':        this.win();        break;
      case 'lose':       this.lose();       break;
    }
  }

  private crash(): void {
    const t = this.ctx.currentTime;
    const noise = this.whiteNoise(0.3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    noise.connect(gain);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.3);
    gain.connect(filter);
    filter.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.4);
  }

  private boostStart(): void {
    const t = this.ctx.currentTime;
    const dur = 0.55;

    // Low sine layer — rises slowly from sub-bass to mid
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, t);
    osc1.frequency.exponentialRampToValueAtTime(220, t + dur);

    // High triangle layer — rises faster, gives the "whoosh" edge
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(180, t);
    osc2.frequency.exponentialRampToValueAtTime(520, t + dur * 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + dur * 0.35); // ramp up
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);  // fade out

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t); osc1.stop(t + dur);
    osc2.start(t); osc2.stop(t + dur);
  }

  private boostEnd(): void {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  private spawn(): void {
    const t = this.ctx.currentTime;
    const freqs = [330, 440, 550];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      const start = t + i * 0.07;
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  private win(): void {
    const t = this.ctx.currentTime;
    const notes = [262, 330, 392, 523];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      const start = t + i * 0.1;
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  }

  private lose(): void {
    const t = this.ctx.currentTime;
    const notes = [330, 294, 262, 220];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      const start = t + i * 0.1;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  private whiteNoise(duration: number): AudioBufferSourceNode {
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
}
