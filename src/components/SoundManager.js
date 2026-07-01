class SoundManager {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playError() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    // Apply a lowpass filter to make it softer
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playSuccess() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Acorde sombrio e misterioso: Gm9 (Sol menor com nona)
    // G2 (grave profundo), D3 (quinta perfeita), Bb3 (terça menor sombria), F4 (sétima), A4 (nona misteriosa)
    const notes = [98.00, 146.83, 233.08, 349.23, 440.00]; 
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Usa triângulo para o grave profundo e senoidal para as notas mais altas
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      // Filtro passa-baixas dinâmico para abafar o som ao longo do tempo (efeito cave)
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 1.4);

      // Envelope com ataque suave e decaimento lento (ressonância longa)
      gain.gain.setValueAtTime(0.0, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.07, now + idx * 0.05 + 0.12); 
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 1.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 1.5);
    });
  }

  playHappyBirthday() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Notes and their durations in seconds
    // Tempo: ~120 BPM => 1 beat = 0.5s
    const tempo = 0.45; // seconds per beat
    
    // Melodia: "Parabéns a você..." em Sol Maior (G Major)
    // D4, D4, E4, D4, G4, F#4,
    // D4, D4, E4, D4, A4, G4,
    // D4, D4, D5, B4, G4, F#4, E4,
    // C5, C5, B4, G4, A4, G4
    const melody = [
      { f: 293.66, d: 0.75 }, // D4 (ponto)
      { f: 293.66, d: 0.25 }, // D4 (rápida)
      { f: 329.63, d: 1.0 },  // E4
      { f: 293.66, d: 1.0 },  // D4
      { f: 392.00, d: 1.0 },  // G4
      { f: 369.99, d: 2.0 },  // F#4
      
      { f: 293.66, d: 0.75 }, // D4
      { f: 293.66, d: 0.25 }, // D4
      { f: 329.63, d: 1.0 },  // E4
      { f: 293.66, d: 1.0 },  // D4
      { f: 440.00, d: 1.0 },  // A4
      { f: 392.00, d: 2.0 },  // G4
      
      { f: 293.66, d: 0.75 }, // D4
      { f: 293.66, d: 0.25 }, // D4
      { f: 587.33, d: 1.0 },  // D5
      { f: 493.88, d: 1.0 },  // B4
      { f: 392.00, d: 1.0 },  // G4
      { f: 369.99, d: 1.0 },  // F#4
      { f: 329.63, d: 2.0 },  // E4
      
      { f: 523.25, d: 0.75 }, // C5
      { f: 523.25, d: 0.25 }, // C5
      { f: 493.88, d: 1.0 },  // B4
      { f: 392.00, d: 1.0 },  // G4
      { f: 440.00, d: 1.0 },  // A4
      { f: 392.00, d: 2.5 }   // G4
    ];

    let currentOffset = 0;
    
    // We keep track of the notes so we can stop them if the user leaves the screen
    const playingNodes = [];

    melody.forEach((note) => {
      const startTime = now + currentOffset * tempo;
      const duration = note.d * tempo;
      currentOffset += note.d;

      // Soft triangle wave for retro/lullaby synth feel
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, startTime);

      // Simple ADSR envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.05); // Attack
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.02); // Release

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, startTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
      
      playingNodes.push({ osc, gain });
    });

    return playingNodes;
  }
}

export const sound = new SoundManager();
