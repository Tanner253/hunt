'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { LobbyInfo } from '@/shared/types';

interface LobbyBrowserProps {
  onJoinLobby: (lobbyId: string) => void;
}

function LobbyCard({ lobby, onJoin }: { lobby: LobbyInfo; onJoin: () => void }) {
  const fill = lobby.players.length / lobby.maxPlayers;
  const isOpen = lobby.state === 'waiting' && lobby.players.length < lobby.maxPlayers;
  const isPlaying = lobby.state === 'playing';

  return (
    <div
      className={`group relative bg-gray-900/60 border rounded-2xl p-5 transition-all duration-200 ${
        isOpen
          ? 'border-gray-800 hover:border-gray-600 hover:bg-gray-900/80 cursor-pointer'
          : 'border-gray-800/50 opacity-80'
      }`}
      onClick={isOpen || isPlaying ? onJoin : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-lg">{lobby.name}</h3>
            {lobby.isFree && (
              <span className="text-[10px] font-black uppercase bg-gradient-to-r from-green-600 to-emerald-500 text-white px-2 py-0.5 rounded-full tracking-wider">
                Free
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-gray-500 text-sm">
              <span className="text-white font-bold">{lobby.players.length}</span>/{lobby.maxPlayers}
            </span>
            {lobby.spectators > 0 && (
              <span className="text-gray-600 text-xs flex items-center gap-1">
                <span className="opacity-60">&#x1F441;</span> {lobby.spectators}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPlaying && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-bold uppercase">Live</span>
            </div>
          )}
          {lobby.state === 'countdown' && (
            <span className="text-yellow-400 text-xs font-bold uppercase animate-pulse">Starting...</span>
          )}
          {isOpen && (
            <div className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              JOIN
            </div>
          )}
          {isPlaying && (
            <div className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-5 py-2 rounded-xl text-sm transition-colors">
              WATCH
            </div>
          )}
        </div>
      </div>

      {/* Fill bar */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            fill >= 0.9 ? 'bg-red-500' : fill >= 0.5 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${fill * 100}%` }}
        />
      </div>

      {/* Player color dots */}
      {lobby.players.length > 0 && (
        <div className="flex items-center gap-1 mt-2.5">
          {lobby.players.slice(0, 10).map((p, i) => (
            <div
              key={p.id}
              className="w-3 h-3 rounded-full border border-black/30"
              style={{ backgroundColor: getColorForId(p.colorId) }}
              title={p.name}
            />
          ))}
          {lobby.players.length > 10 && (
            <span className="text-gray-600 text-xs ml-1">+{lobby.players.length - 10}</span>
          )}
        </div>
      )}
    </div>
  );
}

const COLOR_MAP: Record<string, string> = {
  Blue: '#132ED1', Green: '#117F2D', Pink: '#ED54BA', Orange: '#EF7D0D',
  Yellow: '#F5F557', Black: '#3F474E', White: '#D6E0F0', Purple: '#6B2FBB',
  Brown: '#71491E', Cyan: '#38FEDB', Lime: '#50EF39', Maroon: '#6B2C2C',
};

function getColorForId(colorId: string): string {
  return COLOR_MAP[colorId] || '#888';
}

export function LobbyBrowser({ onJoinLobby }: LobbyBrowserProps) {
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('lobby:list', (list: LobbyInfo[]) => {
      setLobbies(list);
      setLoading(false);
    });
    socket.on('lobby:list', setLobbies);
    return () => { socket.off('lobby:list'); };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-5 animate-pulse">
            <div className="h-5 w-32 bg-gray-800 rounded mb-3" />
            <div className="h-1.5 w-full bg-gray-800 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const free = lobbies.filter((l) => l.isFree);
  const regular = lobbies.filter((l) => !l.isFree);

  return (
    <div className="space-y-6">
      {free.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600 mb-3">Featured</h2>
          {free.map((lobby) => (
            <LobbyCard key={lobby.id} lobby={lobby} onJoin={() => onJoinLobby(lobby.id)} />
          ))}
        </div>
      )}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600 mb-3">
          Lobbies ({regular.filter((l) => l.state === 'waiting').length} open)
        </h2>
        <div className="grid gap-2">
          {regular.map((lobby) => (
            <LobbyCard key={lobby.id} lobby={lobby} onJoin={() => onJoinLobby(lobby.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
