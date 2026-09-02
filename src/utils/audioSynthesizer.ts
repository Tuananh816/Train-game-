/**
 * Web Audio API procedural sound synthesizer for realistic train audio effects.
 * 100% self-contained without external audio asset dependencies.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private isInitialized: boolean = false;

  // Background loop generators
  private ambientGain: GainNode | null = null;
  private chuffInterval: number | null = null;
  private lastChuffTime: number = 0;

  constructor() {
    // Lazy initialization on first user interaction
  }

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.isInitialized = true;
    } catch {
      console.warn('Web Audio API not supported or blocked by browser policy');
    }
  }

  public toggleMute(): boolean {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Train steam engine chuff (piston exhaust stroke)
   */
  public playChuff(intensity: number = 1.0) {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // White noise buffer for steam blast
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      // Bandpass filter to sculpt steam frequency
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400 + intensity * 200, t);
      filter.Q.setValueAtTime(2.5, t);

      // Low frequency thump for heavy iron piston impact
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(65, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.4 * intensity, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35 * intensity, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain!);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain!);

      whiteNoise.start(t);
      osc.start(t);
      whiteNoise.stop(t + 0.12);
      osc.stop(t + 0.08);
    } catch {}
  }

  /**
   * Authentic Steam Locomotive Whistle (Dual Tone Chords with vibrato)
   */
  public playWhistle() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const duration = 1.4;

      // Traditional 3-chime whistle frequencies: ~440Hz (A4), ~554Hz (C#5), ~659Hz (E5)
      const freqs = [440, 554, 659.25, 880];
      const masterWhistleGain = this.ctx.createGain();
      masterWhistleGain.gain.setValueAtTime(0.001, t);
      masterWhistleGain.gain.linearRampToValueAtTime(0.3, t + 0.15); // gentle blow-in
      masterWhistleGain.gain.setValueAtTime(0.28, t + duration - 0.3);
      masterWhistleGain.gain.exponentialRampToValueAtTime(0.0001, t + duration); // decay
      masterWhistleGain.connect(this.masterGain!);

      freqs.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        osc.type = index % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        // Acoustic vibrato
        const vibrato = this.ctx!.createOscillator();
        vibrato.frequency.setValueAtTime(5.5, t);
        const vibratoGain = this.ctx!.createGain();
        vibratoGain.gain.setValueAtTime(4.0, t);
        vibrato.connect(osc.frequency);
        vibrato.start(t);
        vibrato.stop(t + duration);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, t);

        const oscGain = this.ctx!.createGain();
        oscGain.gain.setValueAtTime(0.25 / freqs.length, t);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(masterWhistleGain);

        osc.start(t);
        osc.stop(t + duration);
      });

      // Add slight steam hiss alongside the whistle
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1200, t);
      const steamGain = this.ctx.createGain();
      steamGain.gain.setValueAtTime(0.05, t);
      steamGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      noise.connect(noiseFilter);
      noiseFilter.connect(steamGain);
      steamGain.connect(masterWhistleGain);
      noise.start(t);
      noise.stop(t + duration);
    } catch {}
  }

  /**
   * Track Click-Clack (Wheel passing rail joint)
   */
  public playClickClack() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const clicks = [0, 0.07]; // Double-beat click... clack

      clicks.forEach((offset, idx) => {
        const clickTime = t + offset;
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? 320 : 260, clickTime);
        osc.frequency.exponentialRampToValueAtTime(80, clickTime + 0.04);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.18, clickTime);
        gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.04);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(clickTime);
        osc.stop(clickTime + 0.05);
      });
    } catch {}
  }

  /**
   * Steam Release Hiss (when stopping or slowing down)
   */
  public playSteamHiss() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const duration = 0.8;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(300, t + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      noise.start(t);
      noise.stop(t + duration);
    } catch {}
  }

  /**
   * Station Arrival Brass Bell
   */
  public playStationBell() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // Ding-Dong bell
      const strikes = [
        { freq: 880, time: 0 },
        { freq: 740, time: 0.4 },
        { freq: 880, time: 0.9 },
      ];

      strikes.forEach((strike) => {
        const strikeTime = t + strike.time;
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(strike.freq, strikeTime);

        // Overtone harmonic
        const harmonic = this.ctx!.createOscillator();
        harmonic.type = 'sine';
        harmonic.frequency.setValueAtTime(strike.freq * 2.76, strikeTime);

        const bellGain = this.ctx!.createGain();
        bellGain.gain.setValueAtTime(0.25, strikeTime);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + 1.2);

        const harmGain = this.ctx!.createGain();
        harmGain.gain.setValueAtTime(0.08, strikeTime);
        harmGain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + 0.6);

        osc.connect(bellGain);
        harmonic.connect(harmGain);
        bellGain.connect(this.masterGain!);
        harmGain.connect(this.masterGain!);

        osc.start(strikeTime);
        harmonic.start(strikeTime);
        osc.stop(strikeTime + 1.2);
        harmonic.stop(strikeTime + 0.6);
      });
    } catch {}
  }

  /**
   * Gold / Coin Chime (ka-ching)
   */
  public playCoinSound() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [987.77, 1318.51, 1567.98, 2093.0]; // B5, E6, G6, C7
      notes.forEach((freq, index) => {
        const noteTime = t + index * 0.06;
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.2, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(noteTime);
        osc.stop(noteTime + 0.25);
      });
    } catch {}
  }

  /**
   * Fuel Refill Sound (Liquid bubbling & pumping)
   */
  public playFuelRefill() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 5; i++) {
        const bubbleTime = t + i * 0.09;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        const startFreq = 200 + Math.random() * 150;
        osc.frequency.setValueAtTime(startFreq, bubbleTime);
        osc.frequency.exponentialRampToValueAtTime(startFreq + 350, bubbleTime + 0.08);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, bubbleTime);
        gain.gain.exponentialRampToValueAtTime(0.001, bubbleTime + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(bubbleTime);
        osc.stop(bubbleTime + 0.09);
      }
    } catch {}
  }

  /**
   * Hull Repair Sound (Metallic hammer impact)
   */
  public playRepairSound() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // Anvil clink
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch {}
  }

  /**
   * Unlock / Achievement chime success
   */
  public playChimeSuccess() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [587.33, 880.0, 1174.66]; // D5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.09);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.18, t + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(t + idx * 0.09);
        osc.stop(t + idx * 0.09 + 0.6);
      });
    } catch {}
  }

  /**
   * Upgrade Fanfare (Ascending bright synth chords)
   */
  public playUpgradeFanfare() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chord.forEach((freq, idx) => {
        const noteTime = t + idx * 0.1;
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.22, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(noteTime);
        osc.stop(noteTime + 0.8);
      });
    } catch {}
  }

  /**
   * Crop Harvest pop sound
   */
  public playHarvestSound() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  }

  /**
   * Warning / Low resource alert sound
   */
  public playWarningSound() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(330, t + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.25);
    } catch {}
  }

  /**
   * Thunder rumble and distant lightning strike
   */
  public playThunder() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // Low frequency rumble oscillator
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 1.2);

      // Filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, t);

      // Noise buffer for crackle
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

      osc.connect(filter);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      noise.start(t);
      osc.stop(t + 1.6);
      noise.stop(t + 1.6);
    } catch {}
  }

  /**
   * Meteor celestial shimmer chime
   */
  public playMeteorChime() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const freqs = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.12, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.9);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.9);
      });
    } catch {}
  }

  /**
   * Cold crisp snow shimmer
   */
  public playSnowShimmer() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1760, t); // A6
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.35);
    } catch {}
  }
}

export const audioSynthesizer = new AudioSynthesizer();
