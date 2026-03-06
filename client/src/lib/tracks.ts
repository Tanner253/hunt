export interface TrackData {
  bpm: number;
  lead: string[];
  bass: string[];
  kick: boolean[];
  hat: boolean[];
}

function p(s: string): string[] { return s.split(' '); }
function b(s: string): boolean[] { return s.split(' ').map((c) => c === 'x'); }

export const TRACKS: Record<string, TrackData> = {
  lobby1: {
    bpm: 130,
    lead: p('C5 _ E5 _ G5 _ C6 _ B5 _ G5 _ E5 _ C5 _ D5 _ F5 _ A5 _ D6 _ C6 _ A5 _ F5 _ D5 _'),
    bass:  p('C3 _ _ C3 _ _ C3 _ G3 _ _ G3 _ _ G3 _ F3 _ _ F3 _ _ F3 _ G3 _ _ G3 _ _ G3 _'),
    kick:  b('x _ _ _ x _ _ _ x _ _ _ x _ _ _ x _ _ _ x _ _ _ x _ _ _ x _ _ _'),
    hat:   b('_ _ x _ _ _ x _ _ _ x _ _ _ x _ _ _ x _ _ _ x _ _ _ x _ _ _ x _'),
  },
  lobby2: {
    bpm: 115,
    lead: p('G4 _ _ B4 _ _ D5 _ _ B4 _ _ G4 _ _ _ A4 _ _ C5 _ _ E5 _ _ C5 _ _ A4 _ _ _'),
    bass:  p('G2 _ G2 _ _ _ G2 _ E2 _ E2 _ _ _ E2 _ A2 _ A2 _ _ _ A2 _ D3 _ D3 _ _ _ D3 _'),
    kick:  b('x _ _ _ _ _ x _ x _ _ _ _ _ x _ x _ _ _ _ _ x _ x _ _ _ _ _ x _'),
    hat:   b('_ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x'),
  },
  lobby3: {
    bpm: 125,
    lead: p('F5 _ A5 _ C6 _ A5 _ G5 _ Bb5 _ A5 _ F5 _ E5 _ G5 _ Bb5 _ G5 _ F5 _ A5 _ G5 _ E5 _'),
    bass:  p('F3 _ _ F3 _ _ C3 _ _ C3 _ _ Bb2 _ _ Bb2 C3 _ _ C3 _ _ G2 _ _ G2 _ _ F2 _ _ F2'),
    kick:  b('x _ x _ _ _ x _ x _ x _ _ _ x _ x _ x _ _ _ x _ x _ x _ _ _ x _'),
    hat:   b('x _ _ x _ x _ _ x _ _ x _ x _ _ x _ _ x _ x _ _ x _ _ x _ x _ _'),
  },
  hiding: {
    bpm: 80,
    lead: p('A4 _ _ _ _ _ C5 _ _ _ _ _ E5 _ _ _ D5 _ _ _ _ _ C5 _ _ _ _ _ B4 _ _ _'),
    bass:  p('A2 _ _ _ _ _ _ _ E2 _ _ _ _ _ _ _ D2 _ _ _ _ _ _ _ A2 _ _ _ _ _ _ _'),
    kick:  b('x _ _ _ _ _ _ _ x _ _ _ _ _ _ _ x _ _ _ _ _ _ _ x _ _ _ _ _ _ _'),
    hat:   b('_ _ _ _ x _ _ _ _ _ _ _ x _ _ _ _ _ _ _ x _ _ _ _ _ _ _ x _ _ _'),
  },
  hunting: {
    bpm: 145,
    lead: p('D5 _ D5 _ F5 _ E5 _ D5 _ C5 _ D5 _ A4 _ Bb4 _ C5 _ D5 _ E5 _ F5 _ E5 _ D5 _ C5 _'),
    bass:  p('D3 D3 _ _ D3 D3 _ _ A2 A2 _ _ A2 A2 _ _ Bb2 Bb2 _ _ Bb2 Bb2 _ _ A2 A2 _ _ A2 A2 _ _'),
    kick:  b('x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _'),
    hat:   b('x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x'),
  },
  overtime: {
    bpm: 185,
    lead: p('D5 F5 D5 A5 _ F5 D5 A5 G5 F5 D5 F5 E5 D5 C5 D5 A5 G5 F5 E5 D5 F5 A5 _ G5 F5 E5 D5 F5 E5 D5 C5'),
    bass:  p('D3 _ D3 _ D3 _ D3 _ A2 _ A2 _ A2 _ A2 _ Bb2 _ Bb2 _ Bb2 _ Bb2 _ A2 _ A2 _ A2 _ A2 _'),
    kick:  b('x x _ x x _ x x _ x x _ x x _ x x x _ x x _ x x _ x x _ x x _ x'),
    hat:   b('x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x'),
  },
  chase: {
    bpm: 155,
    lead: p('A5 _ A5 _ _ A5 _ A5 _ _ F5 _ E5 _ D5 _ A5 _ A5 _ _ A5 _ A5 _ _ G5 _ F5 _ E5 _'),
    bass:  p('D3 _ D3 _ D3 _ _ _ A2 _ A2 _ A2 _ _ _ D3 _ D3 _ D3 _ _ _ A2 _ A2 _ A2 _ _ _'),
    kick:  b('x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _ x _'),
    hat:   b('x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x'),
  },
};

export const LOBBY_TRACKS = ['lobby1', 'lobby2', 'lobby3'];

export const TRACK_NAMES: Record<string, string> = {
  lobby1: 'Arcade Bounce',
  lobby2: 'Chill Groove',
  lobby3: 'Pixel Party',
  hiding: 'Shadow Creep',
  hunting: 'The Chase',
  overtime: 'Final Rush',
  chase: 'Hot Pursuit',
};
