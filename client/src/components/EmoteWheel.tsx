'use client';

import { useState } from 'react';
import { EMOTES } from '@/shared/constants';

interface EmoteWheelProps {
  onSelect: (emoteId: string) => void;
  onClose: () => void;
}

export function EmoteWheel({ onSelect, onClose }: EmoteWheelProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredEmote = EMOTES.find((e) => e.id === hovered);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={onClose}
      onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
    >
      <div
        className="relative w-72 h-72 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-[60px] rounded-full border-2 border-gray-700/30" />

        {EMOTES.map((emote, i) => {
          const angle = (i / EMOTES.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * 100 + 144;
          const y = Math.sin(angle) * 100 + 144;
          const isHovered = hovered === emote.id;

          return (
            <button
              key={emote.id}
              onClick={() => onSelect(emote.id)}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(emote.id); }}
              onMouseEnter={() => setHovered(emote.id)}
              onMouseLeave={() => setHovered(null)}
              className={`absolute w-14 h-14 -ml-7 -mt-7 rounded-full backdrop-blur border-2 transition-all flex items-center justify-center text-2xl shadow-lg ${
                isHovered
                  ? 'bg-gray-800 border-yellow-500 scale-125'
                  : 'bg-gray-900/90 border-gray-700 hover:border-yellow-500 hover:scale-125 active:scale-110 active:border-yellow-500'
              }`}
              style={{
                left: x,
                top: y,
                animationDelay: `${i * 30}ms`,
              }}
            >
              {emote.emoji}
            </button>
          );
        })}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            {hoveredEmote ? (
              <>
                <span className="text-3xl block mb-1">{hoveredEmote.emoji}</span>
                <span className="text-white text-xs font-bold uppercase tracking-wider">{hoveredEmote.name}</span>
              </>
            ) : (
              <>
                <span className="text-gray-600 text-xs font-bold uppercase tracking-wider hidden md:block">Press E</span>
                <span className="text-gray-600 text-xs font-bold uppercase tracking-wider md:hidden">Tap to select</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
