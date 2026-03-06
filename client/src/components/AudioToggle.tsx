'use client';

import { useState, useEffect, useCallback } from 'react';
import { gameAudio } from '@/lib/audio';

function VolumeSlider({ label, icon, value, onChange }: {
  label: string;
  icon: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-5 text-center select-none">{icon}</span>
      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider w-10 select-none">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-blue-500 cursor-pointer"
        style={{ accentColor: value === 0 ? '#EF4444' : '#3B82F6' }}
      />
      <span className="text-[10px] text-gray-500 font-mono w-7 text-right tabular-nums select-none">
        {value}
      </span>
    </div>
  );
}

export function AudioToggle() {
  const [open, setOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return gameAudio.subscribe(() => forceUpdate((n) => n + 1));
  }, []);

  const handleMaster = useCallback((v: number) => { gameAudio.masterVolume = v; }, []);
  const handleMusic = useCallback((v: number) => { gameAudio.musicVolume = v; }, []);
  const handleSfx = useCallback((v: number) => { gameAudio.sfxVolume = v; }, []);

  const toggleOpen = useCallback(() => {
    gameAudio.init();
    setOpen((p) => !p);
  }, []);

  const trackName = gameAudio.trackName;
  const canSkip = gameAudio.canSkip;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          className="bg-gray-950/95 backdrop-blur-md border border-gray-800 rounded-2xl p-4 w-72 shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white text-xs font-black uppercase tracking-wider">Audio Mixer</h4>
            <button
              onClick={() => gameAudio.toggleMute()}
              className="text-[10px] text-gray-500 hover:text-white transition-colors font-bold uppercase"
            >
              {gameAudio.muted ? 'Unmute' : 'Mute All'}
            </button>
          </div>

          <div className="space-y-2.5">
            <VolumeSlider label="Master" icon={'\u{1F50A}'} value={gameAudio.masterVolume} onChange={handleMaster} />
            <VolumeSlider label="Music" icon={'\u{1F3B5}'} value={gameAudio.musicVolume} onChange={handleMusic} />
            <VolumeSlider label="SFX" icon={'\u{1F4A5}'} value={gameAudio.sfxVolume} onChange={handleSfx} />
          </div>

          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Now Playing</div>
                <div className="text-white text-sm font-bold truncate">
                  {trackName === 'None' ? (
                    <span className="text-gray-600 italic">No track</span>
                  ) : (
                    <>
                      <span className="text-blue-400">{'\u{266B}'}</span>{' '}
                      {trackName}
                    </>
                  )}
                </div>
              </div>

              {canSkip && (
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => gameAudio.prevTrack()}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center transition-colors active:scale-90 text-sm"
                    title="Previous track"
                  >
                    {'\u23EE'}
                  </button>
                  <button
                    onClick={() => gameAudio.skipTrack()}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center transition-colors active:scale-90 text-sm"
                    title="Next track"
                  >
                    {'\u23ED'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={toggleOpen}
        className={`w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center text-lg transition-all active:scale-95 ${
          open
            ? 'bg-blue-600/80 border-blue-500/50 hover:bg-blue-500/80'
            : 'bg-gray-900/80 border-gray-700/50 hover:bg-gray-800'
        }`}
        title="Audio Mixer"
      >
        {gameAudio.muted ? '\u{1F507}' : '\u{1F3B6}'}
      </button>
    </div>
  );
}
