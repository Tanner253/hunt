import { TrackData, TRACKS, LOBBY_TRACKS, TRACK_NAMES } from './tracks';

const NOTE_FREQ: Record<string, number> = {};
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
for (let oct = 1; oct <= 7; oct++) {
  NAMES.forEach((name, i) => {
    NOTE_FREQ[`${name}${oct}`] = 440 * Math.pow(2, (i - 9 + (oct - 4) * 12) / 12);
  });
}

function loadVol(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return v !== null ? Number(v) : fallback;
}

class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentTrack: string | null = null;
  private seqInterval: number | null = null;
  private stepIdx = 0;
  private nextStepTime = 0;
  private lobbyTrackIdx = 0;
  private stepCount = 0;
  private listeners = new Set<() => void>();
  private _allowLobbySkip = false;

  private _masterVol = loadVol('hunt-vol-master', 80);
  private _musicVol = loadVol('hunt-vol-music', 70);
  private _sfxVol = loadVol('hunt-vol-sfx', 80);

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private notify() { this.listeners.forEach((fn) => fn()); }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.applyVolumes();
  }

  private applyVolumes() {
    if (this.master) this.master.gain.value = this._masterVol / 100;
    if (this.musicGain) this.musicGain.gain.value = this._musicVol / 100;
    if (this.sfxGain) this.sfxGain.gain.value = this._sfxVol / 100;
  }

  private saveVol(key: string, val: number) {
    if (typeof window !== 'undefined') localStorage.setItem(key, String(val));
  }

  get masterVolume() { return this._masterVol; }
  set masterVolume(v: number) {
    this._masterVol = Math.max(0, Math.min(100, v));
    this.saveVol('hunt-vol-master', this._masterVol);
    this.applyVolumes();
    this.notify();
  }

  get musicVolume() { return this._musicVol; }
  set musicVolume(v: number) {
    this._musicVol = Math.max(0, Math.min(100, v));
    this.saveVol('hunt-vol-music', this._musicVol);
    this.applyVolumes();
    this.notify();
  }

  get sfxVolume() { return this._sfxVol; }
  set sfxVolume(v: number) {
    this._sfxVol = Math.max(0, Math.min(100, v));
    this.saveVol('hunt-vol-sfx', this._sfxVol);
    this.applyVolumes();
    this.notify();
  }

  get trackId() { return this.currentTrack; }
  get trackName() { return this.currentTrack ? (TRACK_NAMES[this.currentTrack] || this.currentTrack) : 'None'; }
  get muted() { return this._masterVol === 0; }

  toggleMute() {
    if (this._masterVol > 0) {
      this.saveVol('hunt-vol-master-prev', this._masterVol);
      this.masterVolume = 0;
    } else {
      this.masterVolume = loadVol('hunt-vol-master-prev', 60);
    }
  }

  // ─── Music ──────────────────────────────────────────────────

  playTrack(name: string) {
    if (!this.ctx || !this.musicGain) return;
    if (this.currentTrack === name) return;
    this.stopMusic();
    const track = TRACKS[name];
    if (!track) return;
    this.currentTrack = name;
    this._allowLobbySkip = name.startsWith('lobby');
    this.stepIdx = 0;
    this.stepCount = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.seqInterval = window.setInterval(() => this.schedule(track), 25);
    this.notify();
  }

  playLobbyMusic() {
    const name = LOBBY_TRACKS[this.lobbyTrackIdx % LOBBY_TRACKS.length];
    this._allowLobbySkip = true;
    this.playTrack(name);
  }

  skipTrack() {
    if (!this._allowLobbySkip) return;
    this.lobbyTrackIdx++;
    const name = LOBBY_TRACKS[this.lobbyTrackIdx % LOBBY_TRACKS.length];
    this.stopMusic();
    this.playTrack(name);
  }

  prevTrack() {
    if (!this._allowLobbySkip) return;
    this.lobbyTrackIdx = (this.lobbyTrackIdx - 1 + LOBBY_TRACKS.length * 100) % LOBBY_TRACKS.length;
    const name = LOBBY_TRACKS[this.lobbyTrackIdx % LOBBY_TRACKS.length];
    this.stopMusic();
    this.playTrack(name);
  }

  get canSkip() { return this._allowLobbySkip; }

  stopMusic() {
    if (this.seqInterval !== null) {
      clearInterval(this.seqInterval);
      this.seqInterval = null;
    }
    this.currentTrack = null;
    this.notify();
  }

  private schedule(track: TrackData) {
    if (!this.ctx) return;
    const stepDur = 60 / track.bpm / 4;
    while (this.nextStepTime < this.ctx.currentTime + 0.1) {
      this.playMusicStep(track, this.stepIdx, this.nextStepTime, stepDur);
      this.nextStepTime += stepDur;
      this.stepIdx = (this.stepIdx + 1) % track.lead.length;
      this.stepCount++;

      if (this.stepCount > 0 && this.stepIdx === 0 && this.currentTrack?.startsWith('lobby')) {
        if (this.stepCount >= track.lead.length * 4) {
          this.lobbyTrackIdx++;
          this.stepCount = 0;
          const next = LOBBY_TRACKS[this.lobbyTrackIdx % LOBBY_TRACKS.length];
          if (next !== this.currentTrack) {
            this.currentTrack = next;
            this.notify();
            const newTrack = TRACKS[next];
            if (newTrack) {
              clearInterval(this.seqInterval!);
              this.seqInterval = window.setInterval(() => this.schedule(newTrack), 25);
            }
          }
        }
      }
    }
  }

  private playMusicStep(track: TrackData, step: number, time: number, dur: number) {
    const leadNote = track.lead[step];
    if (leadNote && leadNote !== '_' && NOTE_FREQ[leadNote]) {
      this.osc('square', NOTE_FREQ[leadNote], dur * 0.7, time, 0.25, this.musicGain!);
    }
    const bassNote = track.bass[step];
    if (bassNote && bassNote !== '_' && NOTE_FREQ[bassNote]) {
      this.osc('triangle', NOTE_FREQ[bassNote], dur * 0.85, time, 0.3, this.musicGain!);
    }
    if (track.kick[step]) this.kick(time);
    if (track.hat[step]) this.hihat(time);
  }

  private osc(type: OscillatorType, freq: number, dur: number, time: number, vol: number, dest: AudioNode) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    o.connect(g);
    g.connect(dest);
    o.start(time);
    o.stop(time + dur + 0.01);
  }

  private kick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(30, time + 0.12);
    g.gain.setValueAtTime(0.45, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(time);
    o.stop(time + 0.15);
  }

  private hihat(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufSize = this.ctx.sampleRate * 0.04;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.musicGain);
    src.start(time);
    src.stop(time + 0.05);
  }

  // ─── Sound Effects ──────────────────────────────────────────

  playFootstep() {
    if (!this.ctx || !this.sfxGain) return;
    const time = this.ctx.currentTime;
    const bufSize = this.ctx.sampleRate * 0.03;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + Math.random() * 800;
    bp.Q.value = 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(time);
    src.stop(time + 0.04);
  }

  playCoinCollect() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      this.osc('square', freq, 0.08, t + i * 0.06, 0.12, this.sfxGain!);
    });
  }

  playPowerUp() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.35);
    g.gain.setValueAtTime(0.2, t);
    g.gain.setValueAtTime(0.2, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.45);
  }

  playStinkBomb() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.25);
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 15;
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + 0.3);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.35);
  }

  playDeath() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.osc('square', 493, 0.2, t, 0.15, this.sfxGain);
    this.osc('square', 349, 0.4, t + 0.15, 0.15, this.sfxGain);
    this.osc('square', 261, 0.5, t + 0.35, 0.12, this.sfxGain);
  }

  playCountdownBeep(final = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.osc('sine', final ? 1760 : 880, 0.1, t, 0.2, this.sfxGain);
  }

  playGameStart() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      this.osc('square', f, 0.12, t + i * 0.08, 0.15, this.sfxGain!);
    });
    this.osc('triangle', 1047, 0.4, t + 0.32, 0.12, this.sfxGain);
  }

  playVictory() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    [523, 587, 659, 784, 1047, 784, 1047].forEach((f, i) => {
      this.osc('square', f, 0.15, t + i * 0.12, 0.15, this.sfxGain!);
    });
  }

  playMarked() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(600, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    lfo.frequency.value = 8;
    lfoG.gain.value = 80;
    lfo.connect(lfoG);
    lfoG.connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + 0.45);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.5);
  }

  playEmote() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.osc('sine', 800, 0.05, t, 0.08, this.sfxGain);
    this.osc('sine', 1200, 0.05, t + 0.05, 0.08, this.sfxGain);
  }
}

export const gameAudio = new GameAudio();
