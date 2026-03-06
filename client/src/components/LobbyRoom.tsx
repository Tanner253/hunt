'use client';

import { getSocket } from '@/lib/socket';
import { LobbyInfo } from '@/shared/types';
import { COLORS } from '@/shared/constants';
import { getMapById } from '@/shared/maps';
import { ChatPanel } from './ChatPanel';
import { LobbyPlayground } from './LobbyPlayground';
import { MapPreview } from './MapPreview';

interface LobbyRoomProps {
  lobby: LobbyInfo;
  playerId: string;
  onLeave: () => void;
  countdown: number | null;
}

export function LobbyRoom({ lobby, playerId, onLeave, countdown }: LobbyRoomProps) {
  const voteToStart = () => getSocket().emit('lobby:vote-start');
  const myPlayer = lobby.players.find((p) => p.id === playerId);
  const hasVoted = myPlayer?.hasVoted || false;
  const votedCount = lobby.votes.length;
  const total = lobby.players.length;
  const threshold = total <= 3 ? total : Math.ceil(total * 0.55);
  const voteProgress = threshold > 0 ? votedCount / threshold : 0;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">{lobby.name}</h2>
          <p className="text-gray-600 text-sm">{total} player{total !== 1 ? 's' : ''} in lobby</p>
        </div>
        <button
          onClick={onLeave}
          className="text-gray-600 hover:text-gray-400 transition-colors text-sm font-bold uppercase tracking-wider"
        >
          Leave
        </button>
      </div>

      {/* Players grid */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Players</h3>
          <span className="text-gray-600 text-sm">{total}/{lobby.maxPlayers}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {lobby.players.map((player) => {
            const color = COLORS[player.colorId]?.primary || '#888';
            const isMe = player.id === playerId;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                  isMe ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-gray-800/40'
                }`}
              >
                {/* Mini character */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-8 h-10 rounded-t-full rounded-b-lg"
                    style={{ backgroundColor: color }}
                  />
                  <div
                    className="absolute top-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5 rounded-sm"
                    style={{ backgroundColor: 'rgba(150,220,255,0.7)' }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`font-bold text-sm block truncate ${isMe ? 'text-blue-400' : 'text-white'}`}>
                    {player.name}
                  </span>
                  {player.hasVoted && (
                    <span className="text-green-500 text-xs font-bold">Ready</span>
                  )}
                </div>
              </div>
            );
          })}
          {/* Empty slots */}
          {Array.from({ length: Math.min(3, lobby.maxPlayers - total) }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 rounded-xl px-4 py-3 bg-gray-800/20 border border-dashed border-gray-800/50">
              <div className="w-8 h-10 rounded-t-full rounded-b-lg bg-gray-800/30" />
              <span className="text-gray-700 text-sm">Waiting...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vote progress bar + button */}
      <div className="space-y-3">
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(voteProgress * 100, 100)}%` }}
          />
        </div>

        <button
          onClick={voteToStart}
          disabled={total < 2 || countdown !== null}
          className={`w-full font-black text-lg py-4 rounded-2xl transition-all active:scale-[0.98] ${
            countdown !== null
              ? 'bg-yellow-600 text-yellow-100 cursor-default'
              : hasVoted
                ? 'bg-green-700/80 text-green-200 hover:bg-green-600/80'
                : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {countdown !== null
            ? `STARTING IN ${countdown}...`
            : hasVoted
              ? `VOTED \u2022 ${votedCount}/${threshold}`
              : `VOTE TO START \u2022 ${votedCount}/${threshold}`}
        </button>

        {total < 2 && (
          <p className="text-gray-600 text-sm text-center">Waiting for at least 2 players</p>
        )}
      </div>

      {/* Map vote */}
      {lobby.mapCandidates && lobby.mapCandidates.length > 0 && (
        <MapVoteSection lobby={lobby} playerId={playerId} />
      )}

      <LobbyPlayground playerId={playerId} />
      <ChatPanel lobbyId={lobby.id} />
    </div>
  );
}

function MapVoteSection({ lobby, playerId }: { lobby: LobbyInfo; playerId: string }) {
  const myVote = lobby.mapVotes?.[playerId] || null;
  const voteCounts: Record<string, number> = {};
  if (lobby.mapVotes) {
    for (const mapId of Object.values(lobby.mapVotes)) {
      voteCounts[mapId] = (voteCounts[mapId] || 0) + 1;
    }
  }

  const handleVote = (mapId: string) => {
    getSocket().emit('lobby:vote-map', mapId);
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
      <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Vote for Map</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {lobby.mapCandidates.map((candidate) => {
          const mapDef = getMapById(candidate.id);
          const votes = voteCounts[candidate.id] || 0;
          const isSelected = myVote === candidate.id;
          return (
            <button
              key={candidate.id}
              onClick={() => handleVote(candidate.id)}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-all active:scale-[0.97] ${
                isSelected
                  ? 'bg-blue-900/40 border-2 border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.25)]'
                  : 'bg-gray-800/40 border-2 border-transparent hover:border-gray-600 hover:bg-gray-800/60'
              }`}
            >
              {mapDef && <MapPreview grid={mapDef.grid} width={180} height={100} />}
              <span className={`font-bold text-xs ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
                {candidate.name}
              </span>
              {votes > 0 && (
                <span className="text-[10px] font-bold text-yellow-400">{votes} vote{votes !== 1 ? 's' : ''}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
