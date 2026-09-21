/**
 * CyberDeck audio engine.
 *
 * A single shared AudioContext drives every sound in the deck:
 *   - short synthesised UI effects (clicks, beeps, confirms, alarms)
 *   - continuous ambient beds (white noise, cyber rain, deep space hum)
 *   - an analyser tap that the visualiser reads each frame
 *
 * Browsers refuse to start an AudioContext outside a user gesture, so the
 * graph is built lazily on the first `unlock()`/`play()` triggered by input.
 */

const FX_PRESETS = {
  /** Dry UI tick for hovers and small toggles. */
  click: { type: 'blip', freq: 1320, end: 660, duration: 0.05, gain: 0.16, wave: 'square' },
  /** Primary button press. */
  beep: { type: 'blip', freq: 880, end: 1240, duration: 0.09, gain: 0.2, wave: 'square' },
  /** Panel or modal opening. */
  open: { type: 'sweep', freq: 320, end: 1400, duration: 0.24, gain: 0.16, wave: 'sawtooth' },
  /** Panel or modal closing. */
  close: { type: 'sweep', freq: 1200, end: 260, duration: 0.2, gain: 0.14, wave: 'sawtooth' },
  /** Toggle switched on. */
  toggleOn: { type: 'blip', freq: 620, end: 1180, duration: 0.11, gain: 0.18, wave: 'triangle' },
  /** Toggle switched off. */
  toggleOff: { type: 'blip', freq: 1180, end: 520, duration: 0.11, gain: 0.16, wave: 'triangle' },
  /** Task created / data committed. */
  confirm: { type: 'chord', notes: [660, 990], duration: 0.16, gain: 0.14, wave: 'triangle' },
  /** Task completed — the reward arpeggio. */
  success: { type: 'arp', notes: [523.25, 659.25, 783.99, 1046.5], step: 0.07, duration: 0.3, gain: 0.17, wave: 'triangle' },
  /** Destructive action. */
  error: { type: 'buzz', freq: 180, end: 90, duration: 0.3, gain: 0.2, wave: 'sawtooth' },
  /** Pomodoro phase finished. */
  alarm: { type: 'alarm', freq: 1046.5, pulses: 3, duration: 0.55, gain: 0.2, wave: 'square' },
  /** Terminal keystroke. */
  type: { type: 'blip', freq: 2200, end: 1900, duration: 0.025, gain: 0.07, wave: 'square' },
  /** Window drag release. */
  thud: { type: 'buzz', freq: 140, end: 60, duration: 0.14, gain: 0.16, wave: 'sine' },
  /** Command palette execute. */
  execute: { type: 'arp', notes: [440, 880, 1320], step: 0.05, duration: 0.2, gain: 0.15, wave: 'square' },
};

