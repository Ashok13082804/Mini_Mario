// Retro Sound & Music Synthesizer using Web Audio API
// Handles retro chiptune SFX and background themes dynamically without assets.

const NOTE_FREQS = {
  "B1": 61.74, "C2": 65.41, "C#2": 69.30, "D2": 73.42, "Eb2": 77.78, "E2": 82.41, "F2": 87.31, "F#2": 92.50, "G2": 98.00, "G#2": 103.83, "A2": 110.00, "Bb2": 116.54, "B2": 123.47,
  "C3": 130.81, "C#3": 138.59, "D3": 146.83, "D#3": 155.56, "E3": 164.81, "F3": 174.61, "F#3": 185.00, "G3": 196.00, "G#3": 207.65, "A3": 220.00, "A#3": 233.08, "B3": 246.94,
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77,
  "C6": 1046.50, "D6": 1174.66, "E6": 1318.51, "F6": 1396.91, "G6": 1567.98, "A6": 1760.00, "B6": 1975.53
};

const MUSIC_THEMES = {
  forest: {
    tempo: 130,
    melody: ["E5", "G5", "A5", "G5", "C5", "D5", "E5", "D5", "E5", "G5", "A5", "C6", "G5", "E5", "D5", "C5"],
    bass: ["C3", "G3", "C3", "G3", "F3", "C4", "F3", "C4", "G3", "D4", "G3", "D4", "C3", "G3", "C3", "G3"],
    waveMelody: "square",
    waveBass: "triangle"
  },
  desert: {
    tempo: 100,
    melody: ["A4", "Bb4", "C#5", "D5", "E5", "F5", "E5", "D5", "C#5", "Bb4", "A4", "A4", "G4", "F4", "E4", "A4"],
    bass: ["D3", "A3", "D3", "A3", "G3", "D4", "G3", "D4", "A3", "E4", "A3", "E4", "D3", "A3", "D3", "A3"],
    waveMelody: "sawtooth",
    waveBass: "triangle"
  },
  ice: {
    tempo: 110,
    melody: ["C6", "E6", "G6", "C6", "A5", "C6", "F6", "A5", "B5", "D6", "G6", "B5", "C6", "G5", "E5", "C5"],
    bass: ["C4", "G4", "C4", "G4", "F4", "C5", "F4", "C5", "G4", "D5", "G4", "D5", "C4", "G4", "C4", "G4"],
    waveMelody: "sine",
    waveBass: "sine"
  },
  sky: {
    tempo: 125,
    melody: ["G5", "C6", "D6", "E6", "F6", "E6", "D6", "C6", "A5", "C6", "D6", "C6", "G5", "E5", "F5", "G5"],
    bass: ["F3", "C4", "F3", "C4", "C3", "G3", "C3", "G3", "A3", "E4", "A3", "E4", "G3", "D4", "G3", "D4"],
    waveMelody: "triangle",
    waveBass: "sine"
  },
  castle: {
    tempo: 140,
    melody: ["D4", "Eb4", "F#4", "G4", "Ab4", "G4", "F#4", "Eb4", "D4", "Eb4", "D4", "C#4", "D4", "D5", "C#5", "C5"],
    bass: ["D2", "D3", "D2", "D3", "Eb2", "Eb3", "Eb2", "Eb3", "D2", "D3", "D2", "D3", "C#2", "C#3", "C2", "B1"],
    waveMelody: "sawtooth",
    waveBass: "sawtooth"
  },
  boss: {
    tempo: 145,
    melody: ["D4", "D4", "F4", "D4", "G4", "D4", "Ab4", "G4", "F4", "D4", "F4", "D4", "C4", "C#4", "D4", "A4"],
    bass: ["D2", "D2", "D2", "D2", "F2", "F2", "F2", "F2", "G2", "G2", "G2", "G2", "Bb2", "Bb2", "A2", "A2"],
    waveMelody: "square",
    waveBass: "sawtooth"
  }
};

