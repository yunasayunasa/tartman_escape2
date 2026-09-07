// Original procedural ambience: no downloaded recordings or external requests.
export class ForestAudio {
  constructor() { this.muted = false; this.stepAt = 0; this.branchAt = 8; }
  async start() {
    if (!this.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext; if (!Context) return;
      this.ctx = new Context(); this.master = this.ctx.createGain(); this.master.gain.value = .55; this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate); const data = buffer.getChannelData(0); let value = 0;
      for (let i = 0; i < data.length; i++) { value = (value + (Math.random() * 2 - 1) * .04) / 1.02; data[i] = value; }
      this.noise = buffer; const source = this.ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
      const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700; this.wind = this.ctx.createGain(); this.wind.gain.value = .32; source.connect(filter); filter.connect(this.wind); this.wind.connect(this.master); source.start();
    }
    await this.ctx.resume();
  }
  setMuted(v) { this.muted = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0 : .55, this.ctx.currentTime, .1); }
  suspend(v) { if (!this.ctx) return; this.master.gain.setTargetAtTime(v || this.muted ? 0 : .55, this.ctx.currentTime, .2); }
  sound(frequency, duration, volume, pan = 0, noise = false) {
    if (!this.ctx || this.muted) return; const now = this.ctx.currentTime;
    const source = noise ? this.ctx.createBufferSource() : this.ctx.createOscillator(); if (noise) source.buffer = this.noise; else { source.type = 'sine'; source.frequency.setValueAtTime(frequency, now); source.frequency.exponentialRampToValueAtTime(frequency * .55, now + duration); }
    const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = frequency * 4;
    const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + .015); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    const stereo = this.ctx.createStereoPanner(); stereo.pan.value = pan; source.connect(filter); filter.connect(gain); gain.connect(stereo); stereo.connect(this.master); source.start(); source.stop(now + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); stereo.disconnect(); };
  }
  update(g, dt) {
    if (!this.ctx || g.state !== 'playing') return;
    this.stepAt -= dt; this.branchAt -= dt;
    if (g.player.moving && this.stepAt <= 0) { this.sound(180, .15, .65, 0, true); this.stepAt = g.player.running ? .26 : .44; }
    if (this.branchAt <= 0) { this.sound(250, .65, .3, Math.random() * 2 - 1, true); this.branchAt = 7 + Math.random() * 12; }
    if (g.event === 'key') this.sound(560, 1.2, .07);
    if (g.event === 'arrival') this.sound(85, 2, .08, .65);
    if (g.ghost.state !== 'absent') { const d = Math.hypot(g.ghost.x - g.player.x, g.ghost.z - g.player.z); this.enemyStep = (this.enemyStep || 0) - dt; if (d < 13 && this.enemyStep <= 0) { this.sound(95, .3, (1 - d / 13) * .19, Math.max(-1, Math.min(1, (g.ghost.x - g.player.x) / 8))); this.enemyStep = g.ghost.state === 'chase' ? .36 : .65; } }
  }
  reset() { this.stepAt = 0; this.branchAt = 8; this.enemyStep = 0; }
}
