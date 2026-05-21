class AudioSynth {
  constructor() {
    this.ctx = null;
    
    // Ambient hum elements
    this.humOsc1 = null;
    this.humOsc2 = null;
    this.humGain = null;
    this.lfoOsc = null;
    this.lfoGain = null;

    this.heartbeatTimer = null;
    this.currentPressure = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(e => console.warn("Failed to resume AudioContext:", e));
      }
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.startHum();
    } catch (e) {
      console.warn("Web Audio API not supported in this browser:", e);
    }
  }

  startHum() {
    if (!this.ctx) return;
    
    // Create oscillators for dual-frequency room hum (G1 = 55Hz and G2 = 110Hz)
    this.humOsc1 = this.ctx.createOscillator();
    this.humOsc1.type = 'sine';
    this.humOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);
    
    this.humOsc2 = this.ctx.createOscillator();
    this.humOsc2.type = 'sine';
    this.humOsc2.frequency.setValueAtTime(110, this.ctx.currentTime);
    
    this.humGain = this.ctx.createGain();
    this.humGain.gain.setValueAtTime(0.008, this.ctx.currentTime); // Low baseline volume

    // Low Frequency Oscillator (LFO) at 0.15Hz to modulate the room hum amplitude
    // This creates a subtle "breathing/pulsing" machine effect (telemetry vibe)
    this.lfoOsc = this.ctx.createOscillator();
    this.lfoOsc.type = 'sine';
    this.lfoOsc.frequency.setValueAtTime(0.15, this.ctx.currentTime);

    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(0.004, this.ctx.currentTime); // depth of breathing

    // Connect LFO to hum gain
    this.lfoOsc.connect(this.lfoGain);
    this.lfoGain.connect(this.humGain.gain);

    // Connect audio signal path
    this.humOsc1.connect(this.humGain);
    this.humOsc2.connect(this.humGain);
    this.humGain.connect(this.ctx.destination);
    
    // Start oscillators
    this.humOsc1.start();
    this.humOsc2.start();
    this.lfoOsc.start();
  }

  playHeartbeat() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // Double beat: Thump-thump (low frequencies passed through a lowpass filter)
    const playThump = (time, gainVal, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = 'sine';
      // Low sub frequency drop (50Hz to 15Hz) for physical chest-thumping sound
      osc.frequency.setValueAtTime(50, time);
      osc.frequency.exponentialRampToValueAtTime(15, time + dur);
      
      // Lowpass filter to remove clicks and leave clean sub-bass
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, time);
      
      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(time);
      osc.stop(time + dur);
    };

    // Calculate dynamic gain based on pressure index (higher pressure = louder thumps)
    const multiplier = Math.min(1.5, Math.max(0.4, this.currentPressure / 50));
    
    // Thump-thump sequence (160ms apart)
    playThump(now, 0.28 * multiplier, 0.15);
    playThump(now + 0.16, 0.16 * multiplier, 0.12);
  }

  setPressure(pressure) {
    this.currentPressure = pressure;
    this.init(); // Auto-initialize on first data update (user gesture)
    
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Clear old heartbeat cycle
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Heartbeat becomes active above 30% pressure
    if (pressure > 30) {
      // 30% -> 2000ms interval, 100% -> 500ms interval (panic rhythm)
      const interval = Math.max(480, 2000 - ((pressure - 30) * 21));
      this.heartbeatTimer = setInterval(() => {
        this.playHeartbeat();
      }, interval);
    }
  }

  playWicketGlitch() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // 1. FM Glitchy Synthesizer
    const osc = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);

    modulator.type = 'square';
    modulator.frequency.setValueAtTime(60, now);
    modGain.gain.setValueAtTime(120, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    modulator.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    modulator.start(now);
    osc.start(now);
    
    modulator.stop(now + 0.55);
    osc.stop(now + 0.55);

    // 2. Heavy Sub-Bass Boom (G0 = 27.5Hz) for physical impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    const subFilter = this.ctx.createBiquadFilter();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(45, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.8);

    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(60, now);

    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.8);
  }

  playStadiumCheer() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const duration = 2.0;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate White Noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Sweeping bandpass filter for crowd roar swell
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(1100, now + 0.6);
    filter.Q.setValueAtTime(1.8, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.4); // swell volume
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  }

  playSixSwell() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // 1. Crowd roar
    this.playStadiumCheer();

    // 2. Cinematic Synthesizer Swell Sweep (creates the "rising tension" tone)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.linearRampToValueAtTime(580, now + 1.2);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(90, now);
    osc2.frequency.linearRampToValueAtTime(290, now + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 1.0);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.8); // swell volume peak
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.6);
    osc2.stop(now + 1.6);
  }

  playGlitchImpact() {
    // Combination of wicket digital crash followed by a sub-bass boom
    this.playWicketGlitch();
  }

  playVictoryCheer() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // 1. Dual crowd roars overlapping
    this.playStadiumCheer();
    setTimeout(() => this.playStadiumCheer(), 400);

    // 2. Uplifting synth melody (arpeggio sequence)
    const playTone = (freq, startTime, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.06, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Uplifting victory arpeggio: C4, E4, G4, C5
    playTone(261.63, now, 0.4);
    playTone(329.63, now + 0.15, 0.4);
    playTone(392.00, now + 0.30, 0.4);
    playTone(523.25, now + 0.45, 0.8);
  }
  
  stop() {
    if (this.humOsc1) {
      try { this.humOsc1.stop(); } catch (e) {}
    }
    if (this.humOsc2) {
      try { this.humOsc2.stop(); } catch (e) {}
    }
    if (this.lfoOsc) {
      try { this.lfoOsc.stop(); } catch (e) {}
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }
}

export const audioSynth = new AudioSynth();
export default audioSynth;