const RetroSynth = {
  ctx: null,
  soundVol: 0.5,
  musicVol: 0.3,
  muted: false,
  currentTheme: null,
  nextNoteTime: 0.0,
  beatIndex: 0,
  isPlayingMusic: false,
  musicGainNode: null,
  sfxGainNode: null,
  activeOscillators: [],
  timerId: null,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Setup main output gain nodes
      this.musicGainNode = this.ctx.createGain();
      this.musicGainNode.gain.value = this.muted ? 0 : this.musicVol;
      this.musicGainNode.connect(this.ctx.destination);
      
      this.sfxGainNode = this.ctx.createGain();
      this.sfxGainNode.gain.value = this.muted ? 0 : this.soundVol;
      this.sfxGainNode.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  },

  setSoundVolume(val) {
    this.soundVol = Math.max(0, Math.min(1, val));
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = this.muted ? 0 : this.soundVol;
    }
  },

  setMusicVolume(val) {
    this.musicVol = Math.max(0, Math.min(1, val));
    if (this.musicGainNode) {
      this.musicGainNode.gain.value = this.muted ? 0 : this.musicVol;
    }
  },

  setMuted(val) {
    this.muted = !!val;
    if (this.musicGainNode) {
      this.musicGainNode.gain.value = this.muted ? 0 : this.musicVol;
    }
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = this.muted ? 0 : this.soundVol;
    }
  },

  resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  // SFX PLAYERS
  playJump() {
    this.resumeContext();
    if (!this.ctx || this.muted || this.soundVol === 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(650, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  },

  playCoin() {
    this.resumeContext();
    if (!this.ctx || this.muted || this.soundVol === 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "square";
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(NOTE_FREQS["B5"], now);
    osc.frequency.setValueAtTime(NOTE_FREQS["E6"], now + 0.08);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.setValueAtTime(0.3, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    
    osc.start();
    osc.stop(now + 0.32);
  },

  playPowerup() {
    this.resumeContext();
    if (!this.ctx || this.muted || this.soundVol === 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "triangle";
    const now = this.ctx.currentTime;
    const notes = ["G4", "C5", "E5", "G5", "C6"];
    const step = 0.07;
    
    notes.forEach((note, index) => {
      osc.frequency.setValueAtTime(NOTE_FREQS[note], now + index * step);
    });
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + notes.length * step);
    
    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    
    osc.start();
    osc.stop(now + notes.length * step + 0.02);
  },

  playHurt() {
    this.resumeContext();
    if (!this.ctx || this.muted || this.soundVol === 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sawtooth";
    const now = this.ctx.currentTime;
    
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.25);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    
    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    
    osc.start();
    osc.stop(now + 0.26);
  },

  playExplode() {
    this.resumeContext();
    if (!this.ctx || this.muted || this.soundVol === 0) return;

    const now = this.ctx.currentTime;
    
    // Create random buffer for white noise
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);
    
    noise.start();
    noise.stop(now + 0.36);
  },

  playWin() {
    this.resumeContext();
    if (!this.ctx || this.muted || this.soundVol === 0) return;

    const notes = ["C5", "E5", "G5", "C6", "E6", "G6"];
    const now = this.ctx.currentTime;
    const step = 0.08;
    
    notes.forEach((note, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(NOTE_FREQS[note], now + index * step);
      
      gain.gain.setValueAtTime(0.4, now + index * step);
      gain.gain.linearRampToValueAtTime(0.01, now + index * step + 0.3);
      
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      
      osc.start(now + index * step);
      osc.stop(now + index * step + 0.32);
    });
  },

  playGameOver() {
    this.resumeContext();
    this.stopMusic();
    if (!this.ctx || this.muted || this.soundVol === 0) return;

    const notes = ["C5", "G4", "E4", "C4"];
    const now = this.ctx.currentTime;
    const step = 0.25;
    
    notes.forEach((note, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(NOTE_FREQS[note], now + index * step);
      
      gain.gain.setValueAtTime(0.4, now + index * step);
      gain.gain.linearRampToValueAtTime(0.01, now + index * step + 0.4);
      
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      
      osc.start(now + index * step);
      osc.stop(now + index * step + 0.45);
    });
  },

  // MUSIC SCHEDULER
  playMusic(themeName) {
    this.resumeContext();
    if (!this.ctx) return;
    
    if (this.isPlayingMusic && this.currentTheme === themeName) return;
    this.stopMusic();

    const theme = MUSIC_THEMES[themeName];
    if (!theme) return;

    this.currentTheme = themeName;
    this.isPlayingMusic = true;
    this.beatIndex = 0;
    this.nextNoteTime = this.ctx.currentTime;

    const scheduleLoop = () => {
      if (!this.isPlayingMusic) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
        this.scheduleNote(this.beatIndex, this.nextNoteTime, theme);
        
        const secondsPerBeat = 60.0 / theme.tempo / 2; // Eighth notes
        this.nextNoteTime += secondsPerBeat;
        this.beatIndex = (this.beatIndex + 1) % 16;
      }
      this.timerId = setTimeout(scheduleLoop, 25);
    };

    scheduleLoop();
  },

  scheduleNote(index, time, theme) {
    if (!this.ctx || this.muted || this.musicVol === 0) return;

    // Melody osc
    const melodyNote = theme.melody[index];
    if (melodyNote && melodyNote !== "REST") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = theme.waveMelody;
      osc.frequency.setValueAtTime(NOTE_FREQS[melodyNote], time);
      
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.linearRampToValueAtTime(0.001, time + (60.0 / theme.tempo / 2) * 0.9);
      
      osc.connect(gain);
      gain.connect(this.musicGainNode);
      
      osc.start(time);
      osc.stop(time + (60.0 / theme.tempo / 2));
      this.activeOscillators.push(osc);
    }

    // Bass osc
    const bassNote = theme.bass[index];
    if (bassNote && bassNote !== "REST") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = theme.waveBass;
      osc.frequency.setValueAtTime(NOTE_FREQS[bassNote], time);
      
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.linearRampToValueAtTime(0.001, time + (60.0 / theme.tempo / 2) * 0.9);
      
      osc.connect(gain);
      gain.connect(this.musicGainNode);
      
      osc.start(time);
      osc.stop(time + (60.0 / theme.tempo / 2));
      this.activeOscillators.push(osc);
    }

    // Clean up expired oscillators
    if (this.activeOscillators.length > 50) {
      this.activeOscillators = this.activeOscillators.filter(osc => {
        try {
          return osc.currentTime < time + 1.0;
        } catch (e) {
          return false;
        }
      });
    }
  },

  stopMusic() {
    this.isPlayingMusic = false;
    this.currentTheme = null;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.activeOscillators = [];
  }
};

window.RetroSynth = RetroSynth;
