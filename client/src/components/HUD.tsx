'use client';

import { GameState } from '@/shared/types';

interface HUDProps {
  gameState: GameState | null;
  hasItem?: boolean;
}

export function HUD({ gameState, hasItem }: HUDProps) {
  if (!gameState) return null;

  const minutes = Math.floor(Math.max(0, gameState.timer) / 60);
  const seconds = Math.floor(Math.max(0, gameState.timer) % 60);
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isUrgent = gameState.phase === 'hunting' && gameState.timer <= 30;

  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-none z-10">
      <div className={`bg-black/60 backdrop-blur-md text-white px-5 py-3 rounded-2xl border transition-colors ${
        isUrgent ? 'border-red-800/50' : 'border-white/5'
      }`}>
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
              {gameState.phase === 'hiding' ? 'Hiding Phase' : gameState.timer <= 0 ? 'Overtime' : 'Hunt Phase'}
            </div>
            <div
              className={`text-2xl font-mono font-black tabular-nums ${
                gameState.phase === 'hiding'
                  ? 'text-yellow-400'
                  : isUrgent
                    ? 'text-red-400 animate-pulse'
                    : 'text-white'
              }`}
            >
              {timeStr}
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Alive</div>
            <div className="text-2xl font-mono font-black tabular-nums text-green-400">
              {gameState.hidersAlive}
            </div>
          </div>
          {hasItem && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Item</div>
                <div className="text-2xl" title="Stink Bomb — Press Space to use">{'\u{1F4A8}'}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {gameState.phase === 'hiding' && (
        <div className="bg-yellow-500/10 backdrop-blur-md text-yellow-400 px-4 py-2 rounded-xl border border-yellow-500/20 text-sm font-bold animate-pulse flex items-center gap-2">
          <span className="text-base">{'\u{1F3C3}'}</span>
          Find a hiding spot!
        </div>
      )}
      {gameState.phase === 'hunting' && gameState.timer <= 0 && (
        <div className="bg-red-500/20 backdrop-blur-md text-red-400 px-4 py-2 rounded-xl border border-red-500/30 text-sm font-black animate-pulse flex items-center gap-2">
          <span className="text-base">{'\u{26A0}\u{FE0F}'}</span>
          OVERTIME — Seeker enraged!
        </div>
      )}

      {hasItem && (
        <div className="bg-green-500/10 backdrop-blur-md text-green-400 px-4 py-2 rounded-xl border border-green-500/20 text-xs font-bold hidden md:flex items-center gap-2">
          <kbd className="bg-green-900/50 px-2 py-0.5 rounded text-green-300 text-[10px] font-mono">SPACE</kbd>
          Throw Stink Bomb
        </div>
      )}
    </div>
  );
}