export const AMBIENT_SOURCES = [
  {
    id: 'white',
    label: 'White Noise',
    description: 'Flat-spectrum static. Masks the outside world.',
    accent: 'cyan',
  },
  {
    id: 'rain',
    label: 'Cyber Rain',
    description: 'Acid drizzle on a neon awning, with droplet transients.',
    accent: 'violet',
  },
  {
    id: 'space',
    label: 'Deep Space Hum',
    description: 'Sub-bass reactor drone drifting on a slow LFO.',
    accent: 'pink',
  },
];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.fxBus = null;
    this.ambientBus = null;
    this.layers = new Map();
    this.noiseBuffer = null;
    this.muted = false;
    this.volume = 0.6;
    this.rainTimer = null;
    this.freqData = null;
  }

  /** Build the audio graph. Safe to call repeatedly. */
  ensure() {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.78;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    this.fxBus = ctx.createGain();
    this.fxBus.gain.value = 1;

    this.ambientBus = ctx.createGain();
    this.ambientBus.gain.value = 1;

    this.fxBus.connect(this.master);
    this.ambientBus.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    return ctx;
  }

  /** Resume a context suspended by autoplay policy. Call from a gesture. */
  async unlock() {
    const ctx = this.ensure();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : this.volume, now, 0.04);
  }

  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (!this.master || this.muted) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volume, now, 0.04);
  }

  /** Lazily generated 2s looping white-noise buffer shared by all beds. */
  getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    const ctx = this.ensure();
    if (!ctx) return null;
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  // ---- UI effects ---------------------------------------------------

  play(name) {
    if (this.muted) return;
    const preset = FX_PRESETS[name];
    if (!preset) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;

    const at = ctx.currentTime;
    switch (preset.type) {
      case 'blip':
      case 'sweep':
      case 'buzz':
        this.#voice(preset.wave, preset.freq, preset.end, at, preset.duration, preset.gain);
        break;
      case 'chord':
        preset.notes.forEach((note) => {
          this.#voice(preset.wave, note, note, at, preset.duration, preset.gain);
        });
        break;
      case 'arp':
        preset.notes.forEach((note, index) => {
          this.#voice(
            preset.wave,
            note,
            note * 1.01,
            at + index * preset.step,
            preset.duration,
            preset.gain,
          );
        });
        break;
      case 'alarm':
        for (let i = 0; i < preset.pulses; i += 1) {
          const start = at + i * (preset.duration / preset.pulses);
          this.#voice(
            preset.wave,
            preset.freq,
            preset.freq * 0.75,
            start,
            preset.duration / preset.pulses / 1.6,
            preset.gain,
          );
        }
        break;
      default:
        break;
    }
  }

  /** One enveloped oscillator voice. */
  #voice(wave, startFreq, endFreq, at, duration, gain) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = wave || 'sine';
    osc.frequency.setValueAtTime(startFreq, at);
    if (endFreq && endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), at + duration);
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.max(600, startFreq * 3), at);
    filter.Q.value = 1.1;

    // Fast attack, exponential decay — reads as "digital", not "musical".
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(filter);
    filter.connect(amp);
    amp.connect(this.fxBus);

    osc.start(at);
    osc.stop(at + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      amp.disconnect();
    };
  }

  // ---- Ambient beds --------------------------------------------------

  isAmbientActive(id) {
    return this.layers.has(id);
  }

  activeAmbients() {
    return [...this.layers.keys()];
  }

  startAmbient(id, level = 0.35) {
    if (this.layers.has(id)) {
      this.setAmbientLevel(id, level);
      return;
    }
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.connect(this.ambientBus);

    let layer;
    if (id === 'white') layer = this.#buildWhite(out);
    else if (id === 'rain') layer = this.#buildRain(out);
    else if (id === 'space') layer = this.#buildSpace(out);
    else return;

    layer.out = out;
    layer.level = level;
    this.layers.set(id, layer);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), ctx.currentTime + 1.1);
  }

  stopAmbient(id) {
    const layer = this.layers.get(id);
    if (!layer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    layer.out.gain.cancelScheduledValues(now);
    layer.out.gain.setValueAtTime(Math.max(0.0002, layer.out.gain.value), now);
    layer.out.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    this.layers.delete(id);

    window.setTimeout(() => {
      layer.stop?.();
      layer.nodes.forEach((node) => {
        try {
          node.stop?.();
        } catch {
          /* already stopped */
        }
        node.disconnect?.();
      });
      layer.out.disconnect();
    }, 900);
  }

  toggleAmbient(id, level = 0.35) {
    if (this.layers.has(id)) {
      this.stopAmbient(id);
      return false;
    }
    this.startAmbient(id, level);
    return true;
  }

  setAmbientLevel(id, level) {
    const layer = this.layers.get(id);
    if (!layer) return;
    layer.level = level;
    layer.out.gain.setTargetAtTime(Math.max(0.0002, level), this.ctx.currentTime, 0.12);
  }

  stopAllAmbient() {
    [...this.layers.keys()].forEach((id) => this.stopAmbient(id));
  }

  /** Flat static, shelved slightly so it does not shred the highs. */
  #buildWhite(out) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer();
    src.loop = true;

    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 3200;
    shelf.gain.value = -12;

    src.connect(shelf);
    shelf.connect(out);
    src.start();

    return { nodes: [src, shelf] };
  }

  /** Band-passed noise with a wandering centre frequency, plus droplet pings. */
  #buildRain(out) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer();
    src.loop = true;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1400;
    band.Q.value = 0.7;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;

    // Slow LFO on the band centre gives the bed a "gusting" motion.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 480;
    lfo.connect(lfoGain);
    lfoGain.connect(band.frequency);

    src.connect(band);
    band.connect(lp);
    lp.connect(out);
    src.start();
    lfo.start();

    // Sparse resonant droplets layered over the drizzle.
    const dropletBus = ctx.createGain();
    dropletBus.gain.value = 0.55;
    dropletBus.connect(out);

    const scheduleDroplet = () => {
      const at = ctx.currentTime;
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = 'sine';
      const freq = 900 + Math.random() * 1600;
      osc.frequency.setValueAtTime(freq, at);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, at + 0.14);
      amp.gain.setValueAtTime(0.0001, at);
      amp.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.05, at + 0.005);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      osc.connect(amp);
      amp.connect(dropletBus);
      osc.start(at);
      osc.stop(at + 0.2);
      osc.onended = () => {
        osc.disconnect();
        amp.disconnect();
      };
      timer = window.setTimeout(scheduleDroplet, 220 + Math.random() * 900);
    };
    let timer = window.setTimeout(scheduleDroplet, 400);

    return {
      nodes: [src, band, lp, lfo, lfoGain, dropletBus],
      stop: () => window.clearTimeout(timer),
    };
  }

  /** Detuned sub-bass drone with a breathing amplitude LFO. */
  #buildSpace(out) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 240;
    lp.Q.value = 3;
    lp.connect(out);

    const nodes = [lp];
    // Three detuned partials — the beating between them is the "engine".
    [36.71, 55.0, 55.42].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = index === 0 ? 'sine' : 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.value = index === 0 ? 0.7 : 0.22;
      osc.connect(gain);
      gain.connect(lp);
      osc.start();
      nodes.push(osc, gain);
    });

    // Airy noise shimmer sitting on top of the drone.
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 320;
    noiseFilter.Q.value = 2.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.28;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(out);
    noise.start();
    nodes.push(noise, noiseFilter, noiseGain);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.055;
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    lfo.start();
    nodes.push(lfo, lfoGain);

    return { nodes };
  }

  // ---- Analyser tap ---------------------------------------------------

  /**
   * Latest frequency bins, or `null` when the graph is idle. The visualiser
   * falls back to simulated data when this returns null.
   */
  getSpectrum() {
    if (!this.analyser || !this.ctx || this.ctx.state !== 'running') return null;
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  get binCount() {
    return this.analyser ? this.analyser.frequencyBinCount : 64;
  }

  get isRunning() {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }
}

export const audioEngine = new AudioEngine();
export const FX_NAMES = Object.keys(FX_PRESETS);
