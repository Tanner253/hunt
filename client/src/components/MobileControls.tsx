'use client';

import { VirtualJoystick } from './VirtualJoystick';

interface MobileControlsProps {
  onJoystickInput: (dx: number, dy: number) => void;
  onEmotePress: () => void;
  onChatPress: () => void;
  onUseItem?: () => void;
  hasItem?: boolean;
}

export function MobileControls({ onJoystickInput, onEmotePress, onChatPress, onUseItem, hasItem }: MobileControlsProps) {
  return (
    <>
      <VirtualJoystick onInput={onJoystickInput} />

      <div className="absolute bottom-8 right-8 z-30 flex flex-col gap-3 touch-none select-none">
        {hasItem && onUseItem && (
          <button
            onTouchStart={(e) => { e.preventDefault(); onUseItem(); }}
            className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-400/40 flex items-center justify-center text-2xl active:bg-green-500/40 transition-colors animate-pulse"
          >
            {'\u{1F4A8}'}
          </button>
        )}
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
