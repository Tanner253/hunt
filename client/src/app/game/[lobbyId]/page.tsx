'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { gameAudio } from '@/lib/audio';
import { LobbyInfo, GameOverData } from '@/shared/types';
import { LobbyRoom } from '@/components/LobbyRoom';
import { GameCanvas } from '@/components/GameCanvas';
import { CountdownOverlay } from '@/components/CountdownOverlay';
import { AudioToggle } from '@/components/AudioToggle';

type PageState = 'joining' | 'lobby' | 'countdown' | 'playing' | 'spectating' | 'gameover';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const lobbyId = params.lobbyId as string;

  const [pageState, setPageState] = useState<PageState>('joining');
  const [lobby, setLobby] = useState<LobbyInfo | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [mapId, setMapId] = useState<string>('station-alpha');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const pageStateRef = useRef<PageState>('joining');
  const [playerName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('hunt-player-name') || 'Player';
    return 'Player';
  });

  useEffect(() => { pageStateRef.current = pageState; }, [pageState]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    gameAudio.init();

    socket.emit('lobby:join', { lobbyId, playerName }, (result) => {
      if (result.success && result.lobby) {
        setLobby(result.lobby);
        const me = result.lobby.players[result.lobby.players.length - 1];
        setPlayerId(me.id);
        setPageState('lobby');
        gameAudio.playLobbyMusic();
      } else {
        socket.emit('spectate:join', lobbyId);
        setPageState('spectating');
      }
    });

    const handleLobbyState = (lobbyInfo: LobbyInfo) => {
      setLobby(lobbyInfo);
      if (lobbyInfo.state === 'waiting' && pageStateRef.current === 'gameover') {
        setGameOverData(null);
        setPageState('lobby');
        gameAudio.playLobbyMusic();
      }
    };

    socket.on('lobby:state', handleLobbyState);
    socket.on('lobby:countdown', (s) => {
      setCountdown(s);
      setPageState('countdown');
      gameAudio.playCountdownBeep(s <= 1);
    });
    socket.on('game:start', (data) => {
      setPlayerId(data.yourId);
      setMapId(data.mapId || 'station-alpha');
      setCountdown(0);
      gameAudio.stopMusic();
      gameAudio.playGameStart();
      setTimeout(() => {
        setPageState('playing');
        setCountdown(null);
      }, 800);
    });
    socket.on('game:over', (data) => {
      setGameOverData(data);
      setPageState('gameover');
      gameAudio.stopMusic();
    });
    socket.on('error', (msg) => console.error('Socket error:', msg));

    return () => {
      socket.off('lobby:state', handleLobbyState);
      socket.off('lobby:countdown');
      socket.off('game:start');
      socket.off('game:over');
      socket.off('error');
    };
  }, [lobbyId, playerName]);

  const handleLeave = useCallback(() => {
    getSocket().emit('lobby:leave');
    router.push('/');
  }, [router]);

  const handleGameOver = useCallback((data: GameOverData) => {
    setGameOverData(data);
    setPageState('gameover');
  }, []);

  if (pageState === 'joining') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-800 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold">Connecting to lobby...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'lobby' || pageState === 'countdown') {
    return (
      <div className="min-h-screen bg-gray-950 p-6 relative">
        {lobby && playerId && (
          <LobbyRoom lobby={lobby} playerId={playerId} onLeave={handleLeave} countdown={countdown} />
        )}
        <CountdownOverlay count={countdown} />
        <AudioToggle />
      </div>
    );
  }

  if ((pageState === 'playing' || pageState === 'spectating') && playerId) {
    return (
      <>
        <GameCanvas
          playerId={playerId}
          mapId={mapId}
          isSpectating={pageState === 'spectating'}
          onGameOver={handleGameOver}
        />
        <AudioToggle />
      </>
    );
  }

  if (pageState === 'gameover' && gameOverData) {
    return (
      <>
        <GameOverScreen
          data={gameOverData}
          playerId={playerId}
          onBackToLobby={() => { setGameOverData(null); setPageState('lobby'); }}
          onHome={() => router.push('/')}
        />
        <AudioToggle />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-gray-800 border-t-white rounded-full animate-spin" />
    </div>
  );
}

function GameOverScreen({
  data,
  playerId,
  onBackToLobby,
  onHome,
}: {
  data: GameOverData;
  playerId: string | null;
  onBackToLobby: () => void;
  onHome: () => void;
}) {
  const isWinner = data.winnerId === playerId;
  const [visible, setVisible] = useState(false);
  const [returnTimer, setReturnTimer] = useState(10);

  useEffect(() => {
    if (isWinner) gameAudio.playVictory();
    else gameAudio.playDeath();
  }, [isWinner]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const interval = setInterval(() => {
      setReturnTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

  return (
    <div className={`min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 p-6 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Confetti for winner */}
      {isWinner && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#F5F557', '#4ADE80', '#60A5FA', '#F472B6', '#FB923C'][i % 5],
                animation: `confetti-fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 text-center animate-scale-in">
        {isWinner ? (
          <>
            <div className="text-7xl mb-4">{'\u{1F451}'}</div>
            <h1
              className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 tracking-tighter"
              style={{ filter: 'drop-shadow(0 0 40px rgba(245,245,87,0.3))' }}
            >
              VICTORY
            </h1>
            <p className="text-xl text-yellow-400/80 font-bold mt-2">You were the last one standing</p>
          </>
        ) : (
          <>
            <h1
              className="text-6xl md:text-8xl font-black tracking-tighter"
              style={{ color: '#C51111', textShadow: '0 0 40px rgba(197,17,17,0.3)' }}
            >
              GAME OVER
            </h1>
            {data.winnerName && (
              <p className="text-xl text-gray-400 mt-2">
                <span className="text-yellow-400 font-bold">{data.winnerName}</span> won the round
              </p>
            )}
          </>
        )}
      </div>

      {/* Standings */}
      <div className="relative z-10 w-full max-w-lg animate-scale-in" style={{ animationDelay: '0.2s' }}>
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Final Standings</h3>
            <span className="text-gray-600 text-xs font-mono">
              {data.duration.toFixed(0)}s match
            </span>
          </div>
          <div className="divide-y divide-gray-800/50">
            {data.standings.map((s, i) => {
              const isMe = s.id === playerId;
              return (
                <div
                  key={s.id}
                  className={`px-5 py-3 flex items-center gap-4 ${isMe ? 'bg-blue-900/20' : ''}`}
                >
                  <div className="w-8 text-center flex-shrink-0">
                    {i < 3 ? (
                      <span className="text-xl">{medals[i]}</span>
                    ) : (
                      <span className="text-gray-600 font-bold text-sm">#{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`font-bold truncate block ${isMe ? 'text-blue-400' : 'text-white'}`}>
                      {s.name} {isMe && '(You)'}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-gray-500 text-sm font-mono">{s.survivalTime.toFixed(1)}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 flex flex-col items-center gap-3 animate-scale-in" style={{ animationDelay: '0.4s' }}>
        <div className="flex gap-4">
          <button
            onClick={onBackToLobby}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] active:scale-95"
          >
            PLAY AGAIN
          </button>
          <button
            onClick={onHome}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-8 py-3.5 rounded-2xl transition-colors active:scale-95"
          >
            HOME
          </button>
        </div>
        {returnTimer > 0 && (
          <p className="text-gray-600 text-sm">
            Returning to lobby in {returnTimer}s
          </p>
        )}
      </div>
    </div>
  );
}
