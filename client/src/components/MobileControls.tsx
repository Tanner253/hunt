'use client';

import { useCallback } from 'react';
import { VirtualJoystick } from './VirtualJoystick';

interface MobileControlsProps {
  onJoystickInput: (dx: number, dy: number) => void;
  onEmotePress: () => void;
  onChatPress: () => void;
}

export function MobileControls({ onJoystickInput, onEmotePress, onChatPress }: MobileControlsProps) {
  return (
    <>
      <VirtualJoystick onInput={onJoystickInput} />

      {/* Right side action buttons */}
      <div className="absolute bottom-8 right-8 z-30 flex flex-col gap-3 touch-none select-none">
        <button
          onTouchStart={(e) => { e.preventDefault(); onEmotePress(); }}
          className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl active:bg-white/20 transition-colors"
        >
          {'\u{1F44B}'}
        </button>
        <button
          onTouchStart={(e) => { e.preventDefault(); onChatPress(); }}
          className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl active:bg-white/20 transition-colors"
        >
          {'\u{1F4AC}'}
        </button>
      </div>
    </>
  );
}
