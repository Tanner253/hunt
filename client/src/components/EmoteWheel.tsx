'use client';

import { EMOTES } from '@/shared/constants';

interface EmoteWheelProps {
  onSelect: (emoteId: string) => void;
  onClose: () => void;
}

export function EmoteWheel({ onSelect, onClose }: EmoteWheelProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="relative w-72 h-72 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Center ring */}
        <div className="absolute inset-[60px] rounded-full border-2 border-gray-700/30" />

        {EMOTES.map((emote, i) => {
          const angle = (i / EMOTES.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * 100 + 144;
          const y = Math.sin(angle) * 100 + 144;

          return (
            <button
              key={emote.id}
              onClick={() => onSelect(emote.id)}
              className="absolute w-14 h-14 -ml-7 -mt-7 rounded-full bg-gray-900/90 backdrop-blur border-2 border-gray-700 hover:border-yellow-500 hover:scale-125 hover:bg-gray-800 transition-all flex items-center justify-center text-2xl shadow-lg"
              style={{
                left: x,
                top: y,
                animationDelay: `${i * 30}ms`,
              }}
              title={emote.name}
            >
              {emote.emoji}
            </button>
          );
        })}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className="text-gray-600 text-xs font-bold uppercase tracking-wider">Press E</span>
          </div>
        </div>
      </div>
    </div>
  );
}
