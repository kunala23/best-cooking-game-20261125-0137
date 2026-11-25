// Sizzle & Serve — sound effects, synthesised with WebAudio, no audio files.
// One clear job: every blip, sizzle and jingle the kitchen makes.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sizzleNodes = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopSizzle();
    return this.muted;
  }

  blip(freq, seconds, type, volume) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  pickup() { this.blip(520, 0.08, 'triangle', 0.1); }
  drop() { this.blip(300, 0.07, 'triangle', 0.09); }
  chop() { this.blip(180, 0.06, 'square', 0.08); this.blip(90, 0.05, 'square', 0.06); }
  chopped() { this.blip(660, 0.09, 'triangle', 0.11); this.blip(880, 0.12, 'triangle', 0.1); }
  grillOn() { this.blip(240, 0.1, 'sawtooth', 0.06); }
  cooked() { this.blip(740, 0.1, 'sine', 0.12); this.blip(988, 0.14, 'sine', 0.11); }
  burnt() { this.blip(140, 0.25, 'sawtooth', 0.1); }
  serve() {
    this.blip(523, 0.1, 'triangle', 0.12);
    setTimeout(() => this.blip(659, 0.1, 'triangle', 0.12), 90);
    setTimeout(() => this.blip(784, 0.18, 'triangle', 0.13), 180);
  }
  wrong() { this.blip(220, 0.15, 'square', 0.09); this.blip(165, 0.22, 'square', 0.09); }
  expire() { this.blip(330, 0.12, 'sawtooth', 0.08); this.blip(220, 0.2, 'sawtooth', 0.08); }
  tick() { this.blip(980, 0.05, 'sine', 0.07); }
  start() {
    this.blip(392, 0.1, 'triangle', 0.12);
    setTimeout(() => this.blip(523, 0.1, 'triangle', 0.12), 100);
    setTimeout(() => this.blip(659, 0.2, 'triangle', 0.13), 200);
  }
  gameOver() {
    this.blip(392, 0.2, 'triangle', 0.11);
    setTimeout(() => this.blip(330, 0.2, 'triangle', 0.11), 180);
    setTimeout(() => this.blip(262, 0.35, 'triangle', 0.11), 360);
  }

  startSizzle() {
    if (this.muted || !this.ctx || this.sizzleNodes) return;
    const len = this.ctx.sampleRate * 1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5200;
    filter.Q.value = 0.6;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.025;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
    this.sizzleNodes = { src, gain };
  }

  stopSizzle() {
    if (!this.sizzleNodes) return;
    try { this.sizzleNodes.src.stop(); } catch (e) { /* already stopped */ }
    this.sizzleNodes = null;
  }
}
