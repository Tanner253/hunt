'use client';

import { useState, useCallback } from 'react';
import { gameAudio } from '@/lib/audio';

export function AudioToggle() {
  const [muted, setMuted] = useState(gameAudio.muted);

  const toggle = useCallback(() => {
    gameAudio.init();
    gameAudio.toggleMute();
    setMuted(gameAudio.muted);
  }, []);

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-gray-900/80 backdrop-blur border border-gray-700/50 flex items-center justify-center text-lg hover:bg-gray-800 transition-colors active:scale-95"
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '\u{1F507}' : '\u{1F50A}'}
    </button>
  );
}
